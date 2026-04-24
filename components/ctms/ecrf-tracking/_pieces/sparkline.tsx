'use client';

import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

import { cn } from '@/lib/utils';

interface SparklineProps {
  /** Daily values, oldest-first. The component renders `points.length - 1` segments. */
  points: { day: string; value: number }[];
  /** Tailwind color class for the stroke + gradient (e.g. `text-blue-500`). */
  toneClassName?: string;
  /** Override the chart height; defaults to a 32px strip suited to a KPI card footer. */
  heightClassName?: string;
  /** Tooltip label prefix (e.g. "CRFs entered"). When omitted no tooltip is shown. */
  tooltipLabel?: string;
}

/**
 * Tiny axis-less area chart used inside KPI cards to show 7-day momentum.
 * Built on Recharts so the codebase keeps a single charting dependency. The
 * stroke + fill gradient inherit `currentColor` from a Tailwind text class so
 * the parent decides the accent (info/success/warn/critical).
 */
export function Sparkline({
  points,
  toneClassName = 'text-blue-500',
  heightClassName = 'h-8',
  tooltipLabel,
}: SparklineProps) {
  const gradientId = useId();
  const data = points.map((p, i) => ({ ...p, x: i }));
  const allZero = data.every((d) => d.value === 0);

  return (
    <div
      className={cn('w-full', heightClassName, toneClassName, allZero && 'opacity-40')}
      aria-hidden={!tooltipLabel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.45} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          {tooltipLabel && (
            <Tooltip
              cursor={false}
              wrapperStyle={{ outline: 'none' }}
              contentStyle={{
                fontSize: 11,
                padding: '4px 6px',
                borderRadius: 4,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value) => [String(value ?? ''), tooltipLabel] as [string, string]}
              labelFormatter={(_label, payload) => {
                const day = (payload?.[0]?.payload as { day?: string })?.day;
                if (!day) return '';
                return new Date(day).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="currentColor"
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
