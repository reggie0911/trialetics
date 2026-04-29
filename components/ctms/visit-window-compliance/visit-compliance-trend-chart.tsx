'use client';

import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Card } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { VisitWindowComplianceBundle } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

interface VisitComplianceTrendChartProps {
  data: VisitWindowComplianceBundle['complianceTrend'];
  className?: string;
}

const SERIES = {
  in_window_pct: { label: 'In Window %', color: 'hsl(142 71% 45%)' },
  overdue_pct: { label: 'Overdue %', color: 'hsl(0 84% 60%)' },
} as const;

const CHART_CONFIG = SERIES satisfies ChartConfig;

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Compact swatch + label rendered next to the title in the card header so the
 *  chart body stays free of legend chrome. */
function LegendSwatch({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <span
        aria-hidden="true"
        className="block h-0.5 w-3.5 rounded"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

/**
 * Footer card showing the last 7 days of in-window % and overdue % as
 * overlaid line series. Designed for the By Site tab so program leads can
 * spot a creeping overdue trend before it becomes a portfolio risk.
 */
export function VisitComplianceTrendChart({
  data,
  className,
}: VisitComplianceTrendChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        day: formatDayLabel(d.day),
        in_window_pct: d.in_window_pct,
        overdue_pct: d.overdue_pct,
      })),
    [data],
  );

  return (
    <Card
      className={cn(
        'flex h-full w-full flex-col border-border/70 py-0 shadow-none',
        className,
      )}
    >
      <div className="px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            <Activity className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              data-slot="card-title"
              className="!text-[12px] font-medium leading-tight text-foreground"
            >
              Visit Compliance Trend
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Last 7 days — in-window % vs overdue % of visits in this view
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <LegendSwatch
                label={SERIES.in_window_pct.label}
                color={SERIES.in_window_pct.color}
              />
              <LegendSwatch
                label={SERIES.overdue_pct.label}
                color={SERIES.overdue_pct.color}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="min-w-0 px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-[11px] text-muted-foreground">
            No visit activity in the last 7 days.
          </p>
        ) : (
          <ChartContainer config={CHART_CONFIG} className="h-[180px] w-full">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                width={38}
                domain={[0, 100]}
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: 3 }}
                content={<ChartTooltipContent />}
              />
              <Line
                type="monotone"
                dataKey="in_window_pct"
                stroke="var(--color-in_window_pct)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="overdue_pct"
                stroke="var(--color-overdue_pct)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </Card>
  );
}
