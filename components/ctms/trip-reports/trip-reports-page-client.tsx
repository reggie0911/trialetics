'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Calendar,
  FilePlus,
  Pencil,
  Download,
  MoreHorizontal,
  Trash2,
  Power,
  PowerOff,
  Eye,
  FileCheck2,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type {
  TripReportSummaryRow,
  TripReportTrackerRow,
  TripReportReviewQueueRow,
  TemplateWithQuestionCount,
  TrackerComplianceMetrics,
} from '@/lib/actions/visit-reports';
import {
  deleteTemplate,
  deactivateTemplate,
  reactivateTemplate,
  getApprovedTripReportPdfData,
} from '@/lib/actions/visit-reports';
import { downloadVisitReportPdf } from '@/lib/utils/visit-report-pdf';
import { exportToCSV } from '@/lib/utils/table-export';
import {
  VISIT_REPORT_STATUS_LABELS,
  VISIT_REPORT_TYPE_LABELS,
  TEMPLATE_STATUS_LABELS,
} from '@/lib/types/visit-reports';
import { TRIP_REPORT_CLAIM_REVIEW_PATH } from '@/lib/constants/visit-reports';
import type { VisitReportStatus, VisitReportTemplate } from '@/lib/types/visit-reports';
import type { Study } from '@/lib/types/ctms';
import { Badge } from '@/components/ui/badge';
import { CreateSiteVisitModal } from './create-site-visit-modal';
import { AddEditTemplateModal } from './add-edit-template-modal';

/** Sentinel for null/empty person fields in tracker column filters */
const TRACKER_EMPTY_PERSON_VALUE = '__none__';

function trackerPersonKey(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return TRACKER_EMPTY_PERSON_VALUE;
  return String(value).trim();
}

function trackerPersonSelectLabel(key: string): string {
  return key === TRACKER_EMPTY_PERSON_VALUE ? '—' : key;
}

const TRACKER_STATUS_SWATCH: Record<string, string> = {
  total: 'bg-muted-foreground/60',
  report_pending: 'bg-amber-500',
  authoring: 'bg-teal-500',
  submitted: 'bg-blue-500',
  under_review: 'bg-indigo-500',
  returned: 'bg-rose-500',
  approved_and_signed: 'bg-emerald-500',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

interface TripReportsPageClientProps {
  initialSummaryList: TripReportSummaryRow[];
  templateCount: number;
  initialTemplates: TemplateWithQuestionCount[];
  studies: Pick<Study, 'id' | 'title' | 'protocol_number'>[];
  trackerRows: TripReportTrackerRow[];
  trackerMetrics: TrackerComplianceMetrics;
  initialReviewQueue: TripReportReviewQueueRow[];
}

export function TripReportsPageClient({
  initialSummaryList,
  templateCount,
  initialTemplates,
  studies,
  trackerRows,
  trackerMetrics,
  initialReviewQueue,
}: TripReportsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [createVisitOpen, setCreateVisitOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'admin' || tab === 'tracker' || tab === 'summary' || tab === 'review') {
      setActiveTab(tab);
    }
    if (searchParams.get('createVisit') === '1') {
      setCreateVisitOpen(true);
      setActiveTab('summary');
    }
  }, [searchParams]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<string>('all');
  const [trackerStudyFilter, setTrackerStudyFilter] = useState<string>('all');
  const [trackerSiteFilter, setTrackerSiteFilter] = useState<string>('all');
  const [trackerVisitTypeFilter, setTrackerVisitTypeFilter] = useState<string>('all');
  const [trackerAuthorFilter, setTrackerAuthorFilter] = useState<string>('all');
  const [trackerComplianceFilter, setTrackerComplianceFilter] = useState<string>('all');
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<VisitReportTemplate | null>(null);
  const [actionTemplate, setActionTemplate] = useState<{
    id: string;
    report_count: number;
    template_status: string;
  } | null>(null);
  const [pdfVisitIdLoading, setPdfVisitIdLoading] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const handleDownloadOfficialPdf = async (visitId: string) => {
    if (pdfVisitIdLoading) return;
    setPdfVisitIdLoading(visitId);
    const loadingToast = toast.loading('Generating PDF...');
    try {
      const result = await getApprovedTripReportPdfData(visitId);
      if ('error' in result) {
        toast.error(result.error, { id: loadingToast });
        return;
      }
      const pdfData = result.data;
      await downloadVisitReportPdf(pdfData, {
        filename: `Visit-Report-${String(pdfData.visitTypeLabel).replace(/[^a-zA-Z0-9-]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
        footerLeft: `${pdfData.studyTitle} | ${pdfData.siteName} | ${pdfData.visitTypeLabel}`,
        footerRight: `Printed: ${new Date().toLocaleDateString('en-US')}`,
      });
      toast.success('PDF downloaded.', { id: loadingToast });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('PDF generation failed:', err);
      toast.error(`PDF error: ${msg}`, { id: loadingToast });
    } finally {
      setPdfVisitIdLoading(null);
    }
  };

  const trackerStudyOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of trackerRows) set.add(r.study_name);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [trackerRows]);

  const trackerSiteOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of trackerRows) set.add(r.site_name);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [trackerRows]);

  const trackerVisitTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of trackerRows) set.add(r.visit_type);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [trackerRows]);

  const trackerAuthorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of trackerRows) set.add(trackerPersonKey(r.report_author));
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [trackerRows]);

  const trackerComplianceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of trackerRows) set.add(r.compliance_status);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [trackerRows]);

  const filteredTrackerRows = useMemo(() => {
    let rows = trackerRows;
    if (trackerStatusFilter !== 'all') {
      rows = rows.filter((r) => r.report_status === trackerStatusFilter);
    }
    if (trackerStudyFilter !== 'all') {
      rows = rows.filter((r) => r.study_name === trackerStudyFilter);
    }
    if (trackerSiteFilter !== 'all') {
      rows = rows.filter((r) => r.site_name === trackerSiteFilter);
    }
    if (trackerVisitTypeFilter !== 'all') {
      rows = rows.filter((r) => r.visit_type === trackerVisitTypeFilter);
    }
    if (trackerAuthorFilter !== 'all') {
      rows = rows.filter((r) => trackerPersonKey(r.report_author) === trackerAuthorFilter);
    }
    if (trackerComplianceFilter !== 'all') {
      rows = rows.filter((r) => r.compliance_status === trackerComplianceFilter);
    }
    return rows;
  }, [
    trackerRows,
    trackerStatusFilter,
    trackerStudyFilter,
    trackerSiteFilter,
    trackerVisitTypeFilter,
    trackerAuthorFilter,
    trackerComplianceFilter,
  ]);

  const trackerFiltersActive =
    trackerStatusFilter !== 'all' ||
    trackerStudyFilter !== 'all' ||
    trackerSiteFilter !== 'all' ||
    trackerVisitTypeFilter !== 'all' ||
    trackerAuthorFilter !== 'all' ||
    trackerComplianceFilter !== 'all';

  const resetTrackerFilters = () => {
    setTrackerStatusFilter('all');
    setTrackerStudyFilter('all');
    setTrackerSiteFilter('all');
    setTrackerVisitTypeFilter('all');
    setTrackerAuthorFilter('all');
    setTrackerComplianceFilter('all');
  };

  const handleExportTrackerCsv = () => {
    const columns = [
      { header: 'Study Name', accessorKey: 'study_name' as const },
      { header: 'Site', accessorKey: 'site_name' as const },
      { header: 'Visit Type', accessorKey: 'visit_type' as const },
      { header: 'Visit ID', accessorKey: 'visit_id_display' as const },
      { header: 'Visit End Date', accessorKey: 'visit_end_date' as const },
      { header: 'Expected Send Date: Confirmation Letter', accessorKey: 'expected_send_date_confirmation_letter' as const },
      { header: 'Expected VR Submission Date', accessorKey: 'expected_vr_submission_date' as const },
      { header: 'VR Submission Date', accessorKey: 'submission_date' as const },
      { header: 'Submission Compliance', accessorKey: 'submission_compliance' as const },
      { header: 'Submission Days', accessorKey: 'submission_days' as const },
      { header: 'VR Reviewed Date', accessorKey: 'vr_reviewed_date' as const },
      { header: 'Review Days', accessorKey: 'review_days' as const },
      { header: 'Expected VR Approval Date', accessorKey: 'expected_vr_approval_date' as const },
      { header: 'VR Approval Date', accessorKey: 'approved_date' as const },
      { header: 'Approval Compliance', accessorKey: 'approval_compliance' as const },
      { header: 'Approval Days', accessorKey: 'approval_days' as const },
      { header: 'Expected Send Date: Follow-up Letter', accessorKey: 'expected_send_date_followup_letter' as const },
      { header: 'Date Follow-up Letter Uploaded', accessorKey: 'date_followup_letter_uploaded' as const },
      { header: 'Date Monitoring visit log (MVL Log) Uploaded', accessorKey: 'date_mvl_log_uploaded' as const },
      { header: 'Days Until Trip Report Submission Due', accessorKey: 'days_until_submission_due' as const },
      { header: 'Visit Report Status', accessorKey: 'report_status' as const },
      { header: 'Days Until Submission Due', accessorKey: 'days_until_submission_due' as const },
      { header: 'Days Until Approval Due', accessorKey: 'days_until_approval_due' as const },
      { header: 'Report Author', accessorKey: 'report_author' as const },
      { header: 'Submission Date', accessorKey: 'submission_date' as const },
      { header: 'Approver', accessorKey: 'approver' as const },
      { header: 'Compliance Status', accessorKey: 'compliance_status' as const },
    ];
    exportToCSV(filteredTrackerRows, columns, 'trip-report-tracker');
  };

  const filteredSummary =
    statusFilter === 'all'
      ? initialSummaryList
      : initialSummaryList.filter((row) => row.report_status === statusFilter);

  const hasActiveTemplates = initialTemplates.some((t) => t.template_status === 'active');

  return (
    <>
      <div className="flex flex-col gap-4">
        <div data-onboarding="page-trip-reports">
          <h1 className="text-2xl font-semibold tracking-tight">Trip Report Summary</h1>
          <p className="text-sm text-muted-foreground">
            View and manage site visit reports. Create site visits and templates from the actions below.
          </p>
        </div>

        <Tabs tabsId="trip-reports" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList className="h-9 flex-wrap">
              <TabsTrigger value="summary">Trip Report Summary</TabsTrigger>
              <TabsTrigger value="tracker">Trip Report Tracker</TabsTrigger>
              <TabsTrigger value="review">Review queue</TabsTrigger>
              <TabsTrigger value="admin">Trip Report Admin</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px] text-xs" style={{ fontSize: '12px' }}>
                  <SelectValue
                    placeholder="All Statuses"
                    getDisplayLabel={(v) =>
                      !v || v === 'all' ? 'All Statuses' : (VISIT_REPORT_STATUS_LABELS[v as keyof typeof VISIT_REPORT_STATUS_LABELS] ?? v)
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(Object.entries(VISIT_REPORT_STATUS_LABELS) as [keyof typeof VISIT_REPORT_STATUS_LABELS, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeTab === 'summary' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateVisitOpen(true)}
                  aria-label="Create Site Visit"
                  title={
                    hasActiveTemplates
                      ? 'Create a site visit and trip report. Select a report template in the form to associate the report with that template; choose "None" for a report without a template.'
                      : 'Create at least one active template in the Admin tab before creating a site visit.'
                  }
                  className="ml-auto"
                  disabled={!hasActiveTemplates}
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Create Site Visit
                </Button>
              )}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-xs">#</TableHead>
                    <TableHead className="text-xs">Site Name</TableHead>
                    <TableHead className="text-xs">Visit Name</TableHead>
                    <TableHead className="text-xs">Visit Type</TableHead>
                    <TableHead className="text-xs">Country</TableHead>
                    <TableHead className="text-xs">Visit Start Date</TableHead>
                    <TableHead className="text-xs">Report Status</TableHead>
                    <TableHead className="text-xs">Report Author</TableHead>
                    <TableHead className="text-xs min-w-[120px] w-[120px] text-center">Report Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSummary.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No visit reports found. Create a site visit to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSummary.map((row, idx) => (
                      <TableRow key={row.visit_id}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{row.site_name}</TableCell>
                        <TableCell className="text-xs">{row.visit_name}</TableCell>
                        <TableCell className="text-xs">
                          {VISIT_REPORT_TYPE_LABELS[row.visit_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? row.visit_type}
                        </TableCell>
                        <TableCell className="text-xs">{row.country_name}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.visit_start_date)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={row.report_status} />
                            {row.submission_overdue && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Submission overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{row.report_author}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                          {row.report_status === 'approved_and_signed' &&
                            row.report_id &&
                            row.can_view_report && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-foreground"
                                disabled={pdfVisitIdLoading === row.visit_id}
                                onClick={() => handleDownloadOfficialPdf(row.visit_id)}
                                aria-label="Download approved report PDF"
                                title="Download approved report PDF"
                              >
                                {pdfVisitIdLoading === row.visit_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                  <FileCheck2 className="h-4 w-4" aria-hidden />
                                )}
                              </Button>
                            )}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Report options</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_view_report}>
                                <Link
                                  href={
                                    row.report_id && row.can_view_report
                                      ? `/protected/trip-reports/${row.visit_id}/author`
                                      : '#'
                                  }
                                  className={`flex w-full items-center gap-2 px-2 py-1.5 ${!row.report_id || !row.can_view_report ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View report
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_edit_report}>
                                <Link
                                  href={
                                    row.report_id && row.can_edit_report
                                      ? `/protected/trip-reports/${row.visit_id}/author`
                                      : '#'
                                  }
                                  className={`flex w-full items-center gap-2 px-2 py-1.5 ${!row.report_id || !row.can_edit_report ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Report
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_review_report}>
                                <Link
                                  href={
                                    row.report_id && row.can_review_report
                                      ? `/protected/trip-reports/${row.visit_id}${TRIP_REPORT_CLAIM_REVIEW_PATH}`
                                      : '#'
                                  }
                                  className={`flex w-full items-center gap-2 px-2 py-1.5 ${!row.report_id || !row.can_review_report ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Open for review
                                </Link>
                              </DropdownMenuItem>
                              {row.report_status === 'approved_and_signed' &&
                                row.report_id &&
                                row.can_view_report && (
                                  <DropdownMenuItem
                                    disabled={pdfVisitIdLoading === row.visit_id}
                                    onClick={() => handleDownloadOfficialPdf(row.visit_id)}
                                  >
                                    <FileCheck2 className="h-4 w-4 mr-2" />
                                    Download official PDF
                                  </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="tracker" className="mt-4 space-y-4">
            {(() => {
              const totalVisits = trackerRows.length;
              const statusKeys = Object.keys(VISIT_REPORT_STATUS_LABELS) as VisitReportStatus[];
              const statusPills: { id: string; label: string; count: number }[] = [
                { id: 'total', label: 'Total Visits', count: totalVisits },
                ...statusKeys.map((id) => ({
                  id,
                  label: VISIT_REPORT_STATUS_LABELS[id],
                  count: trackerRows.filter((r) => r.report_status === id).length,
                })),
              ];
              return (
                <>
                  <div className="flex flex-wrap items-start gap-6">
                    <div className="min-w-0 flex-1">
                      <h3 className="border-b border-border pb-1 text-sm font-semibold">Report Status</h3>
                      <div className="mt-3 flex flex-wrap items-start gap-3">
                        <div>
                          <h4 className="border-b border-border pb-1 text-left text-sm font-semibold">Trip Report Submission</h4>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <div className="min-w-[90px] rounded-md border border-border bg-card p-2 text-left shadow-sm">
                              <p className="text-[11px] text-muted-foreground">Compliant / Not Compliant</p>
                              <p className="text-base font-semibold">{trackerMetrics.submissionCompleted}</p>
                            </div>
                            <div className="min-w-[70px] rounded-md border border-border bg-card p-2 text-left shadow-sm">
                              <p className="text-[11px] text-muted-foreground">Compliance %</p>
                              <p className="text-base font-semibold">{trackerMetrics.submissionPercent}%</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="border-b border-border pb-1 text-left text-sm font-semibold">Trip Report Approval</h4>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <div className="min-w-[90px] rounded-md border border-border bg-card p-2 text-left shadow-sm">
                              <p className="text-[11px] text-muted-foreground">Compliant / Not Compliant</p>
                              <p className="text-base font-semibold">{trackerMetrics.approvalCompleted}</p>
                            </div>
                            <div className="min-w-[70px] rounded-md border border-border bg-card p-2 text-left shadow-sm">
                              <p className="text-[11px] text-muted-foreground">Compliance %</p>
                              <p className="text-base font-semibold">{trackerMetrics.approvalPercent}%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full max-w-full flex-wrap items-center justify-start gap-2">
                    <Select value={trackerStatusFilter} onValueChange={setTrackerStatusFilter}>
                      <SelectTrigger className="w-[180px] text-xs" style={{ fontSize: '12px' }}>
                        <SelectValue
                          placeholder="All Statuses"
                          getDisplayLabel={(v) =>
                            !v || v === 'all' ? 'All Statuses' : (VISIT_REPORT_STATUS_LABELS[v as keyof typeof VISIT_REPORT_STATUS_LABELS] ?? v)
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {(Object.entries(VISIT_REPORT_STATUS_LABELS) as [keyof typeof VISIT_REPORT_STATUS_LABELS, string][]).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={trackerStudyFilter} onValueChange={setTrackerStudyFilter}>
                      <SelectTrigger className="w-[160px] text-xs" style={{ fontSize: '12px' }}>
                        <SelectValue
                          placeholder="All studies"
                          getDisplayLabel={(v) => (!v || v === 'all' ? 'All studies' : v)}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All studies</SelectItem>
                        {trackerStudyOptions.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={trackerSiteFilter} onValueChange={setTrackerSiteFilter}>
                      <SelectTrigger className="w-[160px] text-xs" style={{ fontSize: '12px' }}>
                        <SelectValue
                          placeholder="All sites"
                          getDisplayLabel={(v) => (!v || v === 'all' ? 'All sites' : v)}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All sites</SelectItem>
                        {trackerSiteOptions.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={trackerVisitTypeFilter} onValueChange={setTrackerVisitTypeFilter}>
                      <SelectTrigger className="w-[170px] text-xs" style={{ fontSize: '12px' }}>
                        <SelectValue
                          placeholder="All visit types"
                          getDisplayLabel={(v) =>
                            !v || v === 'all'
                              ? 'All visit types'
                              : (VISIT_REPORT_TYPE_LABELS[v as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? v)
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All visit types</SelectItem>
                        {trackerVisitTypeOptions.map((vt) => (
                          <SelectItem key={vt} value={vt}>
                            {VISIT_REPORT_TYPE_LABELS[vt as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? vt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={trackerAuthorFilter} onValueChange={setTrackerAuthorFilter}>
                      <SelectTrigger className="w-[170px] text-xs" style={{ fontSize: '12px' }}>
                        <SelectValue
                          placeholder="All authors"
                          getDisplayLabel={(v) =>
                            !v || v === 'all' ? 'All authors' : trackerPersonSelectLabel(v)
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All authors</SelectItem>
                        {trackerAuthorOptions.map((key) => (
                          <SelectItem key={key} value={key}>
                            {trackerPersonSelectLabel(key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={trackerComplianceFilter} onValueChange={setTrackerComplianceFilter}>
                      <SelectTrigger className="w-[170px] text-xs" style={{ fontSize: '12px' }}>
                        <SelectValue
                          placeholder="All compliance"
                          getDisplayLabel={(v) => (!v || v === 'all' ? 'All compliance' : v)}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All compliance</SelectItem>
                        {trackerComplianceOptions.map((cs) => (
                          <SelectItem key={cs} value={cs}>{cs}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={resetTrackerFilters}
                      disabled={!trackerFiltersActive}
                      aria-label="Reset tracker filters"
                      title="Reset tracker filters"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <div className="mt-2 flex w-full max-w-full flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusPills.map(({ id, label, count }) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs"
                        >
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-sm ${TRACKER_STATUS_SWATCH[id] ?? 'bg-muted-foreground/60'}`}
                            aria-hidden
                          />
                          <span>
                            {label} ({count})
                          </span>
                        </span>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExportTrackerCsv} className="shrink-0">
                      <Download className="h-4 w-4 mr-1.5" />
                      Download CSV
                    </Button>
                  </div>
                </>
              );
            })()}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 w-10 min-w-10 border-r border-border bg-background text-xs">#</TableHead>
                    <TableHead className="sticky left-10 z-10 min-w-[140px] border-r border-border bg-background text-xs">Study Name</TableHead>
                    <TableHead className="sticky left-[180px] z-10 min-w-[120px] border-r border-border bg-background text-xs">Site</TableHead>
                    <TableHead className="sticky left-[300px] z-10 min-w-[120px] border-r border-border bg-background text-xs shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)]">Visit Type</TableHead>
                    <TableHead className="text-xs">Visit ID</TableHead>
                    <TableHead className="text-xs">Visit End Date</TableHead>
                    <TableHead className="text-xs min-w-[140px]">Expected Send Date: Confirmation Letter</TableHead>
                    <TableHead className="text-xs min-w-[120px]">Expected VR Submission Date</TableHead>
                    <TableHead className="text-xs">VR Submission Date</TableHead>
                    <TableHead className="text-xs">Submission Compliance</TableHead>
                    <TableHead className="text-xs">Submission Days</TableHead>
                    <TableHead className="text-xs">VR Reviewed Date</TableHead>
                    <TableHead className="text-xs">Review Days</TableHead>
                    <TableHead className="text-xs min-w-[120px]">Expected VR Approval Date</TableHead>
                    <TableHead className="text-xs">VR Approval Date</TableHead>
                    <TableHead className="text-xs">Approval Compliance</TableHead>
                    <TableHead className="text-xs">Approval Days</TableHead>
                    <TableHead className="text-xs min-w-[140px]">Expected Send Date: Follow-up Letter</TableHead>
                    <TableHead className="text-xs min-w-[140px]">Date Follow-up Letter Uploaded</TableHead>
                    <TableHead className="text-xs min-w-[160px]">Date Monitoring visit log (MVL Log) Uploaded</TableHead>
                    <TableHead className="text-xs min-w-[160px]">Days Until Trip Report Submission Due</TableHead>
                    <TableHead className="text-xs">Visit Report Status</TableHead>
                    <TableHead className="text-xs">Days Until Submission Due</TableHead>
                    <TableHead className="text-xs">Days Until Approval Due</TableHead>
                    <TableHead className="text-xs">Report Author</TableHead>
                    <TableHead className="text-xs">Submission Date</TableHead>
                    <TableHead className="text-xs">Approver</TableHead>
                    <TableHead className="text-xs">Compliance Status</TableHead>
                    <TableHead className="text-xs w-20 text-center">Report Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrackerRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={29} className="text-center text-muted-foreground py-8">
                        {trackerRows.length === 0
                          ? 'No tracker data.'
                          : 'No rows match the current filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrackerRows.map((row, idx) => (
                      <TableRow key={row.visit_id}>
                        <TableCell className="sticky left-0 z-10 border-r border-border bg-background text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="sticky left-10 z-10 border-r border-border bg-background text-xs">{row.study_name}</TableCell>
                        <TableCell className="sticky left-[180px] z-10 border-r border-border bg-background text-xs">{row.site_name}</TableCell>
                        <TableCell className="sticky left-[300px] z-10 border-r border-border bg-background text-xs shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                          {VISIT_REPORT_TYPE_LABELS[row.visit_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? row.visit_type}
                        </TableCell>
                        <TableCell className="text-xs">{row.visit_id_display}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.visit_end_date)}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.expected_send_date_confirmation_letter)}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.expected_vr_submission_date)}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.submission_date)}</TableCell>
                        <TableCell className="text-xs">{row.submission_compliance}</TableCell>
                        <TableCell className="text-xs">{row.submission_days ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.vr_reviewed_date)}</TableCell>
                        <TableCell className="text-xs">{row.review_days ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.expected_vr_approval_date)}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.approved_date)}</TableCell>
                        <TableCell className="text-xs">{row.approval_compliance}</TableCell>
                        <TableCell className="text-xs">{row.approval_days ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.expected_send_date_followup_letter)}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.date_followup_letter_uploaded)}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.date_mvl_log_uploaded)}</TableCell>
                        <TableCell className="text-xs">{row.days_until_submission_due ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={row.report_status} />
                            {row.submission_overdue && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                Sub. overdue
                              </Badge>
                            )}
                            {row.approval_overdue && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-600 text-amber-800">
                                Appr. overdue
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{row.days_until_submission_due ?? '—'}</TableCell>
                        <TableCell className="text-xs">{row.days_until_approval_due ?? '—'}</TableCell>
                        <TableCell className="text-xs">{row.report_author ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(row.submission_date)}</TableCell>
                        <TableCell className="text-xs">{row.approver ?? '—'}</TableCell>
                        <TableCell className="text-xs">{row.compliance_status}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                          {row.report_status === 'approved_and_signed' &&
                            row.report_id &&
                            row.can_view_report && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-foreground"
                                disabled={pdfVisitIdLoading === row.visit_id}
                                onClick={() => handleDownloadOfficialPdf(row.visit_id)}
                                aria-label="Download approved report PDF"
                                title="Download approved report PDF"
                              >
                                {pdfVisitIdLoading === row.visit_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                  <FileCheck2 className="h-4 w-4" aria-hidden />
                                )}
                              </Button>
                            )}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Options</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {row.report_status === 'submitted' && (
                                <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_review_report}>
                                  <Link
                                    href={
                                      row.report_id && row.can_review_report
                                        ? `/protected/trip-reports/${row.visit_id}${TRIP_REPORT_CLAIM_REVIEW_PATH}`
                                        : '#'
                                    }
                                    className={`flex w-full items-center gap-2 px-2 py-1.5 ${!row.report_id || !row.can_review_report ? 'pointer-events-none opacity-50' : ''}`}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Start Review
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_view_report}>
                                <Link
                                  href={
                                    row.report_id && row.can_view_report
                                      ? `/protected/trip-reports/${row.visit_id}/author`
                                      : '#'
                                  }
                                  className={`flex w-full items-center gap-2 px-2 py-1.5 ${!row.report_id || !row.can_view_report ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View report
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_edit_report}>
                                <Link
                                  href={
                                    row.report_id && row.can_edit_report
                                      ? `/protected/trip-reports/${row.visit_id}/author`
                                      : '#'
                                  }
                                  className={`flex w-full items-center gap-2 px-2 py-1.5 ${!row.report_id || !row.can_edit_report ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Report
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_review_report}>
                                <Link
                                  href={
                                    row.report_id && row.can_review_report
                                      ? `/protected/trip-reports/${row.visit_id}${TRIP_REPORT_CLAIM_REVIEW_PATH}`
                                      : '#'
                                  }
                                  className={`flex w-full items-center gap-2 px-2 py-1.5 ${!row.report_id || !row.can_review_report ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Open for review
                                </Link>
                              </DropdownMenuItem>
                              {row.report_status === 'approved_and_signed' &&
                                row.report_id &&
                                row.can_view_report && (
                                  <DropdownMenuItem
                                    disabled={pdfVisitIdLoading === row.visit_id}
                                    onClick={() => handleDownloadOfficialPdf(row.visit_id)}
                                  >
                                    <FileCheck2 className="h-4 w-4 mr-2" />
                                    Download official PDF
                                  </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="review" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Reports in <strong>Submitted</strong> or <strong>Under review</strong> for studies where you are a Clinical
              Project Manager. Open a row to start review or complete approval.
            </p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Study</TableHead>
                    <TableHead className="text-xs">Site</TableHead>
                    <TableHead className="text-xs">Visit type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Author</TableHead>
                    <TableHead className="text-xs w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialReviewQueue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No reports waiting for your review.
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialReviewQueue.map((row: TripReportReviewQueueRow) => (
                      <TableRow key={row.visit_id}>
                        <TableCell className="text-xs font-medium">{row.study_name}</TableCell>
                        <TableCell className="text-xs">{row.site_name}</TableCell>
                        <TableCell className="text-xs">
                          {VISIT_REPORT_TYPE_LABELS[row.visit_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ??
                            row.visit_type}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.report_status} />
                        </TableCell>
                        <TableCell className="text-xs">{row.report_author ?? '—'}</TableCell>
                        <TableCell>
                          <Link
                            href={`/protected/trip-reports/${row.visit_id}${TRIP_REPORT_CLAIM_REVIEW_PATH}`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 text-xs')}
                          >
                            Open
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="admin" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Card className="w-fit">
                <CardContent className="py-3 px-4 text-center">
                  <p className="text-xs text-muted-foreground">Template Count</p>
                  <p className="text-xl font-semibold">{templateCount}</p>
                </CardContent>
              </Card>
              <Button size="sm" onClick={() => setCreateTemplateOpen(true)} aria-label="Create Template">
                <FilePlus className="h-4 w-4 mr-1.5" />
                Create Template
              </Button>
            </div>
            <div className="rounded-md border">
              <Table className="text-[11px]">
                <TableHeader>
                  <TableRow className="h-8 hover:bg-transparent">
                    <TableHead className="h-8 w-8 min-w-8 px-1.5 py-1 text-[11px] leading-none">#</TableHead>
                    <TableHead className="h-8 min-w-0 px-1.5 py-1 text-[11px] leading-none">Template Name</TableHead>
                    <TableHead className="h-8 w-[194px] px-1.5 py-1 text-[11px] leading-none">Question Count</TableHead>
                    <TableHead className="h-8 min-w-0 px-1.5 py-1 text-[11px] leading-none">Study Name</TableHead>
                    <TableHead className="h-8 min-w-0 px-1.5 py-1 text-[11px] leading-none">Visit Type</TableHead>
                    <TableHead className="h-8 px-1.5 py-1 text-[11px] leading-none">Created By</TableHead>
                    <TableHead className="h-8 w-[158px] px-1.5 py-1 text-[11px] leading-none">Template Status</TableHead>
                    <TableHead className="h-8 w-[120px] px-1.5 py-1 text-[11px] leading-none">Template Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialTemplates.length === 0 ? (
                    <TableRow className="h-auto hover:bg-transparent">
                        <TableCell colSpan={8} className="px-1.5 py-6 text-center text-[11px] text-muted-foreground">
                        No templates yet. Create a template to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialTemplates.map((t, idx) => (
                      <TableRow key={t.id} className="h-8">
                        <TableCell className="px-1.5 py-1 text-[11px] leading-tight text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="max-w-[220px] truncate px-1.5 py-1 text-[11px] font-medium leading-tight">{t.name}</TableCell>
                        <TableCell className="px-1.5 py-1 text-[11px] leading-tight">{t.question_count}</TableCell>
                        <TableCell className="max-w-[200px] truncate px-1.5 py-1 text-[11px] leading-tight">
                          {t.study_name ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate px-1.5 py-1 text-[11px] leading-tight">
                          {VISIT_REPORT_TYPE_LABELS[t.visit_report_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? t.visit_report_type}
                        </TableCell>
                        <TableCell className="px-1.5 py-1 text-[11px] leading-tight">—</TableCell>
                        <TableCell className="px-1.5 py-1">
                          <StatusBadge
                            status={t.template_status}
                            label={TEMPLATE_STATUS_LABELS[t.template_status as keyof typeof TEMPLATE_STATUS_LABELS]}
                            className="px-1.5 py-0 text-[10px] font-normal leading-none"
                          />
                        </TableCell>
                        <TableCell className="px-1.5 py-1">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/protected/trip-reports/templates/${t.id}`}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'flex h-auto flex-col gap-0.5 p-1 text-muted-foreground hover:text-foreground'
                              )}
                              aria-label="Edit template"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-normal leading-none">Edit</span>
                            </Link>
                            <Link
                              href={`/protected/trip-reports/templates/${t.id}?mode=view`}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'flex h-auto flex-col gap-0.5 p-1 text-muted-foreground hover:text-foreground'
                              )}
                              aria-label="View template"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-normal leading-none">View</span>
                            </Link>
                            {t.template_status === 'inactive' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="flex h-auto flex-col gap-0.5 p-1 text-muted-foreground hover:text-foreground"
                                onClick={() => setActionTemplate({ id: t.id, report_count: t.report_count ?? 0, template_status: t.template_status })}
                                aria-label="Reactivate template"
                              >
                                <Power className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-normal leading-none">Reactivate</span>
                              </Button>
                            ) : (t.report_count ?? 0) === 0 ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="flex h-auto flex-col gap-0.5 p-1 text-muted-foreground hover:text-destructive"
                                onClick={() => setActionTemplate({ id: t.id, report_count: t.report_count ?? 0, template_status: t.template_status })}
                                aria-label="Delete template"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-normal leading-none">Delete</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="flex h-auto flex-col gap-0.5 p-1 text-muted-foreground hover:text-foreground"
                                onClick={() => setActionTemplate({ id: t.id, report_count: t.report_count ?? 0, template_status: t.template_status })}
                                aria-label="Deactivate template"
                              >
                                <PowerOff className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-normal leading-none">Deactivate</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <CreateSiteVisitModal
          open={createVisitOpen}
          onOpenChange={setCreateVisitOpen}
          studies={studies}
          templates={initialTemplates}
          initialTemplateId={searchParams.get('templateId')}
          onSuccess={refresh}
        />
        <AddEditTemplateModal
          open={createTemplateOpen || !!editTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setCreateTemplateOpen(false);
              setEditTemplate(null);
            }
          }}
          template={editTemplate}
          studies={studies}
          onSuccess={() => {
            setEditTemplate(null);
            refresh();
          }}
        />
        <AlertDialog open={!!actionTemplate} onOpenChange={(open) => !open && setActionTemplate(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionTemplate?.template_status === 'inactive'
                  ? 'Reactivate template'
                  : (actionTemplate?.report_count ?? 0) === 0
                    ? 'Delete template'
                    : 'Deactivate template'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionTemplate?.template_status === 'inactive'
                  ? 'Restore this template so it can be selected for new reports.'
                  : (actionTemplate?.report_count ?? 0) === 0
                    ? 'This will permanently delete the template and its questions. This action cannot be undone.'
                    : `This template is used in ${actionTemplate?.report_count ?? 0} report(s). It cannot be deleted. Deactivating will hide it from new report creation. Existing reports keep their data.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={
                  actionTemplate?.template_status === 'inactive' || (actionTemplate?.report_count ?? 0) > 0
                    ? undefined
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                }
                onClick={async () => {
                  if (!actionTemplate) return;
                  const id = actionTemplate.id;
                  const isReactivate = actionTemplate.template_status === 'inactive';
                  const isDelete = actionTemplate.template_status !== 'inactive' && (actionTemplate.report_count ?? 0) === 0;
                  setActionTemplate(null);
                  if (isReactivate) {
                    const { error } = await reactivateTemplate(id);
                    if (error) toast.error(error);
                    else {
                      toast.success('Template reactivated.');
                      refresh();
                    }
                  } else if (isDelete) {
                    const { error } = await deleteTemplate(id);
                    if (error) toast.error(error);
                    else {
                      toast.success('Template deleted.');
                      refresh();
                    }
                  } else {
                    const { error } = await deactivateTemplate(id);
                    if (error) toast.error(error);
                    else {
                      toast.success('Template deactivated.');
                      refresh();
                    }
                  }
                }}
              >
                {actionTemplate?.template_status === 'inactive'
                  ? 'Reactivate'
                  : (actionTemplate?.report_count ?? 0) === 0
                    ? 'Delete'
                    : 'Deactivate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
