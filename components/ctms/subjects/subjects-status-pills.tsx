'use client';

import { cn } from '@/lib/utils';
import type { EnrollmentFunnelData, SubjectStatus } from '@/lib/types/ctms';

export type SubjectStatusFilter = SubjectStatus | 'all';

type FunnelKey = keyof Omit<
  EnrollmentFunnelData,
  'total' | 'openQueryCount' | 'answeredQueryCount'
>;

interface ChipDef {
  filterValue: SubjectStatusFilter;
  label: string;
  funnelKey: FunnelKey | null;
  /** Resting tint applied to non-active chips so each status carries the same color it has elsewhere. */
  tone: string;
  /** Active styling that lifts the selected chip without losing the per-status hue. */
  activeTone: string;
}

const CHIPS: ChipDef[] = [
  {
    filterValue: 'all',
    label: 'All',
    funnelKey: null,
    tone: 'bg-muted text-foreground border-border/70',
    activeTone: 'bg-foreground text-background border-foreground',
  },
  {
    filterValue: 'pre_screening',
    label: 'Pre-Screening',
    funnelKey: 'preScreening',
    tone: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:border-slate-800',
    activeTone:
      'bg-slate-200 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-50 dark:border-slate-700 shadow-inner',
  },
  {
    filterValue: 'screening',
    label: 'Screening',
    funnelKey: 'screening',
    tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900',
    activeTone:
      'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/60 dark:text-blue-50 dark:border-blue-700 shadow-inner',
  },
  {
    filterValue: 'randomized',
    label: 'Randomized',
    funnelKey: 'randomized',
    tone: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-900',
    activeTone:
      'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-900/60 dark:text-violet-50 dark:border-violet-700 shadow-inner',
  },
  {
    filterValue: 'active',
    label: 'Active',
    funnelKey: 'active',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
    activeTone:
      'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-50 dark:border-emerald-700 shadow-inner',
  },
  {
    filterValue: 'screen_failed',
    label: 'Screen Failed',
    funnelKey: 'screenFailed',
    tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
    activeTone:
      'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/60 dark:text-rose-50 dark:border-rose-700 shadow-inner',
  },
  {
    filterValue: 'completed',
    label: 'Completed',
    funnelKey: 'completed',
    tone: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-200 dark:border-green-900',
    activeTone:
      'bg-green-100 text-green-900 border-green-300 dark:bg-green-900/60 dark:text-green-50 dark:border-green-700 shadow-inner',
  },
  {
    filterValue: 'withdrawn',
    label: 'Withdrawn',
    funnelKey: 'withdrawn',
    tone: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900',
    activeTone:
      'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/60 dark:text-orange-50 dark:border-orange-700 shadow-inner',
  },
  {
    filterValue: 'discontinued',
    label: 'Discontinued',
    funnelKey: 'discontinued',
    tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
    activeTone:
      'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/60 dark:text-rose-50 dark:border-rose-700 shadow-inner',
  },
];

interface SubjectsStatusPillsProps {
  funnel: EnrollmentFunnelData;
  value: SubjectStatusFilter;
  onValueChange: (next: SubjectStatusFilter) => void;
}

export function SubjectsStatusPills({
  funnel,
  value,
  onValueChange,
}: SubjectsStatusPillsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filter subjects by status"
    >
      {CHIPS.map((chip) => {
        const count =
          chip.funnelKey === null ? funnel.total : (funnel[chip.funnelKey] as number);
        const isActive = value === chip.filterValue;
        return (
          <button
            key={chip.filterValue}
            type="button"
            onClick={() => onValueChange(chip.filterValue)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              isActive ? chip.activeTone : chip.tone,
              !isActive && 'hover:brightness-95',
            )}
          >
            <span>{chip.label}</span>
            <span
              className={cn(
                'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                isActive
                  ? 'bg-background/30 text-current'
                  : 'bg-background/70 text-current',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
