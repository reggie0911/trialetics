'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PortfolioTable } from '@/components/ctms/reports/portfolio-table';
import { KriGauge } from '@/components/ctms/reports/kri-gauge';
import type { KriDefinition, StudyPortfolioRow } from '@/lib/types/ctms';
import type { ReportRunAuditRecord, ReportExportAuditRecord } from '@/lib/types/reports';

interface ReportsOverviewTabProps {
  portfolio: StudyPortfolioRow[];
  kriDefinitions: KriDefinition[];
  runAudit: ReportRunAuditRecord[];
  exportAudit: ReportExportAuditRecord[];
}

export function ReportsOverviewTab({
  portfolio,
  kriDefinitions,
  runAudit,
  exportAudit,
}: ReportsOverviewTabProps) {
  const failedRuns = runAudit.filter((row) => row.status === 'failed');
  const failedExports = exportAudit.filter((row) => row.status === 'failed');
  const latestErrors = [...failedRuns, ...failedExports]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Saved Definitions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{kriDefinitions.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Report Runs (30d)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{runAudit.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Export Jobs (30d)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{exportAudit.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failure Events</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{failedRuns.length + failedExports.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <PortfolioTable studies={portfolio} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>KRI Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          {kriDefinitions.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {kriDefinitions.map((kri) => (
                <KriGauge
                  key={kri.id}
                  name={kri.name}
                  category={kri.category}
                  value={0}
                  status="green"
                  thresholdYellow={kri.threshold_yellow}
                  thresholdRed={kri.threshold_red}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No KRI definitions configured yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operational Diagnostics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {latestErrors.length ? (
            latestErrors.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md border p-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {'dataset_key' in row ? row.dataset_key : 'unknown_dataset'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {'error_message' in row && row.error_message ? row.error_message : 'No error detail'}
                  </p>
                </div>
                <Badge variant="destructive">Failed</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No recent run/export failures.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
