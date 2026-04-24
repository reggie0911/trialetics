'use client';

import { useState, useEffect, useMemo, useRef, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  History,
  FileSignature,
  Archive,
  Send,
  Undo2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  approveReportsBulk,
  recallReport,
} from '@/lib/actions/visit-reports';
import { downloadVisitReportPdf } from '@/lib/utils/visit-report-pdf';
import {
  downloadVisitReportPdfBundle,
  type BulkPdfFailure,
  type BulkPdfItem,
} from '@/lib/utils/bulk-visit-report-pdf';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkSignatureCaptureModal, type BulkSignatureReportRow } from './bulk-signature-capture-modal';
import type { SignatureCaptureConfirmPayload } from './signature-capture-modal';
import { exportToCSV } from '@/lib/utils/table-export';
import {
  VISIT_REPORT_STATUS_LABELS,
  VISIT_REPORT_TYPE_LABELS,
  VISIT_REPORT_TYPE_OPTIONS,
  TEMPLATE_STATUS_LABELS,
} from '@/lib/types/visit-reports';
import { TRIP_REPORT_CLAIM_REVIEW_PATH } from '@/lib/constants/visit-reports';
import { TRIP_REPORT_DEFAULT_PAGE_SIZE } from '@/lib/trip-report-compliance';
import type { VisitReportStatus, VisitReportTemplate } from '@/lib/types/visit-reports';
import type { Study } from '@/lib/types/ctms';
import { ctmsStudyPath } from '@/lib/nav/ctms-study-paths';
import { Badge } from '@/components/ui/badge';
import { CreateSiteVisitModal } from './create-site-visit-modal';
import { AddEditTemplateModal } from './add-edit-template-modal';
import { TripReportStatusTimelineDialog } from './trip-report-status-timeline-dialog';

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

const ADMIN_TEMPLATE_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const ADMIN_TEMPLATE_PAGE_SIZE_MAX = 200;

function parseAdminTemplatePage(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function parseAdminTemplatePageSize(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return TRIP_REPORT_DEFAULT_PAGE_SIZE;
  const capped = Math.min(ADMIN_TEMPLATE_PAGE_SIZE_MAX, n);
  if ((ADMIN_TEMPLATE_PAGE_SIZE_OPTIONS as readonly number[]).includes(capped)) {
    return capped;
  }
  return TRIP_REPORT_DEFAULT_PAGE_SIZE;
}

interface TripReportsPageClientProps {
  initialSummaryList: TripReportSummaryRow[];
  summaryTotal?: number;
  summaryPage?: number;
  summaryPageSize?: number;
  summarySort?: { column: string; direction: 'asc' | 'desc' } | null;
  templateCount: number;
  initialTemplates: TemplateWithQuestionCount[];
  studies: Pick<Study, 'id' | 'title' | 'study_name' | 'protocol_number'>[];
  trackerRows: TripReportTrackerRow[];
  trackerTotal?: number;
  trackerPage?: number;
  trackerPageSize?: number;
  trackerSort?: { column: string; direction: 'asc' | 'desc' } | null;
  trackerMetrics: TrackerComplianceMetrics;
  initialReviewQueue: TripReportReviewQueueRow[];
  /** When set, links stay under `/protected/studies/{id}/trip-reports/...`. */
  studyId?: string | null;
  /**
   * Whether the current user holds an active CPM membership on any study.
   * When false, the Review queue tab is hidden because the user can never
   * approve a report.
   */
  isCpmOnAnyStudy?: boolean;
}

export function TripReportsPageClient({
  initialSummaryList,
  summaryTotal,
  summaryPage = 1,
  summaryPageSize = 50,
  summarySort = null,
  templateCount,
  initialTemplates,
  studies,
  trackerRows,
  trackerTotal,
  trackerPage = 1,
  trackerPageSize = 50,
  trackerSort = null,
  trackerMetrics,
  initialReviewQueue,
  studyId = null,
  isCpmOnAnyStudy = false,
}: TripReportsPageClientProps) {
  const summaryTotalCount = summaryTotal ?? initialSummaryList.length;
  const trackerTotalCount = trackerTotal ?? trackerRows.length;
  const summaryTotalPages = Math.max(1, Math.ceil(summaryTotalCount / summaryPageSize));
  const trackerTotalPages = Math.max(1, Math.ceil(trackerTotalCount / trackerPageSize));
  const portfolioStudyFallback =
    studyId ??
    studies[0]?.id ??
    initialSummaryList[0]?.study_id ??
    trackerRows[0]?.study_id ??
    initialReviewQueue[0]?.study_id ??
    null;

  const tripBaseForRow = (rowStudyId: string) => ctmsStudyPath(studyId ?? rowStudyId, 'trip-reports');

  const tripBaseForTemplate = (t: TemplateWithQuestionCount) => {
    const sid = studyId ?? t.study_id ?? portfolioStudyFallback;
    if (!sid) return '/protected/studies';
    return ctmsStudyPath(sid, 'trip-reports');
  };

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTabFromUrl = (() => {
    const tab = searchParams.get('tab');
    if (tab === 'admin' || tab === 'tracker' || tab === 'summary') return tab;
    if (tab === 'review' && isCpmOnAnyStudy) return tab;
    return 'summary';
  })();

  const [activeTab, setActiveTab] = useState<string>(initialTabFromUrl);
  const [createVisitOpen, setCreateVisitOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? 'all');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<string>(searchParams.get('tStatus') ?? 'all');
  const [trackerStudyFilter, setTrackerStudyFilter] = useState<string>(searchParams.get('tStudy') ?? 'all');
  const [trackerSiteFilter, setTrackerSiteFilter] = useState<string>(searchParams.get('tSite') ?? 'all');
  const [trackerVisitTypeFilter, setTrackerVisitTypeFilter] = useState<string>(searchParams.get('tType') ?? 'all');
  const [trackerAuthorFilter, setTrackerAuthorFilter] = useState<string>(searchParams.get('tAuthor') ?? 'all');
  const [trackerComplianceFilter, setTrackerComplianceFilter] = useState<string>(searchParams.get('tCompliance') ?? 'all');
  const [adminVisitTypeFilter, setAdminVisitTypeFilter] = useState<string>(searchParams.get('aVtype') ?? 'all');

  useEffect(() => {
    setAdminVisitTypeFilter(searchParams.get('aVtype') ?? 'all');
  }, [searchParams]);

  const adminSort = (() => {
    const raw = searchParams.get('aSort');
    if (!raw) return null;
    const [column, direction] = raw.split(':');
    if (!column || (direction !== 'asc' && direction !== 'desc')) return null;
    return { column, direction: direction as 'asc' | 'desc' };
  })();

  const templatesFilteredByVisitType = useMemo(() => {
    if (adminVisitTypeFilter === 'all') return initialTemplates;
    return initialTemplates.filter((t) => t.visit_report_type === adminVisitTypeFilter);
  }, [initialTemplates, adminVisitTypeFilter]);

  const sortedTemplates = useMemo(() => {
    if (!adminSort) return templatesFilteredByVisitType;
    const arr = [...templatesFilteredByVisitType];
    const { column, direction } = adminSort;
    const get = (t: TemplateWithQuestionCount): unknown => {
      switch (column) {
        case 'name': return t.name;
        case 'question_count': return t.question_count;
        case 'study_name': return t.study_name;
        case 'visit_report_type': return t.visit_report_type;
        case 'created_by_name': return t.created_by_name;
        case 'template_status': return t.template_status;
        default: return null;
      }
    };
    arr.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av == null && bv == null) return 0;
      if (av == null) return direction === 'asc' ? 1 : -1;
      if (bv == null) return direction === 'asc' ? -1 : 1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return direction === 'asc' ? av - bv : bv - av;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      const cmp = sa < sb ? -1 : sa > sb ? 1 : 0;
      return direction === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [templatesFilteredByVisitType, adminSort]);

  const adminTemplatesTotal = sortedTemplates.length;
  const adminParsedPageSize = parseAdminTemplatePageSize(searchParams.get('aPs'));
  const adminTotalPages = Math.max(1, Math.ceil(adminTemplatesTotal / adminParsedPageSize) || 1);
  const adminParsedPage = parseAdminTemplatePage(searchParams.get('aPage'));
  const adminCurrentPage = Math.min(Math.max(1, adminParsedPage), adminTotalPages);

  const paginatedTemplates = useMemo(() => {
    const start = (adminCurrentPage - 1) * adminParsedPageSize;
    return sortedTemplates.slice(start, start + adminParsedPageSize);
  }, [sortedTemplates, adminCurrentPage, adminParsedPageSize]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'admin' || tab === 'tracker' || tab === 'summary') {
      setActiveTab((prev) => (prev === tab ? prev : tab));
    } else if (tab === 'review' && isCpmOnAnyStudy) {
      setActiveTab((prev) => (prev === 'review' ? prev : 'review'));
    }
    if (searchParams.get('createVisit') === '1') {
      setCreateVisitOpen(true);
      setActiveTab('summary');
    }
  }, [searchParams, isCpmOnAnyStudy]);

  useEffect(() => {
    if (!pathname) return;
    const params = new URLSearchParams(searchParams.toString());
    const setOrDelete = (key: string, value: string, defaultValue = 'all') => {
      if (value && value !== defaultValue) params.set(key, value);
      else params.delete(key);
    };
    setOrDelete('tab', activeTab, 'summary');
    setOrDelete('status', statusFilter);
    setOrDelete('tStatus', trackerStatusFilter);
    setOrDelete('tStudy', trackerStudyFilter);
    setOrDelete('tSite', trackerSiteFilter);
    setOrDelete('tType', trackerVisitTypeFilter);
    setOrDelete('tAuthor', trackerAuthorFilter);
    setOrDelete('tCompliance', trackerComplianceFilter);
    setOrDelete('aVtype', adminVisitTypeFilter);
    params.delete('createVisit');
    const aPageVal = params.get('aPage');
    if (!aPageVal || aPageVal === '1') params.delete('aPage');
    const aPsVal = params.get('aPs');
    const defaultPs = String(TRIP_REPORT_DEFAULT_PAGE_SIZE);
    if (!aPsVal || aPsVal === defaultPs) params.delete('aPs');
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [
    pathname,
    router,
    searchParams,
    activeTab,
    statusFilter,
    trackerStatusFilter,
    trackerStudyFilter,
    trackerSiteFilter,
    trackerVisitTypeFilter,
    trackerAuthorFilter,
    trackerComplianceFilter,
    adminVisitTypeFilter,
  ]);
  // Selections only refer to currently-rendered ids; clear them any
  // time the rendered set could change underneath us. Bulk approve and
  // bulk PDF intentionally never carry selection across pages.
  useEffect(() => {
    setReviewSelected(new Set());
  }, [activeTab, initialReviewQueue]);
  useEffect(() => {
    setTrackerSelected(new Set());
  }, [
    activeTab,
    trackerPage,
    trackerPageSize,
    trackerSort,
    trackerStatusFilter,
    trackerStudyFilter,
    trackerSiteFilter,
    trackerVisitTypeFilter,
    trackerAuthorFilter,
    trackerComplianceFilter,
  ]);

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<VisitReportTemplate | null>(null);
  const [actionTemplate, setActionTemplate] = useState<{
    id: string;
    report_count: number;
    template_status: string;
  } | null>(null);
  const [pdfQueue, setPdfQueue] = useState<{ pending: string[]; active: string[]; completed: number; total: number }>(
    { pending: [], active: [], completed: 0, total: 0 }
  );
  const pdfToastIdRef = useRef<string | number | null>(null);
  /**
   * Per-row spinner predicate. Returns true while the visit's PDF download is
   * queued or currently being generated.
   */
  const isPdfBusy = (visitId: string): boolean =>
    pdfQueue.active.includes(visitId) || pdfQueue.pending.includes(visitId);
  const [timelineReport, setTimelineReport] = useState<{ reportId: string; label: string } | null>(null);
  const [recallTarget, setRecallTarget] = useState<{ reportId: string; label: string } | null>(null);
  const [isRecallPending, startRecallTransition] = useTransition();

  const handleConfirmRecall = () => {
    if (!recallTarget) return;
    const target = recallTarget;
    startRecallTransition(async () => {
      const { error } = await recallReport(target.reportId);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Report recalled. You can edit and resubmit.');
      setRecallTarget(null);
      router.refresh();
    });
  };

  // Bulk-action selections. Each set is keyed by the row's natural id
  // (visit_id for tracker, report_id for review queue) and represents
  // ONLY the currently-rendered page; cleared on tab/filter/page/sort
  // changes so a CPM can never "select across all pages" without seeing
  // every record they sign.
  const [reviewSelected, setReviewSelected] = useState<Set<string>>(new Set());
  const [trackerSelected, setTrackerSelected] = useState<Set<string>>(new Set());
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkApprovePending, setBulkApprovePending] = useState(false);
  const [bulkApproveErrors, setBulkApproveErrors] = useState<
    { reportId: string; label: string; error: string }[]
  >([]);
  const [bulkPdfRunning, setBulkPdfRunning] = useState(false);
  const [bulkPdfProgress, setBulkPdfProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [bulkPdfFailures, setBulkPdfFailures] = useState<BulkPdfFailure[]>([]);
  const bulkPdfToastIdRef = useRef<string | number | null>(null);

  const refresh = () => router.refresh();

  const reviewQueueCount = initialReviewQueue.length;

  const updatePagerParam = (key: string, value: string | null) => {
    if (!pathname) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const onAdminVisitTypeFilterChange = (v: string) => {
    setAdminVisitTypeFilter(v);
    updatePagerParam('aPage', '1');
  };

  /**
   * Accessible link that visually appears disabled and short-circuits both
   * mouse navigation and keyboard activation when `disabled` is true. Avoids
   * `pointer-events-none`, which is not exposed to assistive tech and prevents
   * focus from landing on the element. Use for table-row dropdown actions
   * where permissions can disable specific items.
   */
  const DisabledAwareLink = ({
    disabled,
    href,
    className,
    children,
    label,
  }: {
    disabled: boolean;
    href: string;
    className?: string;
    children: React.ReactNode;
    label?: string;
  }) => (
    <Link
      href={disabled ? '#' : href}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      aria-label={label}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onKeyDown={(e) => {
        if (disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className={cn(
        'flex w-full items-center gap-2 px-2 py-1.5',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {children}
    </Link>
  );

  const renderSortHeader = (
    label: string,
    column: string,
    sortKey: string,
    currentSort: { column: string; direction: 'asc' | 'desc' } | null,
    pageKey: string
  ) => {
    const isActive = currentSort?.column === column;
    const nextDirection = isActive && currentSort?.direction === 'asc' ? 'desc' : 'asc';
    const handleClick = () => {
      if (isActive && currentSort?.direction === 'desc') {
        updatePagerParam(sortKey, null);
      } else {
        updatePagerParam(sortKey, `${column}:${nextDirection}`);
      }
      updatePagerParam(pageKey, '1');
    };
    return (
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 text-left font-medium hover:text-foreground"
        aria-label={`Sort by ${label}`}
      >
        <span>{label}</span>
        {isActive ? (
          currentSort?.direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden />
        )}
      </button>
    );
  };

  const renderPager = (
    label: string,
    currentPage: number,
    totalPages: number,
    pageSize: number,
    total: number,
    pageKey: string,
    pageSizeKey: string
  ) => {
    if (total <= 0) return null;
    const showingFrom = (currentPage - 1) * pageSize + 1;
    const showingTo = Math.min(total, currentPage * pageSize);
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <div>
          {label}: showing {showingFrom}–{showingTo} of {total}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            <span>Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                updatePagerParam(pageKey, '1');
                updatePagerParam(pageSizeKey, v);
              }}
            >
              <SelectTrigger className="h-7 w-[80px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage <= 1}
              onClick={() => updatePagerParam(pageKey, String(Math.max(1, currentPage - 1)))}
              aria-label={`Previous ${label.toLowerCase()} page`}
            >
              Prev
            </Button>
            <span className="px-1">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage >= totalPages}
              onClick={() => updatePagerParam(pageKey, String(Math.min(totalPages, currentPage + 1)))}
              aria-label={`Next ${label.toLowerCase()} page`}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Authoritative queue lives in refs so that fast successive clicks cannot
  // miss state updates that React has not yet flushed; the `pdfQueue` state
  // is a UI mirror used to drive per-row spinners.
  const pdfPendingRef = useRef<string[]>([]);
  const pdfActiveRef = useRef<string | null>(null);
  const pdfTotalRef = useRef(0);
  const pdfCompletedRef = useRef(0);
  const pdfRunningRef = useRef(false);

  const syncPdfQueueState = useCallback(() => {
    setPdfQueue({
      pending: [...pdfPendingRef.current],
      active: pdfActiveRef.current ? [pdfActiveRef.current] : [],
      completed: pdfCompletedRef.current,
      total: pdfTotalRef.current,
    });
  }, []);

  const updatePdfToast = useCallback(
    (message: string, mode: 'loading' | 'success' | 'error' = 'loading') => {
      const opts = pdfToastIdRef.current ? { id: pdfToastIdRef.current } : undefined;
      if (mode === 'loading') {
        const id = toast.loading(message, opts);
        pdfToastIdRef.current = id;
      } else if (mode === 'success') {
        toast.success(message, opts);
        pdfToastIdRef.current = null;
      } else {
        toast.error(message, opts);
        pdfToastIdRef.current = null;
      }
    },
    []
  );

  /**
   * Sequentially process PDF downloads from the queue. A single shared toast
   * tracks aggregate progress (X/Y) across all enqueued visits, so a user
   * who triggers multiple downloads is not blocked waiting for the first one.
   */
  const processPdfQueue = useCallback(async () => {
    if (pdfRunningRef.current) return;
    pdfRunningRef.current = true;
    try {
      while (pdfPendingRef.current.length > 0) {
        const nextVisitId = pdfPendingRef.current.shift()!;
        pdfActiveRef.current = nextVisitId;
        syncPdfQueueState();
        updatePdfToast(`Generating PDF ${pdfCompletedRef.current + 1} of ${pdfTotalRef.current}...`);
        try {
          const result = await getApprovedTripReportPdfData(nextVisitId);
          if ('error' in result) {
            updatePdfToast(result.error, 'error');
          } else {
            const pdfData = result.data;
            await downloadVisitReportPdf(pdfData, {
              filename: `Visit-Report-${String(pdfData.visitTypeLabel).replace(/[^a-zA-Z0-9-]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
              footerLeft: `${pdfData.studyTitle} | ${pdfData.siteName} | ${pdfData.visitTypeLabel}`,
              footerRight: `Printed: ${new Date().toLocaleDateString('en-US')}`,
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('PDF generation failed:', err);
          updatePdfToast(`PDF error: ${msg}`, 'error');
        } finally {
          pdfActiveRef.current = null;
          pdfCompletedRef.current += 1;
          syncPdfQueueState();
        }
      }
      if (pdfToastIdRef.current) {
        const total = pdfTotalRef.current;
        const msg = total > 1 ? `${total} PDFs downloaded.` : 'PDF downloaded.';
        updatePdfToast(msg, 'success');
      }
    } finally {
      pdfRunningRef.current = false;
      pdfPendingRef.current = [];
      pdfTotalRef.current = 0;
      pdfCompletedRef.current = 0;
      pdfActiveRef.current = null;
      syncPdfQueueState();
    }
  }, [syncPdfQueueState, updatePdfToast]);

  const handleDownloadOfficialPdf = (visitId: string) => {
    if (pdfPendingRef.current.includes(visitId) || pdfActiveRef.current === visitId) {
      toast.message('PDF already queued.');
      return;
    }
    pdfPendingRef.current.push(visitId);
    pdfTotalRef.current += 1;
    syncPdfQueueState();
    void processPdfQueue();
  };

  // ---------------------------------------------------------------
  // Bulk actions (review-queue-side; tracker-side uses
  // `filteredTrackerRows` so it's defined further below.)
  // ---------------------------------------------------------------

  /**
   * Subset of the current Review queue that can actually be approved
   * in a single batch. We keep the source-of-truth filter here so the
   * header checkbox and the toolbar agree on what "select all" means.
   */
  const reviewEligibleRows = useMemo(
    () =>
      initialReviewQueue.filter(
        (r) => r.report_status === 'submitted' || r.report_status === 'under_review'
      ),
    [initialReviewQueue]
  );

  const reviewAllSelected =
    reviewEligibleRows.length > 0 &&
    reviewEligibleRows.every((r) => reviewSelected.has(r.report_id));
  const reviewSomeSelected = reviewSelected.size > 0 && !reviewAllSelected;

  const toggleReviewRow = (reportId: string, checked: boolean) => {
    setReviewSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(reportId);
      else next.delete(reportId);
      return next;
    });
  };
  const toggleReviewAll = (checked: boolean) => {
    setReviewSelected(checked ? new Set(reviewEligibleRows.map((r) => r.report_id)) : new Set());
  };

  /**
   * Build the per-report context list shown above the printed-name
   * input in `BulkSignatureCaptureModal`. Order follows the rendered
   * Review queue so the visual list lines up with what the CPM was
   * just looking at.
   */
  const bulkApproveCandidates = useMemo<BulkSignatureReportRow[]>(
    () =>
      reviewEligibleRows
        .filter((r) => reviewSelected.has(r.report_id))
        .map((r) => ({
          reportId: r.report_id,
          primary: `${r.study_name} · ${r.site_name} · ${
            VISIT_REPORT_TYPE_LABELS[r.visit_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? r.visit_type
          }`,
          secondary: r.report_author ? `Author: ${r.report_author}` : null,
        })),
    [reviewEligibleRows, reviewSelected]
  );

  const handleBulkApproveConfirm = async (payload: SignatureCaptureConfirmPayload) => {
    const ids = bulkApproveCandidates.map((c) => c.reportId);
    if (ids.length === 0) return;
    setBulkApprovePending(true);
    setBulkApproveErrors([]);
    try {
      const response = await approveReportsBulk(ids, payload);
      if (response.error) {
        toast.error(response.error);
        return;
      }
      const labelById = new Map(bulkApproveCandidates.map((c) => [c.reportId, c.primary]));
      const failures = response.results
        .filter((r) => !r.ok)
        .map((r) => ({
          reportId: r.reportId,
          label: labelById.get(r.reportId) ?? r.reportId,
          error: r.error ?? 'Unknown error',
        }));
      setBulkApproveErrors(failures);
      const { succeeded, total, failed } = response.summary;
      if (succeeded > 0 && failed === 0) {
        toast.success(`Approved ${succeeded} of ${total} reports.`);
      } else if (succeeded > 0) {
        toast.warning(`Approved ${succeeded} of ${total} reports; ${failed} failed.`);
      } else {
        toast.error(`No reports approved (${failed} failed).`);
      }
      setReviewSelected(new Set());
      setBulkApproveOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk approval failed.');
    } finally {
      setBulkApprovePending(false);
    }
  };

  // Tracker-side bulk handlers are defined after `filteredTrackerRows`
  // (further below) because they depend on it.

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

  // ---------------------------------------------------------------
  // Tracker-side bulk PDF (depends on `filteredTrackerRows`).
  // Only `approved_and_signed` rows are eligible because
  // `getApprovedTripReportPdfData` returns 'Visit report not found.'
  // for anything else, and we want the per-row checkbox to encode
  // that constraint visually rather than failing inside the zip.
  // ---------------------------------------------------------------
  const trackerEligibleRows = useMemo(
    () =>
      filteredTrackerRows.filter(
        (r) => r.report_status === 'approved_and_signed' && r.report_id && r.can_view_report
      ),
    [filteredTrackerRows]
  );

  const trackerAllSelected =
    trackerEligibleRows.length > 0 &&
    trackerEligibleRows.every((r) => trackerSelected.has(r.visit_id));
  const trackerSomeSelected = trackerSelected.size > 0 && !trackerAllSelected;

  const toggleTrackerRow = (visitId: string, checked: boolean) => {
    setTrackerSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(visitId);
      else next.delete(visitId);
      return next;
    });
  };
  const toggleTrackerAll = (checked: boolean) => {
    setTrackerSelected(checked ? new Set(trackerEligibleRows.map((r) => r.visit_id)) : new Set());
  };

  const handleBulkPdfDownload = async () => {
    const selectedIds = Array.from(trackerSelected);
    const items: BulkPdfItem[] = trackerEligibleRows
      .filter((r) => selectedIds.includes(r.visit_id))
      .map((r) => {
        const safe = (s: string) => s.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        const visitTypeLabel =
          VISIT_REPORT_TYPE_LABELS[r.visit_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? r.visit_type;
        const datePart = r.approved_date ? r.approved_date.split('T')[0] : 'no-date';
        return {
          visitId: r.visit_id,
          filename: `${safe(r.study_name)}_${safe(r.site_name)}_${safe(visitTypeLabel)}_${datePart}.pdf`,
          footerLeft: `${r.study_name} | ${r.site_name} | ${visitTypeLabel}`,
          footerRight: `Printed: ${new Date().toLocaleDateString('en-US')}`,
        };
      });
    if (items.length === 0) return;

    setBulkPdfRunning(true);
    setBulkPdfFailures([]);
    setBulkPdfProgress({ done: 0, total: items.length });
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
    const zipFilename = `trip-reports-${stamp}.zip`;
    bulkPdfToastIdRef.current = toast.loading(`Generating 0 / ${items.length} reports...`);
    try {
      const result = await downloadVisitReportPdfBundle(items, {
        zipFilename,
        concurrency: 2,
        onProgress: (p) => {
          setBulkPdfProgress({ done: p.done, total: p.total });
          if (bulkPdfToastIdRef.current) {
            toast.loading(`Generating ${p.done} / ${p.total} reports...`, {
              id: bulkPdfToastIdRef.current,
            });
          }
        },
      });
      setBulkPdfFailures(result.failures);
      if (bulkPdfToastIdRef.current) {
        if (result.failures.length === 0) {
          toast.success(
            `Downloaded ${result.succeeded} report${result.succeeded === 1 ? '' : 's'} as a zip.`,
            { id: bulkPdfToastIdRef.current }
          );
        } else {
          toast.warning(
            `Downloaded ${result.succeeded} of ${result.total} reports; ${result.failures.length} failed (see failures.txt in the zip).`,
            { id: bulkPdfToastIdRef.current }
          );
        }
      }
      setTrackerSelected(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bulk PDF generation failed.';
      if (bulkPdfToastIdRef.current) {
        toast.error(msg, { id: bulkPdfToastIdRef.current });
      } else {
        toast.error(msg);
      }
    } finally {
      bulkPdfToastIdRef.current = null;
      setBulkPdfRunning(false);
    }
  };

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
      { header: 'Visit Report Status', accessorKey: 'report_status' as const },
      { header: 'Days Until Submission Due', accessorKey: 'days_until_submission_due' as const },
      { header: 'Days Until Approval Due', accessorKey: 'days_until_approval_due' as const },
      { header: 'Report Author', accessorKey: 'report_author' as const },
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {activeTab === 'tracker'
              ? 'Trip Report Tracker'
              : activeTab === 'review'
                ? 'Review Queue'
                : activeTab === 'admin'
                  ? 'Templates'
                  : 'Trip Report Summary'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'tracker'
              ? 'Track submission and approval progress across all site visits.'
              : activeTab === 'review'
                ? 'Reports waiting on your CPM review or approval.'
                : activeTab === 'admin'
                  ? 'Manage trip report templates used to author site visit reports.'
                  : 'View and manage site visit reports. Create site visits and templates from the actions below.'}
          </p>
        </div>

        <Tabs tabsId="trip-reports" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TooltipProvider delay={200}>
              <TabsList className="h-9 flex-wrap">
                <Tooltip>
                  <TooltipTrigger render={<TabsTrigger value="summary" />}>Trip Report Summary</TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    All site visits in this study and their report status.
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger render={<TabsTrigger value="tracker" />}>Trip Report Tracker</TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    Submission and approval due dates, days remaining, and compliance status.
                  </TooltipContent>
                </Tooltip>
                {isCpmOnAnyStudy ? (
                  <Tooltip>
                    <TooltipTrigger render={<TabsTrigger value="review" />}>
                      <span className="inline-flex items-center gap-1.5">
                        Review queue
                        {reviewQueueCount > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-foreground px-1.5 py-px text-[10px] font-semibold leading-none text-background">
                            {reviewQueueCount}
                          </span>
                        ) : null}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {reviewQueueCount > 0
                        ? `${reviewQueueCount} report${reviewQueueCount === 1 ? '' : 's'} waiting on your CPM review.`
                        : 'No reports currently waiting on your CPM review.'}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                <Tooltip>
                  <TooltipTrigger render={<TabsTrigger value="admin" />}>Templates</TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    Create, edit, and manage trip report templates.
                  </TooltipContent>
                </Tooltip>
              </TabsList>
            </TooltipProvider>
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
                hasActiveTemplates ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateVisitOpen(true)}
                    aria-label="Create Site Visit"
                    title='Create a site visit and trip report. Select a report template in the form to associate the report with that template; choose "None" for a report without a template.'
                    className="ml-auto"
                  >
                    <Calendar className="h-4 w-4 mr-1.5" />
                    Create Site Visit
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveTab('admin');
                      setCreateTemplateOpen(true);
                    }}
                    aria-label="Create your first template"
                    title="No active templates exist yet. Create your first template before scheduling a site visit."
                    className="ml-auto"
                  >
                    <FilePlus className="h-4 w-4 mr-1.5" />
                    Create your first template
                  </Button>
                )
              )}
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-xs">#</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Site Name', 'site_name', 'sSort', summarySort, 'sPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Visit Name', 'visit_name', 'sSort', summarySort, 'sPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Visit Type', 'visit_type', 'sSort', summarySort, 'sPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Country', 'country_name', 'sSort', summarySort, 'sPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Visit Start Date', 'visit_start_date', 'sSort', summarySort, 'sPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Report Status', 'report_status', 'sSort', summarySort, 'sPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Report Author', 'report_author', 'sSort', summarySort, 'sPage')}</TableHead>
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
                                disabled={isPdfBusy(row.visit_id)}
                                onClick={() => handleDownloadOfficialPdf(row.visit_id)}
                                aria-label="Download approved report PDF"
                                title="Download approved report PDF"
                              >
                                {isPdfBusy(row.visit_id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                  <FileCheck2 className="h-4 w-4" aria-hidden />
                                )}
                              </Button>
                            )}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                              aria-label={`Report options for ${row.site_name} ${row.visit_name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Report options</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_view_report}>
                                <DisabledAwareLink
                                  disabled={!row.report_id || !row.can_view_report}
                                  href={`${tripBaseForRow(row.study_id)}/${row.visit_id}/author`}
                                  label="View report"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View report
                                </DisabledAwareLink>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_edit_report}>
                                <DisabledAwareLink
                                  disabled={!row.report_id || !row.can_edit_report}
                                  href={`${tripBaseForRow(row.study_id)}/${row.visit_id}/author`}
                                  label="Edit report"
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Report
                                </DisabledAwareLink>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_review_report}>
                                <DisabledAwareLink
                                  disabled={!row.report_id || !row.can_review_report}
                                  href={`${tripBaseForRow(row.study_id)}/${row.visit_id}${TRIP_REPORT_CLAIM_REVIEW_PATH}`}
                                  label="Open report for review"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Open for review
                                </DisabledAwareLink>
                              </DropdownMenuItem>
                              {row.report_status === 'approved_and_signed' &&
                                row.report_id &&
                                row.can_view_report && (
                                  <DropdownMenuItem
                                    disabled={isPdfBusy(row.visit_id)}
                                    onClick={() => handleDownloadOfficialPdf(row.visit_id)}
                                  >
                                    <FileCheck2 className="h-4 w-4 mr-2" />
                                    Download official PDF
                                  </DropdownMenuItem>
                                )}
                              <DropdownMenuItem
                                disabled={!row.report_id || !row.can_view_report}
                                onClick={() => {
                                  if (row.report_id && row.can_view_report) {
                                    setTimelineReport({
                                      reportId: row.report_id,
                                      label: `${row.site_name} · ${row.visit_name}`,
                                    });
                                  }
                                }}
                              >
                                <History className="h-4 w-4 mr-2" />
                                View status timeline
                              </DropdownMenuItem>
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
            {renderPager(
              'Summary',
              summaryPage,
              summaryTotalPages,
              summaryPageSize,
              summaryTotalCount,
              'sPage',
              'sPs'
            )}
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
                            <div
                              className="min-w-[80px] rounded-md border border-border bg-card p-2 text-left shadow-sm"
                              title="Submissions overdue (currently past their expected submission date)"
                            >
                              <p className="text-[11px] text-muted-foreground">Overdue</p>
                              <p className={`text-base font-semibold ${trackerMetrics.submissionOverdue > 0 ? 'text-rose-600' : ''}`}>
                                {trackerMetrics.submissionOverdue}
                              </p>
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
                            <div
                              className="min-w-[80px] rounded-md border border-border bg-card p-2 text-left shadow-sm"
                              title="Approvals overdue (currently past their expected approval date)"
                            >
                              <p className="text-[11px] text-muted-foreground">Overdue</p>
                              <p className={`text-base font-semibold ${trackerMetrics.approvalOverdue > 0 ? 'text-rose-600' : ''}`}>
                                {trackerMetrics.approvalOverdue}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {(trackerMetrics.submissionOverdue > 0 ||
                    trackerMetrics.approvalOverdue > 0 ||
                    trackerMetrics.byAuthor.length > 0 ||
                    trackerMetrics.bySite.length > 0) && (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-md border border-border bg-card p-3">
                        <h4 className="border-b border-border pb-1 text-sm font-semibold">Aging buckets (overdue)</h4>
                        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                          {([
                            ['1to7', '1–7 days'],
                            ['8to14', '8–14 days'],
                            ['15to30', '15–30 days'],
                            ['31plus', '31+ days'],
                          ] as const).map(([key, label]) => (
                            <div key={key} className="rounded border border-border/60 p-2">
                              <p className="text-[11px] text-muted-foreground">{label}</p>
                              <div className="mt-0.5 flex justify-between gap-2 text-sm">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] leading-tight text-muted-foreground">Overdue submissions</p>
                                  <p className={trackerMetrics.submissionAging[key] > 0 ? 'font-semibold text-rose-600' : 'font-semibold'}>
                                    {trackerMetrics.submissionAging[key]}
                                  </p>
                                </div>
                                <div className="min-w-0 flex-1 text-right">
                                  <p className="text-[10px] leading-tight text-muted-foreground">Overdue approvals</p>
                                  <p className={trackerMetrics.approvalAging[key] > 0 ? 'font-semibold text-rose-600' : 'font-semibold'}>
                                    {trackerMetrics.approvalAging[key]}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-md border border-border bg-card p-3">
                        <h4 className="border-b border-border pb-1 text-sm font-semibold">By author</h4>
                        <div className="mt-2 max-h-40 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="py-1 pr-2 font-medium">Author</th>
                                <th className="py-1 pr-2 font-medium">Total</th>
                                <th className="py-1 pr-2 font-medium">Overdue submissions</th>
                                <th className="py-1 font-medium">Overdue approvals</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trackerMetrics.byAuthor.slice(0, 8).map((row) => (
                                <tr key={row.label} className="border-t border-border/40">
                                  <td className="max-w-[140px] truncate py-1 pr-2">{row.label}</td>
                                  <td className="py-1 pr-2">{row.total}</td>
                                  <td className={`py-1 pr-2 ${row.submissionOverdue > 0 ? 'font-semibold text-rose-600' : ''}`}>{row.submissionOverdue}</td>
                                  <td className={`py-1 ${row.approvalOverdue > 0 ? 'font-semibold text-rose-600' : ''}`}>{row.approvalOverdue}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="rounded-md border border-border bg-card p-3 lg:col-span-2">
                        <h4 className="border-b border-border pb-1 text-sm font-semibold">By site</h4>
                        <div className="mt-2 max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-muted-foreground">
                                <th className="py-1 pr-2 font-medium">Site</th>
                                <th className="py-1 pr-2 font-medium">Total</th>
                                <th className="py-1 pr-2 font-medium">Overdue submissions</th>
                                <th className="py-1 pr-2 font-medium">Overdue approvals</th>
                                <th className="py-1 pr-2 font-medium">Compliant submissions</th>
                                <th className="py-1 font-medium">Compliant approvals</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trackerMetrics.bySite.slice(0, 12).map((row) => (
                                <tr key={row.label} className="border-t border-border/40">
                                  <td className="max-w-[200px] truncate py-1 pr-2">{row.label}</td>
                                  <td className="py-1 pr-2">{row.total}</td>
                                  <td className={`py-1 pr-2 ${row.submissionOverdue > 0 ? 'font-semibold text-rose-600' : ''}`}>{row.submissionOverdue}</td>
                                  <td className={`py-1 pr-2 ${row.approvalOverdue > 0 ? 'font-semibold text-rose-600' : ''}`}>{row.approvalOverdue}</td>
                                  <td className="py-1 pr-2">{row.submissionCompleted}</td>
                                  <td className="py-1">{row.approvalCompleted}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
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
            {/* Small-screen card fallback (below lg). The full tracker table is
                wide enough that horizontal scrolling on phones / small tablets
                is unusable, so we surface a focused card list instead. */}
            <div className="space-y-2 lg:hidden">
              {filteredTrackerRows.length === 0 ? (
                <div className="rounded-md border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                  No visits match the current filters.
                </div>
              ) : (
                filteredTrackerRows.map((row) => {
                  const dueDays = row.days_until_submission_due;
                  const submissionLabel =
                    dueDays === null
                      ? '—'
                      : dueDays < 0
                        ? `${Math.abs(dueDays)}d overdue`
                        : `${dueDays}d left`;
                  const submissionTone =
                    dueDays === null ? 'text-muted-foreground' : dueDays < 0 ? 'text-rose-600' : 'text-foreground';
                  return (
                    <div
                      key={`m-${row.visit_id}`}
                      className="rounded-md border border-border bg-card p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{row.site_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.study_name} · {VISIT_REPORT_TYPE_LABELS[row.visit_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? row.visit_type}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.visit_name}</p>
                        </div>
                        <StatusBadge
                          status={row.report_status}
                          label={VISIT_REPORT_STATUS_LABELS[row.report_status as VisitReportStatus] ?? row.report_status}
                          className="shrink-0 text-[10px]"
                        />
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div className="text-xs">
                          <p className="text-muted-foreground">Days until submission due</p>
                          <p className={`text-sm font-semibold ${submissionTone}`}>{submissionLabel}</p>
                        </div>
                        {row.report_id && row.can_view_report ? (
                          <Link
                            href={`${tripBaseForRow(row.study_id)}/${row.visit_id}/author`}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 text-xs')}
                            aria-label={`Open trip report for ${row.site_name} ${row.visit_name}`}
                          >
                            Open
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">No access</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {trackerSelected.size > 0 ? (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm"
                role="region"
                aria-label="Bulk PDF download toolbar"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {trackerSelected.size} report{trackerSelected.size === 1 ? '' : 's'} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setTrackerSelected(new Set())}
                    disabled={bulkPdfRunning}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => void handleBulkPdfDownload()}
                  disabled={bulkPdfRunning}
                >
                  {bulkPdfRunning ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Generating {bulkPdfProgress.done} / {bulkPdfProgress.total}…
                    </>
                  ) : (
                    <>
                      <Archive className="mr-1.5 h-4 w-4" />
                      Download {trackerSelected.size} PDF{trackerSelected.size === 1 ? '' : 's'} (.zip)
                    </>
                  )}
                </Button>
              </div>
            ) : null}
            {bulkPdfFailures.length > 0 ? (
              <div
                className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs"
                role="status"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-amber-800">
                    {bulkPdfFailures.length} PDF{bulkPdfFailures.length === 1 ? '' : 's'} failed in the last bundle
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-[11px]"
                    onClick={() => setBulkPdfFailures([])}
                  >
                    Dismiss
                  </Button>
                </div>
                <ul className="space-y-0.5 pl-2">
                  {bulkPdfFailures.map((f) => (
                    <li key={f.visitId}>
                      <span className="font-medium">{f.filename}:</span> {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="hidden rounded-md border overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 w-14 min-w-14 border-r border-border bg-background text-xs">
                      <div className="flex items-center gap-1">
                        {trackerEligibleRows.length > 0 ? (
                          <Checkbox
                            aria-label="Select all approved reports on this page"
                            checked={
                              trackerAllSelected
                                ? true
                                : trackerSomeSelected
                                  ? 'indeterminate'
                                  : false
                            }
                            onCheckedChange={(v) => toggleTrackerAll(v === true)}
                          />
                        ) : null}
                        <span aria-hidden>#</span>
                      </div>
                    </TableHead>
                    <TableHead className="sticky left-14 z-10 min-w-[140px] border-r border-border bg-background text-xs">{renderSortHeader('Study Name', 'study_name', 'tSort', trackerSort, 'tPage')}</TableHead>
                    <TableHead className="sticky left-[196px] z-10 min-w-[120px] border-r border-border bg-background text-xs">{renderSortHeader('Site', 'site_name', 'tSort', trackerSort, 'tPage')}</TableHead>
                    <TableHead className="sticky left-[316px] z-10 min-w-[120px] border-r border-border bg-background text-xs shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)]">{renderSortHeader('Visit Type', 'visit_type', 'tSort', trackerSort, 'tPage')}</TableHead>
                    <TableHead className="text-xs">Visit ID</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Visit End Date', 'visit_end_date', 'tSort', trackerSort, 'tPage')}</TableHead>
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
                    <TableHead className="text-xs">{renderSortHeader('Visit Report Status', 'report_status', 'tSort', trackerSort, 'tPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Days Until Submission Due', 'days_until_submission_due', 'tSort', trackerSort, 'tPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Days Until Approval Due', 'days_until_approval_due', 'tSort', trackerSort, 'tPage')}</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Report Author', 'report_author', 'tSort', trackerSort, 'tPage')}</TableHead>
                    <TableHead className="text-xs">Approver</TableHead>
                    <TableHead className="text-xs">{renderSortHeader('Compliance Status', 'compliance_status', 'tSort', trackerSort, 'tPage')}</TableHead>
                    <TableHead className="text-xs w-20 text-center">Report Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrackerRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={27} className="text-center text-muted-foreground py-8">
                        {trackerRows.length === 0
                          ? 'No tracker data.'
                          : 'No rows match the current filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrackerRows.map((row, idx) => {
                      const trackerEligible =
                        row.report_status === 'approved_and_signed' && !!row.report_id && row.can_view_report;
                      const trackerChecked = trackerSelected.has(row.visit_id);
                      return (
                      <TableRow key={row.visit_id} data-state={trackerChecked ? 'selected' : undefined}>
                        <TableCell className="sticky left-0 z-10 border-r border-border bg-background text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {trackerEligible ? (
                              <Checkbox
                                aria-label={`Select ${row.study_name} ${row.site_name}`}
                                checked={trackerChecked}
                                onCheckedChange={(v) => toggleTrackerRow(row.visit_id, v === true)}
                              />
                            ) : null}
                            <span>{idx + 1}</span>
                          </div>
                        </TableCell>
                        <TableCell className="sticky left-14 z-10 border-r border-border bg-background text-xs">{row.study_name}</TableCell>
                        <TableCell className="sticky left-[196px] z-10 border-r border-border bg-background text-xs">{row.site_name}</TableCell>
                        <TableCell className="sticky left-[316px] z-10 border-r border-border bg-background text-xs shadow-[4px_0_6px_-2px_rgba(0,0,0,0.05)]">
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
                                disabled={isPdfBusy(row.visit_id)}
                                onClick={() => handleDownloadOfficialPdf(row.visit_id)}
                                aria-label="Download approved report PDF"
                                title="Download approved report PDF"
                              >
                                {isPdfBusy(row.visit_id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                ) : (
                                  <FileCheck2 className="h-4 w-4" aria-hidden />
                                )}
                              </Button>
                            )}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0"
                              aria-label={`Tracker row options for ${row.site_name} ${row.visit_name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Options</span>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {row.report_status === 'submitted' && (
                                <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_review_report}>
                                  <DisabledAwareLink
                                    disabled={!row.report_id || !row.can_review_report}
                                    href={`${tripBaseForRow(row.study_id)}/${row.visit_id}${TRIP_REPORT_CLAIM_REVIEW_PATH}`}
                                    label="Start review"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Start Review
                                  </DisabledAwareLink>
                                </DropdownMenuItem>
                              )}
                              {row.can_send_to_review && (
                                <DropdownMenuItem className="p-0" disabled={!row.report_id}>
                                  <DisabledAwareLink
                                    disabled={!row.report_id}
                                    href={`${tripBaseForRow(row.study_id)}/${row.visit_id}/author#submit`}
                                    label={row.report_status === 'returned' ? 'Resubmit report' : 'Send report to review'}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    {row.report_status === 'returned' ? 'Resubmit' : 'Send to Review'}
                                  </DisabledAwareLink>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_view_report}>
                                <DisabledAwareLink
                                  disabled={!row.report_id || !row.can_view_report}
                                  href={`${tripBaseForRow(row.study_id)}/${row.visit_id}/author`}
                                  label="View report"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View report
                                </DisabledAwareLink>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_edit_report}>
                                <DisabledAwareLink
                                  disabled={!row.report_id || !row.can_edit_report}
                                  href={`${tripBaseForRow(row.study_id)}/${row.visit_id}/author`}
                                  label="Edit report"
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Report
                                </DisabledAwareLink>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="p-0" disabled={!row.report_id || !row.can_review_report}>
                                <DisabledAwareLink
                                  disabled={!row.report_id || !row.can_review_report}
                                  href={`${tripBaseForRow(row.study_id)}/${row.visit_id}${TRIP_REPORT_CLAIM_REVIEW_PATH}`}
                                  label="Open report for review"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Open for review
                                </DisabledAwareLink>
                              </DropdownMenuItem>
                              {row.can_recall_report && row.report_id && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    if (!row.report_id) return;
                                    setRecallTarget({
                                      reportId: row.report_id,
                                      label: `${row.site_name} · ${row.visit_name}`,
                                    });
                                  }}
                                >
                                  <Undo2 className="h-4 w-4 mr-2" />
                                  Recall
                                </DropdownMenuItem>
                              )}
                              {row.report_status === 'approved_and_signed' &&
                                row.report_id &&
                                row.can_view_report && (
                                  <DropdownMenuItem
                                    disabled={isPdfBusy(row.visit_id)}
                                    onClick={() => handleDownloadOfficialPdf(row.visit_id)}
                                  >
                                    <FileCheck2 className="h-4 w-4 mr-2" />
                                    Download official PDF
                                  </DropdownMenuItem>
                                )}
                              <DropdownMenuItem
                                disabled={!row.report_id || !row.can_view_report}
                                onClick={() => {
                                  if (row.report_id && row.can_view_report) {
                                    setTimelineReport({
                                      reportId: row.report_id,
                                      label: `${row.site_name} · ${row.visit_name}`,
                                    });
                                  }
                                }}
                              >
                                <History className="h-4 w-4 mr-2" />
                                View status timeline
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {renderPager(
              'Tracker',
              trackerPage,
              trackerTotalPages,
              trackerPageSize,
              trackerTotalCount,
              'tPage',
              'tPs'
            )}
          </TabsContent>

          <TabsContent value="review" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Reports in <strong>Submitted</strong> or <strong>Under review</strong> for studies where you are a Clinical
              Project Manager. Open a row to start review or complete approval.
            </p>
            {reviewSelected.size > 0 ? (
              <div
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm"
                role="region"
                aria-label="Bulk approve toolbar"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {reviewSelected.size} report{reviewSelected.size === 1 ? '' : 's'} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setReviewSelected(new Set())}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => setBulkApproveOpen(true)}
                  disabled={bulkApprovePending}
                >
                  <FileSignature className="mr-1.5 h-4 w-4" />
                  Approve {reviewSelected.size} report{reviewSelected.size === 1 ? '' : 's'}
                </Button>
              </div>
            ) : null}
            {bulkApproveErrors.length > 0 ? (
              <div
                className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs"
                role="alert"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-destructive">
                    {bulkApproveErrors.length} report
                    {bulkApproveErrors.length === 1 ? '' : 's'} could not be approved
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-[11px]"
                    onClick={() => setBulkApproveErrors([])}
                  >
                    Dismiss
                  </Button>
                </div>
                <ul className="space-y-0.5 pl-2">
                  {bulkApproveErrors.map((e) => (
                    <li key={e.reportId}>
                      <span className="font-medium">{e.label}:</span> {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-xs">
                      {reviewEligibleRows.length > 0 ? (
                        <Checkbox
                          aria-label="Select all reports on this page"
                          checked={
                            reviewAllSelected
                              ? true
                              : reviewSomeSelected
                                ? 'indeterminate'
                                : false
                          }
                          onCheckedChange={(v) => toggleReviewAll(v === true)}
                        />
                      ) : null}
                    </TableHead>
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No reports waiting for your review.
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialReviewQueue.map((row: TripReportReviewQueueRow) => {
                      const eligible =
                        row.report_status === 'submitted' || row.report_status === 'under_review';
                      const checked = reviewSelected.has(row.report_id);
                      return (
                        <TableRow key={row.visit_id} data-state={checked ? 'selected' : undefined}>
                          <TableCell className="text-xs">
                            {eligible ? (
                              <Checkbox
                                aria-label={`Select ${row.study_name} ${row.site_name}`}
                                checked={checked}
                                onCheckedChange={(v) => toggleReviewRow(row.report_id, v === true)}
                              />
                            ) : null}
                          </TableCell>
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
                              href={`${tripBaseForRow(row.study_id)}/${row.visit_id}${TRIP_REPORT_CLAIM_REVIEW_PATH}`}
                              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 text-xs')}
                            >
                              Open
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="admin" className="mt-4 space-y-4">
            <TooltipProvider delay={200}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <Card className="w-fit">
                  <CardContent className="py-3 px-4 text-center">
                    <p className="text-xs text-muted-foreground">Template Count</p>
                    <p className="text-xl font-semibold">{templateCount}</p>
                  </CardContent>
                </Card>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-template-visit-type" className="text-xs text-muted-foreground">
                    Visit type
                  </Label>
                  <Select value={adminVisitTypeFilter} onValueChange={onAdminVisitTypeFilterChange}>
                    <SelectTrigger id="admin-template-visit-type" className="h-9 w-[220px] text-[12px]">
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
                      {VISIT_REPORT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size="sm"
                      onClick={() => setCreateTemplateOpen(true)}
                      aria-label="Create Template"
                    >
                      <FilePlus className="h-4 w-4 mr-1.5" />
                      Create Template
                    </Button>
                  }
                />
                <TooltipContent side="top" className="max-w-[260px] text-[11px]">
                  Add a new trip report template. Optionally scope it to this study and set visit type and due-day rules.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="rounded-md border">
              <Table className="text-[11px]" aria-label="Trip report templates">
                <TableHeader className="bg-muted/50 [&_tr]:border-b-0">
                  <TableRow className="h-8 hover:bg-transparent border-b border-border">
                    <TableHead className="h-8 w-8 min-w-8 px-1.5 py-1 text-[11px] leading-none">#</TableHead>
                    <TableHead className="h-8 min-w-0 px-1.5 py-1 text-[11px] leading-none">{renderSortHeader('Template Name', 'name', 'aSort', adminSort, 'aPage')}</TableHead>
                    <TableHead className="h-8 w-[194px] px-1.5 py-1 text-[11px] leading-none">{renderSortHeader('Question Count', 'question_count', 'aSort', adminSort, 'aPage')}</TableHead>
                    <TableHead className="h-8 min-w-0 px-1.5 py-1 text-[11px] leading-none">{renderSortHeader('Study Name', 'study_name', 'aSort', adminSort, 'aPage')}</TableHead>
                    <TableHead className="h-8 min-w-0 px-1.5 py-1 text-[11px] leading-none">{renderSortHeader('Visit Type', 'visit_report_type', 'aSort', adminSort, 'aPage')}</TableHead>
                    <TableHead className="h-8 px-1.5 py-1 text-[11px] leading-none">{renderSortHeader('Created By', 'created_by_name', 'aSort', adminSort, 'aPage')}</TableHead>
                    <TableHead className="h-8 w-[158px] px-1.5 py-1 text-[11px] leading-none">{renderSortHeader('Template Status', 'template_status', 'aSort', adminSort, 'aPage')}</TableHead>
                    <TableHead className="h-8 w-[120px] px-1.5 py-1 text-[11px] leading-none">Template Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTemplates.length === 0 ? (
                    <TableRow className="h-auto hover:bg-transparent">
                        <TableCell colSpan={8} className="px-1.5 py-6 text-center text-[11px] text-muted-foreground">
                        {initialTemplates.length === 0
                          ? 'No templates yet. Create a template to get started.'
                          : 'No templates match this visit type. Choose "All visit types" to see every template.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTemplates.map((t, idx) => {
                      const globalRowIndex = (adminCurrentPage - 1) * adminParsedPageSize + idx;
                      return (
                      <TableRow
                        key={t.id}
                        className={cn('h-8', globalRowIndex % 2 === 1 && 'bg-muted/30')}
                      >
                        <TableCell className="px-1.5 py-1 text-[11px] leading-tight text-muted-foreground">{globalRowIndex + 1}</TableCell>
                        <TableCell className="max-w-[220px] truncate px-1.5 py-1 text-[11px] font-medium leading-tight">
                          <span className="inline-flex items-center gap-1">
                            <span className="truncate">{t.name}</span>
                            {(t.snapshotted_report_count ?? 0) > 0 ? (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Badge
                                      variant="outline"
                                      className="h-4 shrink-0 px-1 text-[9px] font-normal leading-none"
                                    >
                                      {t.snapshotted_report_count} snapshotted
                                    </Badge>
                                  }
                                />
                                <TooltipContent side="top" className="max-w-[260px] text-[11px]">
                                  {t.snapshotted_report_count} historical report
                                  {t.snapshotted_report_count === 1 ? '' : 's'} have a locked-in
                                  copy of this template. Editing it will not change those
                                  reports.
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell className="px-1.5 py-1 text-[11px] leading-tight">{t.question_count}</TableCell>
                        <TableCell className="max-w-[200px] truncate px-1.5 py-1 text-[11px] leading-tight">
                          {t.study_name ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate px-1.5 py-1 text-[11px] leading-tight">
                          {VISIT_REPORT_TYPE_LABELS[t.visit_report_type as keyof typeof VISIT_REPORT_TYPE_LABELS] ?? t.visit_report_type}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate px-1.5 py-1 text-[11px] leading-tight">
                          {t.created_by_name ?? '—'}
                        </TableCell>
                        <TableCell className="px-1.5 py-1">
                          <StatusBadge
                            status={t.template_status}
                            label={TEMPLATE_STATUS_LABELS[t.template_status as keyof typeof TEMPLATE_STATUS_LABELS]}
                            className="px-1.5 py-0 text-[10px] font-normal leading-none"
                          />
                        </TableCell>
                        <TableCell className="px-1.5 py-1">
                          <div className="flex items-center gap-1.5">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Link
                                    href={`${tripBaseForTemplate(t)}/templates/${t.id}`}
                                    className={cn(
                                      buttonVariants({ variant: 'ghost', size: 'icon' }),
                                      'flex h-auto flex-col gap-0.5 p-1 text-muted-foreground hover:text-foreground'
                                    )}
                                    aria-label="Edit template"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-normal leading-none">Edit</span>
                                  </Link>
                                }
                              />
                              <TooltipContent side="top" className="max-w-[260px] text-[11px]">
                                Open the template builder to edit questions, timing, and study assignment.
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Link
                                    href={`${tripBaseForTemplate(t)}/templates/${t.id}?mode=view`}
                                    className={cn(
                                      buttonVariants({ variant: 'ghost', size: 'icon' }),
                                      'flex h-auto flex-col gap-0.5 p-1 text-muted-foreground hover:text-foreground'
                                    )}
                                    aria-label="View template"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    <span className="text-[10px] font-normal leading-none">View</span>
                                  </Link>
                                }
                              />
                              <TooltipContent side="top" className="max-w-[260px] text-[11px]">
                                Open a read-only preview of this template (no edits).
                              </TooltipContent>
                            </Tooltip>
                            {t.template_status === 'inactive' ? (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
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
                                  }
                                />
                                <TooltipContent side="top" className="max-w-[260px] text-[11px]">
                                  Restore this template so it can be selected for new site visit reports.
                                </TooltipContent>
                              </Tooltip>
                            ) : (t.report_count ?? 0) === 0 ? (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
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
                                  }
                                />
                                <TooltipContent side="top" className="max-w-[260px] text-[11px]">
                                  Permanently delete this template and its questions. Only available when no trip reports reference it.
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
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
                                  }
                                />
                                <TooltipContent side="top" className="max-w-[260px] text-[11px]">
                                  Hide this template from new reports. Existing reports keep their locked-in copy; you can reactivate later.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {renderPager(
              'Templates',
              adminCurrentPage,
              adminTotalPages,
              adminParsedPageSize,
              adminTemplatesTotal,
              'aPage',
              'aPs'
            )}
            </TooltipProvider>
          </TabsContent>
        </Tabs>

        <CreateSiteVisitModal
          open={createVisitOpen}
          onOpenChange={setCreateVisitOpen}
          studies={studies}
          templates={initialTemplates}
          initialTemplateId={searchParams.get('templateId')}
          onSuccess={refresh}
          defaultStudyId={studyId ?? undefined}
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
        <TripReportStatusTimelineDialog
          tripReportId={timelineReport?.reportId ?? null}
          contextLabel={timelineReport?.label ?? null}
          onClose={() => setTimelineReport(null)}
        />
        <AlertDialog
          open={!!recallTarget}
          onOpenChange={(open) => {
            if (!open && !isRecallPending) setRecallTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Recall report?</AlertDialogTitle>
              <AlertDialogDescription>
                {recallTarget
                  ? `This will return ${recallTarget.label} to authoring and clear the submission signature. You will need to resubmit and re-sign.`
                  : 'This will return the report to authoring and clear the submission signature. You will need to resubmit and re-sign.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRecallPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isRecallPending}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmRecall();
                }}
              >
                {isRecallPending ? 'Recalling…' : 'Recall'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <BulkSignatureCaptureModal
          open={bulkApproveOpen}
          onOpenChange={(next) => {
            if (!next && bulkApprovePending) return;
            setBulkApproveOpen(next);
          }}
          onConfirm={(payload) => void handleBulkApproveConfirm(payload)}
          isPending={bulkApprovePending}
          reports={bulkApproveCandidates}
        />
      </div>
    </>
  );
}
