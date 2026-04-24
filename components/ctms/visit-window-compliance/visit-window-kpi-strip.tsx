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
  MoreVertical,
  type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

interface BucketAccent {
  topAccent: string;
  iconBg: string;
  iconFg: string;
  donutStroke: string;
  sparklineTone: string;
  newPillClass: string;
}

const ACCENT: Record<KpiBucketId, BucketAccent> = {
  overall: {
    topAccent: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconFg: 'text-emerald-600 dark:text-emerald-300',
    donutStroke: 'stroke-emerald-500',
    sparklineTone: 'text-emerald-500',
    newPillClass:
      'bg-muted/70 text-muted-foreground dark:bg-muted dark:text-muted-foreground',
  },
  in_window: {
    topAccent: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconFg: 'text-emerald-600 dark:text-emerald-300',
    donutStroke: 'stroke-emerald-500',
    sparklineTone: 'text-emerald-500',
    newPillClass:
      'bg-muted/70 text-muted-foreground dark:bg-muted dark:text-muted-foreground',
  },
  out_of_window: {
    topAccent: 'bg-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-500/15',
    iconFg: 'text-amber-600 dark:text-amber-300',
    donutStroke: 'stroke-amber-500',
    sparklineTone: 'text-amber-500',
    newPillClass:
      'bg-amber-100/70 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  overdue: {
    topAccent: 'bg-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-500/15',
    iconFg: 'text-rose-600 dark:text-rose-300',
    donutStroke: 'stroke-rose-500',
    sparklineTone: 'text-rose-500',
    newPillClass:
      'bg-rose-100/70 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
  due_now: {
    topAccent: 'bg-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconFg: 'text-blue-600 dark:text-blue-300',
    donutStroke: 'stroke-blue-500',
    sparklineTone: 'text-blue-500',
    newPillClass:
      'bg-blue-100/70 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  upcoming: {
    topAccent: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-500/15',
    iconFg: 'text-violet-600 dark:text-violet-300',
    donutStroke: 'stroke-violet-500',
    sparklineTone: 'text-violet-500',
    newPillClass:
      'bg-violet-100/70 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  pending: {
    topAccent: 'bg-slate-400 dark:bg-slate-500',
    iconBg: 'bg-slate-100 dark:bg-slate-500/20',
    iconFg: 'text-slate-500 dark:text-slate-300',
    donutStroke: 'stroke-slate-400 dark:stroke-slate-500',
    sparklineTone: 'text-slate-400 dark:text-slate-500',
    newPillClass:
      'bg-muted/70 text-muted-foreground dark:bg-muted dark:text-muted-foreground',
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

/** Header trend pill. Renders as a stylized "New" badge when no delta is
 *  available yet, otherwise mirrors the arrow + delta% used in
 *  `kpi-strip-pro.tsx` so both strips read the same. */
function TrendPill({
  trend,
  newPillClass,
}: {
  trend?: VisitWindowTrend;
  newPillClass: string;
}) {
  if (!trend) {
    return (
      <Badge
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-medium border-transparent',
          newPillClass,
        )}
      >
        New
      </Badge>
    );
  }

  const delta = trend.deltaPct7d;
  if (delta === null) {
    return (
      <Badge
        className={cn(
          'rounded-full px-2 py-0.5 text-[10px] font-medium border-transparent',
          newPillClass,
        )}
      >
        New
      </Badge>
    );
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
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-medium leading-none tracking-tight text-foreground">
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
        'flex h-full flex-col gap-0 overflow-hidden border-border/70 p-0 shadow-none',
        onClick &&
          'cursor-pointer transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active && 'border-primary/60 ring-1 ring-primary/30',
      )}
    >
      <div className={cn('h-[3px] w-full shrink-0', accent.topAccent)} />

      <div className="flex h-full flex-col gap-3 px-4 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                accent.iconBg,
              )}
            >
              <Icon className={cn('h-3.5 w-3.5', accent.iconFg)} />
            </span>
            <p
              id={labelId}
              className="text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-muted-foreground"
            >
              {LABEL[id]}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <TrendPill trend={trend} newPillClass={accent.newPillClass} />
          </div>
        </div>

        <DonutChart
          percentage={donutPercentage}
          fillStrokeClassName={accent.donutStroke}
          centerLabel={donutCenterLabel}
        />

        <div className="space-y-0.5 text-center">
          <p className="text-xl font-medium leading-none tracking-tight text-foreground">
            {primaryValue}
          </p>
          <p className="text-[11px] text-muted-foreground">{subtext}</p>
        </div>

        <div className="mt-auto pt-1">
          {trend ? (
            <Sparkline
              points={trend.points}
              toneClassName={accent.sparklineTone}
              tooltipLabel={LABEL[id]}
              heightClassName="h-6"
            />
          ) : (
            <div className={cn('h-px w-full', accent.topAccent, 'opacity-60')} />
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
 * accent line and the trend pill renders as "New".
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
