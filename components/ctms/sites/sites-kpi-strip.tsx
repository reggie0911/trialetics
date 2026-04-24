'use client';

import { useMemo, type ComponentType } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Hourglass,
  MoreVertical,
  TrendingUp,
  Users,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { AT_RISK_REASON_LABEL, type EnrichedSiteRow } from '@/lib/sites/derive';

interface SitesKpiStripProps {
  sites: EnrichedSiteRow[];
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

interface DonutChartProps {
  percentage: number;
  centerValue: string | number;
  centerLabel: string;
  fillStrokeClassName: string;
}

function DonutChart({
  percentage,
  centerValue,
  centerLabel,
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
        <span className="text-2xl font-medium leading-none tracking-tight text-foreground">
          {centerValue}
        </span>
        <span className="mt-1 text-[10px] font-medium text-muted-foreground">
          {centerLabel}
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
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClassName)} />
        <span className="truncate text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium text-foreground/90">
        {value}
        <span className="ml-1 text-muted-foreground">({percentage}%)</span>
      </span>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconBgClassName: string;
  iconFgClassName: string;
  topAccentClassName: string;
  donutCenterValue: string | number;
  donutLabel: string;
  donutPercentage: number;
  donutStrokeClassName: string;
  primarySegment: LegendSegment;
  secondarySegment: LegendSegment;
  tooltip?: string;
}

function KpiCard({
  title,
  icon: Icon,
  iconBgClassName,
  iconFgClassName,
  topAccentClassName,
  donutCenterValue,
  donutLabel,
  donutPercentage,
  donutStrokeClassName,
  primarySegment,
  secondarySegment,
  tooltip,
}: KpiCardProps) {
  return (
    <Card
      className="flex h-full flex-col gap-4 overflow-hidden border-border/70 p-0 shadow-none"
      title={tooltip}
    >
      <div className={cn('h-[3px] w-full shrink-0', topAccentClassName)} />

      <div className="flex h-full flex-col gap-4 px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                iconBgClassName,
              )}
            >
              <Icon className={cn('h-4 w-4', iconFgClassName)} />
            </span>
            <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-muted-foreground">
              {title}
            </p>
          </div>
          <span className="text-muted-foreground/70" aria-hidden="true">
            <MoreVertical className="h-4 w-4" />
          </span>
        </div>

        <DonutChart
          percentage={donutPercentage}
          centerValue={donutCenterValue}
          centerLabel={donutLabel}
          fillStrokeClassName={donutStrokeClassName}
        />

        <div className="mt-auto space-y-2 border-t border-border/60 pt-3">
          <LegendRow {...primarySegment} />
          <LegendRow {...secondarySegment} />
        </div>
      </div>
    </Card>
  );
}

export function SitesKpiStrip({ sites }: SitesKpiStripProps) {
  const metrics = useMemo(() => {
    const total = sites.length;
    const activated = sites.filter(
      (s) => s.status === 'activated' || s.status === 'enrolling',
    ).length;
    const enrolling = sites.filter((s) => s.status === 'enrolling').length;
    const startup = sites.filter(
      (s) =>
        s.status === 'identified' ||
        s.status === 'selected' ||
        s.status === 'initiated',
    ).length;
    const enrolled = sites.reduce((sum, s) => sum + s.enrolled, 0);
    const target = sites.reduce((sum, s) => sum + (s.target_enrollment || 0), 0);
    const atRisk = sites.filter((s) => s.isAtRisk);
    const reasonCounts = atRisk.reduce<Record<string, number>>((acc, s) => {
      for (const r of s.atRiskReasons) {
        acc[r] = (acc[r] ?? 0) + 1;
      }
      return acc;
    }, {});
    return {
      total,
      activated,
      enrolling,
      startup,
      enrolled,
      target,
      atRisk,
      reasonCounts,
    };
  }, [sites]);

  const atRiskTooltip = metrics.atRisk.length
    ? Object.entries(metrics.reasonCounts)
        .map(
          ([reason, count]) =>
            `${count} \u00D7 ${
              AT_RISK_REASON_LABEL[reason as keyof typeof AT_RISK_REASON_LABEL] ??
              reason
            }`,
        )
        .join(' \u00B7 ')
    : 'No sites currently flagged at risk.';

  const remaining = (count: number) => Math.max(metrics.total - count, 0);
  const remainingDot = 'bg-muted-foreground/30 dark:bg-muted-foreground/40';

  const enrolledRemaining = Math.max(metrics.target - metrics.enrolled, 0);
  const enrolledPercent = pct(metrics.enrolled, metrics.target);
  const enrolledRemainingPercent = Math.max(100 - enrolledPercent, 0);
  const atRiskCount = metrics.atRisk.length;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <KpiCard
        title="Total Sites"
        icon={Building2}
        iconBgClassName="bg-sky-50 dark:bg-sky-500/15"
        iconFgClassName="text-sky-600 dark:text-sky-300"
        topAccentClassName="bg-blue-500"
        donutCenterValue={metrics.total}
        donutLabel="Total"
        donutPercentage={metrics.total > 0 ? 100 : 0}
        donutStrokeClassName="stroke-blue-500"
        primarySegment={{
          label: 'Total Sites',
          value: metrics.total,
          percentage: metrics.total > 0 ? 100 : 0,
          dotClassName: 'bg-blue-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: 0,
          percentage: 0,
          dotClassName: remainingDot,
        }}
        tooltip="All sites linked to this study, regardless of activation state."
      />

      <KpiCard
        title="Activated"
        icon={CheckCircle2}
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        topAccentClassName="bg-emerald-500"
        donutCenterValue={metrics.activated}
        donutLabel="Activated"
        donutPercentage={pct(metrics.activated, metrics.total)}
        donutStrokeClassName="stroke-emerald-500"
        primarySegment={{
          label: 'Activated',
          value: metrics.activated,
          percentage: pct(metrics.activated, metrics.total),
          dotClassName: 'bg-emerald-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: remaining(metrics.activated),
          percentage: pct(remaining(metrics.activated), metrics.total),
          dotClassName: remainingDot,
        }}
        tooltip="Sites with status Activated or Enrolling."
      />

      <KpiCard
        title="Enrolling"
        icon={TrendingUp}
        iconBgClassName="bg-violet-50 dark:bg-violet-500/15"
        iconFgClassName="text-violet-600 dark:text-violet-300"
        topAccentClassName="bg-violet-500"
        donutCenterValue={metrics.enrolling}
        donutLabel="Enrolling"
        donutPercentage={pct(metrics.enrolling, metrics.total)}
        donutStrokeClassName="stroke-violet-500"
        primarySegment={{
          label: 'Enrolling',
          value: metrics.enrolling,
          percentage: pct(metrics.enrolling, metrics.total),
          dotClassName: 'bg-violet-500',
        }}
        secondarySegment={{
          label: 'Not Enrolling',
          value: remaining(metrics.enrolling),
          percentage: pct(remaining(metrics.enrolling), metrics.total),
          dotClassName: remainingDot,
        }}
        tooltip="Sites whose status is Enrolling."
      />

      <KpiCard
        title="Startup"
        icon={Hourglass}
        iconBgClassName="bg-amber-50 dark:bg-amber-500/15"
        iconFgClassName="text-amber-600 dark:text-amber-300"
        topAccentClassName="bg-amber-500"
        donutCenterValue={metrics.startup}
        donutLabel="Startup"
        donutPercentage={pct(metrics.startup, metrics.total)}
        donutStrokeClassName="stroke-amber-500"
        primarySegment={{
          label: 'In Pipeline',
          value: metrics.startup,
          percentage: pct(metrics.startup, metrics.total),
          dotClassName: 'bg-amber-500',
        }}
        secondarySegment={{
          label: 'Not in Pipeline',
          value: remaining(metrics.startup),
          percentage: pct(remaining(metrics.startup), metrics.total),
          dotClassName: remainingDot,
        }}
        tooltip="Sites in Identified, Selected, or Initiated status."
      />

      <KpiCard
        title="Enrolled / Target"
        icon={Users}
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        topAccentClassName="bg-teal-500"
        donutCenterValue={`${metrics.enrolled} / ${metrics.target}`}
        donutLabel="Enrolled"
        donutPercentage={enrolledPercent}
        donutStrokeClassName="stroke-emerald-500"
        primarySegment={{
          label: 'Enrolled',
          value: metrics.enrolled,
          percentage: enrolledPercent,
          dotClassName: 'bg-emerald-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: enrolledRemaining,
          percentage: enrolledRemainingPercent,
          dotClassName: remainingDot,
        }}
        tooltip="Live count of subjects (randomized, active, completed) over the sum of site enrollment targets."
      />

      <KpiCard
        title="At-Risk Sites"
        icon={AlertTriangle}
        iconBgClassName="bg-rose-50 dark:bg-rose-500/15"
        iconFgClassName="text-rose-600 dark:text-rose-300"
        topAccentClassName="bg-rose-500"
        donutCenterValue={atRiskCount}
        donutLabel="At-Risk"
        donutPercentage={pct(atRiskCount, metrics.total)}
        donutStrokeClassName="stroke-rose-500"
        primarySegment={{
          label: 'At-Risk',
          value: atRiskCount,
          percentage: pct(atRiskCount, metrics.total),
          dotClassName: 'bg-rose-500',
        }}
        secondarySegment={{
          label: 'Not At-Risk',
          value: remaining(atRiskCount),
          percentage: pct(remaining(atRiskCount), metrics.total),
          dotClassName: remainingDot,
        }}
        tooltip={atRiskTooltip}
      />
    </div>
  );
}
