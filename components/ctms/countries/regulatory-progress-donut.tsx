'use client';

import { useMemo } from 'react';
import { CalendarDays, MoreVertical, ShieldCheck } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

import type { CountryDashboardRow } from '@/lib/actions/countries';

interface RegulatoryProgressDonutProps {
  countries: CountryDashboardRow[];
}

type SegmentKey = 'approved' | 'in_progress' | 'not_started';

const SEGMENTS: Array<{
  key: SegmentKey;
  label: string;
  color: string;
  rowClassName: string;
}> = [
  {
    key: 'approved',
    label: 'Approved',
    color: '#10b981',
    rowClassName: 'bg-emerald-50/80 dark:bg-emerald-500/10',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: '#f59e0b',
    rowClassName: 'bg-amber-50/80 dark:bg-amber-500/10',
  },
  {
    key: 'not_started',
    label: 'Not Started',
    color: '#94a3b8',
    rowClassName: 'bg-slate-100/80 dark:bg-slate-500/10',
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

  const chartData = segments
    .filter((s) => s.count > 0)
    .map((s) => ({ name: s.label, value: s.count, color: s.color }));

  return (
    <Card className="border-border/70 py-0">
      <CardHeader className="px-4 pb-0 pt-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          >
            <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3
              className="text-base font-semibold leading-tight text-foreground"
              title="Distribution of countries across the three regulatory milestones."
            >
              Regulatory Progress
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Overview of regulatory submissions
            </p>
          </div>
          <button
            type="button"
            aria-label="More options"
            className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        <div className="my-3 h-px bg-border/70" aria-hidden />

        <div className="flex flex-col items-center gap-4">
          <div className="relative h-36 w-36">
            {total === 0 ? (
              <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                0
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    innerRadius="62%"
                    outerRadius="100%"
                    paddingAngle={0}
                    stroke="none"
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold leading-none tracking-tight text-foreground">
                {total}
              </span>
              <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Total
              </span>
            </div>
          </div>

          <ul className="w-full space-y-1.5">
            {segments.map((segment) => (
              <li
                key={segment.key}
                className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 ${segment.rowClassName}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  <span className="truncate text-xs font-medium text-foreground">
                    {segment.label}
                  </span>
                </div>
                <span className="flex items-baseline gap-1 text-xs font-semibold text-foreground">
                  {segment.count}
                  <span className="font-normal text-muted-foreground">
                    ({pct(segment.count, total)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="my-3 h-px bg-border/70" aria-hidden />

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/60"
          >
            <CalendarDays className="h-3.5 w-3.5" />
          </span>
          <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
