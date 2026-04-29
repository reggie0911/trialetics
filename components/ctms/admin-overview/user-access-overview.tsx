'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ROLE_BUCKET_LABEL,
  type AdminOverviewProps,
  type RoleBucket,
} from '@/lib/dashboard/get-admin-overview-props';

interface UserAccessOverviewProps {
  roleBreakdown: AdminOverviewProps['roleBreakdown'];
  userCount: number;
}

const SEGMENTS: Array<{ key: RoleBucket; color: string }> = [
  { key: 'admin', color: '#3b82f6' },
  { key: 'study_manager', color: '#10b981' },
  { key: 'cra', color: '#f59e0b' },
  { key: 'other', color: '#a855f7' },
];

export function UserAccessOverview({ roleBreakdown, userCount }: UserAccessOverviewProps) {
  const { resolvedTheme } = useTheme();

  const segments = useMemo(
    () =>
      SEGMENTS.map((seg) => ({
        ...seg,
        label: ROLE_BUCKET_LABEL[seg.key],
        count: roleBreakdown[seg.key] ?? 0,
      })),
    [roleBreakdown],
  );

  const total = userCount;

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base font-semibold">User Access Overview</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex items-center gap-5">
          <DonutChart
            total={total}
            segments={segments}
            isDark={resolvedTheme === 'dark'}
          />
          <ul className="flex min-w-0 flex-1 flex-col gap-3">
            {segments.map((segment) => (
              <li
                key={segment.key}
                className="flex w-full min-w-0 items-center justify-between gap-3 text-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="truncate font-medium text-foreground">{segment.label}</span>
                </div>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {segment.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

interface DonutChartProps {
  total: number;
  segments: Array<{ key: RoleBucket; label: string; color: string; count: number }>;
  isDark: boolean;
}

/**
 * Single-ring multi-segment donut. Each role takes a slice of the same circle
 * proportional to its count; small gaps separate adjacent segments.
 */
function DonutChart({ total, segments, isDark }: DonutChartProps) {
  const size = 144;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const trackColor = isDark ? 'rgb(39 39 42)' : 'rgb(241 245 249)';

  // Visual gap between adjacent segments. Skipped when only one segment has
  // count > 0 so a 100% slice still looks like a continuous ring.
  const visibleSegments = segments.filter((s) => s.count > 0);
  const gapPx = visibleSegments.length > 1 ? 4 : 0;

  let cumulative = 0;
  const arcs = visibleSegments.map((seg) => {
    const proportion = seg.count / total;
    const segmentLength = Math.max(0, proportion * circumference - gapPx);
    const offset = -cumulative;
    cumulative += proportion * circumference;
    return {
      ...seg,
      dasharray: `${segmentLength} ${circumference - segmentLength}`,
      dashoffset: offset,
    };
  });

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`User access: ${segments.map((s) => `${s.count} ${s.label}`).join(', ')}`}
    >
      {total === 0 ? (
        <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
          0
        </div>
      ) : (
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={arc.dasharray}
              strokeDashoffset={arc.dashoffset}
            />
          ))}
        </svg>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
          {total}
        </span>
        <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Total Users
        </span>
      </div>
    </div>
  );
}
