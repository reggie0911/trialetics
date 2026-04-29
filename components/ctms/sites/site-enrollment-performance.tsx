'use client';

import { format } from 'date-fns';
import { ExternalLink, Info, LineChart as LineChartIcon } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  metricValueClass,
  metricValueClassDate24,
  metricValueClassNonTabular,
} from '@/components/ctms/metric-stat-tokens';
import { Card } from '@/components/ui/card';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SiteOverviewServerMetrics } from '@/lib/site-page-metrics';
import { cn } from '@/lib/utils';

const PURPLE_ACTUAL = '#7C3AED';
const GREY_EXPECTED = '#9CA3AF';
const PURPLE_FORECAST = '#A78BFA';

const cta11 =
  'text-[11px] font-medium text-sky-600 underline-offset-2 transition-colors hover:underline dark:text-sky-400 dark:hover:text-sky-300 hover:text-sky-700';

type Props = {
  chart: SiteOverviewServerMetrics['enrollmentChart'];
  enrolledCount: number;
  className?: string;
  /** e.g. switch to Subjects tab */
  onViewEnrollmentPlan?: () => void;
};

function formatDelayMonths(n: number): { label: string; tone: 'late' | 'ok' } {
  if (n <= 0) return { label: 'On Track', tone: 'ok' };
  return { label: `${n} month${n === 1 ? '' : 's'} delay`, tone: 'late' };
}

export function SiteEnrollmentPerformance({ chart, enrolledCount, className, onViewEnrollmentPlan }: Props) {
  const data = chart.points.map((p) => ({
    month: p.month,
    actual: p.actual,
    expected: p.expected,
    forecast: p.forecast,
  }));
  const planDate = chart.planCompletionDateIso ? new Date(chart.planCompletionDateIso) : null;
  const projDate = chart.projectedCompletionDateIso ? new Date(chart.projectedCompletionDateIso) : null;
  const dateFmt = (d: Date) => format(d, 'MMM d, yyyy');

  const t = chart.targetEnrollment > 0 ? chart.targetEnrollment : 20;
  const maxY = Math.max(
    t,
    enrolledCount,
    ...data.map((d) => Math.max(d.actual, d.expected, d.forecast), 0),
  );
  const yMax = Math.ceil((maxY + 2) / 5) * 5;
  const actualPct =
    chart.targetEnrollment > 0 ? Math.min(100, Math.round((enrolledCount / chart.targetEnrollment) * 100)) : null;

  const delay = formatDelayMonths(chart.monthsBehind);

  return (
    <TooltipProvider delay={200}>
    <Card className={cn('min-w-0 gap-0 overflow-hidden border-border/70 py-0 shadow-none', className)}>
        <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
            >
              <LineChartIcon className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3
                  data-slot="card-title"
                  className="!text-[12px] font-medium leading-tight text-foreground"
                >
                  Enrollment Performance
                </h3>
                <UiTooltip>
                  <TooltipTrigger
                    type="button"
                    className="rounded text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="About this chart"
                  >
                    <Info className="h-3.5 w-3.5" strokeWidth={2} />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs" side="bottom">
                    Cumulative enrolled subjects. Expected follows a linear plan to the enrollment target. Forecast
                    extends recent monthly enrollment to estimate completion. Approximate, not a protocol commitment.
                  </TooltipContent>
                </UiTooltip>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                Actual, expected, and forecast to plan completion dates
              </p>
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-5 px-4 pb-4 pt-0 sm:px-5 sm:pb-5 md:grid-cols-1 md:gap-4 xl:grid-cols-12 xl:items-stretch xl:gap-0 xl:divide-x xl:divide-border/60"
        >
          {/* Left: KPIs ~20% */}
          <div className="flex h-full min-h-0 flex-col gap-2 border-border/40 pb-0 xl:col-span-2 xl:min-w-0 xl:pr-4">
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Target</p>
                <p className={cn('mt-1.5', metricValueClass)}>
                  <span className="text-base">
                  {chart.targetEnrollment > 0 ? chart.targetEnrollment : '—'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Actual</p>
                <p className={cn('mt-1.5', metricValueClass, 'text-[#7C3AED]')}>
                  <span className="text-base">{enrolledCount}</span>
                  {actualPct != null && (
                    <span className="pl-1 text-[11px] font-medium text-muted-foreground">({actualPct}%)</span>
                  )}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Expected by now</p>
                  <UiTooltip>
                    <TooltipTrigger
                      type="button"
                      className="text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      aria-label="How expected is calculated"
                    >
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs" side="bottom">
                      Linear share of the enrollment target from first planned month to plan end, evaluated at the
                      current month.
                    </TooltipContent>
                  </UiTooltip>
                </div>
                <p className={cn('mt-1.5', metricValueClass)}>
                  <span className="text-base">{chart.expectedByNow}</span>
                </p>
              </div>
            </div>
            {onViewEnrollmentPlan ? (
              <button
                type="button"
                onClick={onViewEnrollmentPlan}
                className={cn('inline-flex w-fit items-center gap-1', cta11)}
              >
                View enrollment plan
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
              </button>
            ) : null}
          </div>

          {/* Center: chart ~60% */}
          <div className="min-h-[240px] min-w-0 py-0 xl:col-span-8 xl:px-3" role="img" aria-label="Cumulative enrolled subjects by month.">
            <div className="h-[220px] w-full sm:h-[240px] lg:h-[min(18rem,28vh)] lg:min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data}
                  margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} className="fill-muted-foreground" tickMargin={4} />
                  <YAxis
                    domain={[0, yMax]}
                    allowDecimals={false}
                    width={32}
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    tickCount={5}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    labelStyle={{ color: 'var(--foreground)' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="center"
                    iconType="line"
                    wrapperStyle={{ fontSize: 12, paddingBottom: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual"
                    stroke={PURPLE_ACTUAL}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expected"
                    name="Expected"
                    stroke={GREY_EXPECTED}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Forecast"
                    stroke={PURPLE_FORECAST}
                    strokeWidth={2}
                    strokeDasharray="2 4"
                    dot={{ r: 3, fill: 'white', stroke: PURPLE_FORECAST, strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: forecast ~20% */}
          <div className="flex flex-col justify-start xl:col-span-2 xl:min-w-0 xl:pl-4">
            <div className="space-y-0 overflow-hidden rounded-lg border border-violet-200/60 bg-violet-50/50 dark:border-violet-500/20 dark:bg-violet-500/5">
              <div className="px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">At current pace</p>
                <p
                  className={cn(
                    'mt-1.5',
                    metricValueClassNonTabular,
                    'text-base',
                    delay.tone === 'late'
                      ? 'text-orange-600 dark:text-orange-500'
                      : 'text-emerald-600 dark:text-emerald-500',
                  )}
                >
                  {delay.label}
                </p>
              </div>
              <div className="h-px bg-border/50 dark:bg-border/40" />
              <div className="px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">Projected completion</p>
                <p className={cn('mt-1.5 break-words', metricValueClassDate24, 'text-base')}>{projDate ? dateFmt(projDate) : '—'}</p>
              </div>
              <div className="h-px bg-border/50 dark:bg-border/40" />
              <div className="px-3 py-2 sm:px-4 sm:py-2.5">
                <p className="text-[10px] font-normal text-black dark:text-foreground">Plan completion</p>
                <p className={cn('mt-1.5 break-words', metricValueClassDate24, 'text-base')}>{planDate ? dateFmt(planDate) : '—'}</p>
              </div>
            </div>
          </div>
        </div>
    </Card>
    </TooltipProvider>
  );
}
