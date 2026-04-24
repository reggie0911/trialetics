'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  in_window_pct: { label: 'In window %', color: 'hsl(142 71% 45%)' },
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
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className="block h-0.5 w-3 rounded"
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
    <Card className={cn('h-full w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium">
          Visit Compliance Trend (Last 7 Days)
        </CardTitle>
        <div className="flex items-center gap-3">
          <LegendSwatch
            label={SERIES.in_window_pct.label}
            color={SERIES.in_window_pct.color}
          />
          <LegendSwatch
            label={SERIES.overdue_pct.label}
            color={SERIES.overdue_pct.color}
          />
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
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
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10 }}
                width={36}
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
      </CardContent>
    </Card>
  );
}
