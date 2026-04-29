'use client';

import { CalendarClock, Check, Clock, Lock, User } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SiteMilestoneIcon =
  | 'blue-dot'
  | 'check-sky'
  | 'user-gray'
  | 'check-green'
  | 'clock-gray'
  | 'lock-sky';

export type SiteMilestone = {
  id: string;
  label: string;
  /** Formatted right column, or `null` for an em dash placeholder. */
  dateDisplay: string | null;
  icon: SiteMilestoneIcon;
};

type SiteMilestoneTimelineProps = {
  milestones: SiteMilestone[];
  onViewFullTimeline?: () => void;
};

function TimelineIcon({ type }: { type: SiteMilestoneIcon }) {
  const wrap = (inner: React.ReactNode, className: string) => (
    <span
      className={cn('relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', className)}
      aria-hidden
    >
      {inner}
    </span>
  );

  switch (type) {
    case 'blue-dot':
      return wrap(
        <span className="h-1.5 w-1.5 rounded-full bg-white" />,
        'bg-blue-500 ring-2 ring-white dark:ring-card',
      );
    case 'check-sky':
      return wrap(
        <Check className="h-2.5 w-2.5 stroke-[2.5] text-white" />,
        'bg-sky-500 shadow-sm',
      );
    case 'user-gray':
      return wrap(
        <User className="h-2.5 w-2.5 text-slate-500" strokeWidth={2} />,
        'bg-slate-200 dark:bg-slate-700/80',
      );
    case 'check-green':
      return wrap(
        <Check className="h-2.5 w-2.5 stroke-[2.5] text-white" />,
        'bg-emerald-500 shadow-sm',
      );
    case 'clock-gray':
      return wrap(
        <Clock className="h-2.5 w-2.5 text-slate-500" strokeWidth={2} />,
        'bg-slate-200 dark:bg-slate-700/80',
      );
    case 'lock-sky':
      return wrap(
        <Lock className="h-2.5 w-2.5 text-sky-700" strokeWidth={2} />,
        'bg-sky-200 dark:bg-sky-900/50',
      );
  }
}

export function SiteMilestoneTimeline({ milestones, onViewFullTimeline }: SiteMilestoneTimelineProps) {
  return (
    <Card className="gap-0 border-border/70 bg-card py-0 text-card-foreground shadow-sm">
      <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"
          >
            <CalendarClock className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              data-slot="card-title"
              className="!text-[12px] font-medium leading-tight text-foreground"
            >
              Timeline
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Planned vs actual key enrollment dates
            </p>
          </div>
        </div>
      </div>
      <CardContent className="p-0 px-0 sm:px-0">
        <div className="px-4 pb-4 sm:px-5 sm:pb-4">
          {/**
           * The vertical line is centered on the 28px (w-7) icon column: 0.875rem from
           * the list’s left edge, then -translate-x-1/2 so the 1px stroke bisects each
           * icon. Icons sit on top (z-10) so the line runs continuously behind.
           */}
          <ol
            className="relative m-0 list-none space-y-0 p-0 text-[11px] before:pointer-events-none before:absolute before:left-3.5 before:top-2 before:bottom-2 before:z-0 before:w-px before:-translate-x-1/2 before:bg-slate-200/90 before:content-[''] dark:before:bg-slate-700/80"
            role="list"
            aria-label="Site timeline milestones"
          >
            {milestones.map((m) => (
              <li
                key={m.id}
                className="grid min-h-12 grid-cols-[1.75rem_1fr_minmax(6rem,35%)] items-center gap-x-2 gap-y-0 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800/80"
              >
                <div className="relative z-10 flex justify-center pl-0">
                  <TimelineIcon type={m.icon} />
                </div>
                <p className="min-w-0 leading-snug text-slate-600 dark:text-slate-400">{m.label}</p>
                <p
                  className={cn(
                    'min-w-0 break-words text-right text-[11px] tabular-nums leading-snug',
                    m.dateDisplay ? 'font-medium text-foreground' : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {m.dateDisplay ?? '—'}
                </p>
              </li>
            ))}
          </ol>
        </div>
        {onViewFullTimeline ? (
          <div className="border-t border-border/50 px-4 py-3 sm:px-5 sm:py-3.5">
            <button
              type="button"
              onClick={onViewFullTimeline}
              className="text-[11px] font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            >
              View full timeline
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
