import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PlatformBusinessAnalyticsDTO } from '@/lib/types/platform-analytics';
import { PlatformAnalyticsCharts } from '@/components/platform/platform-analytics-charts';
import { PlatformAnalyticsTablePanels } from '@/components/platform/platform-analytics-table-panels';

export function PlatformAnalyticsDashboard({
  data,
  rangeDays,
}: {
  data: PlatformBusinessAnalyticsDTO;
  rangeDays: number;
}) {
  const { snapshot } = data;
  const ranges = [30, 90];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Time range</span>
        {ranges.map((d) => (
          <Link
            key={d}
            href={`/protected/platform/analytics?range=${d}`}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              rangeDays === d
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            Last {d} days
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{snapshot.company_count}</p>
            <p className="text-xs text-muted-foreground mt-1">
              +{snapshot.new_companies_in_range} in range · +{snapshot.new_companies_last_30_days} last 30d
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Members (seats)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{snapshot.profile_total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Per company min {snapshot.seat_stats.min} · max {snapshot.seat_stats.max} · avg{' '}
              {snapshot.seat_stats.avg}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paying vs at-risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {snapshot.paying_subscriptions}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Active/trialing ·{' '}
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {snapshot.at_risk_subscriptions} past_due/cancelled
              </span>
              {snapshot.companies_without_subscription > 0 && (
                <>
                  {' '}
                  · {snapshot.companies_without_subscription} co. no subscription row
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trackers & audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {snapshot.tracker_definitions_total}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {snapshot.companies_with_custom_definitions} companies with defs ·{' '}
              {snapshot.audit_events_in_range} config events in range
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modules</CardTitle>
          </CardHeader>
          <CardContent className="text-sm tabular-nums space-y-1">
            <p>CTMS on: {snapshot.module_ctms_enabled}</p>
            <p>eTMF on: {snapshot.module_etmf_enabled}</p>
            <p>Custom trackers on: {snapshot.module_tracker_enabled}</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custom definitions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm tabular-nums space-y-1">
            <p>
              Active {snapshot.tracker_definitions_active} · platform licensed{' '}
              {snapshot.tracker_definitions_platform_enabled}
            </p>
          </CardContent>
        </Card>
      </div>

      <PlatformAnalyticsCharts data={data} rangeDays={rangeDays} />

      <PlatformAnalyticsTablePanels companies={data.companies} recentAudit={data.recent_audit} />
    </div>
  );
}
