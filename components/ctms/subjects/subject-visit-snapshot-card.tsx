'use client';

import { CalendarDays, ChevronDown, Info } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type SubjectVisitSnapshotCardProps = {
  /** Main line: "None" or e.g. "V1 · 12-Jan-2025" */
  lastVisitLine: string;
  /**
   * Small grey sub under last visit (e.g. "—" when `lastVisitLine` is "None").
   * Pass `null` to hide the subline when the main line is enough.
   */
  lastVisitSubline: string | null;
  overdueCount: number;
  /** Primary value in column 3: "—" or a window string. */
  upcomingWindow: string;
  /** True when there is no next visit in the pipeline (show the blue callout + copy). */
  hasUpcomingCallout: boolean;
  /** When a next visit exists, one-line summary for the upcoming section. */
  pipelineSummary?: string | null;
  onSchedule: () => void;
  onViewAllVisits: () => void;
  readOnly: boolean;
};

/** Aligned with study StatCard: rounded-[5px] border-border/70, 12px titles, 11px support */
const cardBase =
  'w-full overflow-hidden rounded-[5px] border border-border/70 bg-card text-foreground shadow-sm';

const headerBtn =
  'h-8 gap-1 border-sky-500/80 bg-background px-2.5 text-[11px] font-medium text-sky-600 ' +
  'hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500/30 ' +
  'dark:border-sky-500 dark:bg-card dark:text-sky-400 dark:hover:bg-sky-950/40';

const ctaLink = cn(
  'text-[11px] font-medium text-sky-600 transition-colors',
  'hover:text-sky-700 hover:underline',
  'dark:text-sky-400 dark:hover:text-sky-300',
);

const metricLabel = 'text-[12px] font-medium leading-tight text-muted-foreground';
const metricSub = 'mt-0.5 text-[11px] text-muted-foreground';
const statValueClass = 'text-[#000000] dark:text-foreground';

export function SubjectVisitSnapshotCard({
  lastVisitLine,
  lastVisitSubline,
  overdueCount,
  upcomingWindow,
  hasUpcomingCallout,
  pipelineSummary,
  onSchedule,
  onViewAllVisits,
  readOnly,
}: SubjectVisitSnapshotCardProps) {
  const overdueIsZero = overdueCount === 0;
  const windowIsEmpty = upcomingWindow === '—' || !upcomingWindow.trim();

  return (
    <div className={cardBase} data-testid="visit-snapshot-card">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 dark:border-border/80">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-white/10">
            <CalendarDays
              className="h-3.5 w-3.5 opacity-90"
              strokeWidth={2.25}
              aria-hidden
            />
          </span>
          <h2
            data-slot="stat-card-title"
            className="!text-[12px] font-medium leading-tight text-muted-foreground"
          >
            Visit Snapshot
          </h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={headerBtn}
              disabled={readOnly}
            >
              Schedule Visit
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                onSchedule();
              }}
            >
              Open Visit Schedule
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Three columns with vertical rules */}
      <div
        className="grid grid-cols-1 gap-4 border-b border-border/80 px-4 py-4 sm:grid-cols-3 sm:gap-0 sm:px-0 sm:py-4 dark:border-border/80"
        data-testid="visit-snapshot-stats"
      >
        <div className="px-0 sm:px-4 sm:border-r sm:border-border/80 dark:sm:border-border/80">
          <p className={metricLabel} data-slot="stat-card-title">Last Visit</p>
          <p
            className={cn(
              'mt-1.5 text-[24px] font-medium leading-[1.05] tracking-tight',
              statValueClass,
            )}
          >
            {lastVisitLine}
          </p>
          {lastVisitSubline != null && lastVisitSubline.length > 0
            ? (
                <p className={metricSub}>
                  {lastVisitSubline}
                </p>
              )
            : null}
        </div>
        <div className="px-0 sm:px-4 sm:border-r sm:border-border/80 dark:sm:border-border/80">
          <p className={metricLabel} data-slot="stat-card-title">Overdue Visits</p>
          <p
            className={cn(
              'mt-1.5 text-[24px] font-medium leading-[1.05] tabular-nums',
              statValueClass,
            )}
          >
            {String(overdueCount)}
          </p>
          <p className={metricSub}>
            {overdueIsZero
              ? 'No overdue visits'
              : `${overdueCount} ${
                overdueCount === 1
                  ? 'visit is'
                  : 'visits are'
              } in the overdue window` }
          </p>
        </div>
        <div className="px-0 sm:px-4">
          <p className={metricLabel} data-slot="stat-card-title">Upcoming Window</p>
          <p
            className={cn(
              'mt-1.5 min-w-0 font-medium leading-[1.05] tracking-tight',
              statValueClass,
              windowIsEmpty
                ? '!text-[24px]'
                : 'text-[24px] tabular-nums',
            )}
          >
            {upcomingWindow}
          </p>
          <p className={metricSub}>
            {windowIsEmpty
              ? 'No upcoming window'
              : 'Planned window for next scheduled visit' }
          </p>
        </div>
      </div>

      {/* Upcoming Visits sub-section */}
      <div className="space-y-2.5 bg-card px-4 pb-4 pt-2 sm:pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            className="!text-[12px] font-medium leading-tight text-muted-foreground"
            data-slot="stat-card-title"
          >
            Upcoming Visits
          </h3>
          <button
            type="button"
            onClick={onViewAllVisits}
            className="text-[11px] font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            View All Visits
          </button>
        </div>

        {hasUpcomingCallout
          ? (
            <div className="flex flex-col gap-3 rounded-[5px] border border-border/70 bg-card p-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3.5">
              <div className="flex min-w-0 flex-1 gap-2 sm:items-start">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/80 dark:border-sky-800/60 dark:bg-sky-950/40">
                  <Info
                    className="h-3 w-3 text-sky-600 dark:text-sky-300"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">
                    No upcoming visits scheduled
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Schedule the next visit to stay on track with the protocol.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={readOnly}
                onClick={onSchedule}
                variant="outline"
                className="h-8 rounded-[5px] border-sky-200 bg-background px-3 text-[11px] font-medium text-sky-600 hover:bg-sky-50 dark:border-sky-700/60 dark:bg-card dark:text-sky-400 dark:hover:bg-sky-950/40"
              >
                Schedule Visit
              </Button>
            </div>
            )
          : (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {pipelineSummary
                || 'The next visit is in your protocol schedule. Use the visit tab to adjust.'}
            </p>
            )}
      </div>
    </div>
  );
}
