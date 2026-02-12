'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, RefreshCw, Plus, FileText, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getTripReports } from '@/lib/actions/trip-reports';
import { getTripReportTemplates } from '@/lib/actions/trip-report-templates';
import { getOrganizations } from '@/lib/actions/organizations';
import Link from 'next/link';
import { TripReportTemplateList } from './trip-report-template-list';
import { TripReportCreateDialog } from './trip-report-create-dialog';
import type { TripReportWithRelations, TripReportStatus, TripReportTemplateWithDetails } from '@/lib/types/trip-reports';
import { TRIP_REPORT_STATUS_LABELS } from '@/lib/types/trip-reports';
import { SITE_VISIT_TYPE_LABELS } from '@/lib/types/contacts-organizations';

interface TripReportsPageClientProps {
  companyId: string;
  profileId: string;
  userEmail: string;
}

export function TripReportsPageClient({
  companyId,
  profileId,
  userEmail,
}: TripReportsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createFromSiteVisitId = searchParams.get('createFrom');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'reports' | 'templates'>('reports');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reports, setReports] = useState<TripReportWithRelations[]>([]);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [templates, setTemplates] = useState<TripReportTemplateWithDetails[]>([]);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const [reportsRes, orgsRes, templatesRes] = await Promise.all([
        getTripReports(companyId, {
          status: statusFilter !== 'all' ? (statusFilter as TripReportStatus) : undefined,
          organization_id: orgFilter !== 'all' ? orgFilter : undefined,
        }),
        getOrganizations(companyId, { organization_type: 'site', pageSize: 500 }),
        getTripReportTemplates(companyId),
      ]);

      if (reportsRes.success && reportsRes.data) {
        setReports(reportsRes.data);
      } else if (!reportsRes.success) {
        toast({
          title: 'Error loading trip reports',
          description: reportsRes.error || 'Failed to load',
          variant: 'destructive',
        });
      }

      if (orgsRes.success && orgsRes.data) {
        setOrganizations(orgsRes.data.organizations.map((o) => ({ id: o.id, name: o.name })));
      }
      if (templatesRes.success && templatesRes.data) {
        setTemplates(templatesRes.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [companyId, statusFilter, orgFilter, toast]);

  useEffect(() => {
    if (createFromSiteVisitId) {
      setShowCreateDialog(true);
    }
  }, [createFromSiteVisitId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => fetchData(true);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'short' });
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  };

  const getSiteName = (report: TripReportWithRelations) => {
    const sv = report.site_visit as { organization?: { name: string } } | undefined;
    return sv?.organization?.name ?? '—';
  };

  const getVisitName = (report: TripReportWithRelations) => {
    const sv = report.site_visit as { visit_name?: string } | undefined;
    return sv?.visit_name ?? '—';
  };

  const getVisitType = (report: TripReportWithRelations) => {
    const sv = report.site_visit as { visit_type?: string } | undefined;
    return sv?.visit_type ? SITE_VISIT_TYPE_LABELS[sv.visit_type as keyof typeof SITE_VISIT_TYPE_LABELS] : '—';
  };

  const getVisitStart = (report: TripReportWithRelations) => {
    const sv = report.site_visit as { visit_start?: string } | undefined;
    return sv?.visit_start ? formatDateTime(sv.visit_start) : '—';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'reports' | 'templates')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="reports" className="text-xs">
            <FileText className="mr-2 h-3 w-3" />
            Trip Reports ({reports.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            <Settings className="mr-2 h-3 w-3" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-[12px] h-8 rounded-md border border-input bg-background px-3 py-1"
                >
                  <option value="all">All Statuses</option>
                  {Object.entries(TRIP_REPORT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                  className="text-[12px] h-8 rounded-md border border-input bg-background px-3 py-1 min-w-[180px]"
                >
                  <option value="all">All Sites</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="text-xs">
                  {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  <span className="ml-1">Refresh</span>
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium">Trip Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No trip reports found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Site</th>
                          <th className="text-left py-2 px-3 font-medium">Visit Name</th>
                          <th className="text-left py-2 px-3 font-medium">Visit Type</th>
                          <th className="text-left py-2 px-3 font-medium">Visit Date</th>
                          <th className="text-left py-2 px-3 font-medium">Status</th>
                          <th className="text-left py-2 px-3 font-medium">Version</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map((report) => (
                          <tr
                            key={report.id}
                            className="border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => router.push(`/protected/trip-reports/${report.id}`)}
                          >
                            <td className="py-2 px-3">{getSiteName(report)}</td>
                            <td className="py-2 px-3">{getVisitName(report)}</td>
                            <td className="py-2 px-3">{getVisitType(report)}</td>
                            <td className="py-2 px-3">{getVisitStart(report)}</td>
                            <td className="py-2 px-3">
                              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium">
                                {TRIP_REPORT_STATUS_LABELS[report.status as keyof typeof TRIP_REPORT_STATUS_LABELS]}
                              </span>
                            </td>
                            <td className="py-2 px-3">{report.version}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="flex justify-end mb-4">
            <Link href="/protected/trip-reports/templates/new">
              <Button size="sm" className="text-xs">
                <Plus className="mr-2 h-3 w-3" />
                Add Template
              </Button>
            </Link>
          </div>
          <TripReportTemplateList
            companyId={companyId}
            onSuccess={fetchData}
          />
        </TabsContent>
      </Tabs>

      <TripReportCreateDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open && createFromSiteVisitId) {
            router.replace('/protected/trip-reports');
          }
        }}
        siteVisitId={createFromSiteVisitId}
        templates={templates}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
