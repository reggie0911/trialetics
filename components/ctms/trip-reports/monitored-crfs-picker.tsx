'use client';

/**
 * Monitored CRFs picker for the trip-report authoring flow.
 *
 * Replaces the old free-text Subject / CRF Name / SDV Status inputs with a
 * structured selector backed by the eCRF Tracking matrix
 * (`subject_visits` + `subject_crfs`). The CRA picks a subject (scoped to
 * the visit's site) and one of that subject's visits, then sees the same
 * CRF rows shown in the eCRF Tracking tab. Inline DE / SDR / SDV / PI / LOCK
 * checkboxes and the Query toggle write back to `subject_crfs` via the same
 * `setSubjectCrfMetric` / `setSubjectCrfQueryStatus` server actions used by
 * `SubjectEcrfTrackingPanel`. A leading "include" checkbox per row marks the
 * CRF for snapshotting into `trip_report_crf_entries` via `addCrfEntriesBulk`.
 */

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { addCrfEntriesBulk, type TripReportCrfEntry } from '@/lib/actions/visit-reports';
import { getSubjectEcrfTracking, setSubjectCrfMetric, setSubjectCrfQueryStatus } from '@/lib/actions/subject-ecrf-tracking';
import {
  SUBJECT_CRF_METRICS,
  SUBJECT_CRF_METRIC_SHORT_LABELS,
  SUBJECT_CRF_QUERY_STATUSES,
  SUBJECT_CRF_QUERY_STATUS_LABELS,
  type SubjectCrf,
  type SubjectCrfMetricKey,
  type SubjectCrfQueryStatus,
  type SubjectVisitWithCrfs,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

export interface MonitoredCrfsPickerSubject {
  id: string;
  subject_number: string;
  status: string | null;
}

export interface MonitoredCrfsPickerProps {
  reportId: string;
  /** Visit's site id; when null the picker hides itself. */
  siteId: string | null;
  /** Pre-loaded list of subjects on the site (avoids the first-render fetch). */
  siteSubjects: MonitoredCrfsPickerSubject[];
  /** Already-recorded entries on this report; used to dedupe and pre-check rows. */
  recordedEntries: TripReportCrfEntry[];
  /** Default visit name from the monitoring visit; used to auto-pick a matching subject_visit. */
  defaultVisitName?: string | null;
  canEdit: boolean;
  /** Called after a successful bulk add so the parent can refresh server data. */
  onAdded?: () => void;
}

/**
 * Builds a human-readable SDV status string from a subject_crf row's metrics
 * + query state. This is what gets snapshot into `trip_report_crf_entries.sdv_status`
 * so legacy report renderers (PDF, etc.) keep working with plain text.
 */
function deriveSdvStatusLabel(crf: SubjectCrf): string {
  const flags: string[] = [];
  if (crf.data_management_lock) flags.push('LOCK');
  else if (crf.source_data_verified) flags.push('SDV');
  else if (crf.source_data_review) flags.push('SDR');
  else if (crf.data_entry) flags.push('DE');
  else flags.push('Pending');
  if (crf.query_status === 'open') flags.push('Query: Open');
  else if (crf.query_status === 'answered') flags.push('Query: Answered');
  return flags.join(' · ');
}

function applyCascade(
  current: SubjectCrf,
  metric: SubjectCrfMetricKey,
  value: boolean,
): Partial<SubjectCrf> {
  const patch: Partial<SubjectCrf> = { [metric]: value };
  if (value && (metric === 'source_data_verified' || metric === 'data_management_lock')) {
    patch.data_entry = true;
  }
  return patch;
}

export function MonitoredCrfsPicker({
  reportId,
  siteId,
  siteSubjects,
  recordedEntries,
  defaultVisitName,
  canEdit,
  onAdded,
}: MonitoredCrfsPickerProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [visitsBySubject, setVisitsBySubject] = useState<Record<string, SubjectVisitWithCrfs[]>>({});
  const [loadingSubjectId, setLoadingSubjectId] = useState<string | null>(null);
  const [pendingRows, setPendingRows] = useState<Set<string>>(new Set());
  const [includeIds, setIncludeIds] = useState<Set<string>>(new Set());
  const [isAdding, startAddTransition] = useTransition();

  const recordedSubjectCrfIds = useMemo(
    () =>
      new Set(
        recordedEntries
          .map((e) => e.subject_crf_id)
          .filter((v): v is string => !!v),
      ),
    [recordedEntries],
  );

  const subjectVisits = visitsBySubject[selectedSubjectId] ?? [];
  const selectedVisit = subjectVisits.find((v) => v.id === selectedVisitId) ?? null;

  // Lazy-load the subject's eCRF tracking matrix the first time it's chosen.
  useEffect(() => {
    if (!selectedSubjectId) return;
    if (visitsBySubject[selectedSubjectId]) return;

    let cancelled = false;
    setLoadingSubjectId(selectedSubjectId);
    void getSubjectEcrfTracking(selectedSubjectId)
      .then((visits) => {
        if (cancelled) return;
        setVisitsBySubject((prev) => ({ ...prev, [selectedSubjectId]: visits }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : 'Failed to load eCRF tracking');
        setVisitsBySubject((prev) => ({ ...prev, [selectedSubjectId]: [] }));
      })
      .finally(() => {
        if (!cancelled) setLoadingSubjectId(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSubjectId, visitsBySubject]);

  // Auto-pick a default subject_visit once the matrix loads. Prefer one whose
  // visit_name matches the monitoring visit; fall back to the first visit.
  useEffect(() => {
    if (!selectedSubjectId) return;
    const visits = visitsBySubject[selectedSubjectId];
    if (!visits || visits.length === 0) {
      setSelectedVisitId('');
      return;
    }
    if (selectedVisitId && visits.some((v) => v.id === selectedVisitId)) return;
    const matchByName = defaultVisitName
      ? visits.find(
          (v) => v.visit_name?.trim().toLowerCase() === defaultVisitName.trim().toLowerCase(),
        )
      : null;
    setSelectedVisitId((matchByName ?? visits[0]).id);
  }, [defaultVisitName, selectedSubjectId, selectedVisitId, visitsBySubject]);

  // Reset row include selections whenever the visit changes.
  useEffect(() => {
    setIncludeIds(new Set());
  }, [selectedVisitId]);

  const markPending = useCallback((id: string, on: boolean) => {
    setPendingRows((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const patchRow = useCallback((subjectId: string, crfId: string, patch: Partial<SubjectCrf>) => {
    setVisitsBySubject((prev) => {
      const visits = prev[subjectId];
      if (!visits) return prev;
      return {
        ...prev,
        [subjectId]: visits.map((v) => ({
          ...v,
          crfs: v.crfs.map((c) => (c.id === crfId ? { ...c, ...patch } : c)),
        })),
      };
    });
  }, []);

  const findCrf = useCallback(
    (subjectId: string, crfId: string): SubjectCrf | undefined => {
      const visits = visitsBySubject[subjectId];
      if (!visits) return undefined;
      for (const v of visits) {
        const f = v.crfs.find((c) => c.id === crfId);
        if (f) return f;
      }
      return undefined;
    },
    [visitsBySubject],
  );

  const handleMetricToggle = useCallback(
    async (subjectId: string, crfId: string, metric: SubjectCrfMetricKey, value: boolean) => {
      const current = findCrf(subjectId, crfId);
      if (!current) return;
      const cascade = applyCascade(current, metric, value);
      const previous: Partial<SubjectCrf> = {};
      for (const k of Object.keys(cascade) as Array<keyof SubjectCrf>) {
        // @ts-expect-error keyof bounce
        previous[k] = current[k];
      }

      patchRow(subjectId, crfId, cascade);
      markPending(crfId, true);

      try {
        const { error } = await setSubjectCrfMetric({ subjectCrfId: crfId, metric, value });
        if (error) {
          patchRow(subjectId, crfId, previous);
          toast.error(error);
        }
      } finally {
        markPending(crfId, false);
      }
    },
    [findCrf, markPending, patchRow],
  );

  const handleQueryChange = useCallback(
    async (subjectId: string, crfId: string, value: SubjectCrfQueryStatus) => {
      const current = findCrf(subjectId, crfId);
      if (!current) return;
      const previous = current.query_status;

      patchRow(subjectId, crfId, { query_status: value });
      markPending(crfId, true);

      try {
        const { error } = await setSubjectCrfQueryStatus({ subjectCrfId: crfId, value });
        if (error) {
          patchRow(subjectId, crfId, { query_status: previous });
          toast.error(error);
        }
      } finally {
        markPending(crfId, false);
      }
    },
    [findCrf, markPending, patchRow],
  );

  const toggleInclude = useCallback((crfId: string) => {
    setIncludeIds((prev) => {
      const next = new Set(prev);
      if (next.has(crfId)) next.delete(crfId);
      else next.add(crfId);
      return next;
    });
  }, []);

  const handleAddSelected = useCallback(() => {
    if (!selectedVisit || includeIds.size === 0) return;
    const subject = siteSubjects.find((s) => s.id === selectedSubjectId);
    if (!subject) {
      toast.error('Subject not found.');
      return;
    }
    const rows = selectedVisit.crfs
      .filter((c) => includeIds.has(c.id))
      .map((c) => ({
        subject_number: subject.subject_number,
        crf_name: c.crf_name,
        sdv_status: deriveSdvStatusLabel(c),
        subject_id: subject.id,
        subject_visit_id: selectedVisit.id,
        subject_crf_id: c.id,
      }));
    if (rows.length === 0) return;

    startAddTransition(async () => {
      const { data, skipped, error } = await addCrfEntriesBulk(reportId, rows);
      if (error) {
        toast.error(error);
        return;
      }
      const added = data.length;
      if (added > 0 && skipped > 0) {
        toast.success(`Added ${added} CRF${added === 1 ? '' : 's'}, skipped ${skipped} already linked.`);
      } else if (added > 0) {
        toast.success(`Added ${added} CRF${added === 1 ? '' : 's'} to the report.`);
      } else if (skipped > 0) {
        toast.message(`Skipped ${skipped} CRF${skipped === 1 ? '' : 's'} already linked.`);
      }
      setIncludeIds(new Set());
      onAdded?.();
    });
  }, [includeIds, onAdded, reportId, selectedSubjectId, selectedVisit, siteSubjects]);

  if (!siteId) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Visit has no site assigned; eCRF-driven CRF picker unavailable.
      </p>
    );
  }

  if (!canEdit) return null;

  if (siteSubjects.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No subjects have been enrolled at this site yet. Add subjects to the site to populate this picker.
      </p>
    );
  }

  const subjectLabelById = new Map(siteSubjects.map((s) => [s.id, s.subject_number]));
  const visitLabelById = new Map(subjectVisits.map((v) => [v.id, v.visit_name ?? '(unnamed)']));

  return (
    <div className="space-y-3 rounded-md border border-dashed border-border p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add monitored CRFs from eCRF tracking
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Subject</label>
          <Select
            value={selectedSubjectId}
            onValueChange={(v) => setSelectedSubjectId(v)}
          >
            <SelectTrigger className="w-[180px] h-9 text-[12px]">
              <SelectValue
                placeholder="Choose subject…"
                getDisplayLabel={(value) => (value ? subjectLabelById.get(value) ?? null : null)}
              />
            </SelectTrigger>
            <SelectContent>
              {siteSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.subject_number}
                  {s.status ? (
                    <span className="text-muted-foreground"> · {s.status}</span>
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted-foreground">Subject visit</label>
          <Select
            value={selectedVisitId}
            onValueChange={(v) => setSelectedVisitId(v)}
            disabled={!selectedSubjectId || subjectVisits.length === 0}
          >
            <SelectTrigger className="w-[200px] h-9 text-[12px]">
              <SelectValue
                placeholder={
                  loadingSubjectId === selectedSubjectId
                    ? 'Loading…'
                    : subjectVisits.length === 0
                      ? 'No visits'
                      : 'Choose visit…'
                }
                getDisplayLabel={(value) => (value ? visitLabelById.get(value) ?? null : null)}
              />
            </SelectTrigger>
            <SelectContent>
              {subjectVisits.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.visit_name ?? '(unnamed)'}
                  <span className="text-muted-foreground"> · {v.crfs.length} CRF{v.crfs.length === 1 ? '' : 's'}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSelected}
          disabled={isAdding || includeIds.size === 0}
          aria-label="Add selected CRFs to report"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add {includeIds.size > 0 ? `${includeIds.size} ` : ''}selected to report
        </Button>
      </div>

      {selectedSubjectId && loadingSubjectId === selectedSubjectId && (
        <p className="text-xs text-muted-foreground">Loading eCRF tracking…</p>
      )}

      {selectedVisit && selectedVisit.crfs.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No CRFs snapshotted for this subject visit yet.
        </p>
      )}

      {selectedVisit && selectedVisit.crfs.length > 0 && (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[42px] text-center">
                  <span className="sr-only">Include</span>
                </TableHead>
                <TableHead className="min-w-[160px]">CRF</TableHead>
                {SUBJECT_CRF_METRICS.map((m) => (
                  <TableHead key={m} className="text-center text-[11px]">
                    {SUBJECT_CRF_METRIC_SHORT_LABELS[m]}
                  </TableHead>
                ))}
                <TableHead className="text-center">Query</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedVisit.crfs.map((crf) => {
                const pending = pendingRows.has(crf.id);
                const alreadyAdded = recordedSubjectCrfIds.has(crf.id);
                const checked = alreadyAdded || includeIds.has(crf.id);
                return (
                  <TableRow key={crf.id} className={cn(pending && 'opacity-70')}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={checked}
                        disabled={alreadyAdded || isAdding}
                        onCheckedChange={() => toggleInclude(crf.id)}
                        aria-label={alreadyAdded ? `Already added ${crf.crf_name}` : `Include ${crf.crf_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{crf.crf_name}</span>
                        {alreadyAdded && (
                          <Badge variant="outline" className="text-[10px]">
                            Added
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {SUBJECT_CRF_METRICS.map((m) => (
                      <TableCell key={m} className="text-center">
                        <Checkbox
                          checked={crf[m]}
                          disabled={pending}
                          onCheckedChange={(next) =>
                            handleMetricToggle(selectedSubjectId, crf.id, m, next === true)
                          }
                          aria-label={`${SUBJECT_CRF_METRIC_SHORT_LABELS[m]} for ${crf.crf_name}`}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <ToggleGroup
                        value={[crf.query_status]}
                        onValueChange={(values) => {
                          const next = (values[0] ?? 'none') as SubjectCrfQueryStatus;
                          if (next === crf.query_status) return;
                          handleQueryChange(selectedSubjectId, crf.id, next);
                        }}
                        variant="outline"
                        size="sm"
                        className="mx-auto"
                        disabled={pending}
                      >
                        {SUBJECT_CRF_QUERY_STATUSES.map((s) => (
                          <ToggleGroupItem
                            key={s}
                            value={s}
                            aria-label={SUBJECT_CRF_QUERY_STATUS_LABELS[s]}
                            className={cn(
                              'text-[11px]',
                              s === 'none' &&
                                'aria-pressed:!bg-muted aria-pressed:!text-foreground aria-pressed:hover:!bg-muted/80 dark:aria-pressed:!bg-muted dark:aria-pressed:!text-foreground',
                              s === 'open' &&
                                'aria-pressed:!bg-red-600 aria-pressed:!text-white aria-pressed:hover:!bg-red-700 dark:aria-pressed:!bg-red-500 dark:aria-pressed:hover:!bg-red-600',
                              s === 'answered' &&
                                'aria-pressed:!bg-yellow-400 aria-pressed:!text-yellow-950 aria-pressed:hover:!bg-yellow-500 dark:aria-pressed:!bg-yellow-300 dark:aria-pressed:!text-yellow-950 dark:aria-pressed:hover:!bg-yellow-400',
                            )}
                          >
                            {SUBJECT_CRF_QUERY_STATUS_LABELS[s]}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
