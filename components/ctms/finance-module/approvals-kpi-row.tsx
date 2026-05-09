'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApprovalsKpis } from '@/lib/actions/study-finance-module';

interface ApprovalsKpiRowProps {
  kpis: ApprovalsKpis;
}

interface KpiCardProps {
  title: string;
  value: number;
  description: string;
  tone?: 'default' | 'warning' | 'critical' | 'positive';
}

function KpiCard({ title, value, description, tone = 'default' }: KpiCardProps) {
  const valueClass =
    tone === 'critical'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'positive'
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-foreground';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${valueClass}`}>{value}</div>
        <CardDescription className="mt-1 text-[11px] text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function ApprovalsKpiRow({ kpis }: ApprovalsKpiRowProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard title="Total Pending" value={kpis.totalPending} description="Awaiting your action." />
      <KpiCard
        title="Overdue"
        value={kpis.overdue}
        description="Past due date and unresolved."
        tone={kpis.overdue > 0 ? 'critical' : 'default'}
      />
      <KpiCard
        title="Due Today"
        value={kpis.dueToday}
        description="Due before end of day."
        tone={kpis.dueToday > 0 ? 'warning' : 'default'}
      />
      <KpiCard title="In Progress" value={kpis.inProgress} description="Currently routed." />
      <KpiCard
        title="Approved (This Month)"
        value={kpis.approvedThisMonth}
        description="Decisions recorded this month."
        tone="positive"
      />
    </div>
  );
}
