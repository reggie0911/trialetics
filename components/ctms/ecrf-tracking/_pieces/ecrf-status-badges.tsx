'use client';

import { Badge } from '@/components/ui/badge';
import {
  ECRF_DATA_STATUS_LABELS,
  ECRF_VISIT_DUE_STATUS_LABELS,
  type EcrfVisitDueStatus,
} from '@/lib/parsers/ecrf-tracking-extras';
import type { EcrfDataStatus } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

type Tone = 'critical' | 'warn' | 'info' | 'success' | 'muted';

const TONE_TO_BADGE: Record<Tone, 'destructive' | 'warning' | 'info' | 'success' | 'secondary'> = {
  critical: 'destructive',
  warn: 'warning',
  info: 'info',
  success: 'success',
  muted: 'secondary',
};

const TONE_DOT_CLASS: Record<Tone, string> = {
  critical: 'bg-red-500',
  warn: 'bg-amber-500',
  info: 'bg-blue-500',
  success: 'bg-green-500',
  muted: 'bg-muted-foreground/40',
};

const DATA_STATUS_TONE: Record<EcrfDataStatus, Tone> = {
  not_started: 'muted',
  no_data: 'critical',
  partial_data: 'warn',
  ready_for_sdv: 'warn',
  sdv_in_progress: 'info',
  ready_for_lock: 'info',
  locked: 'success',
};

const VISIT_DUE_TONE: Record<EcrfVisitDueStatus, Tone> = {
  overdue: 'critical',
  due_soon: 'warn',
  upcoming: 'info',
  completed: 'success',
  not_started: 'muted',
};

/**
 * Pill rendering the coarse "where is this row in the eCRF lifecycle" status.
 * Colours are pulled from the existing `Badge` variant tokens so the legend +
 * the column cells never drift apart.
 */
export function DataStatusBadge({
  status,
  className,
}: {
  status: EcrfDataStatus;
  className?: string;
}) {
  return (
    <Badge variant={TONE_TO_BADGE[DATA_STATUS_TONE[status]]} className={cn('text-[11px]', className)}>
      <span
        className={cn(
          'mr-1 inline-block h-1.5 w-1.5 rounded-full',
          TONE_DOT_CLASS[DATA_STATUS_TONE[status]],
        )}
      />
      {ECRF_DATA_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Pill rendering the visit's window-status. Same tone palette as DataStatusBadge. */
export function VisitDueStatusBadge({
  status,
  className,
}: {
  status: EcrfVisitDueStatus;
  className?: string;
}) {
  return (
    <Badge variant={TONE_TO_BADGE[VISIT_DUE_TONE[status]]} className={cn('text-[11px]', className)}>
      <span
        className={cn(
          'mr-1 inline-block h-1.5 w-1.5 rounded-full',
          TONE_DOT_CLASS[VISIT_DUE_TONE[status]],
        )}
      />
      {ECRF_VISIT_DUE_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * Action chip used in the "Next Action" column. Renders as a non-interactive
 * pill (the row's row-level Actions menu owns the actual click target).
 */
export function NextActionChip({
  label,
  tone,
  className,
}: {
  label: string;
  tone: Tone;
  className?: string;
}) {
  return (
    <Badge variant={TONE_TO_BADGE[tone]} className={cn('text-[11px]', className)}>
      {label}
    </Badge>
  );
}

/** Coloured-dot legend strip rendered in the table footer. */
export function StatusLegend({ className }: { className?: string }) {
  const items: { label: string; tone: Tone }[] = [
    { label: 'Critical / Overdue', tone: 'critical' },
    { label: 'Needs attention', tone: 'warn' },
    { label: 'In progress', tone: 'info' },
    { label: 'Complete / Locked', tone: 'success' },
    { label: 'Not started', tone: 'muted' },
  ];
  return (
    <div className={cn('flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground', className)}>
      <span className="font-medium uppercase tracking-wide">Legend</span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1">
          <span className={cn('inline-block h-2 w-2 rounded-full', TONE_DOT_CLASS[it.tone])} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
