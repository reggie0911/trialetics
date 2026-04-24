'use client';

/**
 * Subject eCRF Tracking — per-subject completion matrix.
 *
 * Layout (per visit):
 *   ┌──────────────────────────────────────────────────────────────────────────┐
 *   │ Visit name                       DE% / SDV% / Lock% (visit summary)     │
 *   ├──────────────────────────────────────────────────────────────────────────┤
 *   │ CRF | Expected | DE | SDR | SDV | PI | LOCK | Query | DE% | SDV% | Lock%│
 *   │ ... (one row per subject_crf, optimistic toggles, server-validated)      │
 *   └──────────────────────────────────────────────────────────────────────────┘
 *
 * Five boolean metrics use Checkbox (independent on/off). Query status uses a
 * 3-segment ToggleGroup (mutually exclusive). Percentages are read-only Badges
 * computed by `computeSubjectCrfPercentages`. The header strip aggregates over
 * every CRF on the subject so users get a "where do I stand overall" view.
 */

import { useCallback, useMemo, useState, useTransition } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  History,
  MoreHorizontal,
  RefreshCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  bulkSetSubjectCrfMetrics,
  resyncSubjectEcrf,
  setSubjectCrfMetric,
  setSubjectCrfQueryStatus,
} from '@/lib/actions/subject-ecrf-tracking';
import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import {
  SUBJECT_CRF_METRICS,
  SUBJECT_CRF_METRIC_SHORT_LABELS,
  SUBJECT_CRF_QUERY_STATUSES,
  SUBJECT_CRF_QUERY_STATUS_LABELS,
  type SubjectCrf,
  type SubjectCrfMetricKey,
  type SubjectCrfPercentages,
  type SubjectCrfQueryStatus,
  type SubjectVisitWithCrfs,
} from '@/lib/types/ctms';
import { SubjectCrfHistorySheet } from './subject-crf-history-sheet';

// Full-name + short description for each metric column header tooltip. Kept
// local to the panel because these descriptions are UI-only copy (the canonical
// labels in lib/types/ctms.ts mix short and long forms for compactness elsewhere).
const METRIC_HEADER_DETAILS: Record<
  SubjectCrfMetricKey,
  { full: string; description: string }
> = {
  data_entry: {
    full: 'Data Entry',
    description: 'Data has been entered for this CRF.',
  },
  source_data_review: {
    full: 'Source Data Review',
    description: 'Source data has been reviewed for this CRF.',
  },
  source_data_verified: {
    full: 'Source Data Verified',
    description: 'Source data has been verified against the source documents.',
  },
  pi_signed: {
    full: 'Principal Investigator Signed',
    description: 'Principal Investigator has signed off on this CRF.',
  },
  data_management_lock: {
    full: 'Data Management Lock',
    description: 'Data Management has locked this CRF — no further edits.',
  },
};
import { cn } from '@/lib/utils';

interface SubjectEcrfTrackingPanelProps {
  studyId: string;
  subjectId: string;
  templateVersionId: string | null;
  templateSyncedAt: string | null;
  initialVisits: SubjectVisitWithCrfs[];
  disabled?: boolean;
  disabledTooltip?: string;
  /** Called after a successful resync so the parent can refresh its data. */
  onMutated?: () => void;
}

type BulkActionKind =
  | { kind: 'setMetric'; metric: SubjectCrfMetricKey; value: boolean }
  | { kind: 'setQuery'; value: SubjectCrfQueryStatus };

interface PendingBulkAction {
  visitId: string;
  visitName: string;
  action: BulkActionKind;
  description: string;
}

// SDV/Lock-implies-DE cascade — applied client-side so the optimistic UI
// stays in sync with the server RPC's behaviour.
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

function PctBadge({
  value,
  capped,
}: {
  value: number | null;
  capped?: boolean;
}) {
  if (value === null) {
    return (
      <Badge variant="outline" className="font-mono text-[10px]">
        —
      </Badge>
    );
  }
  const variant = value >= 100 ? 'success' : value >= 50 ? 'info' : 'secondary';
  return (
    <Badge variant={variant} className="font-mono text-[10px] gap-1">
      {value}%
      {capped && (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex" />}>
            <AlertCircle className="size-3" />
          </TooltipTrigger>
          <TooltipContent>
            Capped at 99% — open or answered query in this scope.
          </TooltipContent>
        </Tooltip>
      )}
    </Badge>
  );
}

function PercentageStrip({
  totals,
  label,
}: {
  totals: SubjectCrfPercentages;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {label && <span className="font-medium uppercase tracking-wide">{label}</span>}
      <div className="flex items-center gap-1">
        <span>Data Entry (DE)</span>
        <PctBadge value={totals.dataEntryPct} />
      </div>
      <div className="flex items-center gap-1">
        <span>Source Data Verified (SDV)</span>
        <PctBadge value={totals.sdvPct} capped={totals.hasUnresolvedQuery && totals.sdvPct === 99} />
      </div>
      <div className="flex items-center gap-1">
        <span>Data Management Lock (Lock)</span>
        <PctBadge value={totals.lockPct} capped={totals.hasUnresolvedQuery && totals.lockPct === 99} />
      </div>
      <span className="text-muted-foreground/70">
        ({totals.dataEntryTotal}/{totals.dataExpectedTotal} CRFs entered)
      </span>
      {totals.openQueryCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-red-500">
          Open: {totals.openQueryCount}
        </span>
      )}
      {totals.answeredQueryCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-2 py-0.5 text-[11px] font-medium text-yellow-950 dark:bg-yellow-300">
          Answered: {totals.answeredQueryCount}
        </span>
      )}
    </div>
  );
}

export function SubjectEcrfTrackingPanel({
  studyId,
  subjectId,
  templateVersionId,
  templateSyncedAt,
  initialVisits,
  disabled,
  disabledTooltip,
  onMutated,
}: SubjectEcrfTrackingPanelProps) {
  const [visits, setVisits] = useState<SubjectVisitWithCrfs[]>(initialVisits);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(
    () => new Set(initialVisits.map((v) => v.id)),
  );
  const [pendingRows, setPendingRows] = useState<Set<string>>(new Set());
  const [pendingVisits, setPendingVisits] = useState<Set<string>>(new Set());
  const [isResyncing, startResync] = useTransition();
  const [pendingBulk, setPendingBulk] = useState<PendingBulkAction | null>(null);
  const [historyCrf, setHistoryCrf] = useState<SubjectCrf | null>(null);

  const allCrfs = useMemo(() => visits.flatMap((v) => v.crfs), [visits]);
  const overall = useMemo(() => computeSubjectCrfPercentages(allCrfs), [allCrfs]);

  const toggleVisit = useCallback((visitId: string) => {
    setExpandedVisits((prev) => {
      const next = new Set(prev);
      if (next.has(visitId)) next.delete(visitId);
      else next.add(visitId);
      return next;
    });
  }, []);

  const markPending = useCallback((id: string, on: boolean) => {
    setPendingRows((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Optimistic patch: apply a partial update to a single CRF row in local state.
  const patchRow = useCallback(
    (crfId: string, patch: Partial<SubjectCrf>) => {
      setVisits((prev) =>
        prev.map((v) => ({
          ...v,
          crfs: v.crfs.map((c) => (c.id === crfId ? { ...c, ...patch } : c)),
        })),
      );
    },
    [],
  );

  const findCrf = useCallback(
    (crfId: string): SubjectCrf | undefined => {
      for (const v of visits) {
        const found = v.crfs.find((c) => c.id === crfId);
        if (found) return found;
      }
      return undefined;
    },
    [visits],
  );

  const handleMetricToggle = useCallback(
    async (crfId: string, metric: SubjectCrfMetricKey, value: boolean) => {
      const current = findCrf(crfId);
      if (!current) return;
      const cascade = applyCascade(current, metric, value);
      const previous: Partial<SubjectCrf> = {};
      for (const k of Object.keys(cascade) as Array<keyof SubjectCrf>) {
        // @ts-expect-error keyof bounce
        previous[k] = current[k];
      }

      patchRow(crfId, cascade);
      markPending(crfId, true);

      try {
        const { error } = await setSubjectCrfMetric({
          subjectCrfId: crfId,
          metric,
          value,
        });
        if (error) {
          patchRow(crfId, previous);
          toast.error(error);
        }
      } finally {
        markPending(crfId, false);
      }
    },
    [findCrf, markPending, patchRow],
  );

  const handleQueryChange = useCallback(
    async (crfId: string, value: SubjectCrfQueryStatus) => {
      const current = findCrf(crfId);
      if (!current) return;
      const previous = current.query_status;

      patchRow(crfId, { query_status: value });
      markPending(crfId, true);

      try {
        const { error } = await setSubjectCrfQueryStatus({
          subjectCrfId: crfId,
          value,
        });
        if (error) {
          patchRow(crfId, { query_status: previous });
          toast.error(error);
        }
      } finally {
        markPending(crfId, false);
      }
    },
    [findCrf, markPending, patchRow],
  );

  const handleResync = useCallback(() => {
    startResync(async () => {
      const { error, visitsAdded, crfsAdded } = await resyncSubjectEcrf(subjectId);
      if (error) {
        toast.error(error);
        return;
      }
      const v = visitsAdded ?? 0;
      const c = crfsAdded ?? 0;
      if (v === 0 && c === 0) {
        toast.success('Already in sync with the live template.');
      } else {
        toast.success(`Added ${v} visit${v === 1 ? '' : 's'} and ${c} CRF${c === 1 ? '' : 's'}.`);
      }
      onMutated?.();
    });
  }, [onMutated, subjectId, startResync]);

  const markVisitPending = useCallback((visitId: string, on: boolean) => {
    setPendingVisits((prev) => {
      const next = new Set(prev);
      if (on) next.add(visitId);
      else next.delete(visitId);
      return next;
    });
  }, []);

  // Apply a bulk action to every CRF in a visit. Optimistic on the panel; the
  // server-side `bulkSetSubjectCrfMetrics` runs the same per-row RPC so the
  // SDV/Lock-implies-DE cascade and audit log behave identically to single
  // toggles.
  const runBulkAction = useCallback(
    async (visit: SubjectVisitWithCrfs, action: BulkActionKind) => {
      const ids = visit.crfs.map((c) => c.id);
      if (ids.length === 0) return;

      const previousById = new Map<string, SubjectCrf>(
        visit.crfs.map((c) => [c.id, { ...c }]),
      );

      const patch: Partial<SubjectCrf> = {};
      if (action.kind === 'setMetric') {
        patch[action.metric] = action.value;
        if (
          action.value &&
          (action.metric === 'source_data_verified' ||
            action.metric === 'data_management_lock')
        ) {
          patch.data_entry = true;
        }
      } else {
        patch.query_status = action.value;
      }

      setVisits((prev) =>
        prev.map((v) =>
          v.id === visit.id
            ? { ...v, crfs: v.crfs.map((c) => ({ ...c, ...patch })) }
            : v,
        ),
      );
      markVisitPending(visit.id, true);

      try {
        const apiPatch =
          action.kind === 'setMetric'
            ? action.value &&
              (action.metric === 'source_data_verified' ||
                action.metric === 'data_management_lock')
              ? { [action.metric]: action.value, data_entry: true }
              : { [action.metric]: action.value }
            : { query_status: action.value };

        const { error, succeeded } = await bulkSetSubjectCrfMetrics({
          subjectCrfIds: ids,
          patch: apiPatch,
        });
        if (error) {
          setVisits((prev) =>
            prev.map((v) =>
              v.id === visit.id
                ? {
                    ...v,
                    crfs: v.crfs.map((c) => previousById.get(c.id) ?? c),
                  }
                : v,
            ),
          );
          toast.error(`${error} (${succeeded}/${ids.length} applied)`);
        } else {
          toast.success(
            `Updated ${succeeded} CRF${succeeded === 1 ? '' : 's'} in ${visit.visit_name}.`,
          );
        }
      } finally {
        markVisitPending(visit.id, false);
      }
    },
    [markVisitPending],
  );

  const requestBulkAction = useCallback(
    (visit: SubjectVisitWithCrfs, action: BulkActionKind, description: string) => {
      const isDestructive =
        action.kind === 'setMetric' && action.value === false;
      if (isDestructive) {
        setPendingBulk({
          visitId: visit.id,
          visitName: visit.visit_name,
          action,
          description,
        });
      } else {
        void runBulkAction(visit, action);
      }
    },
    [runBulkAction],
  );

  const confirmBulkAction = useCallback(() => {
    if (!pendingBulk) return;
    const visit = visits.find((v) => v.id === pendingBulk.visitId);
    if (visit) void runBulkAction(visit, pendingBulk.action);
    setPendingBulk(null);
  }, [pendingBulk, runBulkAction, visits]);

  // Empty state: subject has no snapshotted template (e.g. created before this
  // feature shipped, or study has no live template yet).
  if (visits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>eCRF Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No eCRF template has been snapshotted onto this subject yet. This
            usually means the subject was created before a live template was
            published, or this subject pre-dates the eCRF Tracking feature.
          </p>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResync}
                  disabled={disabled || isResyncing}
                />
              }
            >
              <RefreshCcw className={cn('mr-1 h-3.5 w-3.5', isResyncing && 'animate-spin')} />
              {isResyncing ? 'Syncing…' : 'Sync from live template'}
            </TooltipTrigger>
            {disabled && disabledTooltip && (
              <TooltipContent>{disabledTooltip}</TooltipContent>
            )}
          </Tooltip>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            eCRF Tracking
            {templateVersionId && (
              <Badge variant="outline" className="text-[10px]">
                Snapshot
              </Badge>
            )}
          </CardTitle>
          <PercentageStrip totals={overall} label="Overall" />
          {templateSyncedAt && (
            <p className="text-[11px] text-muted-foreground">
              Last template sync: {new Date(templateSyncedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/studies/${studyId}/subjects/${subjectId}/ecrf/export`}
              download
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Export CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/studies/${studyId}/subjects/${subjectId}/ecrf/print`}
              target="_blank"
              rel="noreferrer"
            >
              <FileText className="mr-1 h-3.5 w-3.5" />
              Export PDF
            </a>
          </Button>
          <div className="flex flex-col items-end gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResync}
                    disabled={disabled || isResyncing}
                  />
                }
              >
                <RefreshCcw className={cn('mr-1 h-3.5 w-3.5', isResyncing && 'animate-spin')} />
                {isResyncing ? 'Syncing…' : 'Resync to latest live template'}
              </TooltipTrigger>
              {disabled && disabledTooltip ? (
                <TooltipContent>{disabledTooltip}</TooltipContent>
              ) : (
                <TooltipContent className="max-w-xs text-xs">
                  Subjects are auto-synced when a new template version is
                  published. Use this only if a single subject got out of sync.
                </TooltipContent>
              )}
            </Tooltip>
            <p className="text-[11px] text-muted-foreground">
              Auto-syncs on publish. Use only for recovery.
            </p>
          </div>
        </div>
      </CardHeader>

      <AlertDialog
        open={pendingBulk !== null}
        onOpenChange={(open) => {
          if (!open) setPendingBulk(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm bulk update</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulk
                ? `${pendingBulk.description} for ${pendingBulk.visitName}? This affects every CRF in the visit and is recorded in the audit log.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingBulk(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SubjectCrfHistorySheet
        open={historyCrf !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryCrf(null);
        }}
        subjectCrf={historyCrf}
      />

      <CardContent className="space-y-3">
        {visits.map((visit) => {
          const visitTotals = computeSubjectCrfPercentages(visit.crfs);
          const expanded = expandedVisits.has(visit.id);
          const visitPending = pendingVisits.has(visit.id);
          return (
            <div key={visit.id} className="rounded-md border">
              <div className="flex w-full items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40">
                <button
                  type="button"
                  onClick={() => toggleVisit(visit.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="truncate text-sm font-medium">{visit.visit_name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({visit.crfs.length} CRF{visit.crfs.length === 1 ? '' : 's'})
                  </span>
                </button>
                <div className="flex items-center gap-3">
                  <PercentageStrip totals={visitTotals} />
                  <VisitBulkMenu
                    visit={visit}
                    disabled={Boolean(disabled) || visitPending || visit.crfs.length === 0}
                    disabledTooltip={disabledTooltip}
                    onAction={requestBulkAction}
                  />
                </div>
              </div>

              {expanded && (
                <div className="overflow-x-auto border-t">
                  {visit.crfs.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground">
                      No CRFs snapshotted for this visit.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">CRF</TableHead>
                          <Tooltip>
                            <TooltipTrigger
                              render={<TableHead className="text-center" />}
                            >
                              Expected
                            </TooltipTrigger>
                            <TooltipContent>
                              Expected data points for this CRF (auto = 1 per CRF).
                            </TooltipContent>
                          </Tooltip>
                          {SUBJECT_CRF_METRICS.map((m) => {
                            const details = METRIC_HEADER_DETAILS[m];
                            return (
                              <Tooltip key={m}>
                                <TooltipTrigger
                                  render={<TableHead className="text-center text-[11px]" />}
                                >
                                  {SUBJECT_CRF_METRIC_SHORT_LABELS[m]}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <span className="font-medium">{details.full}</span>
                                  <span className="block text-muted-foreground">
                                    {details.description}
                                  </span>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                          <Tooltip>
                            <TooltipTrigger
                              render={<TableHead className="text-center" />}
                            >
                              Query
                            </TooltipTrigger>
                            <TooltipContent>
                              <span className="font-medium">Query Status</span>
                              <span className="block text-muted-foreground">
                                Open or Answered queries cap SDV% and Lock% at 99%.
                              </span>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={<TableHead className="text-center" />}
                            >
                              DE%
                            </TooltipTrigger>
                            <TooltipContent>
                              Data Entry %&nbsp;= Data Entry / Expected.
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={<TableHead className="text-center" />}
                            >
                              SDV%
                            </TooltipTrigger>
                            <TooltipContent>
                              Source Data Verified %&nbsp;= SDV / Data Entry. Capped at 99% with an open / answered query.
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={<TableHead className="text-center" />}
                            >
                              Lock%
                            </TooltipTrigger>
                            <TooltipContent>
                              Data Management Lock %&nbsp;= Lock / Data Entry. Capped at 99% with an open / answered query.
                            </TooltipContent>
                          </Tooltip>
                          <TableHead className="w-[40px] text-center">
                            <span className="sr-only">History</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visit.crfs.map((crf) => {
                          const rowTotals = computeSubjectCrfPercentages([crf]);
                          const pending = pendingRows.has(crf.id);
                          return (
                            <TableRow
                              key={crf.id}
                              className={cn(pending && 'opacity-70')}
                            >
                              <TableCell className="font-medium">{crf.crf_name}</TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">
                                {crf.data_expected}
                              </TableCell>
                              {SUBJECT_CRF_METRICS.map((m) => {
                                const checked = crf[m];
                                return (
                                  <TableCell key={m} className="text-center">
                                    <Checkbox
                                      checked={checked}
                                      disabled={disabled || pending}
                                      onCheckedChange={(next) =>
                                        handleMetricToggle(crf.id, m, next === true)
                                      }
                                      aria-label={`${SUBJECT_CRF_METRIC_SHORT_LABELS[m]} for ${crf.crf_name}`}
                                    />
                                  </TableCell>
                                );
                              })}
                              <TableCell className="text-center">
                                <ToggleGroup
                                  value={[crf.query_status]}
                                  onValueChange={(values) => {
                                    const next = (values[0] ?? 'none') as SubjectCrfQueryStatus;
                                    if (next === crf.query_status) return;
                                    handleQueryChange(crf.id, next);
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="mx-auto"
                                  disabled={disabled || pending}
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
                              <TableCell className="text-center">
                                <PctBadge value={rowTotals.dataEntryPct} />
                              </TableCell>
                              <TableCell className="text-center">
                                <PctBadge
                                  value={rowTotals.sdvPct}
                                  capped={rowTotals.hasUnresolvedQuery && rowTotals.sdvPct === 99}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <PctBadge
                                  value={rowTotals.lockPct}
                                  capped={rowTotals.hasUnresolvedQuery && rowTotals.lockPct === 99}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setHistoryCrf(crf)}
                                        aria-label={`View history for ${crf.crf_name}`}
                                      />
                                    }
                                  >
                                    <History className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>Change history</TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Per-visit bulk-actions dropdown. Each "Mark all" item is enabled only when
 * at least one CRF in the visit doesn't already have that metric set; clears
 * are enabled only when at least one row currently has the metric set. This
 * keeps the menu honest about what each click would actually change.
 */
function VisitBulkMenu({
  visit,
  disabled,
  disabledTooltip,
  onAction,
}: {
  visit: SubjectVisitWithCrfs;
  disabled: boolean;
  disabledTooltip?: string;
  onAction: (
    visit: SubjectVisitWithCrfs,
    action: BulkActionKind,
    description: string,
  ) => void;
}) {
  const setEnabled = (m: SubjectCrfMetricKey) => visit.crfs.some((c) => !c[m]);
  const clearEnabled = (m: SubjectCrfMetricKey) => visit.crfs.some((c) => c[m]);

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2"
      disabled={disabled}
      aria-label={`Bulk actions for ${visit.visit_name}`}
    >
      Bulk
      <MoreHorizontal className="h-3.5 w-3.5" />
    </Button>
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mark all in this visit</DropdownMenuLabel>
          {SUBJECT_CRF_METRICS.map((m) => (
            <DropdownMenuItem
              key={`set-${m}`}
              disabled={!setEnabled(m)}
              onClick={() =>
                onAction(
                  visit,
                  { kind: 'setMetric', metric: m, value: true },
                  `Mark all ${SUBJECT_CRF_METRIC_SHORT_LABELS[m]}`,
                )
              }
            >
              Mark all {SUBJECT_CRF_METRIC_SHORT_LABELS[m]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Set query for this visit</DropdownMenuLabel>
          {SUBJECT_CRF_QUERY_STATUSES.map((s) => (
            <DropdownMenuItem
              key={`q-${s}`}
              onClick={() =>
                onAction(
                  visit,
                  { kind: 'setQuery', value: s },
                  `Set query to ${SUBJECT_CRF_QUERY_STATUS_LABELS[s]}`,
                )
              }
            >
              {SUBJECT_CRF_QUERY_STATUS_LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Clear (uncheck) for this visit</DropdownMenuLabel>
          {SUBJECT_CRF_METRICS.map((m) => (
            <DropdownMenuItem
              key={`clear-${m}`}
              disabled={!clearEnabled(m)}
              className="text-destructive"
              onClick={() =>
                onAction(
                  visit,
                  { kind: 'setMetric', metric: m, value: false },
                  `Clear all ${SUBJECT_CRF_METRIC_SHORT_LABELS[m]}`,
                )
              }
            >
              Clear all {SUBJECT_CRF_METRIC_SHORT_LABELS[m]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (disabled && disabledTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          {menu}
        </TooltipTrigger>
        <TooltipContent>{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return menu;
}
