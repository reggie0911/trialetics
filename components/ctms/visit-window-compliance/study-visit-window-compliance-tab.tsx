'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Download, ExternalLink, MoreVertical } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import type {
  StudyVisitScheduleBundle,
  SubjectRiskLevel,
  VisitPriority,
  VisitScheduleBucketCounts,
  VisitScheduleSiteRow,
  VisitScheduleSubjectRow,
  VisitScheduleVisitRow,
  VisitWindowAlert,
  VisitWindowComplianceBundle,
} from '@/lib/types/ctms';
import { formatPlanDate } from '@/lib/utils/visit-window';

import { TopOverdueVisitTypesList } from './top-overdue-visit-types-list';
import { VisitComplianceTrendChart } from './visit-compliance-trend-chart';
import { VisitWindowAlertsBanner } from './visit-window-alerts-banner';
import {
  VisitWindowKpiStrip,
  type KpiBucketId,
} from './visit-window-kpi-strip';
import { VisitWindowPageHeader } from './visit-window-page-header';
import { VisitWindowTipBanner } from './visit-window-tip-banner';
import {
  type DueStatus,
  type ToolbarSelectOption,
  type VisitWindowToolbarValue,
  VisitWindowToolbar,
} from './visit-window-toolbar';
import {
  bucketColumns,
  VisitRollupTable,
  type VisitRollupColumn,
} from './visit-rollup-table';

interface StudyVisitScheduleTabProps {
  studyId: string;
  bundle: StudyVisitScheduleBundle;
  /** Visit Window Compliance enrichments (trends, alerts, extras). */
  complianceBundle?: VisitWindowComplianceBundle;
}

type ScopeId = 'by-site' | 'by-visit' | 'by-subject';

const PRIORITY_VARIANT: Record<VisitPriority, 'destructive' | 'warning' | 'success'> = {
  critical: 'destructive',
  at_risk: 'warning',
  on_track: 'success',
};

const PRIORITY_LABEL: Record<VisitPriority, string> = {
  critical: 'Critical',
  at_risk: 'At risk',
  on_track: 'On track',
};

/** 2px row-stripe border colors for the By Site row accent. Mirrors the
 *  Badge tones above so the stripe color and the expanded Priority badge
 *  always agree. */
const PRIORITY_STRIPE: Record<VisitPriority, string> = {
  critical: 'border-l-red-500',
  at_risk: 'border-l-amber-500',
  on_track: 'border-l-emerald-500',
};

function PriorityBadge({ priority }: { priority: VisitPriority }) {
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} className="text-[10px]">
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

const RISK_VARIANT: Record<SubjectRiskLevel, 'destructive' | 'warning' | 'success'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'success',
};

const RISK_STRIPE: Record<SubjectRiskLevel, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-emerald-500',
};

function RiskBadge({ risk }: { risk: SubjectRiskLevel }) {
  return (
    <Badge variant={RISK_VARIANT[risk]} className="text-[10px] capitalize">
      {risk}
    </Badge>
  );
}

/** Compact "Last Visit Activity" cell — formatted date on top, a red
 *  `N days overdue` line underneath when the row has an open overdue. */
function LastVisitActivityCell({
  iso,
  daysOverdue,
}: {
  iso: string | null;
  daysOverdue: number | null;
}) {
  if (!iso) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col leading-tight">
      <span>{formatPlanDate(iso)}</span>
      {daysOverdue !== null && daysOverdue > 0 ? (
        <span className="text-[10px] text-red-600 dark:text-red-400">
          {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
        </span>
      ) : null}
    </div>
  );
}

/** Inline overdue-visits panel rendered in the expanded By Site row. Lists
 *  the alert-derived overdue items for that site so users can act without
 *  navigating away. Falls back to a navigation link when no per-site visit
 *  alerts are available in the bundle (the bundle currently surfaces alerts
 *  scoped to the site as a whole, not individual visits). */
function SiteOverdueVisitsPanel({
  studyId,
  site,
  alerts,
  priority,
}: {
  studyId: string;
  site: VisitScheduleSiteRow;
  alerts: VisitWindowAlert[];
  priority: VisitPriority | null;
}) {
  const siteHref = `/protected/studies/${studyId}/sites/${site.site_id}?tab=visit-window-compliance`;
  // Pull any visit-scoped alerts whose scopeId points at this site.
  const visitAlerts = alerts.filter(
    (a) => a.scope === 'visit' && a.scopeId === site.site_id,
  );
  const totalOverdue = site.overdue;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Priority
        </span>
        {priority ? (
          <PriorityBadge priority={priority} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {totalOverdue} open overdue visit{totalOverdue === 1 ? '' : 's'} at this
          site
        </span>
      </div>

      {visitAlerts.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border bg-card">
          {visitAlerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 px-3 py-1.5 text-xs"
            >
              <span className="font-medium text-red-600 dark:text-red-400">
                {a.title}
              </span>
              <span className="text-muted-foreground">— {a.detail}</span>
            </li>
          ))}
        </ul>
      ) : totalOverdue > 0 ? (
        <p className="text-xs text-muted-foreground">
          Visit-level breakdown isn&apos;t available inline yet.{' '}
          <Link
            href={siteHref}
            className="text-foreground underline-offset-2 hover:underline"
          >
            View overdue visits at this site
          </Link>
          .
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          No open overdue visits — every protocol visit on this site is currently
          in window or upcoming.
        </p>
      )}
    </div>
  );
}

function renderTimepoint(row: VisitScheduleVisitRow): string {
  const parts: string[] = [];
  if (row.timepoint_label) parts.push(row.timepoint_label);
  if (row.timepoint_days !== null && row.timepoint_days !== undefined) {
    const sign = row.timepoint_days > 0 ? '+' : '';
    parts.push(`Day ${sign}${row.timepoint_days}`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

function bucketHasCount(row: VisitScheduleBucketCounts, kind: DueStatus): boolean {
  if (kind === 'all') return true;
  return row[kind] > 0;
}

/**
 * Map a bucket KPI card back into the toolbar's `dueStatus` filter and the
 * matching scope. The Overall card simply clears the filter so the user can
 * scan everything in scope.
 */
function bucketToDueStatus(id: KpiBucketId): DueStatus {
  if (id === 'overall') return 'all';
  return id;
}

function dueStatusToBucket(due: DueStatus): KpiBucketId | null {
  if (due === 'all') return null;
  return due;
}

const DEFAULT_TOOLBAR: VisitWindowToolbarValue = {
  search: '',
  country: 'all',
  status: 'all',
  dueStatus: 'all',
  view: 'list',
};

/**
 * Study-scope Visit Window Compliance tab. Composes the redesigned page
 * skeleton: header → KPI strip → alerts banner → tabs (by site / visit /
 * subject) → analytics row → tip banner. Filter state lives locally per
 * scope so the search box doesn't leak across tabs, but the KPI strip and
 * alerts banner can still steer the active table by setting the dueStatus
 * filter for the visible scope.
 */
export function StudyVisitScheduleTab({
  studyId,
  bundle,
  complianceBundle,
}: StudyVisitScheduleTabProps) {
  const [activeTab, setActiveTab] = useState<ScopeId>('by-site');

  const [siteToolbar, setSiteToolbar] =
    useState<VisitWindowToolbarValue>(DEFAULT_TOOLBAR);
  const [visitToolbar, setVisitToolbar] =
    useState<VisitWindowToolbarValue>(DEFAULT_TOOLBAR);
  const [subjectToolbar, setSubjectToolbar] =
    useState<VisitWindowToolbarValue>(DEFAULT_TOOLBAR);

  const overall = bundle.overall;
  const trends = complianceBundle?.trends;
  const alerts = complianceBundle?.alerts ?? [];
  const extras = complianceBundle?.extras;

  // Country options from the bySite rollup.
  const countryOptions: ToolbarSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    for (const row of bundle.bySite) {
      if (row.country) set.add(row.country);
    }
    return Array.from(set)
      .sort()
      .map((c) => ({ value: c, label: c }));
  }, [bundle.bySite]);

  const subjectStatusOptions: ToolbarSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    for (const row of bundle.bySubject) set.add(row.status);
    return Array.from(set)
      .sort()
      .map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));
  }, [bundle.bySubject]);

  const filteredSites = useMemo(() => {
    const q = siteToolbar.search.trim().toLowerCase();
    return bundle.bySite.filter((row) => {
      if (q) {
        const haystack = [row.site_number, row.site_name, row.country ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (siteToolbar.country !== 'all' && row.country !== siteToolbar.country) {
        return false;
      }
      if (!bucketHasCount(row, siteToolbar.dueStatus)) return false;
      return true;
    });
  }, [bundle.bySite, siteToolbar]);

  const filteredVisits = useMemo(() => {
    const q = visitToolbar.search.trim().toLowerCase();
    return bundle.byVisit.filter((row) => {
      if (q) {
        const haystack = [
          row.visit_name,
          row.timepoint_label ?? '',
          row.visit_number !== null && row.visit_number !== undefined
            ? String(row.visit_number)
            : '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (!bucketHasCount(row, visitToolbar.dueStatus)) return false;
      return true;
    });
  }, [bundle.byVisit, visitToolbar]);

  const filteredSubjects = useMemo(() => {
    const q = subjectToolbar.search.trim().toLowerCase();
    return bundle.bySubject.filter((row) => {
      if (q) {
        const haystack = [row.subject_number, row.site_number ?? '', row.status]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (subjectToolbar.status !== 'all' && row.status !== subjectToolbar.status) {
        return false;
      }
      if (!bucketHasCount(row, subjectToolbar.dueStatus)) return false;
      return true;
    });
  }, [bundle.bySubject, subjectToolbar]);

  const sitePagination = useClientPagination({
    totalItems: filteredSites.length,
    initialPageSize: 10,
    resetKey: [siteToolbar.search, siteToolbar.country, siteToolbar.dueStatus],
  });
  const sitePage = sitePagination.paginate(filteredSites);

  const visitPagination = useClientPagination({
    totalItems: filteredVisits.length,
    initialPageSize: 10,
    resetKey: [visitToolbar.search, visitToolbar.dueStatus],
  });
  const visitPage = visitPagination.paginate(filteredVisits);

  const subjectPagination = useClientPagination({
    totalItems: filteredSubjects.length,
    initialPageSize: 10,
    resetKey: [
      subjectToolbar.search,
      subjectToolbar.status,
      subjectToolbar.dueStatus,
    ],
  });
  const subjectPage = subjectPagination.paginate(filteredSubjects);

  const handleKpiCardClick = useCallback(
    (id: KpiBucketId) => {
      const dueStatus = bucketToDueStatus(id);
      if (activeTab === 'by-site') {
        setSiteToolbar((s) => ({ ...s, dueStatus }));
      } else if (activeTab === 'by-visit') {
        setVisitToolbar((s) => ({ ...s, dueStatus }));
      } else {
        setSubjectToolbar((s) => ({ ...s, dueStatus }));
      }
    },
    [activeTab],
  );

  const activeBucket = useMemo<KpiBucketId | null>(() => {
    if (activeTab === 'by-site') return dueStatusToBucket(siteToolbar.dueStatus);
    if (activeTab === 'by-visit') return dueStatusToBucket(visitToolbar.dueStatus);
    return dueStatusToBucket(subjectToolbar.dueStatus);
  }, [activeTab, siteToolbar.dueStatus, visitToolbar.dueStatus, subjectToolbar.dueStatus]);

  const hrefForAlert = useCallback(
    (alert: VisitWindowAlert): string | null => {
      if (alert.scope === 'site' && alert.scopeId) {
        return `/protected/studies/${studyId}/sites/${alert.scopeId}?tab=visit-window-compliance`;
      }
      if (alert.scope === 'subject' && alert.scopeId) {
        return `/protected/studies/${studyId}/subjects/${alert.scopeId}?tab=visits`;
      }
      return null;
    },
    [studyId],
  );

  const hrefForSite = useCallback(
    (siteId: string): string =>
      `/protected/studies/${studyId}/sites/${siteId}?tab=visit-window-compliance`,
    [studyId],
  );

  const handleCopySiteLink = useCallback(
    (siteId: string) => {
      if (typeof window === 'undefined') return;
      const url = window.location.origin + hrefForSite(siteId);
      void navigator.clipboard.writeText(url);
    },
    [hrefForSite],
  );

  const handleExportSiteCsv = useCallback(
    (siteId: string) => {
      if (typeof window === 'undefined') return;
      window.location.href = `/api/studies/${studyId}/sites/${siteId}/visit-window-compliance/export`;
    },
    [studyId],
  );

  const siteColumns: VisitRollupColumn<VisitScheduleSiteRow>[] = [
    {
      key: 'site_number',
      header: 'Site #',
      className: 'min-w-[120px] font-medium',
      value: (row) => row.site_number,
      render: (row) => (
        <Link
          href={hrefForSite(row.site_id)}
          aria-label={`Open site ${row.site_number}`}
          className="text-foreground font-medium hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {row.site_number}
        </Link>
      ),
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
      totalRender: (rows) => (
        <span className="font-mono text-[11px] font-semibold tabular-nums">
          {rows.reduce((acc, r) => acc + r.subjectCount, 0)}
        </span>
      ),
    },
    ...bucketColumns<VisitScheduleSiteRow>(),
    {
      key: 'last_activity',
      header: 'Last Visit Activity',
      headerSubtitle: 'Oldest overdue',
      headerTooltip:
        'Oldest open overdue visit at this site, or most recent activity if none are overdue.',
      className: 'min-w-[150px] text-xs',
      value: (row) => {
        const e = extras?.sites[row.site_id];
        return e?.oldestOverdueDate ?? row.last_actual_date ?? null;
      },
      render: (row) => {
        const e = extras?.sites[row.site_id];
        return (
          <LastVisitActivityCell
            iso={e?.oldestOverdueDate ?? row.last_actual_date ?? null}
            daysOverdue={e?.oldestOverdueDays ?? null}
          />
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[120px]',
      value: () => null,
      render: (row) => {
        const href = hrefForSite(row.site_id);
        return (
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
              <Link href={href} aria-label={`Open site ${row.site_number}`}>
                <ExternalLink className="h-3 w-3 mr-1" />
                Open
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                aria-label={`More actions for site ${row.site_number}`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onSelect={() => handleCopySiteLink(row.site_id)}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy site link
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleExportSiteCsv(row.site_id)}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Export site CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const visitColumns: VisitRollupColumn<VisitScheduleVisitRow>[] = [
    {
      key: 'visit_number',
      header: '#',
      className: 'text-center w-[50px]',
      value: (row) => row.visit_number ?? '—',
    },
    {
      key: 'visit_name',
      header: 'Visit',
      className: 'min-w-[160px] font-medium',
      value: (row) => row.visit_name,
    },
    {
      key: 'timepoint',
      header: 'Timepoint',
      className: 'min-w-[120px] text-xs text-muted-foreground',
      value: (row) => renderTimepoint(row),
    },
    {
      key: 'window_days',
      header: 'Window',
      headerTooltip: 'Protocol window, e.g. ± 2 days.',
      className: 'w-[100px] text-xs text-muted-foreground',
      value: (row) => {
        const e = extras?.visits[row.visit_name];
        if (!e) return '—';
        if (e.windowDays !== null) return `± ${e.windowDays} days`;
        if (e.windowMinusDays !== null && e.windowPlusDays !== null) {
          return `${e.windowMinusDays}/+${e.windowPlusDays} d`;
        }
        return '—';
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      className: 'text-center w-[110px]',
      value: (row) => extras?.visits[row.visit_name]?.priority ?? null,
      render: (row) => {
        const p = extras?.visits[row.visit_name]?.priority;
        return p ? <PriorityBadge priority={p} /> : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      key: 'subject_count',
      header: 'Subjects',
      headerTooltip: '# subjects with this visit on the schedule.',
      className: 'text-center w-[80px]',
      value: (row) => row.subjectCount,
      totalRender: (rows) => (
        <span className="font-mono text-[11px] font-semibold tabular-nums">
          {rows.reduce((acc, r) => acc + r.subjectCount, 0)}
        </span>
      ),
    },
    ...bucketColumns<VisitScheduleVisitRow>(),
    {
      key: 'next_action',
      header: 'Next Action',
      className: 'min-w-[150px] text-xs',
      value: (row) => extras?.visits[row.visit_name]?.nextAction.label ?? '—',
    },
    {
      key: 'last_activity',
      header: 'Last Visit Activity',
      headerSubtitle: 'Oldest overdue',
      className: 'min-w-[150px] text-xs',
      value: (row) => extras?.visits[row.visit_name]?.oldestOverdueDate ?? null,
      render: (row) => {
        const e = extras?.visits[row.visit_name];
        return (
          <LastVisitActivityCell
            iso={e?.oldestOverdueDate ?? null}
            daysOverdue={e?.oldestOverdueDays ?? null}
          />
        );
      },
    },
  ];

  const subjectColumns: VisitRollupColumn<VisitScheduleSubjectRow>[] = [
    {
      key: 'subject_number',
      header: 'Subject #',
      className: 'min-w-[140px] font-medium',
      value: (row) => row.subject_number,
      render: (row) => (
        <Link
          href={`/protected/studies/${studyId}/subjects/${row.subject_id}?tab=visits`}
          aria-label={`Open subject ${row.subject_number}`}
          className="text-foreground font-medium hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {row.subject_number}
        </Link>
      ),
    },
    {
      key: 'site_number',
      header: 'Site',
      className: 'w-[100px]',
      value: (row) => row.site_number ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[120px]',
      value: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} className="text-xs" />,
    },
    {
      key: 'risk',
      header: 'Risk Level',
      className: 'text-center w-[110px]',
      value: (row) => extras?.subjects[row.subject_id]?.riskLevel ?? null,
      render: (row) => {
        const r = extras?.subjects[row.subject_id]?.riskLevel;
        return r ? <RiskBadge risk={r} /> : <span className="text-muted-foreground text-xs">—</span>;
      },
    },
    {
      key: 'anchor',
      header: 'Anchor',
      headerTooltip:
        'Which subject date drives the schedule (Screening or Randomization) + the date itself.',
      className: 'min-w-[150px] text-xs',
      value: (row) =>
        `${row.visit_anchor_kind === 'screening' ? 'Scrn' : 'Rand'} · ${formatPlanDate(row.anchor_date)}`,
    },
    {
      key: 'last_actual',
      header: 'Last actual',
      headerTooltip: "Most recent actual_date across this subject's visits.",
      className: 'w-[110px] text-xs text-muted-foreground',
      value: (row) => formatPlanDate(row.last_actual_date),
    },
    ...bucketColumns<VisitScheduleSubjectRow>(),
    {
      key: 'next_action',
      header: 'Next Action',
      className: 'min-w-[150px] text-xs',
      value: (row) => extras?.subjects[row.subject_id]?.nextAction.label ?? '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[110px]',
      value: () => null,
      render: (row) => (
        <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
          <Link
            href={`/protected/studies/${studyId}/subjects/${row.subject_id}?tab=visits`}
            aria-label={`Open subject ${row.subject_number}`}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open
          </Link>
        </Button>
      ),
    },
  ];

  const siteEmpty = siteToolbar.search.trim()
    ? 'No sites match your search.'
    : 'No sites yet.';
  const visitEmpty = visitToolbar.search.trim()
    ? 'No visits match your search.'
    : 'No visits have been snapshotted onto subjects yet.';
  const subjectEmpty = subjectToolbar.search.trim()
    ? 'No subjects match your search.'
    : 'No subjects enrolled in this study.';

  return (
    <div className="space-y-4">
      <VisitWindowPageHeader
        lastUpdatedAt={complianceBundle?.generatedAt ?? null}
        csvHref={`/api/studies/${studyId}/visit-window-compliance/export`}
        pdfHref={`/api/studies/${studyId}/visit-window-compliance/print`}
      />

      <VisitWindowKpiStrip
        overall={overall}
        subjectCount={bundle.subjectCount}
        visitCount={bundle.byVisit.length}
        trends={trends}
        onCardClick={handleKpiCardClick}
        activeBucket={activeBucket}
      />

      <VisitWindowAlertsBanner alerts={alerts} hrefForAlert={hrefForAlert} />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ScopeId)}
        tabsId={`vsc-${studyId}`}
      >
        <TabsList>
          <TabsTrigger value="by-site">
            By Site ({bundle.bySite.length})
          </TabsTrigger>
          <TabsTrigger value="by-visit">
            By Visit ({bundle.byVisit.length})
          </TabsTrigger>
          <TabsTrigger value="by-subject">
            By Subject ({bundle.bySubject.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-site" className="space-y-3 pt-3">
          <VisitRollupTable
            variant="panel"
            description="One row per site, summed across that site's subjects."
            toolbar={
              <VisitWindowToolbar
                searchPlaceholder="Search sites..."
                value={siteToolbar}
                onChange={setSiteToolbar}
                countryOptions={countryOptions}
              />
            }
            rows={sitePage}
            columns={siteColumns}
            rowKey={(row) => row.site_id}
            emptyState={siteEmpty}
            showTotalsRow
            totalsLabel={`Total (${filteredSites.length} site${filteredSites.length === 1 ? '' : 's'})`}
            rowAccent={(row) => {
              const p = extras?.sites[row.site_id]?.priority;
              return p
                ? {
                    color: PRIORITY_STRIPE[p],
                    tooltip: `Priority: ${PRIORITY_LABEL[p]}`,
                  }
                : null;
            }}
            expandable
            renderExpanded={(row) => (
              <SiteOverdueVisitsPanel
                studyId={studyId}
                site={row}
                alerts={alerts}
                priority={extras?.sites[row.site_id]?.priority ?? null}
              />
            )}
            footer={
              <TablePaginationFooter
                pagination={sitePagination}
                totalItems={filteredSites.length}
                itemNoun="site"
              />
            }
          />
          {complianceBundle ? (
            <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <VisitWindowTipBanner scope="by-site" />
              <VisitComplianceTrendChart data={complianceBundle.complianceTrend} />
              <TopOverdueVisitTypesList data={complianceBundle.topOverdueVisitTypes} />
            </div>
          ) : (
            <VisitWindowTipBanner scope="by-site" />
          )}
        </TabsContent>

        <TabsContent value="by-visit" className="space-y-3 pt-3">
          <VisitRollupTable
            variant="panel"
            description="One row per visit, summed across every site in the study."
            toolbar={
              <VisitWindowToolbar
                searchPlaceholder="Search visits..."
                value={visitToolbar}
                onChange={setVisitToolbar}
                showViewToggle={false}
              />
            }
            rows={visitPage}
            columns={visitColumns}
            rowKey={(row) => row.visit_name}
            emptyState={visitEmpty}
            showTotalsRow
            totalsLabel={`Total (${filteredVisits.length} visit${filteredVisits.length === 1 ? '' : 's'})`}
            footer={
              <TablePaginationFooter
                pagination={visitPagination}
                totalItems={filteredVisits.length}
                itemNoun="visit"
              />
            }
          />
          <VisitWindowTipBanner scope="by-visit" />
        </TabsContent>

        <TabsContent value="by-subject" className="space-y-3 pt-3">
          <VisitRollupTable
            variant="panel"
            toolbar={
              <VisitWindowToolbar
                searchPlaceholder="Search subjects..."
                value={subjectToolbar}
                onChange={setSubjectToolbar}
                statusOptions={subjectStatusOptions}
                showViewToggle={false}
              />
            }
            rows={subjectPage}
            columns={subjectColumns}
            rowKey={(row) => row.subject_id}
            emptyState={subjectEmpty}
            showTotalsRow
            totalsLabel={`Total (${filteredSubjects.length} subject${filteredSubjects.length === 1 ? '' : 's'})`}
            rowAccent={(row) => {
              const r = extras?.subjects[row.subject_id]?.riskLevel;
              return r
                ? {
                    color: RISK_STRIPE[r],
                    tooltip: `Risk: ${r.charAt(0).toUpperCase() + r.slice(1)}`,
                  }
                : null;
            }}
            footer={
              <TablePaginationFooter
                pagination={subjectPagination}
                totalItems={filteredSubjects.length}
                itemNoun="subject"
              />
            }
          />
          <VisitWindowTipBanner scope="by-subject" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
