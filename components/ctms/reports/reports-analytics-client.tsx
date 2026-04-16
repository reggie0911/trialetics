'use client';

import { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { listReportExportsAudit, listReportRunsAudit } from '@/lib/actions/reports';
import type {
  ReportDatasetKey,
  ReportDefinitionRecord,
  ReportExportAuditRecord,
  ReportFilterConfig,
  ReportGroupingConfig,
  ReportRunAuditRecord,
  ReportSummaryMetricConfig,
} from '@/lib/types/reports';
import type { KriDefinition, StudyPortfolioRow } from '@/lib/types/ctms';
import { ReportsOverviewTab } from '@/components/ctms/reports/reports-overview-tab';
import { ReportsQuickTab } from '@/components/ctms/reports/reports-quick-tab';
import { ReportsCustomBuilderTab } from '@/components/ctms/reports/reports-custom-builder-tab';
import { ReportsSavedTab } from '@/components/ctms/reports/reports-saved-tab';
import { ReportsScheduledTab } from '@/components/ctms/reports/reports-scheduled-tab';
import { ReportsExportsTab } from '@/components/ctms/reports/reports-exports-tab';
import { ReportsAuditLogTab } from '@/components/ctms/reports/reports-audit-log-tab';

const REPORTS_ANALYTICS_TAB_TOOLTIPS = {
  overview:
    'Study portfolio snapshot, KRI definitions, and recent report run or export failures.',
  quickReports:
    'Run curated datasets with preset columns; results can seed the custom builder or saved reports.',
  customBuilder:
    'Design ad hoc reports: pick fields, filters, grouping, and summary metrics for this study.',
  savedReports:
    'Save, open, and manage reusable report definitions tied to this study.',
  scheduledReports:
    'Configure recurring report generation on a schedule using your current builder context.',
  exports:
    'Download report results as CSV from the current builder configuration or saved definitions.',
  auditLog:
    'Governance view of recent report runs and exports, including status and timestamps.',
} as const;

interface ReportsAnalyticsClientProps {
  studyId: string;
  portfolio: StudyPortfolioRow[];
  kriDefinitions: KriDefinition[];
  initialSavedReports: ReportDefinitionRecord[];
  initialRunAudit: ReportRunAuditRecord[];
  initialExportAudit: ReportExportAuditRecord[];
}

export function ReportsAnalyticsClient({
  studyId,
  portfolio,
  kriDefinitions,
  initialSavedReports,
  initialRunAudit,
  initialExportAudit,
}: ReportsAnalyticsClientProps) {
  const [savedReports, setSavedReports] = useState(initialSavedReports);
  const [runAudit, setRunAudit] = useState(initialRunAudit);
  const [exportAudit, setExportAudit] = useState(initialExportAudit);
  const [builderConfig, setBuilderConfig] = useState<{
    datasetKey: ReportDatasetKey;
    selectedFields: string[];
    filters: ReportFilterConfig[];
    grouping: ReportGroupingConfig[];
    summaryMetrics: ReportSummaryMetricConfig[];
  } | null>(null);
  const [refreshingAudit, setRefreshingAudit] = useState(false);

  const refreshAudit = async () => {
    setRefreshingAudit(true);
    const [runs, exports] = await Promise.all([
      listReportRunsAudit({ studyId, limit: 100 }),
      listReportExportsAudit({ studyId, limit: 100 }),
    ]);
    setRefreshingAudit(false);
    if (runs.error) {
      toast.error(runs.error);
      return;
    }
    if (exports.error) {
      toast.error(exports.error);
      return;
    }
    setRunAudit(runs.data);
    setExportAudit(exports.data);
    toast.success('Audit views refreshed');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Run operational and analytics reports across study datasets.
        </p>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="sm" onClick={refreshAudit} disabled={refreshingAudit}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${refreshingAudit ? 'animate-spin' : ''}`} />
                Refresh Audit
              </Button>
            }
          />
          <TooltipContent side="left" className="max-w-xs text-xs">
            Reload run/export audit tables and diagnostics.
          </TooltipContent>
        </Tooltip>
      </div>

      <Tabs tabsId={`reports-analytics-${studyId}`} defaultValue="overview" className="space-y-4">
        <TooltipProvider delay={250}>
          <TabsList className="flex w-full min-w-0 flex-wrap justify-start gap-y-1">
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="overview" />}>Overview</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REPORTS_ANALYTICS_TAB_TOOLTIPS.overview}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="quick-reports" />}>Quick Reports</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REPORTS_ANALYTICS_TAB_TOOLTIPS.quickReports}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="custom-builder" />}>Custom Builder</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REPORTS_ANALYTICS_TAB_TOOLTIPS.customBuilder}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="saved-reports" />}>Saved Reports</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REPORTS_ANALYTICS_TAB_TOOLTIPS.savedReports}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="scheduled-reports" />}>Scheduled Reports</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REPORTS_ANALYTICS_TAB_TOOLTIPS.scheduledReports}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="exports" />}>Exports</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REPORTS_ANALYTICS_TAB_TOOLTIPS.exports}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="audit-log" />}>Audit Log</TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {REPORTS_ANALYTICS_TAB_TOOLTIPS.auditLog}
              </TooltipContent>
            </Tooltip>
          </TabsList>
        </TooltipProvider>

        <TabsContent value="overview">
          <ReportsOverviewTab
            portfolio={portfolio}
            kriDefinitions={kriDefinitions}
            runAudit={runAudit}
            exportAudit={exportAudit}
          />
        </TabsContent>

        <TabsContent value="quick-reports">
          <ReportsQuickTab
            studyId={studyId}
            onRun={(datasetKey, result) => {
              if (!result) return;
              setBuilderConfig({
                datasetKey,
                selectedFields: result.columns,
                filters: [],
                grouping: [],
                summaryMetrics: [],
              });
            }}
          />
        </TabsContent>

        <TabsContent value="custom-builder">
          <ReportsCustomBuilderTab
            studyId={studyId}
            onConfigurationChange={(config) => {
              setBuilderConfig({
                datasetKey: config.datasetKey,
                selectedFields: config.selectedFields,
                filters: config.filters,
                grouping: config.grouping,
                summaryMetrics: config.summaryMetrics,
              });
            }}
          />
        </TabsContent>

        <TabsContent value="saved-reports">
          <ReportsSavedTab
            studyId={studyId}
            savedReports={savedReports}
            currentConfig={builderConfig}
            onSavedReportsChange={setSavedReports}
          />
        </TabsContent>

        <TabsContent value="scheduled-reports">
          <ReportsScheduledTab
            studyId={studyId}
            datasetKey={builderConfig?.datasetKey ?? 'report_tasks'}
            selectedFields={builderConfig?.selectedFields ?? []}
          />
        </TabsContent>

        <TabsContent value="exports">
          <ReportsExportsTab studyId={studyId} config={builderConfig} />
        </TabsContent>

        <TabsContent value="audit-log">
          <ReportsAuditLogTab runAudit={runAudit} exportAudit={exportAudit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
