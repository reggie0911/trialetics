'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Filter,
  LayoutGrid,
  List,
  Search,
  Settings2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { refreshStudyEcrfRollup } from '@/lib/actions/ecrf-rollup';
import { alertsForTab } from '@/lib/parsers/ecrf-alerts';
import {
  deriveDataStatus,
  deriveVisitDueStatus,
  nextActionForStatus,
  nextActionForVisit,
} from '@/lib/parsers/ecrf-tracking-extras';
import {
  SUBJECT_STATUS_OPTIONS,
  type EcrfDataStatus,
  type SiteEcrfRollup,
  type StudyEcrfRollupBundle,
  type SubjectEcrfRollupRow,
  type SubjectStatus,
  type VisitEcrfRollup,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

import {
  EcrfRollupTable,
  metricColumns,
  type EcrfRollupColumn,
} from './ecrf-rollup-table';
import { EcrfTrackingPageHeader } from './ecrf-tracking-page-header';
import { AlertCalloutRow } from './_pieces/alert-callout-row';
import { EcrfRightRail } from './_pieces/ecrf-right-rail';
import {
  ActivityTimestampCell,
  MissingCrfsCell,
  QueriesSplitCell,
  RowActionsMenu,
} from './_pieces/ecrf-row-cells';
import {
  DataStatusBadge,
  NextActionChip,
  StatusLegend,
  VisitDueStatusBadge,
} from './_pieces/ecrf-status-badges';
import { KpiStripPro, type KpiCardId } from './_pieces/kpi-strip-pro';
import { MiniStatStrip } from './_pieces/mini-stat-strip';

type EcrfInnerTab = 'by-subject' | 'by-site' | 'by-visit';
type ViewMode = 'list' | 'grid';

const VIEW_STORAGE_KEY = 'ecrf-tracking:view';

interface StudyEcrfTrackingTabProps {
  studyId: string;
  bundle: StudyEcrfRollupBundle;
}

interface TabSearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}

function TabSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: TabSearchInputProps) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 h-9"
        aria-label={ariaLabel}
      />
    </div>
  );
}

const DATA_STATUS_FILTER_OPTIONS: { value: 'all' | EcrfDataStatus; label: string }[] = [
  { value: 'all', label: 'All data statuses' },
  { value: 'no_data', label: 'No Data' },
  { value: 'partial_data', label: 'Partial Data' },
  { value: 'ready_for_sdv', label: 'Ready for SDV' },
  { value: 'sdv_in_progress', label: 'SDV in Progress' },
  { value: 'ready_for_lock', label: 'Ready for Lock' },
  { value: 'locked', label: 'Locked' },
  { value: 'not_started', label: 'Not Started' },
];

/**
 * Redesigned study-scope eCRF Tracking page. Layout (top to bottom):
 *
 *   1. Page header                — title + Export/Refresh actions
 *   2. KPI strip                  — 6 cards with sparklines and status chips
 *   3. Tabs                       — By Subject / By Site / By Visit
 *   4. Per-tab body
 *      a. Alert callout row
 *      b. Toolbar (search, filters, columns, view toggle)
 *      c. Mini-stat strip (Visit only)
 *      d. Two-column grid: enriched table + tab-specific right rail
 *      e. Footer (pagination + legend + tip)
 *
 * The layout, the column sets, and the data shape all match the redesign
 * plan in `.cursor/plans/ecrf_tracking_redesign_d831d61f.plan.md`.
 */
export function StudyEcrfTrackingTab({
  studyId,
  bundle,
}: StudyEcrfTrackingTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = parseEcrfTab(searchParams.get('ecrfTab')) ?? 'by-subject';
  const [activeTab, setActiveTab] = useState<EcrfInnerTab>(initialTab);

  // Whenever the URL changes (e.g. KPI deep-link or alert click) re-sync the
  // local active-tab state so the dashboard responds to the new params.
  useEffect(() => {
    const next = parseEcrfTab(searchParams.get('ecrfTab'));
    if (next && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'list' || stored === 'grid') setViewMode(stored);
  }, []);
  const persistView = useCallback((next: ViewMode) => {
    setViewMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  }, []);

  // Per-tab search + filter state
  const [siteSearch, setSiteSearch] = useState('');
  const [visitSearch, setVisitSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectSiteFilter, setSubjectSiteFilter] = useState<'all' | string>('all');
  const [subjectStatusFilter, setSubjectStatusFilter] = useState<
    'all' | SubjectStatus
  >('all');
  const initialDataStatus = parseDataStatus(searchParams.get('dataStatus')) ?? 'all';
  const [subjectDataStatusFilter, setSubjectDataStatusFilter] = useState<
    'all' | EcrfDataStatus
  >(initialDataStatus);
  useEffect(() => {
    const next = parseDataStatus(searchParams.get('dataStatus')) ?? 'all';
    setSubjectDataStatusFilter(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [siteNameFilter, setSiteNameFilter] = useState<'all' | string>('all');
  const [siteCountryFilter, setSiteCountryFilter] = useState<
    'all' | '__none__' | string
  >('all');
  const [visitDueFilter, setVisitDueFilter] = useState<
    'all' | 'overdue' | 'due_soon' | 'upcoming' | 'completed'
  >('all');

  const updateActiveTab = useCallback(
    (next: EcrfInnerTab) => {
      setActiveTab(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'ecrf-tracking');
      params.set('ecrfTab', next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleKpiClick = useCallback(
    (id: KpiCardId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'ecrf-tracking');
      switch (id) {
        case 'data_entry':
        case 'queries_open':
        case 'subjects':
        case 'alerts':
          params.set('ecrfTab', 'by-subject');
          if (id === 'data_entry') params.set('dataStatus', 'no_data');
          else if (id === 'queries_open') params.delete('dataStatus');
          break;
        case 'sdv':
        case 'lock':
          params.set('ecrfTab', 'by-site');
          break;
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const siteCountryOptions = useMemo(() => {
    const names = new Set<string>();
    let hasMissing = false;
    for (const row of bundle.bySite) {
      const c = row.country?.trim();
      if (!c) {
        hasMissing = true;
      } else {
        names.add(c);
      }
    }
    return {
      names: Array.from(names).sort((a, b) => a.localeCompare(b)),
      hasMissing,
    };
  }, [bundle.bySite]);

  const bySiteRowOptions = useMemo(() => {
    return bundle.bySite
      .map((row) => ({
        siteId: row.site_id,
        siteNumber: row.site_number,
        siteName: row.site_name,
      }))
      .sort((a, b) => {
        const n = a.siteNumber.localeCompare(b.siteNumber, undefined, {
          numeric: true,
        });
        if (n !== 0) return n;
        return a.siteName.localeCompare(b.siteName, undefined, {
          sensitivity: 'base',
        });
      });
  }, [bundle.bySite]);

  const subjectSiteOptions = useMemo(() => {
    const map = new Map<
      string,
      { siteId: string; siteNumber: string; siteName: string | null }
    >();
    for (const row of bundle.bySubject) {
      if (!row.site_id || map.has(row.site_id)) continue;
      map.set(row.site_id, {
        siteId: row.site_id,
        siteNumber: row.site_number ?? '',
        siteName: row.site_name,
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const byNum = a.siteNumber.localeCompare(b.siteNumber, undefined, {
        numeric: true,
      });
      if (byNum !== 0) return byNum;
      return (a.siteName ?? '').localeCompare(b.siteName ?? '', undefined, {
        sensitivity: 'base',
      });
    });
  }, [bundle.bySubject]);

  const filteredSites = useMemo(() => {
    let rows = bundle.bySite;
    if (siteNameFilter !== 'all') {
      rows = rows.filter((row) => row.site_id === siteNameFilter);
    }
    if (siteCountryFilter !== 'all') {
      if (siteCountryFilter === '__none__') {
        rows = rows.filter((row) => !row.country?.trim());
      } else {
        rows = rows.filter((row) => row.country === siteCountryFilter);
      }
    }
    const q = siteSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [row.site_number, row.site_name, row.country ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bundle.bySite, siteSearch, siteNameFilter, siteCountryFilter]);

  const filteredVisits = useMemo(() => {
    let rows = bundle.byVisit;
    if (visitDueFilter !== 'all') {
      rows = rows.filter((row) => deriveVisitDueStatus(row) === visitDueFilter);
    }
    const q = visitSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.visit_name.toLowerCase().includes(q));
  }, [bundle.byVisit, visitSearch, visitDueFilter]);

  const filteredSubjects = useMemo(() => {
    let rows = bundle.bySubject;
    if (subjectSiteFilter !== 'all') {
      rows = rows.filter((r) => r.site_id === subjectSiteFilter);
    }
    if (subjectStatusFilter !== 'all') {
      rows = rows.filter((r) => r.status === subjectStatusFilter);
    }
    if (subjectDataStatusFilter !== 'all') {
      rows = rows.filter((r) => deriveDataStatus(r) === subjectDataStatusFilter);
    }
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.subject_number,
        row.site_number ?? '',
        row.site_name ?? '',
        row.status,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    bundle.bySubject,
    subjectSearch,
    subjectSiteFilter,
    subjectStatusFilter,
    subjectDataStatusFilter,
  ]);

  const sitePagination = useClientPagination({
    totalItems: filteredSites.length,
    initialPageSize: 10,
    resetKey: [siteSearch, siteNameFilter, siteCountryFilter],
  });
  const sitePage = sitePagination.paginate(filteredSites);

  const visitPagination = useClientPagination({
    totalItems: filteredVisits.length,
    initialPageSize: 10,
    resetKey: [visitSearch, visitDueFilter],
  });
  const visitPage = visitPagination.paginate(filteredVisits);

  const subjectPagination = useClientPagination({
    totalItems: filteredSubjects.length,
    initialPageSize: 10,
    resetKey: [
      subjectSearch,
      subjectSiteFilter,
      subjectStatusFilter,
      subjectDataStatusFilter,
    ],
  });
  const subjectPage = subjectPagination.paginate(filteredSubjects);

  // ─── Columns ───────────────────────────────────────────────────────────

  const subjectColumns: EcrfRollupColumn<SubjectEcrfRollupRow>[] = [
    {
      key: 'subject_number',
      header: 'Subject #',
      className: 'min-w-[120px] font-medium',
      value: (row) => row.subject_number,
    },
    {
      key: 'site_number',
      header: 'Site',
      className: 'w-[80px] tabular-nums',
      value: (row) => row.site_number ?? '—',
    },
    {
      key: 'status',
      header: 'Clinical Status',
      className: 'w-[120px]',
      value: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} className="text-xs" />,
    },
    {
      key: 'data_status',
      header: 'Data Status',
      className: 'w-[150px]',
      value: (row) => deriveDataStatus(row),
      render: (row) => <DataStatusBadge status={deriveDataStatus(row)} />,
    },
    ...metricColumns<SubjectEcrfRollupRow>(),
    {
      key: 'queries',
      header: 'Queries',
      headerTooltip: 'Open / overdue queries (overdue = open >7 days)',
      className: 'w-[140px] text-center',
      value: (row) => row.openQueryCount,
      render: (row) => (
        <QueriesSplitCell
          open={row.openQueryCount}
          overdue={row.overdueQueryCount ?? 0}
        />
      ),
    },
    {
      key: 'last_entry',
      header: 'Last Entry',
      className: 'w-[120px]',
      value: (row) => row.lastEntryAt ?? '',
      render: (row) => <ActivityTimestampCell iso={row.lastEntryAt} />,
    },
    {
      key: 'last_sdv',
      header: 'Last SDV',
      className: 'w-[120px]',
      value: (row) => row.lastSdvAt ?? '',
      render: (row) => <ActivityTimestampCell iso={row.lastSdvAt} />,
    },
    {
      key: 'next_action',
      header: 'Next Action',
      className: 'w-[160px]',
      value: (row) => nextActionForStatus(deriveDataStatus(row)).label,
      render: (row) => {
        const a = nextActionForStatus(deriveDataStatus(row));
        return <NextActionChip label={a.label} tone={a.tone} />;
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[60px] text-right',
      value: () => null,
      render: (row) => (
        <RowActionsMenu
          items={[
            {
              label: 'Open subject',
              onSelect: () =>
                router.push(`/protected/studies/${studyId}/subjects/${row.subject_id}`),
            },
            {
              label: 'Open queries',
              onSelect: () =>
                router.push(
                  `/protected/studies/${studyId}/subjects/${row.subject_id}?tab=queries`,
                ),
            },
            {
              label: 'View activity',
              onSelect: () =>
                router.push(
                  `/protected/studies/${studyId}/subjects/${row.subject_id}?tab=audit`,
                ),
            },
          ]}
        />
      ),
    },
  ];

  const siteColumns: EcrfRollupColumn<SiteEcrfRollup>[] = [
    {
      key: 'site_number',
      header: 'Site #',
      className: 'min-w-[100px] font-medium',
      value: (row) => row.site_number,
    },
    {
      key: 'site_name',
      header: 'Site Name',
      className: 'min-w-[160px]',
      value: (row) => row.site_name,
    },
    {
      key: 'country',
      header: 'Country',
      className: 'w-[110px]',
      value: (row) => row.country ?? '—',
    },
    {
      key: 'subject_count',
      header: 'Subjects',
      className: 'text-center w-[80px]',
      value: (row) => row.subjectCount,
    },
    ...metricColumns<SiteEcrfRollup>(),
    {
      key: 'missing',
      header: 'Missing',
      headerTooltip: 'Expected CRFs not yet entered',
      className: 'text-center w-[80px]',
      value: (row) => row.missingCrfs ?? 0,
      render: (row) => <MissingCrfsCell value={row.missingCrfs} />,
    },
    {
      key: 'queries',
      header: 'Queries',
      headerTooltip: 'Open / overdue queries (overdue = open >7 days)',
      className: 'w-[140px] text-center',
      value: (row) => row.openQueryCount,
      render: (row) => (
        <QueriesSplitCell
          open={row.openQueryCount}
          overdue={row.overdueQueryCount ?? 0}
        />
      ),
    },
    {
      key: 'last_entry',
      header: 'Last Entry',
      className: 'w-[120px]',
      value: (row) => row.lastEntryAt ?? '',
      render: (row) => <ActivityTimestampCell iso={row.lastEntryAt} />,
    },
    {
      key: 'last_sdv',
      header: 'Last SDV',
      className: 'w-[120px]',
      value: (row) => row.lastSdvAt ?? '',
      render: (row) => <ActivityTimestampCell iso={row.lastSdvAt} />,
    },
    {
      key: 'next_action',
      header: 'Next Action',
      className: 'w-[160px]',
      value: (row) => deriveSiteNextAction(row).label,
      render: (row) => {
        const a = deriveSiteNextAction(row);
        return <NextActionChip label={a.label} tone={a.tone} />;
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[60px] text-right',
      value: () => null,
      render: (row) => (
        <RowActionsMenu
          label="Manage"
          items={[
            {
              label: 'Open site',
              onSelect: () =>
                router.push(
                  `/protected/studies/${studyId}/sites/${row.site_id}?tab=ecrf-tracking`,
                ),
            },
            {
              label: 'View subjects',
              onSelect: () =>
                router.push(
                  `/protected/studies/${studyId}?tab=subjects&siteId=${row.site_id}`,
                ),
            },
            {
              label: 'Visit schedule',
              onSelect: () =>
                router.push(
                  `/protected/studies/${studyId}?tab=visit-window-compliance&siteId=${row.site_id}`,
                ),
            },
          ]}
        />
      ),
    },
  ];

  const visitColumns: EcrfRollupColumn<VisitEcrfRollup>[] = [
    {
      key: 'visit_name',
      header: 'Visit',
      className: 'min-w-[140px] font-medium',
      value: (row) => row.visit_name,
    },
    {
      key: 'timepoint',
      header: 'Timepoint',
      className: 'w-[110px]',
      value: (row) => row.timepointLabel ?? (row.timepointDays != null ? `Day ${row.timepointDays}` : '—'),
    },
    {
      key: 'window',
      header: 'Window',
      headerTooltip: 'Allowed window radius (before + after planned date)',
      className: 'w-[80px] text-center tabular-nums',
      value: (row) => row.windowDays ?? '',
      render: (row) =>
        row.windowDays != null ? (
          <span>±{Math.round(row.windowDays / 2)}d</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'due_status',
      header: 'Due Status',
      className: 'w-[130px]',
      value: (row) => deriveVisitDueStatus(row),
      render: (row) => <VisitDueStatusBadge status={deriveVisitDueStatus(row)} />,
    },
    {
      key: 'subjects',
      header: 'Subjects',
      headerTooltip: 'Completed / Expected',
      className: 'w-[100px] text-center tabular-nums',
      value: (row) => `${row.subjectsCompleted ?? 0}/${row.subjectsExpected ?? row.subjectCount}`,
      render: (row) => (
        <span className="font-mono text-[11px]">
          <span className="font-semibold text-foreground">
            {row.subjectsCompleted ?? 0}
          </span>
          <span className="text-muted-foreground">
            /{row.subjectsExpected ?? row.subjectCount}
          </span>
        </span>
      ),
    },
    ...metricColumns<VisitEcrfRollup>(),
    {
      key: 'missing',
      header: 'Missing',
      headerTooltip: 'Expected CRFs not yet entered for this visit',
      className: 'text-center w-[80px]',
      value: (row) => row.missingCrfs ?? 0,
      render: (row) => <MissingCrfsCell value={row.missingCrfs} />,
    },
    {
      key: 'next_action',
      header: 'Next Action',
      className: 'w-[160px]',
      value: (row) => nextActionForVisit(row).label,
      render: (row) => {
        const a = nextActionForVisit(row);
        return <NextActionChip label={a.label} tone={a.tone} />;
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-[60px] text-right',
      value: () => null,
      render: (row) => (
        <RowActionsMenu
          items={[
            {
              label: 'View subjects on this visit',
              onSelect: () =>
                router.push(
                  `/protected/studies/${studyId}?tab=visit-window-compliance&visit=${encodeURIComponent(row.visit_name)}`,
                ),
            },
          ]}
        />
      ),
    },
  ];

  // ─── Tab body helpers ──────────────────────────────────────────────────

  const siteEmpty =
    bundle.bySite.length === 0
      ? 'No sites yet.'
      : 'No sites match your filters.';
  const visitEmpty =
    bundle.byVisit.length === 0
      ? 'No visits have been snapshotted onto subjects yet.'
      : 'No visits match your filters.';
  const subjectHasActiveFilters =
    Boolean(subjectSearch.trim()) ||
    subjectSiteFilter !== 'all' ||
    subjectStatusFilter !== 'all' ||
    subjectDataStatusFilter !== 'all';
  const subjectEmpty =
    bundle.bySubject.length === 0
      ? 'No subjects enrolled in this study.'
      : 'No subjects match your filters.';

  const siteFilterId = `ecrf-subject-site-${studyId}`;
  const statusFilterId = `ecrf-subject-status-${studyId}`;
  const dataStatusFilterId = `ecrf-subject-data-${studyId}`;
  const siteTableSiteId = `ecrf-site-pick-${studyId}`;
  const siteTableCountryId = `ecrf-site-country-${studyId}`;
  const visitTableDueId = `ecrf-visit-due-${studyId}`;

  const siteTableHasActiveFilters =
    Boolean(siteSearch.trim()) ||
    siteNameFilter !== 'all' ||
    siteCountryFilter !== 'all';
  const visitTableHasActiveFilters =
    Boolean(visitSearch.trim()) || visitDueFilter !== 'all';

  const clearSiteTableFilters = () => {
    setSiteSearch('');
    setSiteNameFilter('all');
    setSiteCountryFilter('all');
  };
  const clearVisitTableFilters = () => {
    setVisitSearch('');
    setVisitDueFilter('all');
  };
  const clearSubjectTableFilters = () => {
    setSubjectSearch('');
    setSubjectSiteFilter('all');
    setSubjectStatusFilter('all');
    setSubjectDataStatusFilter('all');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dataStatus');
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // ─── Mini stat strip (Visit-only) ──────────────────────────────────────
  const visitMiniStats = useMemo(() => {
    const totalVisits = bundle.byVisit.length;
    const expected = bundle.byVisit.reduce(
      (acc, v) => acc + (v.dataExpectedTotal ?? 0),
      0,
    );
    const completed = bundle.byVisit.reduce(
      (acc, v) => acc + (v.subjectsCompleted ?? 0),
      0,
    );
    const overdue = bundle.byVisit.reduce(
      (acc, v) => acc + (v.subjectsOverdue ?? 0),
      0,
    );
    const locked = bundle.byVisit.reduce((acc, v) => acc + (v.lockTotal ?? 0), 0);
    const overdueTone: 'critical' | 'muted' = overdue > 0 ? 'critical' : 'muted';
    return [
      { label: 'Total Visits', value: totalVisits },
      { label: 'Expected CRFs', value: expected },
      { label: 'Visits Completed', value: completed, tone: 'success' as const },
      { label: 'Overdue Visits', value: overdue, tone: overdueTone },
      { label: 'Visits Locked', value: locked, tone: 'info' as const },
    ];
  }, [bundle.byVisit]);

  const handleRefresh = useCallback(async () => {
    await refreshStudyEcrfRollup(studyId);
  }, [studyId]);

  // ─── Toolbar pieces ────────────────────────────────────────────────────

  const toolbarRight = (
    <div className="ml-auto flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 text-xs"
        title="Advanced filters (coming soon)"
        disabled
      >
        <Filter className="mr-1 h-3.5 w-3.5" />
        Filters
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 text-xs"
        title="Toggle column visibility (coming soon)"
        disabled
      >
        <Settings2 className="mr-1 h-3.5 w-3.5" />
        Columns
      </Button>
      <div
        role="group"
        aria-label="View toggle"
        className="inline-flex h-9 overflow-hidden rounded-md border bg-background"
      >
        <button
          type="button"
          aria-pressed={viewMode === 'list'}
          onClick={() => persistView('list')}
          className={cn(
            'inline-flex items-center justify-center px-2 text-xs',
            viewMode === 'list'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/40',
          )}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-pressed={viewMode === 'grid'}
          onClick={() => persistView('grid')}
          className={cn(
            'inline-flex items-center justify-center px-2 text-xs',
            viewMode === 'grid'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/40',
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <EcrfTrackingPageHeader
        generatedAt={bundle.generatedAt}
        csvHref={`/api/studies/${studyId}/ecrf-tracking/export`}
        pdfHref={`/api/studies/${studyId}/ecrf-tracking/print`}
        onRefresh={handleRefresh}
      />

      <KpiStripPro bundle={bundle} onCardClick={handleKpiClick} />

      <Tabs
        value={activeTab}
        onValueChange={(v) => updateActiveTab(v as EcrfInnerTab)}
        tabsId={`ecrf-${studyId}`}
      >
        <TabsList>
          <TabsTrigger value="by-subject">
            By Subject ({bundle.bySubject.length})
          </TabsTrigger>
          <TabsTrigger value="by-site">
            By Site ({bundle.bySite.length})
          </TabsTrigger>
          <TabsTrigger value="by-visit">
            By Visit ({bundle.byVisit.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── By Subject ────────────────────────────────────────────── */}
        <TabsContent value="by-subject" className="space-y-3 pt-3">
          <AlertCalloutRow alerts={alertsForTab(bundle, 'by-subject')} />
          <Toolbar>
            <TabSearchInput
              value={subjectSearch}
              onChange={setSubjectSearch}
              placeholder="Search subjects..."
              ariaLabel="Search By Subject rows"
              className="min-w-[10rem] max-w-sm w-[12rem] shrink-0 sm:min-w-[12rem] sm:max-w-md sm:w-64"
            />
            <FilterSelect
              id={siteFilterId}
              label="Site"
              value={subjectSiteFilter}
              onChange={setSubjectSiteFilter}
              displayLabel={(v) => {
                if (v == null || v === 'all') return 'All sites';
                const opt = subjectSiteOptions.find((o) => o.siteId === v);
                if (!opt) return v;
                if (opt.siteName) return `${opt.siteNumber} – ${opt.siteName}`;
                return opt.siteNumber || v;
              }}
            >
              <SelectItem value="all">All sites</SelectItem>
              {subjectSiteOptions.map((opt) => (
                <SelectItem key={opt.siteId} value={opt.siteId}>
                  {opt.siteName
                    ? `${opt.siteNumber} – ${opt.siteName}`
                    : opt.siteNumber || opt.siteId}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect
              id={statusFilterId}
              label="Status"
              value={subjectStatusFilter}
              onChange={(v) => setSubjectStatusFilter(v as 'all' | SubjectStatus)}
              displayLabel={(v) => {
                if (v == null || v === 'all') return 'All statuses';
                return (
                  SUBJECT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v
                );
              }}
            >
              <SelectItem value="all">All statuses</SelectItem>
              {SUBJECT_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect
              id={dataStatusFilterId}
              label="Data status"
              value={subjectDataStatusFilter}
              onChange={(v) =>
                setSubjectDataStatusFilter(v as 'all' | EcrfDataStatus)
              }
              displayLabel={(v) => {
                if (v == null || v === 'all') return 'All data statuses';
                return (
                  DATA_STATUS_FILTER_OPTIONS.find((o) => o.value === v)?.label ??
                  v
                );
              }}
            >
              {DATA_STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </FilterSelect>
            {subjectHasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 text-xs"
                onClick={clearSubjectTableFilters}
              >
                Clear filters
              </Button>
            )}
            {toolbarRight}
          </Toolbar>
          <TableRailLayout tab="by-subject">
            <EcrfRollupTable
              variant="panel"
              rows={subjectPage}
              columns={subjectColumns}
              rowKey={(row) => row.subject_id}
              emptyState={subjectEmpty}
              footer={
                <TablePaginationFooter
                  pagination={subjectPagination}
                  totalItems={filteredSubjects.length}
                  itemNoun="subject"
                />
              }
            />
            <EcrfRightRail bundle={bundle} tab="by-subject" studyId={studyId} />
          </TableRailLayout>
          <FooterStrip tip="Click a subject's Actions menu to drill into queries or activity history." />
        </TabsContent>

        {/* ─── By Site ────────────────────────────────────────────────── */}
        <TabsContent value="by-site" className="space-y-3 pt-3">
          <AlertCalloutRow alerts={alertsForTab(bundle, 'by-site')} />
          <Toolbar>
            <TabSearchInput
              value={siteSearch}
              onChange={setSiteSearch}
              placeholder="Search sites..."
              ariaLabel="Search By Site rows"
              className="min-w-[10rem] max-w-sm w-[12rem] shrink-0 sm:min-w-[12rem] sm:max-w-md sm:w-64"
            />
            <FilterSelect
              id={siteTableSiteId}
              label="Site"
              value={siteNameFilter}
              onChange={setSiteNameFilter}
              displayLabel={(v) => {
                if (v == null || v === 'all') return 'All sites';
                const opt = bySiteRowOptions.find((o) => o.siteId === v);
                if (!opt) return v;
                return `${opt.siteNumber} – ${opt.siteName}`;
              }}
            >
              <SelectItem value="all">All sites</SelectItem>
              {bySiteRowOptions.map((opt) => (
                <SelectItem key={opt.siteId} value={opt.siteId}>
                  {opt.siteNumber} – {opt.siteName}
                </SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect
              id={siteTableCountryId}
              label="Country"
              value={siteCountryFilter}
              onChange={setSiteCountryFilter}
              displayLabel={(v) => {
                if (v == null || v === 'all') return 'All countries';
                if (v === '__none__') return 'No country';
                return v;
              }}
            >
              <SelectItem value="all">All countries</SelectItem>
              {siteCountryOptions.hasMissing && (
                <SelectItem value="__none__">No country</SelectItem>
              )}
              {siteCountryOptions.names.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </FilterSelect>
            {siteTableHasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 text-xs"
                onClick={clearSiteTableFilters}
              >
                Clear filters
              </Button>
            )}
            {toolbarRight}
          </Toolbar>
          <TableRailLayout tab="by-site">
            <EcrfRollupTable
              variant="panel"
              description="One row per site, summed across that site's subjects."
              rows={sitePage}
              columns={siteColumns}
              rowKey={(row) => row.site_id}
              emptyState={siteEmpty}
              footer={
                <TablePaginationFooter
                  pagination={sitePagination}
                  totalItems={filteredSites.length}
                  itemNoun="site"
                />
              }
            />
            <EcrfRightRail bundle={bundle} tab="by-site" studyId={studyId} />
          </TableRailLayout>
          <FooterStrip tip="Click Manage on a site row to view its subjects, schedule, or eCRF tracking detail." />
        </TabsContent>

        {/* ─── By Visit ───────────────────────────────────────────────── */}
        <TabsContent value="by-visit" className="space-y-3 pt-3">
          <AlertCalloutRow alerts={alertsForTab(bundle, 'by-visit')} />
          <Toolbar>
            <TabSearchInput
              value={visitSearch}
              onChange={setVisitSearch}
              placeholder="Search visits..."
              ariaLabel="Search By Visit rows"
              className="min-w-[10rem] max-w-sm w-[12rem] shrink-0 sm:min-w-[12rem] sm:max-w-md sm:w-64"
            />
            <FilterSelect
              id={visitTableDueId}
              label="Due"
              value={visitDueFilter}
              onChange={(v) =>
                setVisitDueFilter(
                  v as 'all' | 'overdue' | 'due_soon' | 'upcoming' | 'completed',
                )
              }
              displayLabel={(v) => {
                if (v == null || v === 'all') return 'All due statuses';
                if (v === 'overdue') return 'Overdue';
                if (v === 'due_soon') return 'Due Soon';
                if (v === 'upcoming') return 'Upcoming';
                if (v === 'completed') return 'Completed';
                return v;
              }}
            >
              <SelectItem value="all">All due statuses</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="due_soon">Due Soon</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </FilterSelect>
            {visitTableHasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 text-xs"
                onClick={clearVisitTableFilters}
              >
                Clear filters
              </Button>
            )}
            {toolbarRight}
          </Toolbar>
          <MiniStatStrip stats={visitMiniStats} />
          <TableRailLayout tab="by-visit">
            <EcrfRollupTable
              variant="panel"
              description="One row per visit, summed across every site in the study."
              rows={visitPage}
              columns={visitColumns}
              rowKey={(row) => row.visit_name}
              emptyState={visitEmpty}
              footer={
                <TablePaginationFooter
                  pagination={visitPagination}
                  totalItems={filteredVisits.length}
                  itemNoun="visit"
                />
              }
            />
            <EcrfRightRail bundle={bundle} tab="by-visit" studyId={studyId} />
          </TableRailLayout>
          <FooterStrip tip="Click a visit name to view subject + CRF status for that timepoint." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Layout helpers ─────────────────────────────────────────────────────

function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 w-full max-w-full overflow-x-auto">
      <div className="flex w-max min-w-0 max-w-full flex-nowrap items-end gap-2 pb-0.5">
        {children}
      </div>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  displayLabel,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  displayLabel: (v: string | null | undefined) => string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Label
        htmlFor={id}
        className="whitespace-nowrap text-xs text-muted-foreground"
      >
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          className="h-9 w-[200px] text-xs"
          aria-label={`Filter by ${label.toLowerCase()}`}
        >
          <SelectValue getDisplayLabel={displayLabel} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function TableRailLayout({
  tab,
  children,
}: {
  tab: EcrfInnerTab;
  children: React.ReactNode;
}) {
  // The rail is null on by-subject, so the children prop is [<Table />, null].
  // We still render a 1-col grid in that case to keep markup symmetric.
  if (tab === 'by-subject') {
    const arr = Array.isArray(children) ? children : [children];
    return <div className="space-y-3">{arr[0]}</div>;
  }
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_320px]">{children}</div>
  );
}

function FooterStrip({ tip }: { tip: string }) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <StatusLegend />
      <span className="inline-flex items-center gap-1">
        <Badge variant="outline" className="h-4 text-[10px]">
          Tip
        </Badge>
        {tip}
      </span>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function parseEcrfTab(value: string | null): EcrfInnerTab | null {
  if (value === 'by-subject' || value === 'by-site' || value === 'by-visit') {
    return value;
  }
  return null;
}

function parseDataStatus(value: string | null): EcrfDataStatus | null {
  const allowed: EcrfDataStatus[] = [
    'not_started',
    'no_data',
    'partial_data',
    'ready_for_sdv',
    'sdv_in_progress',
    'ready_for_lock',
    'locked',
  ];
  if (value && (allowed as string[]).includes(value)) {
    return value as EcrfDataStatus;
  }
  return null;
}

function deriveSiteNextAction(row: SiteEcrfRollup): {
  label: string;
  tone: 'critical' | 'warn' | 'info' | 'success' | 'muted';
} {
  if (row.dataExpectedTotal === 0) {
    return { label: 'Awaiting Subjects', tone: 'muted' };
  }
  if (row.dataEntryTotal === 0) {
    return { label: 'Start Data Entry', tone: 'critical' };
  }
  if ((row.overdueQueryCount ?? 0) > 0) {
    return { label: 'Resolve Queries', tone: 'critical' };
  }
  if (row.dataEntryTotal < row.dataExpectedTotal) {
    return { label: 'Continue Entry', tone: 'warn' };
  }
  if (row.sdvTotal < row.dataEntryTotal) {
    return { label: 'Run SDV', tone: 'info' };
  }
  if (row.lockTotal < row.dataEntryTotal) {
    return { label: 'Lock CRFs', tone: 'info' };
  }
  return { label: 'Locked', tone: 'success' };
}
