'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { EnrollmentFunnelData, SubjectStatus } from '@/lib/types/ctms';

type StageKey =
  | 'preScreening'
  | 'screening'
  | 'screenFailed'
  | 'randomized'
  | 'active'
  | 'completed'
  | 'withdrawn'
  | 'discontinued';

type FilterValue = SubjectStatus | 'all';

const stages: { key: StageKey; label: string; markerColor: string; status: SubjectStatus }[] = [
  { key: 'preScreening', label: 'Pre-Screening', markerColor: 'bg-slate-400', status: 'pre_screening' },
  { key: 'screening', label: 'Screening', markerColor: 'bg-blue-400', status: 'screening' },
  { key: 'screenFailed', label: 'Screen Failed', markerColor: 'bg-red-400', status: 'screen_failed' },
  { key: 'randomized', label: 'Randomized', markerColor: 'bg-indigo-400', status: 'randomized' },
  { key: 'active', label: 'Active', markerColor: 'bg-emerald-500', status: 'active' },
  { key: 'completed', label: 'Completed', markerColor: 'bg-green-600', status: 'completed' },
  { key: 'withdrawn', label: 'Withdrawn', markerColor: 'bg-orange-400', status: 'withdrawn' },
  { key: 'discontinued', label: 'Discontinued', markerColor: 'bg-rose-500', status: 'discontinued' },
];

interface EnrollmentFunnelProps {
  data: EnrollmentFunnelData;
  /** When provided, the funnel becomes an interactive status filter. */
  value?: FilterValue;
  onValueChange?: (next: FilterValue) => void;
}

type Item = {
  label: string;
  count: number;
  markerColor: string | null;
  filterValue: FilterValue;
};

export function EnrollmentFunnel({ data, value, onValueChange }: EnrollmentFunnelProps) {
  const interactive = typeof onValueChange === 'function';
  const activeValue: FilterValue = value ?? 'all';

  const items: Item[] = [
    { label: 'Total', count: data.total, markerColor: null, filterValue: 'all' },
    ...stages.map((s) => ({
      label: s.label,
      count: data[s.key],
      markerColor: s.markerColor,
      filterValue: s.status as FilterValue,
    })),
  ];

  const renderItem = (item: Item) => {
    const isActive = interactive && activeValue === item.filterValue;
    const baseClass = cn(
      'inline-flex items-center gap-2 text-xs font-medium transition-colors',
      interactive
        ? cn(
            'cursor-pointer rounded-md border px-2.5 py-1',
            isActive
              ? 'border-primary/30 bg-primary/15 text-primary'
              : 'border-transparent text-foreground hover:bg-muted',
          )
        : 'text-sm text-foreground',
    );

    const inner = (
      <>
        {item.markerColor && (
          <span
            className={cn('h-2 w-4 shrink-0 rounded-full', item.markerColor)}
            aria-hidden
          />
        )}
        <span>
          {item.label} ({item.count})
        </span>
      </>
    );

    if (interactive) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => onValueChange?.(item.filterValue)}
          aria-pressed={isActive}
          className={baseClass}
        >
          {inner}
        </button>
      );
    }

    return (
      <div key={item.label} className={baseClass}>
        {inner}
      </div>
    );
  };

  const queryBlock = (data.openQueryCount > 0 || data.answeredQueryCount > 0) && (
    <div
      className={cn(
        'ml-auto flex flex-wrap items-center',
        interactive ? 'gap-3' : 'gap-4 md:gap-6',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 font-medium',
          interactive ? 'text-xs' : 'text-sm',
        )}
      >
        <span className="h-2 w-4 shrink-0 rounded-full bg-red-500" aria-hidden />
        <span className="text-red-700 dark:text-red-300">
          Open Queries ({data.openQueryCount})
        </span>
      </div>
      <div
        className={cn(
          'flex items-center gap-2 font-medium',
          interactive ? 'text-xs' : 'text-sm',
        )}
      >
        <span className="h-2 w-4 shrink-0 rounded-full bg-yellow-500" aria-hidden />
        <span className="text-yellow-800 dark:text-yellow-200">
          Answered Queries ({data.answeredQueryCount})
        </span>
      </div>
    </div>
  );

  if (interactive) {
    return (
      <div
        className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/30 px-2 py-1.5"
        role="group"
        aria-label="Filter subjects by status"
      >
        {items.map(renderItem)}
        {queryBlock}
      </div>
    );
  }

  return (
    <Card className="rounded-lg">
      <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
        {items.map(renderItem)}
        {queryBlock}
      </CardContent>
    </Card>
  );
}
