'use client';

import { useMemo } from 'react';
import { CalendarDays, ShieldCheck } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { CountryDashboardRow } from '@/lib/actions/countries';

interface RegulatoryProgressDonutProps {
  countries: CountryDashboardRow[];
}

type SegmentKey = 'approved' | 'in_progress' | 'not_started';

const SEGMENTS: Array<{
  key: SegmentKey;
  label: string;
  color: string;
}> = [
  {
    key: 'approved',
    label: 'Approved',
    color: '#10b981',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: '#f59e0b',
  },
  {
    key: 'not_started',
    label: 'Not Started',
    color: '#94a3b8',
  },
];

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function formatLastUpdated(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function RegulatoryProgressDonut({ countries }: RegulatoryProgressDonutProps) {
  const { resolvedTheme } = useTheme();

  const { total, segments, lastUpdated } = useMemo(() => {
    const t = countries.length;
    const counts = SEGMENTS.map((seg) => ({
      ...seg,
      count: countries.filter((c) => c.regulatory_status === seg.key).length,
    }));
    let latest: string | null = null;
    for (const c of countries) {
      const candidates: Array<string | null | undefined> = [
        c.lastUpdatedAt,
        c.updated_at,
        ...(c.regulatory_submissions ?? []).flatMap((s) => [
          s.updated_at,
          s.approval_date,
          s.submission_date,
        ]),
      ];
      for (const ts of candidates) {
        if (!ts) continue;
        if (!latest || new Date(ts).getTime() > new Date(latest).getTime()) {
          latest = ts;
        }
      }
    }
    return { total: t, segments: counts, lastUpdated: latest };
  }, [countries]);

  return (
    <Card className="h-full min-h-0 overflow-hidden border-border/70 py-0 shadow-none">
      <div className="flex flex-col gap-0 px-4 py-3.5">
        {/* Match study overview StatCard: title + caption (left) · icon (right) */}
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1 text-left">
            <h3
              className="!text-[12px] font-medium leading-tight text-muted-foreground"
              title="Distribution of countries across the three regulatory milestones."
            >
              Regulatory Progress
            </h3>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Overview of regulatory submissions
            </p>
          </div>
          <span
            aria-hidden
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-inset ring-black/5 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-white/10"
          >
            <ShieldCheck className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} />
          </span>
        </div>

        <div className="mt-3 flex w-full flex-col items-center gap-3">
          {(() => {
            const size = 144;
            const strokeWidth = 12;
            const gap = 3;
            const trackColor = resolvedTheme === 'dark' ? 'rgb(39 39 42)' : 'rgb(226 232 240)';
            const rings = segments.map((seg, i) => {
              const inset = i * (strokeWidth + gap);
              const r = (size - strokeWidth) / 2 - inset;
              const circ = 2 * Math.PI * r;
              const pctVal = total > 0 ? seg.count / total : 0;
              const offset = circ - pctVal * circ;
              return { ...seg, r, circ, offset };
            });

            return (
              <div
                className="relative"
                style={{ width: size, height: size }}
                role="img"
                aria-label={`Regulatory status: ${segments.map((s) => `${s.count} ${s.label}`).join(', ')}`}
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
                    {rings.map((ring) => (
                      <g key={ring.key}>
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={ring.r}
                          fill="none"
                          stroke={trackColor}
                          strokeWidth={strokeWidth}
                        />
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={ring.r}
                          fill="none"
                          stroke={ring.color}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeDasharray={ring.circ}
                          strokeDashoffset={ring.offset}
                        />
                      </g>
                    ))}
                  </svg>
                )}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="!text-[30px] font-medium leading-none tabular-nums tracking-tight text-foreground">
                    {total}
                  </span>
                  <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Total
                  </span>
                </div>
              </div>
            );
          })()}

          {total > 0 ? (
            <div className="flex w-full justify-start">
              <span
                className={cn(
                  'inline-flex max-w-full items-center rounded-full border border-[#e5e5e5] bg-[#ffffff] px-2.5 py-1 text-[11px] font-medium text-[#000000] dark:border-neutral-200 dark:bg-[#ffffff] dark:text-[#000000]',
                )}
              >
                {total} {total === 1 ? 'country' : 'countries'} in scope
              </span>
            </div>
          ) : null}

          <ul className="w-full space-y-2 border-t border-border/50 pt-2.5">
            {segments.map((segment) => (
              <li
                key={segment.key}
                className="flex w-full min-w-0 items-center justify-between gap-2 text-left text-[11px] leading-snug"
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="min-w-0 font-medium text-muted-foreground">
                    {segment.label}
                  </span>
                </div>
                <span className="shrink-0 tabular-nums text-foreground">
                  {segment.count}
                  <span className="ml-1 text-muted-foreground">({pct(segment.count, total)}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
          <span
            aria-hidden
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60"
          >
            <CalendarDays className="h-3.5 w-3.5" />
          </span>
          <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
        </div>
      </div>
    </Card>
  );
}
