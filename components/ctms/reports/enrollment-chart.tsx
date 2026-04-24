'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EnrollmentDataPoint } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

interface EnrollmentChartProps {
  data: EnrollmentDataPoint[];
  title?: string;
}

type SeriesKey = 'planned' | 'actual' | 'forecast' | 'target';

const SERIES_META: Record<
  SeriesKey,
  {
    label: string;
    stroke: string;
    dashed?: boolean;
    showDot?: boolean;
  }
> = {
  planned: { label: 'Planned', stroke: '#c9cdd4', dashed: true, showDot: true },
  actual: { label: 'Actual', stroke: '#2f6df6', showDot: true },
  forecast: { label: 'Forecast', stroke: '#2dcb8f', dashed: true, showDot: true },
  target: { label: 'Target', stroke: '#b24dff', dashed: true },
};

function hasSeries(data: EnrollmentDataPoint[], key: SeriesKey) {
  return data.some((item) => {
    const value = item[key];
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  });
}

function formatMonthLabel(month: string): {
  monthLabel: string;
  yearLabel: string;
  monthNumber: number | null;
} {
  const parsed = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { monthLabel: month, yearLabel: '', monthNumber: null };
  }

  return {
    monthLabel: parsed.toLocaleDateString('en-US', { month: 'short' }),
    yearLabel: parsed.toLocaleDateString('en-US', { year: 'numeric' }),
    monthNumber: parsed.getMonth() + 1,
  };
}

function CustomMonthTick(props: {
  x?: number;
  y?: number;
  index?: number;
  payload?: { value: string };
}) {
  const { x = 0, y = 0, index = 0, payload } = props;
  const { monthLabel, yearLabel, monthNumber } = formatMonthLabel(payload?.value ?? '');
  const showYear = index === 0 || monthNumber === 1;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor="middle"
        className="fill-muted-foreground text-[11px]"
      >
        <tspan x="0" dy="0">
          {monthLabel}
        </tspan>
        {showYear ? (
          <tspan x="0" dy="12">
            {yearLabel}
          </tspan>
        ) : null}
      </text>
    </g>
  );
}

function EnrollmentLegend({ data }: { data: EnrollmentDataPoint[] }) {
  const items = (Object.keys(SERIES_META) as SeriesKey[]).filter((key) =>
    hasSeries(data, key),
  );

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {items.map((key) => {
        const series = SERIES_META[key];
        return (
          <div key={key} className="flex items-center gap-2 text-muted-foreground">
            <span className="relative flex w-7 items-center justify-center">
              <span
                className={cn('block h-0.5 w-7', series.dashed ? 'border-t-2 border-dashed bg-transparent' : '')}
                style={
                  series.dashed
                    ? { borderColor: series.stroke }
                    : { backgroundColor: series.stroke }
                }
              />
              {series.showDot ? (
                <span
                  className="absolute h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: series.stroke }}
                />
              ) : null}
            </span>
            <span>{series.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function EnrollmentTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; stroke?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const monthLabel = (() => {
    const parsed = new Date(`${label ?? ''}-01T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return label ?? '';
    return parsed.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  })();

  const rows = payload.filter((item) => {
    if (!item.dataKey) return false;
    return typeof item.value === 'number' && Number.isFinite(item.value);
  });

  if (rows.length === 0) return null;

  return (
    <div className="min-w-[170px] rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm shadow-xl">
      <p className="mb-3 text-lg font-semibold tracking-tight">{monthLabel}</p>
      <div className="space-y-2">
        {rows.map((item) => {
          const key = item.dataKey as SeriesKey;
          const meta = SERIES_META[key];
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.stroke || meta.stroke }}
                />
                <span className="text-muted-foreground">{meta.label}:</span>
              </div>
              <span className="font-medium">{item.value?.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EnrollmentChart({ data, title = 'Enrollment Curve' }: EnrollmentChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border/70 py-0">
        <CardHeader className="px-5 pb-2 pt-5">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No enrollment data available yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delay={200}>
      <Card className="border-border/70 py-0">
        <CardHeader className="space-y-3 px-5 pb-0 pt-5">
          <UiTooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <CardTitle>{title}</CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              Enrollment trend versus plan, forecast, and target across the study timeline.
            </TooltipContent>
          </UiTooltip>
          <EnrollmentLegend data={data} />
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-1">
          <div className="relative h-[300px] w-full min-w-0">
            <div className="pointer-events-none absolute left-1 top-2 text-xs font-medium text-muted-foreground">
              Subjects
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 32, right: 18, left: 6, bottom: 34 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgb(229 231 235)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={<CustomMonthTick />}
                tickMargin={10}
                minTickGap={42}
                height={58}
                interval={2}
              />
              <YAxis
                tick={{ fill: 'rgb(107 114 128)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={34}
              />
              <Tooltip
                cursor={{ stroke: 'rgb(220 224 232)', strokeDasharray: '3 3' }}
                content={<EnrollmentTooltip />}
              />

              {hasSeries(data, 'planned') ? (
                <Line
                  type="monotone"
                  dataKey="planned"
                  stroke={SERIES_META.planned.stroke}
                  strokeWidth={2.5}
                  strokeDasharray="6 6"
                  dot={{
                    r: 3,
                    fill: SERIES_META.planned.stroke,
                    stroke: '#ffffff',
                    strokeWidth: 1,
                  }}
                  activeDot={{
                    r: 4,
                    fill: SERIES_META.planned.stroke,
                    stroke: '#ffffff',
                    strokeWidth: 1.5,
                  }}
                  name="Planned"
                />
              ) : null}

              <Line
                type="monotone"
                dataKey="actual"
                stroke={SERIES_META.actual.stroke}
                strokeWidth={3}
                dot={{
                  r: 3.5,
                  fill: SERIES_META.actual.stroke,
                  stroke: '#ffffff',
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 5,
                  fill: SERIES_META.actual.stroke,
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                connectNulls={false}
                name="Actual"
              />

              {hasSeries(data, 'forecast') ? (
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={SERIES_META.forecast.stroke}
                  strokeWidth={2.5}
                  strokeDasharray="6 6"
                  dot={{
                    r: 3.5,
                    fill: SERIES_META.forecast.stroke,
                    stroke: '#ffffff',
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5,
                    fill: SERIES_META.forecast.stroke,
                    stroke: '#ffffff',
                    strokeWidth: 1.5,
                  }}
                  connectNulls
                  name="Forecast"
                />
              ) : null}

              {hasSeries(data, 'target') ? (
                <Line
                  type="linear"
                  dataKey="target"
                  stroke={SERIES_META.target.stroke}
                  strokeWidth={2.5}
                  strokeDasharray="6 6"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  name="Target"
                />
              ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
