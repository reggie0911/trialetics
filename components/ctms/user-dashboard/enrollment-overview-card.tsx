'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardEnrollmentOverview, DashboardEnrollmentSegment } from '@/lib/dashboard/ctms-dashboard-overview';

export function EnrollmentOverviewCard({ enrollment }: { enrollment: DashboardEnrollmentOverview }) {
  const { resolvedTheme } = useTheme();

  const totalStudies = useMemo(
    () => enrollment.segments.reduce((acc, seg) => acc + seg.count, 0),
    [enrollment.segments],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold">Enrollment Overview</CardTitle>
          <span className="text-xs text-muted-foreground">(All Studies)</span>
        </div>
        <Link
          href="/protected/studies/catalog"
          className="text-xs font-medium text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
        >
          View full report
        </Link>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="flex items-center gap-5">
          <DonutChart
            segments={enrollment.segments}
            total={totalStudies}
            enrolled={enrollment.enrolled}
            target={enrollment.target}
            percent={enrollment.percent}
            isDark={resolvedTheme === 'dark'}
          />
          <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
            {enrollment.segments.map((seg) => (
              <li
                key={seg.key}
                className="flex w-full min-w-0 items-center justify-between gap-3 text-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate font-medium text-foreground">{seg.label}</span>
                </div>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {seg.count} {seg.count === 1 ? 'study' : 'studies'}
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
  segments: DashboardEnrollmentSegment[];
  total: number;
  enrolled: number;
  target: number;
  percent: number;
  isDark: boolean;
}

function DonutChart({ segments, total, enrolled, target, percent, isDark }: DonutChartProps) {
  const size = 144;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const trackColor = isDark ? 'rgb(39 39 42)' : 'rgb(241 245 249)';

  const visibleSegments = segments.filter((s) => s.count > 0);
  const gapPx = visibleSegments.length > 1 ? 4 : 0;

  const arcs = visibleSegments.reduce<Array<DashboardEnrollmentSegment & { dasharray: string; dashoffset: number }>>((acc, seg) => {
    const cumulative = acc.reduce((sum, arc) => sum + (total > 0 ? (arc.count / total) * circumference : 0), 0);
    const proportion = total > 0 ? seg.count / total : 0;
    const segmentLength = Math.max(0, proportion * circumference - gapPx);
    acc.push({
      ...seg,
      dasharray: `${segmentLength} ${circumference - segmentLength}`,
      dashoffset: -cumulative,
    });
    return acc;
  }, []);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Enrollment overview: ${enrolled} of ${target} enrolled (${percent}% of target)`}
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
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
          {enrolled.toLocaleString()}
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Enrolled
        </span>
        <span className="mt-1 text-[10px] tabular-nums text-muted-foreground">
          of {target.toLocaleString()} Target
        </span>
        <span className="mt-0.5 text-xs font-semibold tabular-nums text-foreground">{percent}%</span>
      </div>
    </div>
  );
}
