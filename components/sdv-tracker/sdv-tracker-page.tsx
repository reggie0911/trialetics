'use client';

import { useState, useEffect, useCallback } from 'react';
import { SDVUploadWizardV2 } from './sdv-upload-wizard-v2';
import { SDVReportSelector } from './sdv-report-selector';
import { SDVKPICards } from './sdv-kpi-cards';
import { SDVFilters, SDVActiveFilters, type SDVFilterState } from './sdv-filters';
import { SDVHierarchicalTable } from './sdv-hierarchical-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload, Wrench, Loader2 } from 'lucide-react';
import { ProtocolSelector } from '@/components/ui/protocol-selector';
import {
  getSDVReports,
  getSDVReport,
  createSDVReport,
  deleteSDVReport,
  getSDVAggregations,
  getSDVSiteSummary,
  getSDVFilterOptions,
  refreshSDVMergedView,
  completeSDVReportUpload,
  fixStuckReport,
  type SDVReport,
  type SDVAggregations,
  type SDVSiteSummary,
  type SDVFilterOptions,
} from '@/lib/actions/sdv-tracker';

interface SDVTrackerPageProps {
  companyId: string;
  profileId: string;
  initialProtocolId?: string | null;
}

export function SDVTrackerPage({ companyId, profileId, initialProtocolId }: SDVTrackerPageProps) {
  // Report state
  const [reports, setReports] = useState<SDVReport[]>([]);
  const [protocolId, setProtocolId] = useState<string | null>(initialProtocolId ?? null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SDVReport | null>(null);

  // Data state
  const [aggregations, setAggregations] = useState<SDVAggregations | null>(null);
  const [siteSummary, setSiteSummary] = useState<SDVSiteSummary[]>([]);
  const [filterOptions, setFilterOptions] = useState<SDVFilterOptions>({
    site_names: [],
    subject_ids: [],
    event_names: [],
    form_names: [],
    data_sources: ['site_data_only', 'both'],
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<SDVFilterState>({
    site: null,
    subject: null,
    event: null,
    form: null,
    source: null,
  });

  // Check if report has data
  const hasSiteData = selectedReport?.site_data_upload_id != null;
  const hasSDVData = selectedReport?.sdv_data_upload_id != null;
  const hasData = selectedReport?.status === 'complete';

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      const reportsData = await getSDVReports(companyId, protocolId);
      setReports(reportsData);
      
      // Auto-select the first complete report, or first draft, or null
      if (reportsData.length > 0 && !selectedReportId) {
        const completeReport = reportsData.find(r => r.status === 'complete');
        const firstReport = completeReport || reportsData[0];
        setSelectedReportId(firstReport.id);
        setSelectedReport(firstReport);
      }
    } catch (error) {
      console.error('Error fetching SDV reports:', error);
    }
  }, [companyId, protocolId, selectedReportId]);

  // Fetch data for selected report
  const fetchReportData = useCallback(async (reportId: string) => {
    setIsLoading(true);
    try {
      // Get the report details
      const report = await getSDVReport(reportId);
      setSelectedReport(report);

      // If report is complete, fetch data
      if (report?.status === 'complete') {
        const [agg, sites, options] = await Promise.all([
          getSDVAggregations(reportId, {
            siteFilter: filters.site || undefined,
            subjectFilter: filters.subject || undefined,
            eventFilter: filters.event || undefined,
            formFilter: filters.form || undefined,
            sourceFilter: filters.source || undefined,
          }),
          getSDVSiteSummary(reportId, filters.source || undefined),
          getSDVFilterOptions(reportId),
        ]);

        setAggregations(agg);
        setSiteSummary(sites);
        setFilterOptions(options);
      } else {
        // Clear data for draft reports
        setAggregations(null);
        setSiteSummary([]);
        setFilterOptions({
          site_names: [],
          subject_ids: [],
          event_names: [],
          form_names: [],
          data_sources: ['site_data_only', 'both'],
        });
      }
    } catch (error) {
      console.error('Error fetching SDV report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Refresh data when filters change (for current report)
  const refreshData = useCallback(async () => {
    if (!selectedReportId || !hasData) return;

    setIsRefreshing(true);
    try {
      const [agg, sites] = await Promise.all([
        getSDVAggregations(selectedReportId, {
          siteFilter: filters.site || undefined,
          subjectFilter: filters.subject || undefined,
          eventFilter: filters.event || undefined,
          formFilter: filters.form || undefined,
          sourceFilter: filters.source || undefined,
        }),
        getSDVSiteSummary(selectedReportId, filters.source || undefined),
      ]);

      setAggregations(agg);
      setSiteSummary(sites);
    } catch (error) {
      console.error('Error refreshing SDV data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedReportId, filters, hasData]);

  // Initial load and when protocol changes - fetch reports
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Fetch data when report selection changes
  useEffect(() => {
    if (selectedReportId) {
      fetchReportData(selectedReportId);
    } else {
      setSelectedReport(null);
      setAggregations(null);
      setSiteSummary([]);
    }
  }, [selectedReportId]);

  // Auto-complete stuck reports that have both uploads but are still in draft
  useEffect(() => {
    if (selectedReport && 
        selectedReport.status === 'draft' && 
        selectedReport.site_data_upload_id && 
        selectedReport.sdv_data_upload_id) {
      console.log('Auto-completing stuck report:', selectedReport.id);
      completeSDVReportUpload(selectedReport.id).then(() => {
        console.log('Report completed successfully');
        // Refresh the reports list and selected report
        fetchReports();
        if (selectedReportId) {
          fetchReportData(selectedReportId);
        }
      }).catch((error) => {
        console.error('Failed to auto-complete report:', error);
      });
    }
  }, [selectedReport]);

  // Refresh when filters change
  useEffect(() => {
    if (!isLoading && hasData && selectedReportId) {
      refreshData();
    }
  }, [filters]);

  // Handle report selection
  const handleReportSelect = useCallback((reportId: string | null) => {
    setSelectedReportId(reportId);
    // Reset filters when switching reports
    setFilters({
      site: null,
      subject: null,
      event: null,
      form: null,
      source: null,
    });
  }, []);

  // Handle create report
  const handleCreateReport = useCallback(async (name: string, description?: string): Promise<SDVReport | null> => {
    const { data, error } = await createSDVReport(companyId, profileId, name, description);
    if (error || !data) {
      console.error('Error creating report:', error);
      return null;
    }
    // Add to reports list (don't call fetchReports to avoid duplicate)
    setReports(prev => [data, ...prev]);
    return data;
  }, [companyId, profileId]);

  // Handle delete report
  const handleDeleteReport = useCallback(async (reportId: string) => {
    const { success, error } = await deleteSDVReport(reportId);
    if (success) {
      setReports(prev => prev.filter(r => r.id !== reportId));
      if (selectedReportId === reportId) {
        const remaining = reports.filter(r => r.id !== reportId);
        setSelectedReportId(remaining.length > 0 ? remaining[0].id : null);
      }
    } else {
      console.error('Error deleting report:', error);
    }
  }, [reports, selectedReportId]);

  // Handle upload complete
  const handleUploadComplete = useCallback(async () => {
    // Refresh the current report's data and reports list
    if (selectedReportId) {
      await fetchReportData(selectedReportId);
    }
    await fetchReports();
  }, [selectedReportId, fetchReportData, fetchReports]);

  // State for fixing stuck reports
  const [isFixing, setIsFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  // Handle fix stuck report
  const handleFixReport = useCallback(async () => {
    if (!selectedReportId) return;
    
    setIsFixing(true);
    setFixMessage(null);
    
    try {
      const result = await fixStuckReport(selectedReportId);
      
      if (result.success) {
        setFixMessage(result.message || 'Report fixed successfully!');
        // Refresh data
        await fetchReportData(selectedReportId);
        await fetchReports();
      } else {
        setFixMessage(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fixing report:', error);
      setFixMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFixing(false);
    }
  }, [selectedReportId, fetchReportData, fetchReports]);

  // Handle filter change
  const handleFiltersChange = useCallback((newFilters: SDVFilterState) => {
    setFilters(newFilters);
  }, []);

  // Handle remove filter
  const handleRemoveFilter = useCallback((key: keyof SDVFilterState) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: null };
      
      // Clear dependent filters
      if (key === 'site') {
        newFilters.subject = null;
        newFilters.event = null;
        newFilters.form = null;
      } else if (key === 'subject') {
        newFilters.event = null;
        newFilters.form = null;
      } else if (key === 'event') {
        newFilters.form = null;
      }
      
      return newFilters;
    });
  }, []);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    if (selectedReportId) {
      await refreshSDVMergedView();
      await fetchReportData(selectedReportId);
    }
  }, [selectedReportId, fetchReportData]);

  return (
    <div className="space-y-6">
      {/* Protocol filter and Report Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ProtocolSelector
            companyId={companyId}
            value={protocolId}
            onValueChange={setProtocolId}
            label="Protocol"
            placeholder="All protocols"
            showAllOption={true}
            className="min-w-[200px]"
          />
        </div>
        <SDVReportSelector
          reports={reports}
          selectedReportId={selectedReportId}
          onReportSelect={handleReportSelect}
          onCreateReport={handleCreateReport}
          onDeleteReport={handleDeleteReport}
        />
      </div>

      {/* No Report Selected */}
      {!selectedReportId && reports.length === 0 && (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-muted-foreground">
              <FileSpreadsheet className="h-6 w-6" />
              No Reports Yet
            </CardTitle>
            <CardDescription>
              Create your first SDV report to start uploading and analyzing data.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Selected Report - Upload Area for Draft Reports */}
      {selectedReport && selectedReport.status === 'draft' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Data for: {selectedReport.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {!hasSiteData && !hasSDVData
                    ? 'Upload Site Data Entry and SDV Data files to complete this report.'
                    : hasSiteData && !hasSDVData
                    ? 'Site Data uploaded. Now upload SDV Data to complete this report.'
                    : 'SDV Data uploaded. Now upload Site Data to complete this report.'}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFixReport}
                disabled={isFixing}
                className="gap-2"
              >
                {isFixing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="h-4 w-4" />
                )}
                Fix Report
              </Button>
            </div>
            {fixMessage && (
              <p className={`text-sm mt-2 ${fixMessage.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {fixMessage}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <SDVUploadWizardV2
              companyId={companyId}
              profileId={profileId}
              reportId={selectedReport.id}
              hasSiteData={hasSiteData}
              hasSDVData={hasSDVData}
              onUploadComplete={handleUploadComplete}
            />
          </CardContent>
        </Card>
      )}

      {/* Report Data View (for complete reports) */}
      {selectedReport && selectedReport.status === 'complete' && (
        <>
          {/* KPI Cards */}
          <SDVKPICards aggregations={aggregations} isLoading={isLoading} />

          {/* Filters */}
          {hasData && (
            <div className="space-y-2">
              <SDVFilters
                reportId={selectedReportId!}
                filterOptions={filterOptions}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing || isLoading}
              />
              <SDVActiveFilters
                filters={filters}
                onRemoveFilter={handleRemoveFilter}
              />
            </div>
          )}

          {/* Hierarchical Table */}
          <SDVHierarchicalTable
            reportId={selectedReportId!}
            siteSummary={siteSummary}
            sourceFilter={filters.source || undefined}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );
}
