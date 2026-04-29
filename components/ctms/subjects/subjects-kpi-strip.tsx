'use client';

import { useMemo, type ComponentType } from 'react';
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Filter,
  Info,
  Search,
  Users,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="max-w-full min-w-0 !text-[30px] font-medium leading-[1.05] tabular-nums tracking-tight text-foreground text-balance">
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
    <div className="flex w-full min-w-0 items-baseline justify-between gap-2 text-left text-[11px] leading-snug">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClassName)} />
        <span className="min-w-0 font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="shrink-0 whitespace-nowrap text-right">
        <span className="tabular-nums font-medium text-foreground">{value}</span>
        <span className="text-muted-foreground"> ({percentage}%)</span>
      </div>
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
  donutPercentage: number;
  donutStrokeClassName: string;
  primarySegment: LegendSegment;
  secondarySegment: LegendSegment;
  meta?: string;
  tooltip?: string;
}

function KpiCard({
  title,
  icon: Icon,
  iconBgClassName,
  iconFgClassName,
  topAccentClassName,
  donutCenterValue,
  donutPercentage,
  donutStrokeClassName,
  primarySegment,
  secondarySegment,
  meta,
  tooltip,
}: KpiCardProps) {
  return (
    <Card className="flex h-full min-h-0 w-full flex-col gap-0 overflow-hidden border-border/70 p-0 py-0 shadow-none">
      <div className={cn('h-[3px] w-full shrink-0', topAccentClassName)} />

      <div className="flex min-h-0 flex-1 flex-col gap-0 px-4 py-3.5">
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <p
            data-slot="stat-card-title"
            className="min-w-0 flex-1 text-balance !text-[12px] font-medium leading-tight text-muted-foreground"
          >
            {title}
          </p>
          <span
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10',
              iconBgClassName,
            )}
          >
            <Icon
              className={cn('h-3.5 w-3.5 shrink-0 opacity-90', iconFgClassName)}
            />
          </span>
        </div>

        <div className="mt-3 flex w-full justify-center">
          <DonutChart
            percentage={donutPercentage}
            centerValue={donutCenterValue}
            fillStrokeClassName={donutStrokeClassName}
          />
        </div>

        {meta ? (
          <div className="mt-3 w-full">
            <div className="flex w-full justify-start">
              {tooltip ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-left text-[11px] font-medium text-[#000000] outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring/50 dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]"
                        aria-label={`${title} — more detail`}
                      >
                        <Info
                          className="h-3 w-3 shrink-0 text-[#000000] opacity-80"
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {meta}
                        </span>
                      </button>
                    }
                  />
                  <TooltipContent
                    side="top"
                    className="max-w-xs text-left text-xs text-balance"
                  >
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#000000] dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]">
                  <Info className="h-3 w-3 shrink-0 text-[#000000] opacity-80" aria-hidden />
                  <span className="truncate">{meta}</span>
                </span>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-3 w-full min-w-0 space-y-1.5 border-t border-border/50 pt-2.5">
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
        meta="Full study roster, any status"
        tooltip="Every subject record linked to this study, regardless of status."
      />

      <KpiCard
        title="Pre-Screening"
        icon={Search}
        iconBgClassName="bg-slate-100 dark:bg-slate-500/15"
        iconFgClassName="text-slate-600 dark:text-slate-300"
        topAccentClassName="bg-slate-600"
        donutCenterValue={funnel.preScreening}
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
        meta="Pre-screen funnel (vs all subjects)"
        tooltip="Subjects in the Pre-Screening stage."
      />

      <KpiCard
        title="Screening"
        icon={Filter}
        iconBgClassName="bg-amber-50 dark:bg-amber-500/15"
        iconFgClassName="text-amber-600 dark:text-amber-300"
        topAccentClassName="bg-orange-500"
        donutCenterValue={funnel.screening}
        donutPercentage={pct(funnel.screening, total)}
        donutStrokeClassName="stroke-orange-500"
        primarySegment={{
          label: 'In screening',
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
        meta="Currently in screening (vs all)"
        tooltip="Subjects currently in Screening."
      />

      <KpiCard
        title="Randomized"
        icon={CheckCircle2}
        iconBgClassName="bg-violet-50 dark:bg-violet-500/15"
        iconFgClassName="text-violet-600 dark:text-violet-300"
        topAccentClassName="bg-violet-500"
        donutCenterValue={funnel.randomized}
        donutPercentage={pct(funnel.randomized, total)}
        donutStrokeClassName="stroke-violet-500"
        primarySegment={{
          label: 'In arm',
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
        meta="Randomized to a treatment arm"
        tooltip="Subjects randomized to a treatment arm."
      />

      <KpiCard
        title="Active"
        icon={Activity}
        iconBgClassName="bg-emerald-50 dark:bg-emerald-500/15"
        iconFgClassName="text-emerald-600 dark:text-emerald-300"
        topAccentClassName="bg-emerald-500"
        donutCenterValue={funnel.active}
        donutPercentage={pct(funnel.active, total)}
        donutStrokeClassName="stroke-emerald-500"
        primarySegment={{
          label: 'Ongoing',
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
        meta="Active on-study (vs all subjects)"
        tooltip="Subjects whose status is Active."
      />

      <KpiCard
        title="Data Review Pending"
        icon={ClipboardList}
        iconBgClassName="bg-rose-50 dark:bg-rose-500/15"
        iconFgClassName="text-rose-600 dark:text-rose-300"
        topAccentClassName="bg-rose-500"
        donutCenterValue={dataReviewPending}
        donutPercentage={pct(dataReviewPending, total)}
        donutStrokeClassName="stroke-rose-500"
        primarySegment={{
          label: 'With open SDV',
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
        meta="SDV not yet complete (vs all)"
        tooltip="Subjects with data entered but Source Data Verification (SDV) not yet complete."
      />
    </div>
  );
}
