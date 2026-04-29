'use client';

import { useId, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarPlus,
  CheckCircle2,
  CircleDashed,
  Info,
  type LucideIcon,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkline } from '@/components/ctms/ecrf-tracking/_pieces/sparkline';
import type {
  VisitScheduleBucketCounts,
  VisitWindowTrend,
  VisitWindowTrendKind,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

/** Identifier for each KPI card so the parent can route a click to a filter. */
export type KpiBucketId =
  | 'overall'
  | 'in_window'
  | 'out_of_window'
  | 'overdue'
  | 'due_now'
  | 'upcoming'
  | 'pending';

interface VisitWindowKpiStripProps {
  /** Aggregated bucket counts (study- or site-scoped). */
  overall: VisitScheduleBucketCounts;
  /** Subjects + visits headline numbers shown on the Overall card. */
  subjectCount: number;
  visitCount: number;
  /** Per-bucket trend points for the sparklines + 7-day delta. Optional so
   *  the strip degrades gracefully before the trend rollup ships. */
  trends?: VisitWindowTrend[];
  /** Click filter — the parent maps this back into the table's `dueStatus`. */
  onCardClick?: (id: KpiBucketId) => void;
  /** Currently selected bucket, used to highlight the active card. */
  activeBucket?: KpiBucketId | null;
}

const ICON: Record<KpiBucketId, LucideIcon> = {
  overall: CheckCircle2,
  in_window: CheckCircle2,
  out_of_window: AlertTriangle,
  overdue: AlertCircle,
  due_now: Bell,
  upcoming: CalendarPlus,
  pending: CircleDashed,
};

const LABEL: Record<KpiBucketId, string> = {
  overall: 'Overall Summary',
  in_window: 'In Window',
  out_of_window: 'Out of Window',
  overdue: 'Overdue',
  due_now: 'Due Now',
  upcoming: 'Upcoming',
  pending: 'Pending',
};

/** One-line context for the StatCard-style white chip (below the donut) */
const META: Record<KpiBucketId, string> = {
  overall: 'Done % · visits complete vs all scheduled',
  in_window: 'In window as a share of all visits',
  out_of_window: 'Out of window, not yet overdue or due',
  overdue: 'Overdue (past the allowed target window)',
  due_now: 'In the “due now” monitoring window',
  upcoming: 'Upcoming in schedule (before window open)',
  pending: 'Not yet in a specific window bucket',
};

/** Longer copy for the Info chip tooltip (same idea as the meta line) */
const META_TOOLTIP: Record<KpiBucketId, string> = {
  overall:
    'Rolled-up visit-window completion: “done” visits with compliance work complete, as a share of all scheduled visits. The value under the card repeats done/total, plus how many subjects and visits are in this rollup. The spark is completion % over time.',
  in_window:
    'Count of visits currently inside their target window and treated as in compliance (in window). The ring is this count as a share of all scheduled visits. “vs last 7 days” compares the latest bucket count to the 7-day spark.',
  out_of_window:
    'Visits with an open window that are not yet in their in-window, due, or overdue state, per the status engine. Share is of all visits. Use the table to inspect which visits are bucketed here.',
  overdue:
    'Visits past the end of the allowed target window. High share often drives monitoring follow-up. Sparkline shows the trend; the line under the value is the raw count vs a 7-day context.',
  due_now:
    'Visits in the “due now” band—typically when the window is open and an action is expected imminently (definition follows your site/study visit rules).',
  upcoming:
    'Visits whose target window has not opened yet (scheduled future window). Share is of all scheduled visits; trend reflects movement into other buckets as dates advance.',
  pending:
    'Visits not yet placed into a concrete window state from the current calculation (e.g. missing dates or not yet processed). Re-sync or expand filters if counts look unexpected.',
};

interface BucketAccent {
  topAccent: string;
  iconBg: string;
  iconFg: string;
  donutStroke: string;
  sparklineTone: string;
}

const ACCENT: Record<KpiBucketId, BucketAccent> = {
  overall: {
    topAccent: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconFg: 'text-emerald-600 dark:text-emerald-300',
    donutStroke: 'stroke-emerald-500',
    sparklineTone: 'text-emerald-500',
  },
  in_window: {
    topAccent: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconFg: 'text-emerald-600 dark:text-emerald-300',
    donutStroke: 'stroke-emerald-500',
    sparklineTone: 'text-emerald-500',
  },
  out_of_window: {
    topAccent: 'bg-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-500/15',
    iconFg: 'text-amber-600 dark:text-amber-300',
    donutStroke: 'stroke-amber-500',
    sparklineTone: 'text-amber-500',
  },
  overdue: {
    topAccent: 'bg-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-500/15',
    iconFg: 'text-rose-600 dark:text-rose-300',
    donutStroke: 'stroke-rose-500',
    sparklineTone: 'text-rose-500',
  },
  due_now: {
    topAccent: 'bg-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconFg: 'text-blue-600 dark:text-blue-300',
    donutStroke: 'stroke-blue-500',
    sparklineTone: 'text-blue-500',
  },
  upcoming: {
    topAccent: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-500/15',
    iconFg: 'text-violet-600 dark:text-violet-300',
    donutStroke: 'stroke-violet-500',
    sparklineTone: 'text-violet-500',
  },
  pending: {
    topAccent: 'bg-slate-400 dark:bg-slate-500',
    iconBg: 'bg-slate-100 dark:bg-slate-500/20',
    iconFg: 'text-slate-500 dark:text-slate-300',
    donutStroke: 'stroke-slate-400 dark:stroke-slate-500',
    sparklineTone: 'text-slate-400 dark:text-slate-500',
  },
};

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function trendByKind(
  trends: VisitWindowTrend[] | undefined,
  kind: VisitWindowTrendKind,
): VisitWindowTrend | undefined {
  return trends?.find((t) => t.kind === kind);
}

/** Header trend: 7d delta% with arrow when data exists; empty when not. */
function TrendPill({ trend }: { trend?: VisitWindowTrend }) {
  if (!trend) {
    return null;
  }

  const delta = trend.deltaPct7d;
  if (delta === null) {
    return null;
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <ArrowRight className="h-3 w-3" /> 0%
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-medium',
        positive
          ? 'text-green-600 dark:text-green-400'
          : 'text-red-600 dark:text-red-400',
      )}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(delta)}%
    </span>
  );
}

interface DonutChartProps {
  percentage: number;
  fillStrokeClassName: string;
  centerLabel: string;
}

function DonutChart({
  percentage,
  fillStrokeClassName,
  centerLabel,
}: DonutChartProps) {
  const size = 104;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - safePct / 100);

  return (
    <div className="relative mx-auto h-[104px] w-[104px]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted/70 dark:stroke-muted"
          strokeWidth={strokeWidth}
        />
        {safePct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={fillStrokeClassName}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-1 text-center">
        <span className="max-w-full min-w-0 !text-[30px] font-medium leading-tight tabular-nums tracking-tight text-foreground text-balance">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

interface VisitKpiCardProps {
  id: KpiBucketId;
  donutPercentage: number;
  donutCenterLabel: string;
  primaryValue: string;
  subtext: string;
  trend?: VisitWindowTrend;
  onClick?: () => void;
  active?: boolean;
}

function VisitKpiCard({
  id,
  donutPercentage,
  donutCenterLabel,
  primaryValue,
  subtext,
  trend,
  onClick,
  active,
}: VisitKpiCardProps) {
  const Icon = ICON[id];
  const accent = ACCENT[id];
  const labelId = useId();

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? Boolean(active) : undefined}
      aria-labelledby={labelId}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'flex h-full min-h-0 w-full flex-col gap-0 overflow-hidden border-border/70 p-0 py-0 shadow-none',
        onClick &&
          'cursor-pointer transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active && 'border-primary/60 ring-1 ring-primary/30',
      )}
    >
      <div className={cn('h-[3px] w-full shrink-0', accent.topAccent)} />

      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
        <div className="flex w-full min-w-0 items-start justify-between gap-2">
          <p
            id={labelId}
            data-slot="stat-card-title"
            className="min-w-0 flex-1 !text-[12px] font-medium leading-tight text-muted-foreground"
          >
            {LABEL[id]}
          </p>
          <span
            aria-hidden
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10',
              accent.iconBg,
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 opacity-90', accent.iconFg)} />
          </span>
        </div>

        {trend ? (
          <div className="mt-1.5 flex min-h-4 w-full min-w-0">
            <TrendPill trend={trend} />
          </div>
        ) : null}

        <div className="mt-3 flex w-full justify-center">
          <DonutChart
            percentage={donutPercentage}
            fillStrokeClassName={accent.donutStroke}
            centerLabel={donutCenterLabel}
          />
        </div>

        <div
          className="mt-3 w-full"
          onClick={onClick ? (e) => e.stopPropagation() : undefined}
        >
          <div className="flex w-full justify-start">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-left text-[11px] font-medium text-[#000000] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label={`${LABEL[id]} — more detail`}
                  >
                    <Info
                      className="h-3 w-3 shrink-0 text-[#000000] opacity-80"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-left leading-snug">
                      {META[id]}
                    </span>
                  </button>
                }
              />
              <TooltipContent
                side="top"
                className="max-w-xs text-left text-xs text-balance"
              >
                {META_TOOLTIP[id]}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="mt-3 border-t border-border/50 pt-2.5 text-left">
          <p className="text-[11px] font-medium leading-snug tabular-nums text-foreground">
            {primaryValue}
          </p>
          {subtext ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {subtext}
            </p>
          ) : null}
        </div>

        <div className="mt-auto w-full pt-1">
          {trend ? (
            <Sparkline
              points={trend.points}
              toneClassName={accent.sparklineTone}
              tooltipLabel={LABEL[id]}
              heightClassName="h-6"
            />
          ) : (
            <div
              className={cn(
                'h-px w-full',
                active ? 'opacity-40' : 'opacity-60',
                accent.topAccent,
              )}
            />
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Seven-card KPI strip rendered above the Visit Window Compliance tabs. The
 * first card is an "Overall" card showing the completion donut + done/total
 * count and subjects/visits subtext; the remaining six map 1:1 to the bucket
 * statuses from `computeVisitWindowStatus` (in_window / out_of_window /
 * overdue / due_now / upcoming / pending).
 *
 * Each card forwards a click event with its `KpiBucketId` so the parent can
 * pre-filter the table by `dueStatus`. The strip stays clickable even when
 * the trend bundle hasn't loaded yet — the sparkline degrades to a thin
 * accent line.
 */
export function VisitWindowKpiStrip({
  overall,
  subjectCount,
  visitCount,
  trends,
  onCardClick,
  activeBucket,
}: VisitWindowKpiStripProps) {
  const buckets: Exclude<KpiBucketId, 'overall'>[] = useMemo(
    () => [
      'in_window',
      'out_of_window',
      'overdue',
      'due_now',
      'upcoming',
      'pending',
    ],
    [],
  );

  const overallPct = pct(overall.done, overall.total);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      <VisitKpiCard
        id="overall"
        donutPercentage={overallPct}
        donutCenterLabel={`${overallPct}%`}
        primaryValue={`${overall.done} / ${overall.total}`}
        subtext={`${subjectCount} subject${subjectCount === 1 ? '' : 's'} · ${visitCount} visit${visitCount === 1 ? '' : 's'}`}
        trend={trendByKind(trends, 'done_pct')}
        onClick={onCardClick ? () => onCardClick('overall') : undefined}
        active={activeBucket === 'overall'}
      />

      {buckets.map((id) => {
        const count = overall[id];
        const cardPct = pct(count, overall.total);
        return (
          <VisitKpiCard
            key={id}
            id={id}
            donutPercentage={cardPct}
            donutCenterLabel={`${cardPct}%`}
            primaryValue={String(count)}
            subtext="vs last 7 days"
            trend={trendByKind(trends, id)}
            onClick={onCardClick ? () => onCardClick(id) : undefined}
            active={activeBucket === id}
          />
        );
      })}
    </div>
  );
}
