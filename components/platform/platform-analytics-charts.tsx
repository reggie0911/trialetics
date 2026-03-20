'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlatformBusinessAnalyticsDTO } from '@/lib/types/platform-analytics';

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function chartTooltipProps() {
  return {
    contentStyle: {
      background: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      fontSize: '12px',
    },
    labelStyle: { color: 'hsl(var(--popover-foreground))' },
  };
}

export function PlatformAnalyticsCharts({
  data,
  rangeDays,
}: {
  data: PlatformBusinessAnalyticsDTO;
  rangeDays: number;
}) {
  const planMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of data.subscription_mix) {
      m.set(row.plan, (m.get(row.plan) ?? 0) + row.count);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [data.subscription_mix]);

  const statusMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of data.subscription_mix) {
      m.set(row.status, (m.get(row.status) ?? 0) + row.count);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [data.subscription_mix]);

  const moduleBars = useMemo(
    () => [
      { name: 'CTMS', count: data.snapshot.module_ctms_enabled },
      { name: 'eTMF', count: data.snapshot.module_etmf_enabled },
      { name: 'Custom trackers', count: data.snapshot.module_tracker_enabled },
    ],
    [data.snapshot]
  );

  const comboWeekly = useMemo(() => {
    const byWeek = new Map<string, { week_start: string; new_cos: number; audit_cos: number }>();
    for (const r of data.new_companies_weekly) {
      byWeek.set(r.week_start, { week_start: r.week_start, new_cos: r.count, audit_cos: 0 });
    }
    for (const r of data.audit_distinct_companies_weekly) {
      const ex = byWeek.get(r.week_start);
      if (ex) {
        ex.audit_cos = r.distinct_companies;
      } else {
        byWeek.set(r.week_start, {
          week_start: r.week_start,
          new_cos: 0,
          audit_cos: r.distinct_companies,
        });
      }
    }
    return [...byWeek.values()].sort((a, b) => a.week_start.localeCompare(b.week_start));
  }, [data.new_companies_weekly, data.audit_distinct_companies_weekly]);

  const hasDailyAudit = data.audit_series_daily.length > 0;
  const hasWeekly = comboWeekly.length > 0;
  const hasPlanMix = planMix.some((p) => p.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subscription plan mix</CardTitle>
            <p className="text-xs text-muted-foreground">By company subscription row · snapshot</p>
          </CardHeader>
          <CardContent className="h-64">
            {!hasPlanMix ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No subscription rows yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {planMix.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [v ?? 0, 'Companies']}
                    {...chartTooltipProps()}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subscription status mix</CardTitle>
            <p className="text-xs text-muted-foreground">Cash-risk: past_due & cancelled highlighted in legend</p>
          </CardHeader>
          <CardContent className="h-64">
            {statusMix.every((s) => s.value === 0) ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No status data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {statusMix.map((row, i) => {
                      const risk = row.name === 'past_due' || row.name === 'cancelled';
                      return (
                        <Cell
                          key={i}
                          fill={risk ? 'var(--chart-5)' : COLORS[i % COLORS.length]}
                          stroke="transparent"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [v ?? 0, 'Companies']}
                    {...chartTooltipProps()}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Module adoption</CardTitle>
          <p className="text-xs text-muted-foreground">Companies with each product flag enabled</p>
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moduleBars} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" horizontal={false} />
              <XAxis type="number" allowDecimals={false} className="text-xs" />
              <YAxis type="category" dataKey="name" width={110} className="text-xs" />
              <Tooltip {...chartTooltipProps()} />
              <Bar dataKey="count" name="Companies" radius={[0, 4, 4, 0]}>
                {moduleBars.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform configuration activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              Audit events per day (last {rangeDays}d) · stacked by change type
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {!hasDailyAudit ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                Not enough audit history in this range
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.audit_series_daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip {...chartTooltipProps()} />
                  <Legend />
                  <Bar dataKey="module_flags" stackId="a" name="Module flags" fill="var(--chart-1)" />
                  <Bar dataKey="study_keys" stackId="a" name="Study tracker keys" fill="var(--chart-2)" />
                  <Bar dataKey="tracker_def" stackId="a" name="Tracker definition" fill="var(--chart-3)" />
                  <Bar dataKey="other" stackId="a" name="Other" fill="var(--chart-4)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Growth · weekly</CardTitle>
            <p className="text-xs text-muted-foreground">
              New companies vs distinct companies with audit activity
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {!hasWeekly ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                Not enough history for weekly trends
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comboWeekly}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="week_start" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip {...chartTooltipProps()} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="new_cos"
                    name="New companies"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="audit_cos"
                    name="Distinct cos. in audit"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
