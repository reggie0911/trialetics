'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OrgInsightsSnapshot } from '@/lib/directory/live-directory-types';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

interface OrganizationsInsightsCardProps {
  insights: OrgInsightsSnapshot;
}

export function OrganizationsInsightsCard({
  insights,
}: OrganizationsInsightsCardProps) {
  const totalForDonut = insights.enrollmentBuckets.reduce((acc, b) => acc + b.count, 0);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium text-foreground">Organization Insights</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-5">
        <section className="space-y-2">
          <h4 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Sites by Enrollment
          </h4>
          {totalForDonut === 0 ? (
            <DirectoryEmptyState
              title="Enrollment not tracked"
              description="Site enrollment appears here once live subject/site data exists."
              className="border-0 bg-transparent py-4"
            />
          ) : (
            <div className="flex items-center gap-3">
              <Donut buckets={insights.enrollmentBuckets} total={totalForDonut} />
              <ul className="flex-1 space-y-1.5">
                {insights.enrollmentBuckets.map((b) => (
                <li
                  key={b.key}
                  className="flex items-center justify-between gap-2 text-[11px] leading-snug"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    <span className="text-muted-foreground truncate">{b.label}</span>
                  </span>
                  <span className="text-foreground tabular-nums shrink-0">{b.count}</span>
                </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="space-y-2 border-t border-border/60 pt-4">
          <div className="space-y-0.5">
            <h4 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Organizations by Region
            </h4>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Regional spread based on organization country or region fields.
            </p>
          </div>
          {insights.regionCounts.length === 0 ? (
            <DirectoryEmptyState
              title="No regions yet"
              description="Region counts appear once organizations have country or region data."
              className="border-0 bg-transparent py-4"
            />
          ) : (
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
              <RegionMap buckets={insights.regionCounts} />
              <ul className="space-y-1.5">
                {insights.regionCounts.map((r) => (
                  <li
                    key={r.key}
                    className="flex items-center justify-between gap-2 text-[11px] leading-snug"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-background"
                        style={{ backgroundColor: r.color }}
                      />
                      <span className="truncate text-muted-foreground">{r.label}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-foreground">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function Donut({
  buckets,
  total,
  size = 84,
  strokeWidth = 16,
}: {
  buckets: { key: string; count: number; color: string; label: string }[];
  total: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Enrollment distribution across ${total} sites`}
    >
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
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        {total > 0
          ? buckets.map((b) => {
              const frac = b.count / total;
              if (frac <= 0) return null;
              const dash = frac * circ;
              const offset = -cumulative;
              cumulative += dash;
              return (
                <circle
                  key={b.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={b.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circ - dash}`}
                  strokeDashoffset={offset}
                />
              );
            })
          : null}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="text-base font-semibold tabular-nums text-foreground">{total}</span>
      </div>
    </div>
  );
}

function RegionMap({ buckets }: { buckets: OrgInsightsSnapshot['regionCounts'] }) {
  const total = buckets.reduce((acc, b) => acc + b.count, 0);
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const top = [...buckets].sort((a, b) => b.count - a.count)[0];
  const markerAnchors = [
    { x: 22, y: 30 },
    { x: 50, y: 21 },
    { x: 75, y: 35 },
    { x: 41, y: 46 },
    { x: 65, y: 50 },
  ];

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border/70 bg-background/70',
        'shadow-xs'
      )}
      role="img"
      aria-label={`Regional distribution across ${total} organizations`}
    >
      <svg viewBox="0 0 192 96" className="h-24 w-full" aria-hidden>
        <defs>
          <linearGradient id="region-map-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect width="192" height="96" className="fill-muted/40" />
        <path
          d="M16 48c13-20 33-28 58-24 20 3 28-4 47-7 26-4 46 8 55 27-16 5-30 5-45 1-17-4-26 3-42 9-28 11-51 7-73-6Z"
          fill="url(#region-map-bg)"
          className="text-foreground"
        />
        <path
          d="M26 52c18 7 39 9 61-1 16-7 26-13 44-9 12 3 22 4 34 1"
          className="fill-none stroke-border"
          strokeWidth="1.2"
          strokeDasharray="3 4"
        />
        {buckets.slice(0, markerAnchors.length).map((bucket, index) => {
          const anchor = markerAnchors[index];
          const radius = 5 + Math.round((bucket.count / max) * 9);
          return (
            <g key={bucket.key}>
              <circle
                cx={anchor.x * 2}
                cy={anchor.y * 1.35}
                r={radius + 4}
                fill={bucket.color}
                opacity="0.16"
              />
              <circle
                cx={anchor.x * 2}
                cy={anchor.y * 1.35}
                r={radius}
                fill={bucket.color}
                opacity="0.9"
                className="stroke-background"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3 py-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Top region</p>
          <p className="truncate text-xs font-medium text-foreground">{top?.label ?? 'Unspecified'}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold tabular-nums leading-none text-foreground">{total}</p>
          <p className="text-[10px] text-muted-foreground">orgs</p>
        </div>
      </div>
    </div>
  );
}
