'use client';

import { useMemo, type ComponentType } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Globe,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { CountryDashboardRow } from '@/lib/actions/countries';

interface CountriesKpiStripProps {
  countries: CountryDashboardRow[];
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

interface DonutChartProps {
  percentage: number;
  centerValue: number;
  fillStrokeClassName: string;
}

function DonutChart({
  percentage,
  centerValue,
  fillStrokeClassName,
}: DonutChartProps) {
  const size = 96;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - safePct / 100);

  return (
    <div className="relative mx-auto h-24 w-24">
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="!text-[30px] font-medium leading-none tabular-nums tracking-tight text-foreground">
          {centerValue}
        </span>
      </div>
    </div>
  );
}

interface LegendSegment {
  label: string;
  value: number;
  percentage: number;
  dotClassName: string;
}

function LegendRow({ label, value, percentage, dotClassName }: LegendSegment) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2 text-left text-[11px] leading-snug">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClassName)} />
        <span className="min-w-0 font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="shrink-0 tabular-nums text-foreground">
        {value}
        <span className="ml-1 text-muted-foreground">({percentage}%)</span>
      </span>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  iconBgClassName: string;
  iconFgClassName: string;
  topAccentClassName: string;
  donutPercentage: number;
  donutStrokeClassName: string;
  primarySegment: LegendSegment;
  secondarySegment: LegendSegment;
  /** Short summary line, styled like overview StatCard meta chip */
  meta?: string;
  tooltip?: string;
}

function KpiCard({
  title,
  value,
  icon: Icon,
  iconBgClassName,
  iconFgClassName,
  topAccentClassName,
  donutPercentage,
  donutStrokeClassName,
  primarySegment,
  secondarySegment,
  meta,
  tooltip,
}: KpiCardProps) {
  return (
    <Card
      className="flex h-full min-h-0 flex-col gap-0 overflow-hidden border-border/70 p-0 py-0 shadow-none"
      title={tooltip}
    >
      <div className={cn('h-[3px] w-full shrink-0', topAccentClassName)} />

      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
        {/* Match study overview StatCard: title (left) + icon (right) */}
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <p
            className="min-w-0 flex-1 !text-[12px] font-medium leading-tight text-muted-foreground"
            data-slot="kpi-card-title"
          >
            {title}
          </p>
          <span
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10',
              iconBgClassName,
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 shrink-0 opacity-90', iconFgClassName)} />
          </span>
        </div>

        <div className="mt-3 flex w-full justify-center">
          <DonutChart
            percentage={donutPercentage}
            centerValue={value}
            fillStrokeClassName={donutStrokeClassName}
          />
        </div>

        {meta ? (
          <div className="mt-3 w-full">
            <span
              className={cn(
                'inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#000000] dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]',
              )}
            >
              <span className="truncate">{meta}</span>
            </span>
          </div>
        ) : null}

        <div className="mt-3 w-full min-w-0 space-y-2 border-t border-border/50 pt-2.5">
          <LegendRow {...primarySegment} />
          <LegendRow {...secondarySegment} />
        </div>
      </div>
    </Card>
  );
}

export function CountriesKpiStrip({ countries }: CountriesKpiStripProps) {
  const metrics = useMemo(() => {
    const total = countries.length;
    const planned = countries.filter((c) => c.status === 'planned').length;
    const enrolling = countries.filter((c) => c.status === 'enrolling').length;
    const approved = countries.filter((c) => c.status === 'approved').length;
    const closed = countries.filter((c) => c.status === 'closed').length;
    const active = enrolling + approved;

    const regApproved = countries.filter((c) => c.regulatory_status === 'approved').length;
    const regInProgress = countries.filter(
      (c) => c.regulatory_status === 'in_progress',
    ).length;
    const regNotStarted = countries.filter(
      (c) => c.regulatory_status === 'not_started',
    ).length;

    const activated = countries.filter(
      (c) => c.status === 'enrolling' || (c.status === 'approved' && c.activeSites > 0),
    ).length;

    return {
      total,
      planned,
      active,
      enrolling,
      closed,
      regApproved,
      regInProgress,
      regNotStarted,
      activated,
    };
  }, [countries]);

  const remaining = (count: number) => Math.max(metrics.total - count, 0);
  const remainingDot = 'bg-muted-foreground/30 dark:bg-muted-foreground/40';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        title="Total Countries"
        value={metrics.total}
        icon={Globe}
        iconBgClassName="bg-sky-50 dark:bg-sky-500/15"
        iconFgClassName="text-sky-600 dark:text-sky-300"
        topAccentClassName="bg-blue-500"
        donutPercentage={metrics.total > 0 ? 100 : 0}
        donutStrokeClassName="stroke-blue-500"
        primarySegment={{
          label: 'Planned',
          value: metrics.planned,
          percentage: pct(metrics.planned, metrics.total),
          dotClassName: 'bg-blue-500',
        }}
        secondarySegment={{
          label: 'Active',
          value: metrics.active,
          percentage: pct(metrics.active, metrics.total),
          dotClassName: remainingDot,
        }}
        meta={
          metrics.total > 0
            ? `${metrics.planned} planned · ${metrics.active} active`
            : 'No countries yet'
        }
        tooltip="All countries currently linked to this study, regardless of regulatory progress."
      />

      <KpiCard
        title="Regulatory Approved"
        value={metrics.regApproved}
        icon={CheckCircle2}
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        topAccentClassName="bg-emerald-500"
        donutPercentage={pct(metrics.regApproved, metrics.total)}
        donutStrokeClassName="stroke-emerald-500"
        primarySegment={{
          label: 'Approved',
          value: metrics.regApproved,
          percentage: pct(metrics.regApproved, metrics.total),
          dotClassName: 'bg-emerald-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: remaining(metrics.regApproved),
          percentage: pct(remaining(metrics.regApproved), metrics.total),
          dotClassName: remainingDot,
        }}
        meta={
          metrics.total > 0
            ? `${pct(metrics.regApproved, metrics.total)}% of countries`
            : '—'
        }
        tooltip="Countries whose computed regulatory status is Approved (every required submission cleared)."
      />

      <KpiCard
        title="In Progress"
        value={metrics.regInProgress}
        icon={Clock}
        iconBgClassName="bg-sky-50 dark:bg-sky-500/15"
        iconFgClassName="text-sky-600 dark:text-sky-300"
        topAccentClassName="bg-sky-500"
        donutPercentage={pct(metrics.regInProgress, metrics.total)}
        donutStrokeClassName="stroke-sky-500"
        primarySegment={{
          label: 'In Progress',
          value: metrics.regInProgress,
          percentage: pct(metrics.regInProgress, metrics.total),
          dotClassName: 'bg-sky-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: remaining(metrics.regInProgress),
          percentage: pct(remaining(metrics.regInProgress), metrics.total),
          dotClassName: remainingDot,
        }}
        meta={
          metrics.total > 0
            ? `${pct(metrics.regInProgress, metrics.total)}% in review`
            : '—'
        }
        tooltip="Countries with at least one submitted package not yet approved."
      />

      <KpiCard
        title="Not Started"
        value={metrics.regNotStarted}
        icon={Circle}
        iconBgClassName="bg-slate-100 dark:bg-slate-500/15"
        iconFgClassName="text-slate-500 dark:text-slate-300"
        topAccentClassName="bg-slate-500"
        donutPercentage={pct(metrics.regNotStarted, metrics.total)}
        donutStrokeClassName="stroke-slate-500"
        primarySegment={{
          label: 'Not Started',
          value: metrics.regNotStarted,
          percentage: pct(metrics.regNotStarted, metrics.total),
          dotClassName: 'bg-slate-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: remaining(metrics.regNotStarted),
          percentage: pct(remaining(metrics.regNotStarted), metrics.total),
          dotClassName: remainingDot,
        }}
        meta={
          metrics.total > 0
            ? `${pct(metrics.regNotStarted, metrics.total)}% not started`
            : '—'
        }
        tooltip="Countries that have no recorded regulatory submission."
      />

      <KpiCard
        title="Activated Countries"
        value={metrics.activated}
        icon={Flag}
        iconBgClassName="bg-violet-50 dark:bg-violet-500/15"
        iconFgClassName="text-violet-600 dark:text-violet-300"
        topAccentClassName="bg-violet-500"
        donutPercentage={pct(metrics.activated, metrics.total)}
        donutStrokeClassName="stroke-violet-500"
        primarySegment={{
          label: 'Activated',
          value: metrics.activated,
          percentage: pct(metrics.activated, metrics.total),
          dotClassName: 'bg-violet-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: remaining(metrics.activated),
          percentage: pct(remaining(metrics.activated), metrics.total),
          dotClassName: remainingDot,
        }}
        meta={
          metrics.total > 0
            ? `${pct(metrics.activated, metrics.total)}% with site activity`
            : '—'
        }
        tooltip="Countries with at least one site in initiated/activated/enrolling state, or country status set to Enrolling."
      />
    </div>
  );
}
