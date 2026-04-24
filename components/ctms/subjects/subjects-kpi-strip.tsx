'use client';

import { useMemo, type ComponentType } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Filter,
  MoreVertical,
  Search,
  Users,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getDataReviewPendingCount } from '@/lib/subjects/derive';
import type { EnrollmentFunnelData, SubjectWithSite } from '@/lib/types/ctms';

interface SubjectsKpiStripProps {
  funnel: EnrollmentFunnelData;
  subjects: SubjectWithSite[];
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

export function SubjectsKpiStrip({ funnel, subjects }: SubjectsKpiStripProps) {
  const dataReviewPending = useMemo(
    () => getDataReviewPendingCount(subjects),
    [subjects],
  );

  const total = funnel.total;
  const remaining = (count: number) => Math.max(total - count, 0);
  const remainingDot = 'bg-muted-foreground/30 dark:bg-muted-foreground/40';

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <KpiCard
        title="Total Subjects"
        icon={Users}
        iconBgClassName="bg-sky-50 dark:bg-sky-500/15"
        iconFgClassName="text-sky-600 dark:text-sky-300"
        topAccentClassName="bg-blue-500"
        donutCenterValue={total}
        donutLabel="Total"
        donutPercentage={total > 0 ? 100 : 0}
        donutStrokeClassName="stroke-blue-500"
        primarySegment={{
          label: 'Enrolled',
          value: total,
          percentage: total > 0 ? 100 : 0,
          dotClassName: 'bg-blue-500',
        }}
        secondarySegment={{
          label: 'Not Enrolled',
          value: 0,
          percentage: 0,
          dotClassName: remainingDot,
        }}
        tooltip="Every subject record linked to this study, regardless of status."
      />

      <KpiCard
        title="Pre-Screening"
        icon={Search}
        iconBgClassName="bg-slate-100 dark:bg-slate-500/15"
        iconFgClassName="text-slate-600 dark:text-slate-300"
        topAccentClassName="bg-slate-600"
        donutCenterValue={funnel.preScreening}
        donutLabel="Pre-Screened"
        donutPercentage={pct(funnel.preScreening, total)}
        donutStrokeClassName="stroke-slate-600"
        primarySegment={{
          label: 'Pre-Screened',
          value: funnel.preScreening,
          percentage: pct(funnel.preScreening, total),
          dotClassName: 'bg-slate-600',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: remaining(funnel.preScreening),
          percentage: pct(remaining(funnel.preScreening), total),
          dotClassName: remainingDot,
        }}
        tooltip="Subjects in the Pre-Screening stage."
      />

      <KpiCard
        title="Screening"
        icon={Filter}
        iconBgClassName="bg-amber-50 dark:bg-amber-500/15"
        iconFgClassName="text-amber-600 dark:text-amber-300"
        topAccentClassName="bg-orange-500"
        donutCenterValue={funnel.screening}
        donutLabel="Screening"
        donutPercentage={pct(funnel.screening, total)}
        donutStrokeClassName="stroke-orange-500"
        primarySegment={{
          label: 'Screening',
          value: funnel.screening,
          percentage: pct(funnel.screening, total),
          dotClassName: 'bg-orange-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: remaining(funnel.screening),
          percentage: pct(remaining(funnel.screening), total),
          dotClassName: remainingDot,
        }}
        tooltip="Subjects currently in Screening."
      />

      <KpiCard
        title="Randomized"
        icon={CheckCircle2}
        iconBgClassName="bg-violet-50 dark:bg-violet-500/15"
        iconFgClassName="text-violet-600 dark:text-violet-300"
        topAccentClassName="bg-violet-500"
        donutCenterValue={funnel.randomized}
        donutLabel="Randomized"
        donutPercentage={pct(funnel.randomized, total)}
        donutStrokeClassName="stroke-violet-500"
        primarySegment={{
          label: 'Randomized',
          value: funnel.randomized,
          percentage: pct(funnel.randomized, total),
          dotClassName: 'bg-violet-500',
        }}
        secondarySegment={{
          label: 'Remaining',
          value: remaining(funnel.randomized),
          percentage: pct(remaining(funnel.randomized), total),
          dotClassName: remainingDot,
        }}
        tooltip="Subjects randomized to a treatment arm."
      />

      <KpiCard
        title="Active"
        icon={Activity}
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        topAccentClassName="bg-emerald-500"
        donutCenterValue={funnel.active}
        donutLabel="Active"
        donutPercentage={pct(funnel.active, total)}
        donutStrokeClassName="stroke-emerald-500"
        primarySegment={{
          label: 'Active',
          value: funnel.active,
          percentage: pct(funnel.active, total),
          dotClassName: 'bg-emerald-500',
        }}
        secondarySegment={{
          label: 'Inactive',
          value: remaining(funnel.active),
          percentage: pct(remaining(funnel.active), total),
          dotClassName: remainingDot,
        }}
        tooltip="Subjects whose status is Active."
      />

      <KpiCard
        title="Data Review Pending"
        icon={ClipboardList}
        iconBgClassName="bg-rose-50 dark:bg-rose-500/15"
        iconFgClassName="text-rose-600 dark:text-rose-300"
        topAccentClassName="bg-rose-500"
        donutCenterValue={dataReviewPending}
        donutLabel="Pending Review"
        donutPercentage={pct(dataReviewPending, total)}
        donutStrokeClassName="stroke-rose-500"
        primarySegment={{
          label: 'Pending Review',
          value: dataReviewPending,
          percentage: pct(dataReviewPending, total),
          dotClassName: 'bg-rose-500',
        }}
        secondarySegment={{
          label: 'Reviewed',
          value: remaining(dataReviewPending),
          percentage: pct(remaining(dataReviewPending), total),
          dotClassName: remainingDot,
        }}
        tooltip="Subjects with data entered but Source Data Verification (SDV) not yet complete."
      />
    </div>
  );
}
