'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Database,
  FileBarChart2,
  ListChecks,
  TrendingUp,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ECRF_VISIT_DUE_STATUS_LABELS,
  type EcrfVisitDueStatus,
} from '@/lib/parsers/ecrf-tracking-extras';
import type {
  EcrfAlert,
  EcrfTrend,
  EcrfTrendKind,
  StudyEcrfRollupBundle,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

import { Sparkline } from './sparkline';

const VISIT_HEALTH_COLORS: Record<EcrfVisitDueStatus, string> = {
  overdue: '#ef4444',
  due_soon: '#f59e0b',
  upcoming: '#3b82f6',
  completed: '#10b981',
  not_started: '#94a3b8',
};

const DATA_ENTRY_COLORS = {
  not_entered: '#ef4444',
  in_progress: '#f59e0b',
  complete: '#10b981',
};

const TREND_LABELS: Record<EcrfTrendKind, string> = {
  data_entry: 'Data Entry',
  sdv: 'SDV Progress',
  lock: 'Lock',
  queries_resolved: 'Queries Resolved',
};

const TREND_TONES: Record<EcrfTrendKind, string> = {
  data_entry: 'text-blue-500',
  sdv: 'text-violet-500',
  lock: 'text-emerald-500',
  queries_resolved: 'text-red-500',
};

interface EcrfRightRailProps {
  bundle: StudyEcrfRollupBundle;
  /** Which inner tab is active. Drives which set of widgets the rail shows. */
  tab: 'by-subject' | 'by-site' | 'by-visit';
  studyId: string;
}

/**
 * Per-tab right rail. Composition:
 *   - By Subject: no rail (caller renders a full-width table)
 *   - By Site:    Trends sparkline list + Data Entry by Status donut
 *   - By Visit:   Visit Health donut + Top Issues + Quick Actions
 *
 * Returns `null` for `by-subject` so the caller can switch its grid template
 * to single-column without a placeholder card.
 */
export function EcrfRightRail({ bundle, tab, studyId }: EcrfRightRailProps) {
  if (tab === 'by-subject') return null;
  if (tab === 'by-site') {
    return (
      <div className="space-y-3">
        <TrendsCard trends={bundle.trends} />
        <DataEntryByStatusCard bundle={bundle} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <VisitHealthCard bundle={bundle} />
      <TopIssuesCard alerts={bundle.alerts} />
      <QuickActionsCard studyId={studyId} />
    </div>
  );
}

// ─── By Site widgets ─────────────────────────────────────────────────────────

function TrendsCard({ trends }: { trends: EcrfTrend[] }) {
  const items: { kind: EcrfTrendKind; trend?: EcrfTrend }[] = [
    { kind: 'data_entry', trend: trends.find((t) => t.kind === 'data_entry') },
    { kind: 'sdv', trend: trends.find((t) => t.kind === 'sdv') },
    { kind: 'queries_resolved', trend: trends.find((t) => t.kind === 'queries_resolved') },
  ];
  return (
    <Card className="px-4">
      <CardHeader className="px-0 pb-1">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          Trends (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-0 pb-1">
        {items.map(({ kind, trend }) => {
          const sum = trend?.points.reduce((acc, p) => acc + p.value, 0) ?? 0;
          return (
            <div key={kind}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-foreground">{TREND_LABELS[kind]}</span>
                <span className="font-mono text-muted-foreground tabular-nums">{sum}</span>
              </div>
              <Sparkline
                points={trend?.points ?? []}
                toneClassName={TREND_TONES[kind]}
                tooltipLabel={TREND_LABELS[kind]}
                heightClassName="h-7"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DataEntryByStatusCard({ bundle }: { bundle: StudyEcrfRollupBundle }) {
  const data = useMemo(() => {
    const buckets = bundle.dataEntryByStatus;
    return [
      { key: 'complete', label: 'Complete', value: buckets.complete, fill: DATA_ENTRY_COLORS.complete },
      { key: 'in_progress', label: 'In Progress', value: buckets.in_progress, fill: DATA_ENTRY_COLORS.in_progress },
      { key: 'not_entered', label: 'Not Entered', value: buckets.not_entered, fill: DATA_ENTRY_COLORS.not_entered },
    ].filter((b) => b.value > 0);
  }, [bundle.dataEntryByStatus]);
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <Card className="px-4">
      <CardHeader className="px-0 pb-1">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          Data Entry by Status
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        {total === 0 ? (
          <p className="text-xs text-muted-foreground">No CRFs expected yet.</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      padding: '4px 6px',
                      borderRadius: 4,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={48}
                    isAnimationActive={false}
                    strokeWidth={0}
                  >
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-base font-semibold tabular-nums">{total}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">CRFs</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1">
              {data.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: d.fill }}
                    />
                    <span className="truncate">{d.label}</span>
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── By Visit widgets ────────────────────────────────────────────────────────

function VisitHealthCard({ bundle }: { bundle: StudyEcrfRollupBundle }) {
  const data = useMemo(() => {
    const buckets: Record<EcrfVisitDueStatus, number> = {
      overdue: 0,
      due_soon: 0,
      upcoming: 0,
      completed: 0,
      not_started: 0,
    };
    for (const v of bundle.byVisit) {
      buckets.overdue += v.subjectsOverdue ?? 0;
      buckets.due_soon += v.subjectsDueNow ?? 0;
      buckets.upcoming += v.subjectsUpcoming ?? 0;
      buckets.completed += v.subjectsCompleted ?? 0;
    }
    const known = buckets.overdue + buckets.due_soon + buckets.upcoming + buckets.completed;
    if (known === 0) {
      buckets.not_started = bundle.byVisit.reduce(
        (acc, v) => acc + (v.subjectCount ?? 0),
        0,
      );
    }
    return (Object.entries(buckets) as [EcrfVisitDueStatus, number][])
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        key,
        label: ECRF_VISIT_DUE_STATUS_LABELS[key],
        value,
        fill: VISIT_HEALTH_COLORS[key],
      }));
  }, [bundle.byVisit]);
  const totalVisits = bundle.byVisit.length;

  return (
    <Card className="px-4">
      <CardHeader className="px-0 pb-1">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          Visit Health Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground">No visits in scope yet.</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="relative h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      fontSize: 11,
                      padding: '4px 6px',
                      borderRadius: 4,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={48}
                    isAnimationActive={false}
                    strokeWidth={0}
                  >
                    {data.map((d) => (
                      <Cell key={d.key} fill={d.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-base font-semibold tabular-nums">{totalVisits}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">visits</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1">
              {data.map((d) => (
                <li key={d.key} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: d.fill }}
                    />
                    <span className="truncate">{d.label}</span>
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopIssuesCard({ alerts }: { alerts: EcrfAlert[] }) {
  const top = alerts.slice(0, 5);
  return (
    <Card className="px-4">
      <CardHeader className="px-0 pb-1">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          Top Issues
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        {top.length === 0 ? (
          <p className="text-xs text-muted-foreground">No issues flagged.</p>
        ) : (
          <ul className="space-y-1.5">
            {top.map((a) => {
              const dotClass =
                a.severity === 'critical'
                  ? 'bg-red-500'
                  : a.severity === 'warn'
                  ? 'bg-amber-500'
                  : 'bg-blue-500';
              const body = (
                <span className="flex items-start gap-2 text-[11px]">
                  <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} />
                  <span className="min-w-0 flex-1 truncate">{a.title}</span>
                </span>
              );
              if (a.ctaHref) {
                return (
                  <li key={a.id}>
                    <Link href={a.ctaHref} className="block hover:text-foreground">
                      {body}
                    </Link>
                  </li>
                );
              }
              return <li key={a.id}>{body}</li>;
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActionsCard({ studyId }: { studyId: string }) {
  const items: { label: string; href: string; icon: typeof ListChecks }[] = [
    {
      label: 'Missing CRFs report',
      href: `/protected/studies/${studyId}?tab=ecrf-tracking&ecrfTab=by-visit`,
      icon: ClipboardList,
    },
    {
      label: 'Open queries',
      href: `/protected/studies/${studyId}?tab=ecrf-tracking&ecrfTab=by-subject`,
      icon: AlertTriangle,
    },
    {
      label: 'Visit window compliance',
      href: `/protected/studies/${studyId}?tab=visit-window-compliance`,
      icon: ListChecks,
    },
    {
      label: 'Data entry dashboard',
      href: `/protected/studies/${studyId}?tab=ecrf-tracking&ecrfTab=by-site`,
      icon: FileBarChart2,
    },
  ];
  return (
    <Card className="px-4">
      <CardHeader className="px-0 pb-1">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        <ul className="space-y-1">
          {items.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <Link
                href={href}
                className="flex items-center gap-2 rounded-sm px-1 py-1 text-[11px] text-foreground hover:bg-accent/40"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{label}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
