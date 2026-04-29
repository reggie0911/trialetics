'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { RefObject } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Download,
  MoreHorizontal,
  Pencil,
  Printer,
  RotateCcw,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  VISIT_ANCHOR_OPTIONS,
  WINDOW_STATUS_FILTER_OPTIONS,
  type SubjectVisit,
  type VisitAnchorKind,
  type VisitStatus,
  type WindowStatus,
  type WindowStatusMeta,
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
  /**
   * Study's live eCRF template_version_id. Visits whose snapshot
   * `template_version_id` does not match are hidden from the panel so a
   * single template version is shown at a time. When null (no live
   * version yet), all rows fall back to visible to avoid a blank panel.
   */
  liveTemplateVersionId: string | null;
  /** When true, schedule edits, timing patches, and anchor changes are disabled. */
  readOnly?: boolean;
  readOnlyTooltip?: string;
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
  liveTemplateVersionId,
  readOnly = false,
  readOnlyTooltip = 'This subject is deactivated. Restore the subject to make changes.',
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

  // Show only the visits whose snapshot version matches the study's live
  // eCRF template version. When no live version exists, fall back to the
  // full set so a publish-pending study doesn't render a blank panel.
  const scopedVisits = useMemo(() => {
    if (!liveTemplateVersionId) return visits;
    return visits.filter(
      (v) => v.template_version_id === liveTemplateVersionId,
    );
  }, [visits, liveTemplateVersionId]);

  const filteredVisits = useMemo(() => {
    if (filter === 'all') return scopedVisits;
    return scopedVisits.filter(
      (v) => computeVisitWindowStatus(v, today).kind === filter,
    );
  }, [scopedVisits, filter, today]);

  const completedCount = scopedVisits.filter(
    (v) => v.status === 'completed',
  ).length;
  const showTimepointColumn = useMemo(
    () =>
      scopedVisits.some(
        (v) => v.timepoint_days !== null && v.timepoint_days !== undefined,
      ),
    [scopedVisits],
  );

  const persistPatch = useCallback(
    async (visit: SubjectVisit, patch: SubjectVisitTimingPatch) => {
      if (readOnly) {
        toast.error(readOnlyTooltip);
        return false;
      }
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
    [visits, subjectId, refreshVisits, readOnly, readOnlyTooltip],
  );

  const handleActualSave = useCallback(
    async (visit: SubjectVisit, nextActual: string | null) => {
      if (readOnly) {
        toast.error(readOnlyTooltip);
        return false;
      }
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
    [persistPatch, today, readOnly, readOnlyTooltip],
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

  const scheduleActionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);

  const handleRecompute = useCallback(async () => {
    if (readOnly) {
      toast.error(readOnlyTooltip);
      return;
    }
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
  }, [anchorDate, subjectId, refreshVisits, readOnly, readOnlyTooltip]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium">Visit Schedule</h3>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {scopedVisits.length} visits completed.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">Anchor:</span>
            <span className="text-muted-foreground">{anchorLabel}</span>
            <span className="font-medium text-foreground">
              {formatPlanDate(anchorDate)}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
            <Label
              className="text-xs text-muted-foreground"
              htmlFor="visit-window-filter"
            >
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button asChild type="button" variant="outline" size="sm" className="gap-1.5">
                  <button
                    type="button"
                    ref={scheduleActionsTriggerRef}
                    aria-label="Schedule actions"
                    disabled={readOnly}
                    title={readOnly ? readOnlyTooltip : undefined}
                  >
                    <span>Actions</span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  </button>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuItem
                  disabled={readOnly}
                  onSelect={() => {
                    setTimeout(() => setAnchorEditorOpen(true), 0);
                  }}
                >
                  <Calendar className="size-4" />
                  Change anchor
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={readOnly || !anchorDate}
                  onSelect={() => {
                    void handleRecompute();
                  }}
                >
                  <RotateCcw className="size-4" />
                  Recompute scheduled
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={
                    <a
                      className="cursor-pointer"
                      href={`/api/studies/${studyId}/subjects/${subjectId}/visits/export`}
                      download
                    />
                  }
                >
                  <Download className="size-4" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <a
                      className="cursor-pointer"
                      href={`/api/studies/${studyId}/subjects/${subjectId}/visits/print`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  <Printer className="size-4" />
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {!readOnly && (
          <AnchorEditorPopover
            open={anchorEditorOpen}
            onOpenChange={setAnchorEditorOpen}
            positionAnchor={scheduleActionsTriggerRef}
            subjectId={subjectId}
            anchorKind={anchorKind}
            anchorDate={anchorDate}
            onSaved={refreshVisits}
          />
        )}

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

      {scopedVisits.length === 0 ? (
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
                {showTimepointColumn && (
                  <TableHead className="text-xs">Timepoint (Days)</TableHead>
                )}
                <TableHead className="text-xs">Planned</TableHead>
                <TableHead className="text-xs">Actual</TableHead>
                <TableHead className="text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex cursor-help items-center gap-1 border-b border-dashed border-muted-foreground/40" />
                        }
                      >
                        Status
                      </TooltipTrigger>
                      <TooltipContent>
                        Combines schedule (planned vs today) with lifecycle.
                        Setting a row to Completed, Missed, or Skipped takes
                        over and shows that lifecycle as the primary state.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex cursor-help items-center gap-1 border-b border-dashed border-muted-foreground/40" />
                        }
                      >
                        Window Start
                      </TooltipTrigger>
                      <TooltipContent>
                        Earliest in-window date. Suffix shows the protocol
                        offset before planned.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex cursor-help items-center gap-1 border-b border-dashed border-muted-foreground/40" />
                        }
                      >
                        Window End
                      </TooltipTrigger>
                      <TooltipContent>
                        Latest in-window date. Suffix shows the protocol
                        offset after planned.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-xs">Notes</TableHead>
                <TableHead className="text-xs w-[40px] text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVisits.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  today={today}
                  showTimepointColumn={showTimepointColumn}
                  readOnly={readOnly}
                  onPersist={persistPatch}
                  onActualSave={handleActualSave}
                />
              ))}
              {filteredVisits.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={showTimepointColumn ? 10 : 9}
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

/** Timepoint column: day offset from protocol only (no separate timepoint label). */
function renderTimepoint(visit: SubjectVisit): string {
  if (visit.timepoint_days === null || visit.timepoint_days === undefined) {
    return '--';
  }
  const sign = visit.timepoint_days > 0 ? '+' : '';
  return `Day ${sign}${visit.timepoint_days}`;
}

/**
 * Lifecycle chip metadata shown alongside the derived window state when the
 * row's status overrides the schedule (`completed`/`missed`/`skipped`).
 */
function lifecycleChipMeta(
  status: VisitStatus,
):
  | { label: string; variant: 'success' | 'destructive' | 'secondary' }
  | null {
  if (status === 'completed') return { label: 'Done', variant: 'success' };
  if (status === 'missed') return { label: 'Missed', variant: 'destructive' };
  if (status === 'skipped') return { label: 'Skipped', variant: 'secondary' };
  return null;
}

/**
 * Compute the derived window state ignoring the lifecycle takeover so the
 * State pill can keep showing the schedule-anchored bucket while a secondary
 * chip surfaces the lifecycle status.
 */
function computeBaseWindowMeta(
  visit: SubjectVisit,
  today: string,
): WindowStatusMeta {
  return computeVisitWindowStatus(
    { ...visit, status: 'scheduled' },
    today,
  );
}

interface VisitRowProps {
  visit: SubjectVisit;
  today: string;
  showTimepointColumn: boolean;
  readOnly: boolean;
  onPersist: (
    visit: SubjectVisit,
    patch: SubjectVisitTimingPatch,
  ) => Promise<boolean>;
  onActualSave: (
    visit: SubjectVisit,
    nextActual: string | null,
  ) => Promise<boolean>;
}

function VisitRow({
  visit,
  today,
  showTimepointColumn,
  readOnly,
  onPersist,
  onActualSave,
}: VisitRowProps) {
  const [actualOpen, setActualOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [windowOffsetsOpen, setWindowOffsetsOpen] = useState(false);

  const lifecycle = lifecycleChipMeta(visit.status);
  const baseMeta = lifecycle
    ? computeBaseWindowMeta(visit, today)
    : computeVisitWindowStatus(visit, today);

  // When lifecycle has taken over but no schedule is anchored, the base state
  // is "Pending" which adds noise; in that case keep the lifecycle chip as
  // the primary signal and skip the base pill.
  const showBaseAlongsideLifecycle =
    lifecycle !== null && baseMeta.kind !== 'pending';

  const before = visit.window_before_days ?? 0;
  const after = visit.window_after_days ?? 0;

  const setStatus = (next: VisitStatus) => {
    if (visit.status === next) return;
    void onPersist(visit, { status: next });
  };

  return (
    <TableRow>
      <TableCell className="text-xs font-medium">
        {visit.visit_number}
      </TableCell>
      <TableCell className="text-xs font-medium">{visit.visit_name}</TableCell>
      {showTimepointColumn && (
        <TableCell className="text-xs text-muted-foreground">
          {renderTimepoint(visit)}
        </TableCell>
      )}
      <TableCell className="text-xs text-muted-foreground">
        <DateEditorPopover
          label="Planned date"
          value={visit.planned_date}
          onSave={(next) => onPersist(visit, { planned_date: next })}
          readOnly={readOnly}
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <DateEditorPopover
          label="Actual date"
          value={visit.actual_date}
          onSave={(next) => onActualSave(visit, next)}
          open={actualOpen}
          onOpenChange={setActualOpen}
          readOnly={readOnly}
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1">
          {(!lifecycle || showBaseAlongsideLifecycle) && (
            <Badge variant={baseMeta.variant} className="text-[10px]">
              {baseMeta.label}
            </Badge>
          )}
          {lifecycle && (
            <Badge variant={lifecycle.variant} className="text-[10px]">
              {lifecycle.label}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {visit.window_start ? (
          <span>
            {formatPlanDate(visit.window_start)}
            {before > 0 && (
              <span className="text-muted-foreground">{` (−${before}d)`}</span>
            )}
          </span>
        ) : (
          '--'
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {visit.window_end ? (
          <span>
            {formatPlanDate(visit.window_end)}
            {after > 0 && (
              <span className="text-muted-foreground">{` (+${after}d)`}</span>
            )}
          </span>
        ) : (
          '--'
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <NotesEditorPopover
          value={visit.notes}
          onSave={(next) => onPersist(visit, { notes: next })}
          open={notesOpen}
          onOpenChange={setNotesOpen}
          readOnly={readOnly}
        />
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                aria-label="Row actions"
                disabled={readOnly}
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem
              onClick={() => setActualOpen(true)}
              disabled={readOnly}
            >
              Enter actual date…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setStatus('completed')}
              disabled={readOnly || visit.status === 'completed'}
            >
              Mark completed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatus('missed')}
              disabled={readOnly || visit.status === 'missed'}
            >
              Mark missed
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setStatus('skipped')}
              disabled={readOnly || visit.status === 'skipped'}
            >
              Skip visit
            </DropdownMenuItem>
            {visit.status !== 'scheduled' && (
              <DropdownMenuItem
                onClick={() => setStatus('scheduled')}
                disabled={readOnly}
              >
                Reset to scheduled
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setWindowOffsetsOpen(true)}
              disabled={readOnly}
            >
              Edit window ±…
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setNotesOpen(true)} disabled={readOnly}>
              Edit notes…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <WindowOffsetsEditorPopover
          before={before}
          after={after}
          open={windowOffsetsOpen}
          onOpenChange={setWindowOffsetsOpen}
          readOnly={readOnly}
          onSave={(nextBefore, nextAfter) =>
            onPersist(visit, {
              window_before_days: nextBefore,
              window_after_days: nextAfter,
            })
          }
        />
      </TableCell>
    </TableRow>
  );
}

interface DateEditorPopoverProps {
  label: string;
  value: string | null;
  onSave: (next: string | null) => Promise<boolean | void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  readOnly?: boolean;
}

function DateEditorPopover({
  label,
  value,
  onSave,
  open: controlledOpen,
  onOpenChange,
  readOnly = false,
}: DateEditorPopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(value ?? '');
    setOpen(next);
  };

  if (readOnly) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-xs', !value && 'text-muted-foreground italic')}
        title="Read-only"
      >
        {value ? formatPlanDate(value) : '--'}
      </span>
    );
  }

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

interface NotesEditorPopoverProps {
  value: string | null;
  onSave: (next: string | null) => Promise<boolean | void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  readOnly?: boolean;
}

function NotesEditorPopover({
  value,
  onSave,
  open: controlledOpen,
  onOpenChange,
  readOnly = false,
}: NotesEditorPopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  if (readOnly) {
    return (
      <span className="line-clamp-2 max-w-[12rem] text-xs text-muted-foreground" title={value ?? undefined}>
        {value?.trim() ? value : '—'}
      </span>
    );
  }

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

interface WindowOffsetsEditorPopoverProps {
  before: number;
  after: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    nextBefore: number,
    nextAfter: number,
  ) => Promise<boolean | void>;
  readOnly?: boolean;
}

function WindowOffsetsEditorPopover({
  before,
  after,
  open,
  onOpenChange,
  onSave,
  readOnly = false,
}: WindowOffsetsEditorPopoverProps) {
  const [draftBefore, setDraftBefore] = useState(String(before));
  const [draftAfter, setDraftAfter] = useState(String(after));
  const [saving, setSaving] = useState(false);

  if (readOnly) {
    return null;
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraftBefore(String(before));
      setDraftAfter(String(after));
    }
    onOpenChange(next);
  };

  const parse = (raw: string): number | null => {
    if (raw.trim() === '') return 0;
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
    return n;
  };

  const nextBefore = parse(draftBefore);
  const nextAfter = parse(draftAfter);
  const isValid = nextBefore !== null && nextAfter !== null;
  const isDirty =
    isValid && (nextBefore !== before || nextAfter !== after);

  const handleSave = async () => {
    if (!isValid) return;
    if (!isDirty) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(nextBefore!, nextAfter!);
    setSaving(false);
    if (ok !== false) onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        nativeButton={false}
        render={
          <span aria-hidden className="sr-only" tabIndex={-1} />
        }
      />
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        <div className="space-y-1">
          <Label className="text-xs">Window (relative to planned day)</Label>
          <p className="text-[11px] text-muted-foreground">
            Per-subject override. Both fields must be whole numbers ≥ 0.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              Days before
            </Label>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={draftBefore}
              onChange={(e) => setDraftBefore(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              Days after
            </Label>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={draftAfter}
              onChange={(e) => setDraftAfter(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
        {!isValid && (
          <p className="text-[11px] text-destructive">
            Enter whole numbers ≥ 0 for both fields.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValid || saving}
          >
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Element to align the popover to (e.g. the Schedule &quot;Actions&quot; control). */
  positionAnchor: RefObject<HTMLButtonElement | null>;
}

function AnchorEditorPopover({
  subjectId,
  anchorKind,
  anchorDate,
  onSaved,
  open,
  onOpenChange,
  positionAnchor,
}: AnchorEditorPopoverProps) {
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
    onOpenChange(next);
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
    onOpenChange(false);
    onSaved();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverContent
        className="w-72 space-y-3 p-3"
        anchor={positionAnchor}
        side="bottom"
        align="end"
        sideOffset={6}
      >
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
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
