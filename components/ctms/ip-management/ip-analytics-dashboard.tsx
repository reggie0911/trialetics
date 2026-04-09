'use client';

import { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  IpCategory,
  IpInTransitLineRow,
  IpLogRow,
  IpLotBreakdownRow,
  IpStudyMetricRow,
} from '@/lib/types/ip-management';
import type { IpInventoryUiContext } from '@/lib/utils/ip-inventory-ui-copy';
import type { IpComplianceFlagRow } from '@/components/ctms/ip-management/ip-compliance-dashboard';
import {
  computeKpiMetrics,
  computeDispositionBreakdown,
  computeLifecycleMetrics,
  computeExceptionRows,
  computeSiteAnalytics,
  computeUserActivity,
  computeDataQualityScore,
  filterRows,
  emptyFilters,
  buildAnalyticsCsv,
  type AnalyticsFilters,
} from '@/lib/utils/ip-analytics-metrics';
import { triggerCsvDownload } from '@/lib/utils/csv-download';
import { IpAnalyticsKpiCards } from '@/components/ctms/ip-management/ip-analytics-kpi-cards';
import { IpAnalyticsCharts } from '@/components/ctms/ip-management/ip-analytics-charts';
import { IpAnalyticsSiteTable } from '@/components/ctms/ip-management/ip-analytics-site-table';
import { IpAnalyticsUserTable } from '@/components/ctms/ip-management/ip-analytics-user-table';
import { IpAnalyticsDrilldown } from '@/components/ctms/ip-management/ip-analytics-drilldown';
import { IpAnalyticsFilters } from '@/components/ctms/ip-management/ip-analytics-filters';

export interface IpAnalyticsDashboardProps {
  metrics: IpStudyMetricRow[];
  logRows: IpLogRow[];
  flags: IpComplianceFlagRow[];
  breakdown: IpLotBreakdownRow[];
  inTransitLines: IpInTransitLineRow[];
  loading: boolean;
  categoryFilter: IpCategory;
  uiContext: IpInventoryUiContext;
  studyName?: string;
  protocolNumber?: string;
}

export function IpAnalyticsDashboard({
  logRows,
  loading,
}: IpAnalyticsDashboardProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>(emptyFilters);

  const supplyNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of logRows) names.add(r.item_name);
    return Array.from(names).sort();
  }, [logRows]);

  const filteredRows = useMemo(() => filterRows(logRows, filters), [logRows, filters]);

  const kpis = useMemo(() => computeKpiMetrics(filteredRows), [filteredRows]);
  const dispositionBreakdown = useMemo(() => computeDispositionBreakdown(filteredRows), [filteredRows]);
  const lifecycle = useMemo(() => computeLifecycleMetrics(filteredRows), [filteredRows]);
  const exceptions = useMemo(() => computeExceptionRows(filteredRows), [filteredRows]);
  const siteAnalytics = useMemo(() => computeSiteAnalytics(filteredRows), [filteredRows]);
  const userActivity = useMemo(() => computeUserActivity(filteredRows), [filteredRows]);
  const dataQualityScore = useMemo(() => computeDataQualityScore(filteredRows), [filteredRows]);

  const pendingRows = useMemo(
    () => filteredRows.filter((r) => r.disposition === 'used' && !r.verified_at && !r.verified_by_name),
    [filteredRows]
  );

  const agingRows = useMemo(() => {
    const now = Date.now();
    return filteredRows.filter((r) => {
      if (r.disposition !== 'available' || !r.received_at) return false;
      const age = (now - new Date(r.received_at).getTime()) / 86_400_000;
      return age > 30;
    });
  }, [filteredRows]);

  function handleExportCsv() {
    const csv = buildAnalyticsCsv(filteredRows);
    triggerCsvDownload(`inventory-analytics-${new Date().toISOString().split('T')[0]}.csv`, csv);
  }

  if (loading) {
    return (
      <div className="space-y-4 print:hidden">
        <p className="text-sm text-muted-foreground">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:[print-color-adjust:exact] print:[-webkit-print-color-adjust:exact]">
      {/* Header + export */}
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-muted-foreground text-sm">
            Analytics reflect the current study, site, category, and search filters.
            Use the controls below to refine further.
            {dataQualityScore < 100 && (
              <span className="ml-2 font-medium text-amber-700 dark:text-amber-400">
                Data quality score: {dataQualityScore}%
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={handleExportCsv}>
          <FileDown className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <IpAnalyticsFilters filters={filters} onFiltersChange={setFilters} supplyNames={supplyNames} />

      {filteredRows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No inventory records match the current filters.</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <IpAnalyticsKpiCards kpis={kpis} />

          {/* Charts */}
          <IpAnalyticsCharts
            dispositionBreakdown={dispositionBreakdown}
            lifecycle={lifecycle}
            siteAnalytics={siteAnalytics}
            availableCount={kpis.availableCount}
            usedCount={kpis.usedCount}
            verifiedCount={kpis.verifiedCount}
          />

          {/* Site analytics */}
          <IpAnalyticsSiteTable siteAnalytics={siteAnalytics} />

          {/* User activity */}
          <IpAnalyticsUserTable userActivity={userActivity} />

          {/* Drilldown tables */}
          <IpAnalyticsDrilldown
            allRows={filteredRows}
            exceptionRows={exceptions}
            pendingRows={pendingRows}
            agingRows={agingRows}
          />
        </>
      )}
    </div>
  );
}
