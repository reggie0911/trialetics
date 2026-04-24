'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <li className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-xs">
      <span className="truncate font-medium text-foreground" title={label}>
        {label}
      </span>
      <div
        role="progressbar"
        aria-label={`${label} share of overdue visits`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-red-500 dark:bg-red-500/90"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="whitespace-nowrap font-mono text-muted-foreground tabular-nums">
        {count} ({Math.round(clamped)}%)
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
    <Card className={cn('h-full w-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Top Visit Types Overdue</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No overdue visits — every protocol visit is currently in window or
            upcoming.
          </p>
        ) : (
          <ul className="space-y-3">
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
      </CardContent>
    </Card>
  );
}
