'use client';

import { useState, useCallback, useMemo, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  ClipboardCheck,
  CalendarDays,
  CalendarClock,
  CalendarCheck2,
  FileWarning,
  CheckCircle2,
  Search,
  Table as TableIcon,
  Calendar as CalendarIcon,
  ListFilter,
  Clock3,
  XCircle,
  UserPlus,
  ExternalLink,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  FilePen,
  FileCheck2,
  FileSearch,
  ArrowRightCircle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { VisitCalendar } from './visit-calendar';

import type {
  MonitoringVisitWithRelations,
  MonitoringVisitType,
  MonitoringVisitStatus,
  StudySite,
  TripReport,
} from '@/lib/types/ctms';
import {
  VISIT_TYPE_OPTIONS,
  MONITORING_VISIT_STATUS_OPTIONS,
  VISIT_TYPE_LABEL,
} from '@/lib/types/ctms';
import {
  VISIT_REPORT_STATUS_LABELS,
  type VisitReportStatus,
} from '@/lib/types/visit-reports';
import type { BadgeVariant } from '@/lib/utils/status-config';
import {
  getStudyVisits,
  createVisit,
  updateVisit,
  deleteVisit,
} from '@/lib/actions/visits';
import { useStudyHub } from '@/components/ctms/study-hub-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import { CopilotImportTrigger } from '@/components/copilot/tables/copilot-import-trigger';
import { CopilotFillTrigger } from '@/components/copilot/forms/copilot-fill-trigger';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import {
  BulkUploadDialog,
  type BulkUploadColumn,
  type ValidatedRow,
} from '@/components/bulk-upload/bulk-upload-dialog';
import { parseFlexibleDateToIso } from '@/lib/utils/parse-flexible-date';
import {
  getVisitsImportCsvTemplate,
  VISITS_IMPORT_TEMPLATE_FILENAME,
} from '@/lib/data/visits-csv-templates';
import { ctmsStudyPath } from '@/lib/nav/ctms-study-paths';

const VISITS_TABLE_COL_COUNT = 9;

const VISITS_BULK_UPLOAD_COLUMNS: BulkUploadColumn[] = [
  { header: 'Site number', field: 'site_id', required: true, example: '001' },
  { header: 'Visit type', field: 'visit_type', required: true, example: 'monitoring' },
  { header: 'Status', field: 'status', example: 'planned' },
  { header: 'Planned date', field: 'planned_date', example: '2026-02-01' },
  { header: 'Actual date', field: 'actual_date', example: '' },
  { header: 'Notes', field: 'notes', example: 'Routine interim monitoring visit' },
];

// =====================================================
// Visit KPI donut (inlined helper)
// =====================================================

// Tiny SVG donut used in the KPI strip. Drives the value display in the
// center; the colored arc fills clockwise based on the percentage.
function VisitKpiDonut({
  percentage,
  fillStrokeClassName,
  centerLabel,
}: {
  percentage: number;
  fillStrokeClassName: string;
  centerLabel: string;
}) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, percentage));
  const offset = circumference * (1 - safePct / 100);

  return (
    <div className="relative mx-auto h-[112px] w-[112px]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-full w-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted/70 dark:stroke-muted"
          strokeWidth={strokeWidth}
        />
        {safePct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={fillStrokeClassName}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-medium leading-none tracking-tight text-foreground">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

// =====================================================
// Quick filter type
// =====================================================

type QuickFilter =
  | 'all'
  | 'upcoming'
  | 'confirmed'
  | 'completed'
  | 'missing-report'
  | 'cancelled'
  | 'needs-assignment';

interface VisitsTabProps {
  studyId: string;
  initialVisits: MonitoringVisitWithRelations[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
}

// =====================================================
// Derived data helpers
// =====================================================

interface ReportSummary {
  hasReport: boolean;
  reportStatus: VisitReportStatus | null;
  label: string;
  variant: BadgeVariant;
}

const REPORT_STATUS_VARIANT: Record<VisitReportStatus, BadgeVariant> = {
  report_pending: 'secondary',
  authoring: 'info',
  submitted: 'info',
  under_review: 'warning',
  returned: 'destructive',
  approved_and_signed: 'success',
};

function summarizeReport(visit: MonitoringVisitWithRelations): ReportSummary {
  const tr: TripReport | undefined = visit.trip_reports?.[0];
  if (!tr) {
    return { hasReport: false, reportStatus: null, label: 'Not Started', variant: 'secondary' };
  }
  const status = tr.report_status;
  if (status) {
    return {
      hasReport: true,
      reportStatus: status,
      label: VISIT_REPORT_STATUS_LABELS[status],
      variant: REPORT_STATUS_VARIANT[status],
    };
  }
  // Fallback to legacy `tr.status` (draft / submitted / approved)
  if (tr.status === 'approved') return { hasReport: true, reportStatus: null, label: 'Approved', variant: 'success' };
  if (tr.status === 'submitted') return { hasReport: true, reportStatus: null, label: 'Submitted', variant: 'info' };
  return { hasReport: true, reportStatus: null, label: 'In Progress', variant: 'info' };
}

interface NextActionDescriptor {
  label: string;
  type:
    | 'assign_monitor'
    | 'start_report'
    | 'continue_report'
    | 'submit_report'
    | 'review_report'
    | 'address_returned'
    | 'open_visit';
  href: string;
  icon: React.ReactNode;
}

function deriveNextAction(
  visit: MonitoringVisitWithRelations,
  report: ReportSummary,
  studyId: string
): NextActionDescriptor {
  const visitHref = ctmsStudyPath(studyId, 'visits', visit.id);

  if (!visit.monitor_id) {
    return {
      label: 'Assign monitor',
      type: 'assign_monitor',
      href: visitHref,
      icon: <UserPlus className="h-3.5 w-3.5" />,
    };
  }

  if (report.reportStatus === 'returned') {
    return {
      label: 'Address feedback',
      type: 'address_returned',
      href: visitHref,
      icon: <FileWarning className="h-3.5 w-3.5" />,
    };
  }

  if (report.reportStatus === 'submitted' || report.reportStatus === 'under_review') {
    return {
      label: 'Review report',
      type: 'review_report',
      href: visitHref,
      icon: <FileSearch className="h-3.5 w-3.5" />,
    };
  }

  if (visit.status === 'completed' && !report.hasReport) {
    return {
      label: 'Start report',
      type: 'start_report',
      href: visitHref,
      icon: <FilePen className="h-3.5 w-3.5" />,
    };
  }

  if (
    report.reportStatus === 'authoring' ||
    report.reportStatus === 'report_pending'
  ) {
    return {
      label: 'Continue report',
      type: 'continue_report',
      href: visitHref,
      icon: <FilePen className="h-3.5 w-3.5" />,
    };
  }

  if (report.reportStatus === 'approved_and_signed') {
    return {
      label: 'View report',
      type: 'open_visit',
      href: visitHref,
      icon: <FileCheck2 className="h-3.5 w-3.5" />,
    };
  }

  return {
    label: 'Open visit',
    type: 'open_visit',
    href: visitHref,
    icon: <ArrowRightCircle className="h-3.5 w-3.5" />,
  };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isWithinNext7Days(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const today = startOfToday();
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 7);
  return d >= today && d <= limit;
}

function isMissingReport(visit: MonitoringVisitWithRelations): boolean {
  if (visit.status !== 'completed') return false;
  const tr = visit.trip_reports?.[0];
  if (!tr) return true;
  return tr.report_status !== 'approved_and_signed' && tr.status !== 'approved';
}

// =====================================================
// VisitsTab
// =====================================================

export function VisitsTab({ studyId, initialVisits, sites }: VisitsTabProps) {
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;
  const [visits, setVisits] = useState(initialVisits);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [sortBy, setSortBy] = useState<'planned_date' | 'actual_date'>('planned_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [, startTransition] = useTransition();

  const refreshVisits = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getStudyVisits(studyId);
        setVisits(data);
      } catch {
        toast.error('Failed to refresh visits');
      }
    });
  }, [studyId]);

  const handleDelete = async (id: string) => {
    const { error } = await deleteVisit(id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Visit deleted');
    refreshVisits();
  };

  // Bulk-create monitoring visits from a list of normalized row payloads.
  // Used by both the Copilot import path AND the standard CSV uploader.
  const applyVisitRows = useCallback(async (
    rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]
  ): Promise<{ created: number; updated: number; failed: number }> => {
    if (rows.length === 0) {
      toast.message('No rows to import.');
      return { created: 0, updated: 0, failed: 0 };
    }
    const CHUNK_SIZE = 10;
    const created: string[] = [];
    const failed: { row: number; reason: string }[] = [];

    const processRow = async (row: typeof rows[number]): Promise<void> => {
      if (row.op !== 'insert') return;
      const v = row.values as Record<string, unknown>;
      const rawSite = v.site_id;
      const targetSiteId = (() => {
        if (typeof rawSite !== 'string' || !rawSite) return '';
        if (sites.some(s => s.id === rawSite)) return rawSite;
        const byNumber = sites.find(s => s.site_number.toLowerCase() === rawSite.toLowerCase());
        if (byNumber) return byNumber.id;
        const byName = sites.find(s => s.name.toLowerCase() === rawSite.toLowerCase());
        if (byName) return byName.id;
        return '';
      })();
      if (!targetSiteId) {
        failed.push({ row: row.rowIndex + 2, reason: `Site "${String(rawSite ?? '')}" not found on this study` });
        return;
      }
      const visitType = (typeof v.visit_type === 'string' && v.visit_type
        ? v.visit_type
        : 'monitoring') as MonitoringVisitType;
      const status = (typeof v.status === 'string' && v.status
        ? v.status
        : 'planned') as MonitoringVisitStatus;
      const { error } = await createVisit({
        study_id: studyId,
        site_id: targetSiteId,
        visit_type: visitType,
        status,
        planned_date: (v.planned_date as string | undefined) || undefined,
        actual_date: (v.actual_date as string | undefined) || undefined,
        notes: (v.notes as string | undefined) || undefined,
      });
      if (error) failed.push({ row: row.rowIndex + 2, reason: error });
      else created.push(targetSiteId);
    };

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(processRow));
    }

    if (created.length) {
      toast.success(`${created.length} visit${created.length === 1 ? '' : 's'} scheduled`);
    }
    if (failed.length) {
      const sample = failed.slice(0, 3).map(f => `Row ${f.row}: ${f.reason}`).join('\n');
      const more = failed.length > 3 ? `\n+${failed.length - 3} more` : '';
      toast.error(`${failed.length} row${failed.length === 1 ? '' : 's'} couldn\u2019t be scheduled`, {
        description: `${sample}${more}`,
      });
    }
    if (!created.length && !failed.length) {
      toast.message('No rows imported.');
    }
    refreshVisits();
    return { created: created.length, updated: 0, failed: failed.length };
  }, [studyId, sites, refreshVisits]);

  const handleCopilotImport = useCallback(
    (rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]) =>
      applyVisitRows(rows),
    [applyVisitRows]
  );

  // Pre-validate every parsed CSV row for the standard uploader.
  const validateVisitRows = useCallback(
    async (rawRows: Record<string, string>[]): Promise<ValidatedRow[]> => {
      const VALID_TYPES = new Set<MonitoringVisitType>(VISIT_TYPE_OPTIONS.map((o) => o.value));
      const VALID_STATUSES = new Set<MonitoringVisitStatus>(
        MONITORING_VISIT_STATUS_OPTIONS.map((o) => o.value)
      );

      const sitesByNumber = new Map(
        sites.map((s) => [String(s.site_number).trim().toLowerCase(), s])
      );
      const sitesByName = new Map(sites.map((s) => [s.name.trim().toLowerCase(), s]));

      return rawRows.map((raw, rowIndex) => {
        const errors: string[] = [];

        const rawSite = (raw['Site number'] ?? '').trim();
        let siteId: string | undefined;
        if (!rawSite) {
          errors.push('Site number is required');
        } else {
          const match =
            sitesByNumber.get(rawSite.toLowerCase()) ?? sitesByName.get(rawSite.toLowerCase());
          if (match) siteId = match.id;
          else errors.push(`Site "${rawSite}" not found on this study`);
        }

        const rawType = (raw['Visit type'] ?? '').trim().toLowerCase();
        let visit_type: MonitoringVisitType = 'monitoring';
        if (rawType) {
          if (VALID_TYPES.has(rawType as MonitoringVisitType)) {
            visit_type = rawType as MonitoringVisitType;
          } else {
            errors.push(
              `Visit type "${rawType}" is not one of: ${VISIT_TYPE_OPTIONS.map((o) => o.value).join(', ')}`
            );
          }
        } else {
          errors.push('Visit type is required');
        }

        const rawStatus = (raw['Status'] ?? '').trim().toLowerCase();
        let status: MonitoringVisitStatus = 'planned';
        if (rawStatus) {
          if (VALID_STATUSES.has(rawStatus as MonitoringVisitStatus)) {
            status = rawStatus as MonitoringVisitStatus;
          } else {
            errors.push(
              `Status "${rawStatus}" is not one of: ${MONITORING_VISIT_STATUS_OPTIONS.map((o) => o.value).join(', ')}`
            );
          }
        }

        const checkDate = (label: string, value: string): string | undefined => {
          if (!value) return undefined;
          const parsed = parseFlexibleDateToIso(value);
          if (!parsed) {
            errors.push(`${label} "${value}" couldn\u2019t be parsed. Try YYYY-MM-DD or M/D/YYYY.`);
            return undefined;
          }
          return parsed;
        };
        const planned_date = checkDate('Planned date', (raw['Planned date'] ?? '').trim());
        const actual_date = checkDate('Actual date', (raw['Actual date'] ?? '').trim());

        const values: Record<string, unknown> = {
          site_id: siteId ?? rawSite,
          visit_type,
          status,
          planned_date,
          actual_date,
          notes: (raw['Notes'] ?? '').trim() || undefined,
        };

        return { rowIndex, raw, values, op: 'insert' as const, errors };
      });
    },
    [sites]
  );

  const handleStandardCsvApply = useCallback(
    async (validRows: ValidatedRow[]) => {
      return applyVisitRows(
        validRows.map((r) => ({ rowIndex: r.rowIndex, values: r.values, op: r.op }))
      );
    },
    [applyVisitRows]
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const monitorName = (visit: MonitoringVisitWithRelations) => {
    if (!visit.profiles) return null;
    const full = [visit.profiles.first_name, visit.profiles.last_name].filter(Boolean).join(' ');
    return full || null;
  };

  const monitorInitials = (visit: MonitoringVisitWithRelations) => {
    const name = monitorName(visit);
    if (!name) return '—';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Apply quick filter, dropdown filters, and search to the dataset.
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Quick filter (chip row)
      if (quickFilter === 'upcoming') {
        if (!(v.status === 'planned' || v.status === 'confirmed')) return false;
        if (!isWithinNext7Days(v.planned_date)) return false;
      } else if (quickFilter === 'confirmed') {
        if (v.status !== 'confirmed') return false;
      } else if (quickFilter === 'completed') {
        if (v.status !== 'completed') return false;
      } else if (quickFilter === 'cancelled') {
        if (v.status !== 'cancelled') return false;
      } else if (quickFilter === 'missing-report') {
        if (!isMissingReport(v)) return false;
      } else if (quickFilter === 'needs-assignment') {
        if (v.monitor_id) return false;
      }
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (typeFilter !== 'all' && v.visit_type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const siteName = (v.study_sites?.name ?? '').toLowerCase();
        const studyTitle = (v.studies?.title ?? '').toLowerCase();
        const monitor = (monitorName(v) ?? '').toLowerCase();
        if (!siteName.includes(s) && !studyTitle.includes(s) && !monitor.includes(s)) return false;
      }
      return true;
    });
  }, [visits, statusFilter, typeFilter, search, quickFilter]);

  const sortedVisits = useMemo(() => {
    const copy = [...filteredVisits];
    copy.sort((a, b) => {
      const aRaw = sortBy === 'planned_date' ? a.planned_date : a.actual_date;
      const bRaw = sortBy === 'planned_date' ? b.planned_date : b.actual_date;
      const aTime = aRaw ? new Date(aRaw).getTime() : Number.POSITIVE_INFINITY;
      const bTime = bRaw ? new Date(bRaw).getTime() : Number.POSITIVE_INFINITY;
      if (aTime === bTime) return 0;
      const cmp = aTime < bTime ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredVisits, sortBy, sortDir]);

  const pagination = useClientPagination({
    totalItems: sortedVisits.length,
    resetKey: [search, statusFilter, typeFilter, quickFilter, sortBy, sortDir],
  });
  const paginatedVisits = pagination.paginate(sortedVisits);

  // KPI metrics — derived from full dataset, not the filtered view.
  const metrics = useMemo(() => {
    const total = visits.length;
    const upcoming = visits.filter(
      (v) =>
        (v.status === 'planned' || v.status === 'confirmed') &&
        isWithinNext7Days(v.planned_date)
    ).length;
    const confirmed = visits.filter((v) => v.status === 'confirmed').length;
    const completed = visits.filter((v) => v.status === 'completed').length;
    const missingReports = visits.filter(isMissingReport).length;
    const needsAssignment = visits.filter((v) => !v.monitor_id).length;
    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);
    return {
      total,
      upcoming,
      confirmed,
      completed,
      missingReports,
      needsAssignment,
      confirmedPct: pct(confirmed),
      completedPct: pct(completed),
    };
  }, [visits]);

  const toggleSort = (next: 'planned_date' | 'actual_date') => {
    if (sortBy === next) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(next);
      setSortDir('asc');
    }
  };

  const sortIndicator = (col: 'planned_date' | 'actual_date') => {
    if (sortBy !== col) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  // KPI card data — each card surfaces a count plus a donut showing the
  // metric's share of the total visit pool (where applicable).
  const kpiPct = (n: number, total: number) =>
    total <= 0 ? 0 : Math.round((n / total) * 100);
  const kpiCards: {
    key: 'total' | 'upcoming' | 'confirmed' | 'completed' | 'missing';
    label: string;
    value: number;
    sublabel: string;
    icon: React.ReactNode;
    topAccent: string;
    iconBg: string;
    iconFg: string;
    donutStroke: string;
    donutPercentage: number;
    onClick: () => void;
    isActive: boolean;
  }[] = [
    {
      key: 'total',
      label: 'Total Visits',
      value: metrics.total,
      sublabel: 'All scheduled visits',
      icon: <CalendarDays className="h-4 w-4" />,
      topAccent: 'bg-slate-700 dark:bg-slate-500',
      iconBg: 'bg-slate-100 dark:bg-slate-500/20',
      iconFg: 'text-slate-700 dark:text-slate-300',
      donutStroke: 'stroke-slate-700 dark:stroke-slate-400',
      donutPercentage: 0,
      onClick: () => setQuickFilter('all'),
      isActive: quickFilter === 'all',
    },
    {
      key: 'upcoming',
      label: 'Upcoming 7 Days',
      value: metrics.upcoming,
      sublabel: 'Next 7 days',
      icon: <CalendarClock className="h-4 w-4" />,
      topAccent: 'bg-orange-500',
      iconBg: 'bg-orange-50 dark:bg-orange-500/15',
      iconFg: 'text-orange-600 dark:text-orange-300',
      donutStroke: 'stroke-orange-500',
      donutPercentage: kpiPct(metrics.upcoming, metrics.total),
      onClick: () => setQuickFilter('upcoming'),
      isActive: quickFilter === 'upcoming',
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      value: metrics.confirmed,
      sublabel:
        metrics.total === 0 ? 'No visits yet' : `${metrics.confirmedPct}% of total`,
      icon: <CheckCircle2 className="h-4 w-4" />,
      topAccent: 'bg-blue-500',
      iconBg: 'bg-blue-50 dark:bg-blue-500/15',
      iconFg: 'text-blue-600 dark:text-blue-300',
      donutStroke: 'stroke-blue-500',
      donutPercentage: metrics.confirmedPct,
      onClick: () => setQuickFilter('confirmed'),
      isActive: quickFilter === 'confirmed',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: metrics.completed,
      sublabel:
        metrics.total === 0 ? 'No visits yet' : `${metrics.completedPct}% of total`,
      icon: <CalendarCheck2 className="h-4 w-4" />,
      topAccent: 'bg-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
      iconFg: 'text-emerald-600 dark:text-emerald-300',
      donutStroke: 'stroke-emerald-500',
      donutPercentage: metrics.completedPct,
      onClick: () => setQuickFilter('completed'),
      isActive: quickFilter === 'completed',
    },
    {
      key: 'missing',
      label: 'Missing Reports',
      value: metrics.missingReports,
      sublabel: metrics.missingReports > 0 ? 'Requires action' : 'All reports up to date',
      icon: <FileWarning className="h-4 w-4" />,
      topAccent: 'bg-rose-500',
      iconBg: 'bg-rose-50 dark:bg-rose-500/15',
      iconFg: 'text-rose-600 dark:text-rose-300',
      donutStroke: 'stroke-rose-500',
      donutPercentage: kpiPct(metrics.missingReports, metrics.total),
      onClick: () => setQuickFilter('missing-report'),
      isActive: quickFilter === 'missing-report',
    },
  ];

  // Quick filter chips
  const quickChips: {
    value: QuickFilter;
    label: string;
    icon: React.ReactNode;
    show: boolean;
  }[] = [
    { value: 'all', label: 'All', icon: <ListFilter className="h-3.5 w-3.5" />, show: true },
    { value: 'upcoming', label: 'Upcoming', icon: <Clock3 className="h-3.5 w-3.5" />, show: true },
    {
      value: 'confirmed',
      label: 'Confirmed',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      show: true,
    },
    {
      value: 'completed',
      label: 'Completed',
      icon: <CalendarCheck2 className="h-3.5 w-3.5" />,
      show: true,
    },
    {
      value: 'missing-report',
      label: 'Missing Report',
      icon: <FileWarning className="h-3.5 w-3.5" />,
      show: true,
    },
    {
      value: 'needs-assignment',
      label: 'Needs Assignment',
      icon: <UserPlus className="h-3.5 w-3.5" />,
      show: metrics.needsAssignment > 0 || quickFilter === 'needs-assignment',
    },
    {
      value: 'cancelled',
      label: 'Cancelled',
      icon: <XCircle className="h-3.5 w-3.5" />,
      show: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. KPI summary row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={card.onClick}
            aria-pressed={card.isActive}
            className={cn(
              'group flex h-full flex-col overflow-hidden rounded-md border bg-card text-left shadow-xs transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              card.isActive
                ? 'border-primary ring-1 ring-primary/30'
                : 'border-border/70',
            )}
          >
            <div className={cn('h-[3px] w-full shrink-0', card.topAccent)} />
            <div className="flex h-full flex-col gap-3 px-4 pb-4 pt-3">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                    card.iconBg,
                  )}
                >
                  <span className={card.iconFg}>{card.icon}</span>
                </span>
                <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-muted-foreground">
                  {card.label}
                </span>
              </div>
              <VisitKpiDonut
                percentage={card.donutPercentage}
                fillStrokeClassName={card.donutStroke}
                centerLabel={String(card.value)}
              />
              <p className="mt-auto text-center text-[11px] text-muted-foreground">
                {card.sublabel}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* 2. Quick filter chip row */}
      <div className="flex flex-wrap items-center gap-2">
        {quickChips
          .filter((c) => c.show)
          .map((chip) => {
            const active = quickFilter === chip.value;
            return (
              <Button
                key={chip.value}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                className="h-8 gap-1.5 text-xs"
                onClick={() => setQuickFilter(chip.value)}
              >
                {chip.icon}
                {chip.label}
              </Button>
            );
          })}
      </div>

      {/* 3. Toolbar: search / filters / actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by site, study, or monitor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue
                placeholder="All Statuses"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Statuses';
                  return MONITORING_VISIT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {MONITORING_VISIT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue
                placeholder="All Types"
                getDisplayLabel={(v) => {
                  if (v === 'all') return 'All Types';
                  return VISIT_TYPE_LABEL[v as MonitoringVisitType] ?? v;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {VISIT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!readOnly ? (
            <CopilotImportTrigger
              tableId="ctms.visit-schedule"
              tableLabel="Visits"
              studyId={studyId}
              scope={{ kind: 'study', id: studyId }}
              duplicateKey="planned_date"
              existingRows={visits.map(v => ({
                id: v.id,
                values: {
                  site_id: v.site_id,
                  visit_type: v.visit_type,
                  planned_date: v.planned_date,
                },
              }))}
              targetFields={[
                { path: 'site_id', label: 'Site' },
                { path: 'visit_type', label: 'Visit type' },
                { path: 'planned_date', label: 'Planned date' },
                { path: 'actual_date', label: 'Actual date' },
                { path: 'status', label: 'Status' },
                { path: 'notes', label: 'Notes' },
              ]}
              onApplied={handleCopilotImport}
            />
          ) : null}
          {!readOnly ? (
            <BulkUploadDialog
              tableLabel="Visits"
              templateColumns={VISITS_BULK_UPLOAD_COLUMNS}
              templateFilename={VISITS_IMPORT_TEMPLATE_FILENAME}
              getTemplateCsv={getVisitsImportCsvTemplate}
              validateRows={validateVisitRows}
              onApply={handleStandardCsvApply}
            />
          ) : null}
          <VisitFormDialog
            studyId={studyId}
            sites={sites}
            onSuccess={refreshVisits}
            readOnly={readOnly}
            disabledTooltip={disabledTooltip}
          />
        </div>
      </div>

      {/* 4. Workspace header: view toggle + helper info */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          value={[view]}
          onValueChange={(values) => {
            const next = (values as string[])[0];
            if (next === 'table' || next === 'calendar') setView(next);
          }}
          variant="outline"
          size="sm"
          aria-label="Choose view"
        >
          <ToggleGroupItem value="table" aria-label="Table view">
            <TableIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Table</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label="Calendar view">
            <CalendarIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Calendar</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>Central hub to plan, track, and close site visits.</span>
        </div>
      </div>

      {/* 5a. Table view */}
      {view === 'table' && (
        <div className="space-y-3">
          {visits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No monitoring visits found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Schedule monitoring visits to track site performance and compliance.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Site</TableHead>
                    <TableHead className="text-xs">Monitor</TableHead>
                    <TableHead className="text-xs">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort('planned_date')}
                      >
                        Planned Date
                        {sortIndicator('planned_date')}
                      </button>
                    </TableHead>
                    <TableHead className="text-xs">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={() => toggleSort('actual_date')}
                      >
                        Actual Date
                        {sortIndicator('actual_date')}
                      </button>
                    </TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Report Status</TableHead>
                    <TableHead className="text-xs">Next Action</TableHead>
                    <TableHead className="text-xs w-[110px] text-right pr-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVisits.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={VISITS_TABLE_COL_COUNT}
                        className="text-xs text-muted-foreground text-center py-6"
                      >
                        No monitoring visits match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVisits.map((visit) => {
                      const report = summarizeReport(visit);
                      const next = deriveNextAction(visit, report, studyId);
                      const visitHref = ctmsStudyPath(studyId, 'visits', visit.id);
                      const monitor = monitorName(visit);
                      return (
                        <TableRow key={visit.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {VISIT_TYPE_LABEL[visit.visit_type]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col leading-tight">
                              <span className="text-xs font-medium">
                                {visit.study_sites?.name ?? '—'}
                              </span>
                              {visit.study_sites?.site_number && (
                                <span className="text-[11px] text-muted-foreground">
                                  Site {visit.study_sites.site_number}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {monitor ? (
                              <div className="flex items-center gap-2">
                                <Avatar size="sm">
                                  <AvatarFallback className="text-[10px]">
                                    {monitorInitials(visit)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-foreground truncate max-w-[140px]">
                                  {monitor}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {formatDate(visit.planned_date)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(visit.actual_date)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={visit.status} className="text-xs" />
                          </TableCell>
                          <TableCell>
                            <Badge variant={report.variant} className="text-xs">
                              {report.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 px-2 text-xs text-primary hover:text-primary"
                              render={<Link href={next.href} />}
                              nativeButton={false}
                            >
                              {next.icon}
                              {next.label}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right pr-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                render={<Link href={visitHref} />}
                                nativeButton={false}
                              >
                                <ExternalLink className="h-3 w-3" />
                                Open
                              </Button>
                              <VisitRowMenu
                                visit={visit}
                                studyId={studyId}
                                sites={sites}
                                readOnly={readOnly}
                                disabledTooltip={disabledTooltip}
                                onSuccess={refreshVisits}
                                onDelete={() => handleDelete(visit.id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {visits.length > 0 && (
            <TablePaginationFooter
              pagination={pagination}
              totalItems={sortedVisits.length}
              itemNoun="visit"
            />
          )}
        </div>
      )}

      {/* 5b. Calendar view */}
      {view === 'calendar' && (
        <VisitCalendar visits={filteredVisits} scopeStudyId={studyId} showAgenda />
      )}
    </div>
  );
}

// =====================================================
// Row overflow menu (Edit / Delete inside a single dropdown).
// Keeps the row chrome to a single primary `Open` button plus
// an icon-only dropdown so the table reads like the reference.
// =====================================================

function VisitRowMenu({
  visit,
  studyId,
  sites,
  readOnly,
  disabledTooltip,
  onSuccess,
  onDelete,
}: {
  visit: MonitoringVisitWithRelations;
  studyId: string;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  readOnly: boolean;
  disabledTooltip?: string;
  onSuccess: () => void;
  onDelete: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Visit actions">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={readOnly}
            onClick={() => setEditOpen(true)}
            title={readOnly ? disabledTooltip : undefined}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={readOnly}
            onClick={() => setDeleteOpen(true)}
            title={readOnly ? disabledTooltip : undefined}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit dialog (controlled) */}
      <VisitFormDialog
        studyId={studyId}
        sites={sites}
        visit={visit}
        onSuccess={onSuccess}
        readOnly={readOnly}
        disabledTooltip={disabledTooltip}
        controlledOpen={editOpen}
        onOpenChange={setEditOpen}
        renderTrigger={false}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visit</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this monitoring visit and any associated trip reports, findings, and follow-up items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDeleteOpen(false);
                onDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =====================================================
// Visit Form Dialog
// =====================================================

const visitSchema = z.object({
  site_id: z.string().min(1, 'Site is required'),
  visit_type: z.string().min(1, 'Visit type is required'),
  planned_date: z.string().optional(),
  actual_date: z.string().optional(),
  status: z.string().min(1),
  notes: z.string().optional(),
});

type VisitFormValues = z.infer<typeof visitSchema>;

function VisitFormDialog({
  studyId,
  sites,
  visit,
  onSuccess,
  readOnly = false,
  disabledTooltip,
  controlledOpen,
  onOpenChange,
  renderTrigger = true,
}: {
  studyId: string;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  visit?: MonitoringVisitWithRelations;
  onSuccess: () => void;
  readOnly?: boolean;
  disabledTooltip?: string;
  /** Controlled open state. When provided, the dialog is fully controlled by the parent. */
  controlledOpen?: boolean;
  onOpenChange?: (next: boolean) => void;
  /** Set false to render only the dialog body (parent provides the trigger / state). */
  renderTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const isEdit = !!visit;

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(visitSchema),
    defaultValues: isEdit
      ? {
          site_id: visit.site_id,
          visit_type: visit.visit_type,
          planned_date: visit.planned_date ?? '',
          actual_date: visit.actual_date ?? '',
          status: visit.status,
          notes: visit.notes ?? '',
        }
      : {
          site_id: '',
          visit_type: 'monitoring',
          planned_date: '',
          actual_date: '',
          status: 'planned',
          notes: '',
        },
  });

  const onSubmit = async (values: VisitFormValues) => {
    if (isEdit) {
      const { error } = await updateVisit({
        id: visit.id,
        study_id: studyId,
        ...values,
        visit_type: values.visit_type as MonitoringVisitType,
        status: values.status as MonitoringVisitStatus,
      });
      if (error) { toast.error(error); return; }
      toast.success('Visit updated');
    } else {
      const { error } = await createVisit({
        study_id: studyId,
        ...values,
        visit_type: values.visit_type as MonitoringVisitType,
        status: values.status as MonitoringVisitStatus,
      });
      if (error) { toast.error(error); return; }
      toast.success('Visit scheduled');
    }
    setOpen(false);
    form.reset();
    onSuccess();
  };

  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const handleOpenChange = (next: boolean) => {
    if (readOnly && next) return;
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {renderTrigger && !isEdit ? (
        <DialogTrigger
          render={
            <Button
              size="sm"
              disabled={readOnly}
              title={readOnly ? disabledTooltip : 'Plan a new monitoring visit for a site on this study.'}
            />
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Schedule Visit
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Visit' : 'Schedule Monitoring Visit'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update visit details.' : 'Plan a new monitoring visit for a site.'}</DialogDescription>
        </DialogHeader>
        {!isEdit ? (
          <div className="flex justify-end pb-1">
            <CopilotFillTrigger
              schemaId="ctms.visit-schedule"
              schemaLabel="Visit schedule"
              scope={{ kind: 'study', id: studyId }}
              studyId={studyId}
              currentValues={form.getValues() as Record<string, unknown>}
              onApplied={(values) => {
                for (const [path, value] of Object.entries(values)) {
                  // site_id from a document might be a site_number — try to map it.
                  if (path === 'site_id' && typeof value === 'string') {
                    const direct = sites.find(s => s.id === value);
                    const byNumber = direct
                      ? null
                      : sites.find(s => s.site_number.toLowerCase() === value.toLowerCase());
                    const byName = direct || byNumber
                      ? null
                      : sites.find(s => s.name.toLowerCase() === value.toLowerCase());
                    const resolved = direct?.id ?? byNumber?.id ?? byName?.id ?? null;
                    if (resolved) form.setValue('site_id', resolved, { shouldDirty: true, shouldValidate: true });
                    continue;
                  }
                  form.setValue(path as keyof VisitFormValues, value as never, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }
              }}
            />
          </div>
        ) : null}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={form.watch('site_id')} onValueChange={(val) => form.setValue('site_id', val)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select Site"
                  getDisplayLabel={(v) => {
                    const s = sites.find((x) => x.id === v);
                    return s ? `${s.site_number} — ${s.name}` : v;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.site_number} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.site_id && (
              <p className="text-xs text-destructive">{form.formState.errors.site_id.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Visit Type</Label>
              <Select value={form.watch('visit_type')} onValueChange={(val) => form.setValue('visit_type', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue
                  placeholder="Select Type"
                    getDisplayLabel={(v) => VISIT_TYPE_LABEL[v as MonitoringVisitType] ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.watch('status')} onValueChange={(val) => form.setValue('status', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue
                  placeholder="Select Status"
                    getDisplayLabel={(v) => MONITORING_VISIT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {MONITORING_VISIT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Planned Date</Label>
              <Input type="date" {...form.register('planned_date')} />
            </div>
            <div className="space-y-2">
              <Label>Actual Date</Label>
              <Input type="date" {...form.register('actual_date')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Visit notes..." rows={2} {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Schedule Visit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
