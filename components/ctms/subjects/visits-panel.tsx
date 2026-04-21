'use client';

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  AlertTriangle,
  Download,
  Pencil,
  Printer,
  RotateCcw,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

import {
  VISIT_ANCHOR_OPTIONS,
  VISIT_STATUS_OPTIONS,
  WINDOW_STATUS_FILTER_OPTIONS,
  type SubjectVisit,
  type VisitAnchorKind,
  type VisitStatus,
  type WindowStatus,
} from '@/lib/types/ctms';
import {
  getSubjectById,
  recomputeSubjectVisitDates,
  setSubjectVisitAnchor,
  updateSubjectVisitTiming,
  type SubjectVisitTimingPatch,
} from '@/lib/actions/subjects';
import {
  computeVisitWindowStatus,
  daysOutOfWindow,
  formatPlanDate,
  localTodayIso,
} from '@/lib/utils/visit-window';
import { cn } from '@/lib/utils';

interface VisitsPanelProps {
  subjectId: string;
  studyId: string;
  initialVisits: SubjectVisit[];
  anchorKind: VisitAnchorKind;
  screeningDate: string | null;
  randomizationDate: string | null;
}

interface PendingDeviation {
  visit: SubjectVisit;
  pendingActual: string | null;
  daysOff: number;
  prefilledNote: string;
}

export function VisitsPanel({
  subjectId,
  studyId,
  initialVisits,
  anchorKind: initialAnchorKind,
  screeningDate: initialScreeningDate,
  randomizationDate: initialRandomizationDate,
}: VisitsPanelProps) {
  const [visits, setVisits] = useState(initialVisits);
  const [anchorKind, setAnchorKind] = useState<VisitAnchorKind>(initialAnchorKind);
  const [screeningDate, setScreeningDate] = useState<string | null>(initialScreeningDate);
  const [randomizationDate, setRandomizationDate] = useState<string | null>(
    initialRandomizationDate,
  );
  const [filter, setFilter] = useState<WindowStatus | 'all'>('all');
  const [, startTransition] = useTransition();
  const [pendingDeviation, setPendingDeviation] = useState<PendingDeviation | null>(null);
  const [deviationNote, setDeviationNote] = useState('');

  const today = localTodayIso();

  const anchorDate = anchorKind === 'screening' ? screeningDate : randomizationDate;
  const anchorLabel = anchorKind === 'screening' ? 'Screening Date' : 'Randomization Date';

  const refreshVisits = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getSubjectById(subjectId);
        if (data) {
          setVisits(data.subject_visits);
          setAnchorKind(data.visit_anchor_kind);
          setScreeningDate(data.screening_date);
          setRandomizationDate(data.randomization_date);
        }
      } catch {
        toast.error('Failed to refresh visits');
      }
    });
  }, [subjectId]);

  const filteredVisits = useMemo(() => {
    if (filter === 'all') return visits;
    return visits.filter(
      (v) => computeVisitWindowStatus(v, today).kind === filter,
    );
  }, [visits, filter, today]);

  const completedCount = visits.filter((v) => v.status === 'completed').length;

  const persistPatch = useCallback(
    async (visit: SubjectVisit, patch: SubjectVisitTimingPatch) => {
      const previous = visits;
      setVisits((rows) =>
        rows.map((r) => (r.id === visit.id ? { ...r, ...patch } as SubjectVisit : r)),
      );
      const { error } = await updateSubjectVisitTiming(visit.id, subjectId, patch);
      if (error) {
        setVisits(previous);
        toast.error(error);
        return false;
      }
      toast.success('Visit updated');
      refreshVisits();
      return true;
    },
    [visits, subjectId, refreshVisits],
  );

  const handleActualSave = useCallback(
    async (visit: SubjectVisit, nextActual: string | null) => {
      const candidate = { ...visit, actual_date: nextActual } as SubjectVisit;
      const meta = computeVisitWindowStatus(candidate, today);
      if (meta.kind === 'out_of_window') {
        const days = daysOutOfWindow(candidate);
        const direction = days < 0 ? 'before' : 'after';
        setDeviationNote(
          `Visit ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ${direction} window: `,
        );
        setPendingDeviation({
          visit,
          pendingActual: nextActual,
          daysOff: days,
          prefilledNote: '',
        });
        return false;
      }
      return persistPatch(visit, { actual_date: nextActual });
    },
    [persistPatch, today],
  );

  const confirmDeviationWithNote = useCallback(async () => {
    if (!pendingDeviation) return;
    const ok = await persistPatch(pendingDeviation.visit, {
      actual_date: pendingDeviation.pendingActual,
      notes: deviationNote.trim().length > 0 ? deviationNote : null,
    });
    if (ok) {
      setPendingDeviation(null);
      setDeviationNote('');
    }
  }, [pendingDeviation, deviationNote, persistPatch]);

  const confirmDeviationWithoutNote = useCallback(async () => {
    if (!pendingDeviation) return;
    const ok = await persistPatch(pendingDeviation.visit, {
      actual_date: pendingDeviation.pendingActual,
    });
    if (ok) {
      setPendingDeviation(null);
      setDeviationNote('');
    }
  }, [pendingDeviation, persistPatch]);

  const handleRecompute = useCallback(async () => {
    if (!anchorDate) {
      toast.error('Set the anchor date before recomputing.');
      return;
    }
    const { error, updated } = await recomputeSubjectVisitDates(subjectId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(
      updated > 0
        ? `Recomputed ${updated} scheduled visit${updated === 1 ? '' : 's'}.`
        : 'No scheduled visits to recompute.',
    );
    refreshVisits();
  }, [anchorDate, subjectId, refreshVisits]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium">Visit Schedule</h3>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {visits.length} visits completed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">Anchor:</span>
          <span className="text-muted-foreground">{anchorLabel}</span>
          <span className="font-medium text-foreground">{formatPlanDate(anchorDate)}</span>
          <AnchorEditorPopover
            subjectId={subjectId}
            anchorKind={anchorKind}
            anchorDate={anchorDate}
            onSaved={refreshVisits}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecompute}
            disabled={!anchorDate}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Recompute scheduled
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Label className="text-xs text-muted-foreground" htmlFor="visit-window-filter">
              Filter
            </Label>
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as WindowStatus | 'all')}
            >
              <SelectTrigger id="visit-window-filter" className="h-8 w-[170px] text-xs">
                <SelectValue
                  getDisplayLabel={(v) =>
                    WINDOW_STATUS_FILTER_OPTIONS.find((o) => o.value === v)?.label ?? v
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_STATUS_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/studies/${studyId}/subjects/${subjectId}/visits/export`}
                download
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                Export CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/studies/${studyId}/subjects/${subjectId}/visits/print`}
                target="_blank"
                rel="noreferrer"
              >
                <Printer className="mr-1 h-3.5 w-3.5" />
                Export PDF
              </a>
            </Button>
          </div>
        </div>

        {!anchorDate && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Set the {anchorLabel.toLowerCase()} to auto-fill planned dates and
              window ranges for every scheduled visit.
            </span>
          </div>
        )}
      </div>

      {visits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm font-medium text-muted-foreground">
              No visits to display
            </p>
            <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
              This subject has no visits. Either the study&apos;s eCRF template
              has no visits, or this subject was created before eCRF tracking.
              Resync the template from the eCRF Tracking tab to populate.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[50px]">#</TableHead>
                <TableHead className="text-xs">Visit</TableHead>
                <TableHead className="text-xs">Timepoint</TableHead>
                <TableHead className="text-xs">Planned</TableHead>
                <TableHead className="text-xs">Actual</TableHead>
                <TableHead className="text-xs">Window</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisits.map((visit) => {
                const meta = computeVisitWindowStatus(visit, today);
                return (
                  <TableRow key={visit.id}>
                    <TableCell className="text-xs font-medium">
                      {visit.visit_number}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {visit.visit_name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {renderTimepoint(visit)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <DateEditorPopover
                        label="Planned date"
                        value={visit.planned_date}
                        onSave={(next) =>
                          persistPatch(visit, { planned_date: next })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <DateEditorPopover
                        label="Actual date"
                        value={visit.actual_date}
                        onSave={(next) => handleActualSave(visit, next)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <span>
                          {visit.window_start && visit.window_end
                            ? `${formatPlanDate(visit.window_start)} – ${formatPlanDate(visit.window_end)}`
                            : '--'}
                        </span>
                        <Badge variant={meta.variant} className="text-[10px]">
                          {meta.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusEditorPopover
                        value={visit.status}
                        onSave={(next) => persistPatch(visit, { status: next })}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <NotesEditorPopover
                        value={visit.notes}
                        onSave={(next) => persistPatch(visit, { notes: next })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredVisits.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-xs text-muted-foreground"
                  >
                    No visits match this filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={pendingDeviation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeviation(null);
            setDeviationNote('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Out of window</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeviation
                ? `Visit ${Math.abs(pendingDeviation.daysOff)} day${Math.abs(pendingDeviation.daysOff) === 1 ? '' : 's'} ${pendingDeviation.daysOff < 0 ? 'before' : 'after'} the protocol window. Add a deviation note (recommended) or save without one.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deviation-note" className="text-xs">
              Deviation note
            </Label>
            <Textarea
              id="deviation-note"
              rows={3}
              value={deviationNote}
              onChange={(e) => setDeviationNote(e.target.value)}
              placeholder="Reason for the protocol deviation..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={confirmDeviationWithoutNote}>
              Save without note
            </Button>
            <AlertDialogAction onClick={confirmDeviationWithNote}>
              Save with note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Cell editors ────────────────────────────────────────────────────────────

function renderTimepoint(visit: SubjectVisit): string {
  const parts: string[] = [];
  if (visit.timepoint_label) parts.push(visit.timepoint_label);
  if (visit.timepoint_days !== null) {
    const sign = visit.timepoint_days > 0 ? '+' : '';
    parts.push(`Day ${sign}${visit.timepoint_days}`);
  }
  return parts.length > 0 ? parts.join(' · ') : '--';
}

interface DateEditorPopoverProps {
  label: string;
  value: string | null;
  onSave: (next: string | null) => Promise<boolean | void>;
}

function DateEditorPopover({ label, value, onSave }: DateEditorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(value ?? '');
    setOpen(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const next = draft.trim().length > 0 ? draft : null;
    if (next === (value ?? null)) {
      setOpen(false);
      setSaving(false);
      return;
    }
    const ok = await onSave(next);
    setSaving(false);
    if (ok !== false) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-muted',
              !value && 'text-muted-foreground italic',
            )}
          />
        }
      >
        <span>{value ? formatPlanDate(value) : '--'}</span>
        <Pencil className="h-3 w-3 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3 p-3">
        <Label className="text-xs">{label}</Label>
        <Input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-3 w-3" />
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface StatusEditorPopoverProps {
  value: VisitStatus;
  onSave: (next: VisitStatus) => Promise<boolean | void>;
}

function StatusEditorPopover({ value, onSave }: StatusEditorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<VisitStatus>(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (draft === value) {
      setOpen(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok !== false) setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value);
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted"
          />
        }
      >
        <StatusBadge status={value} className="text-xs" />
        <Pencil className="h-3 w-3 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-56 space-y-3 p-3">
        <Label className="text-xs">Visit status</Label>
        <Select
          value={draft}
          onValueChange={(v) => setDraft(v as VisitStatus)}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue
              getDisplayLabel={(v) =>
                VISIT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v
              }
            />
          </SelectTrigger>
          <SelectContent>
            {VISIT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface NotesEditorPopoverProps {
  value: string | null;
  onSave: (next: string | null) => Promise<boolean | void>;
}

function NotesEditorPopover({ value, onSave }: NotesEditorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const next = draft.trim().length > 0 ? draft : null;
    if (next === (value ?? null)) {
      setOpen(false);
      setSaving(false);
      return;
    }
    const ok = await onSave(next);
    setSaving(false);
    if (ok !== false) setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(value ?? '');
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              'inline-flex max-w-[180px] items-center gap-1 rounded px-1 py-0.5 hover:bg-muted',
              !value && 'text-muted-foreground italic',
            )}
          />
        }
      >
        <span className="truncate">{value || 'Add note'}</span>
        <Pencil className="h-3 w-3 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-3">
        <Label className="text-xs">Notes</Label>
        <Textarea
          rows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Visit notes..."
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-3 w-3" />
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface AnchorEditorPopoverProps {
  subjectId: string;
  anchorKind: VisitAnchorKind;
  anchorDate: string | null;
  onSaved: () => void;
}

function AnchorEditorPopover({
  subjectId,
  anchorKind,
  anchorDate,
  onSaved,
}: AnchorEditorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draftKind, setDraftKind] = useState<VisitAnchorKind>(anchorKind);
  const [draftDate, setDraftDate] = useState<string>(anchorDate ?? '');
  const [recompute, setRecompute] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraftKind(anchorKind);
      setDraftDate(anchorDate ?? '');
      setRecompute(true);
    }
    setOpen(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const cleanDate = draftDate.trim().length > 0 ? draftDate : null;
    const { error, updated } = await setSubjectVisitAnchor(
      subjectId,
      draftKind,
      cleanDate,
      recompute,
    );
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (recompute && updated > 0) {
      toast.success(`Anchor updated; ${updated} scheduled visit${updated === 1 ? '' : 's'} recomputed.`);
    } else {
      toast.success('Anchor updated.');
    }
    setOpen(false);
    onSaved();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-7 text-xs" />
        }
      >
        Change anchor
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3 p-3">
        <div className="space-y-2">
          <Label className="text-xs">Anchor kind</Label>
          <Select
            value={draftKind}
            onValueChange={(v) => setDraftKind(v as VisitAnchorKind)}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue
                getDisplayLabel={(v) =>
                  VISIT_ANCHOR_OPTIONS.find((o) => o.value === v)?.label ?? v
                }
              />
            </SelectTrigger>
            <SelectContent>
              {VISIT_ANCHOR_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Anchor date</Label>
          <Input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={recompute}
            onChange={(e) => setRecompute(e.target.checked)}
          />
          Recompute scheduled visits after save
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-3 w-3" />
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
