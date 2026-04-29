'use client';

import { ListOrdered } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { VisitWindowComplianceBundle } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

interface TopOverdueVisitTypesListProps {
  data: VisitWindowComplianceBundle['topOverdueVisitTypes'];
  className?: string;
}

/** Inline horizontal bar — name on the left, bar in the middle, count + pct on
 *  the right. Pure CSS so no chart library is pulled in just for four rows. */
function OverdueBar({
  label,
  count,
  pct,
}: {
  label: string;
  count: number;
  pct: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <li className="grid grid-cols-[minmax(0,5.5rem)_1fr_auto] items-center gap-2.5 text-[11px] leading-snug sm:grid-cols-[6.5rem_1fr_auto] sm:gap-3">
      <span
        className="truncate font-medium text-foreground"
        title={label}
      >
        {label}
      </span>
      <div
        role="progressbar"
        aria-label={`${label} share of overdue visits`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="relative h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-muted/90"
      >
        <div
          className="h-full rounded-full bg-red-500 dark:bg-red-500/90"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="whitespace-nowrap tabular-nums text-muted-foreground">
        {count}{' '}
        <span className="text-foreground/90">({Math.round(clamped)}%)</span>
      </span>
    </li>
  );
}

/**
 * Companion card to the compliance trend chart. Lists the visit names that
 * account for most of the overdue backlog so the team knows which visit type
 * to triage first.
 */
export function TopOverdueVisitTypesList({
  data,
  className,
}: TopOverdueVisitTypesListProps) {
  return (
    <Card
      className={cn(
        'flex h-full w-full flex-col border-border/70 py-0 shadow-none',
        className,
      )}
    >
      <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
          >
            <ListOrdered className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              data-slot="card-title"
              className="!text-[12px] font-medium leading-tight text-foreground"
            >
              Top Visit Types (Overdue)
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              By share of overdue volume — use to triage monitoring focus
            </p>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
        {data.length === 0 ? (
          <p className="py-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            No overdue visits — every protocol visit is currently in window or
            upcoming.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {data.map((row) => (
              <OverdueBar
                key={row.visit_name}
                label={row.visit_name}
                count={row.overdue}
                pct={row.pct}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
