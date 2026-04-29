'use client';

import { Lock, LockOpen, Minus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LOCK_STATE_LABEL, type SubjectLockState } from '@/lib/subjects/derive';
import type { SubjectTrackingSummary } from '@/lib/types/ctms';

import { summaryToPercentages } from './subject-tracking-summary-cell';

interface SubjectsDataQualityCellProps {
  summary: SubjectTrackingSummary | null | undefined;
  lockState: SubjectLockState;
}

function MiniPctBadge({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const variant = value === null ? 'outline' : value >= 100 ? 'success' : value >= 50 ? 'info' : 'secondary';
  return (
    <Badge variant={variant} className="font-mono text-[10px]">
      {label} {value === null ? '-' : `${value}%`}
    </Badge>
  );
}

const LOCK_PILL_TONE: Record<SubjectLockState, string> = {
  locked:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800',
  open:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
  not_started:
    'bg-muted text-muted-foreground border-border/70',
};

const LOCK_ICON: Record<SubjectLockState, React.ComponentType<{ className?: string }>> = {
  locked: Lock,
  open: LockOpen,
  not_started: Minus,
};

/**
 * Combined Data Quality cell — DE/SDV percentage badges + lock-state pill,
 * with a tooltip that surfaces full DE/SDV/Lock %, open queries, and
 * answered queries (since standalone OQ/AQ columns were removed).
 */
export function SubjectsDataQualityCell({
  summary,
  lockState,
}: SubjectsDataQualityCellProps) {
  if (!summary || summary.dataExpectedTotal === 0) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const totals = summaryToPercentages(summary);
  const LockIcon = LOCK_ICON[lockState];

  const tooltip = (
    <div className="space-y-0.5 text-xs">
      <div>
        Data Entry:{' '}
        <span className="font-mono">
          {totals.dataEntryPct != null ? `${totals.dataEntryPct}%` : '-'}
        </span>
      </div>
      <div>
        SDV:{' '}
        <span className="font-mono">{totals.sdvPct != null ? `${totals.sdvPct}%` : '-'}</span>
      </div>
      <div>
        Lock:{' '}
        <span className="font-mono">{totals.lockPct != null ? `${totals.lockPct}%` : '-'}</span>
      </div>
      <div className="pt-0.5 text-[11px] text-muted-foreground">
        Open queries: {summary.openQueryCount} \u00B7 Answered: {summary.answeredQueryCount}
      </div>
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="inline-flex flex-wrap items-center gap-1.5" />}
      >
        <MiniPctBadge label="DE" value={totals.dataEntryPct} />
        <MiniPctBadge label="SDV" value={totals.sdvPct} />
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
            LOCK_PILL_TONE[lockState],
          )}
        >
          <LockIcon className="h-3 w-3" />
          {LOCK_STATE_LABEL[lockState]}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
