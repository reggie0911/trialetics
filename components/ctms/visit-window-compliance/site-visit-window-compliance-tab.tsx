'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import type {
  SiteVisitScheduleBundle,
  SiteVisitWindowComplianceBundle,
  SubjectRiskLevel,
  VisitPriority,
  VisitScheduleBucketCounts,
  VisitScheduleSubjectRow,
  VisitScheduleVisitRow,
} from '@/lib/types/ctms';
import { formatPlanDate } from '@/lib/utils/visit-window';

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

interface SiteVisitScheduleTabProps {
  studyId: string;
  siteId: string;
  bundle: SiteVisitScheduleBundle;
  /** Visit Window Compliance enrichments. */
  complianceBundle?: SiteVisitWindowComplianceBundle;
}

type ScopeId = 'by-visit' | 'by-subject';

const PRIORITY_VARIANT: Record<VisitPriority, 'destructive' | 'warning' | 'success'> = {
  critical: 'destructive',
  at_risk: 'warning',
  on_track: 'success',
};
const PRIORITY_LABEL: Record<VisitPriority, string> = {
  critical: 'Critical',
  at_risk: 'At risk',
  on_track: 'On Track',
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
 * Site-scope Visit Window Compliance tab. Mirrors the study-scoped layout
 * (header → KPI strip → alerts → tabs) but drops the by-site rollup and the
 * portfolio-wide analytics row (compliance trend / top overdue) since those
 * are inherently study-wide.
 */
export function SiteVisitScheduleTab({
  studyId,
  siteId,
  bundle,
  complianceBundle,
}: SiteVisitScheduleTabProps) {
  const [activeTab, setActiveTab] = useState<ScopeId>('by-visit');
  const [visitToolbar, setVisitToolbar] =
    useState<VisitWindowToolbarValue>(DEFAULT_TOOLBAR);
  const [subjectToolbar, setSubjectToolbar] =
    useState<VisitWindowToolbarValue>(DEFAULT_TOOLBAR);

  const overall = bundle.overall;
  const trends = complianceBundle?.trends;
  const alerts = complianceBundle?.alerts ?? [];
  const extras = complianceBundle?.extras;

  const subjectStatusOptions: ToolbarSelectOption[] = useMemo(() => {
    const set = new Set<string>();
    for (const row of bundle.bySubject) set.add(row.status);
    return Array.from(set)
      .sort()
      .map((s) => ({ value: s, label: s.replace(/_/g, ' ') }));
  }, [bundle.bySubject]);

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
        const haystack = [row.subject_number, row.status].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (subjectToolbar.status !== 'all' && row.status !== subjectToolbar.status) {
        return false;
      }
      if (!bucketHasCount(row, subjectToolbar.dueStatus)) return false;
      return true;
    });
  }, [bundle.bySubject, subjectToolbar]);

  const visitPagination = useClientPagination({
    totalItems: filteredVisits.length,
    initialPageSize: 10,
    resetKey: [visitToolbar.search, visitToolbar.dueStatus],
  });
  const visitPage = visitPagination.paginate(filteredVisits);

  const subjectPagination = useClientPagination({
    totalItems: filteredSubjects.length,
    initialPageSize: 10,
    resetKey: [subjectToolbar.search, subjectToolbar.status, subjectToolbar.dueStatus],
  });
  const subjectPage = subjectPagination.paginate(filteredSubjects);

  const handleKpiCardClick = useCallback(
    (id: KpiBucketId) => {
      const dueStatus = bucketToDueStatus(id);
      if (activeTab === 'by-visit') {
        setVisitToolbar((s) => ({ ...s, dueStatus }));
      } else {
        setSubjectToolbar((s) => ({ ...s, dueStatus }));
      }
    },
    [activeTab],
  );

  const activeBucket = useMemo<KpiBucketId | null>(() => {
    if (activeTab === 'by-visit') return dueStatusToBucket(visitToolbar.dueStatus);
    return dueStatusToBucket(subjectToolbar.dueStatus);
  }, [activeTab, visitToolbar.dueStatus, subjectToolbar.dueStatus]);

  const hrefForAlert = useCallback(
    (alert: { scope: string; scopeId?: string }): string | null => {
      if (alert.scope === 'subject' && alert.scopeId) {
        return `/protected/studies/${studyId}/subjects/${alert.scopeId}?tab=visits`;
      }
      return null;
    },
    [studyId],
  );

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
      key: 'last_activity',
      header: 'Last Visit Activity',
      headerSubtitle: 'Oldest overdue',
      className: 'min-w-[150px] text-xs',
      value: (row) =>
        extras?.subjects[row.subject_id]?.oldestOverdueDate ??
        row.last_actual_date ??
        null,
      render: (row) => {
        const e = extras?.subjects[row.subject_id];
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

  const visitEmpty = visitToolbar.search.trim()
    ? 'No visits match your search.'
    : 'No visits have been snapshotted onto subjects at this site yet.';
  const subjectEmpty = subjectToolbar.search.trim()
    ? 'No subjects match your search.'
    : 'No subjects enrolled at this site.';

  return (
    <div className="space-y-4">
      <VisitWindowPageHeader
        lastUpdatedAt={complianceBundle?.generatedAt ?? null}
        csvHref={`/api/studies/${studyId}/sites/${siteId}/visit-window-compliance/export`}
        pdfHref={`/api/studies/${studyId}/sites/${siteId}/visit-window-compliance/print`}
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
        tabsId={`vsc-${siteId}`}
      >
        <TabsList>
          <TabsTrigger value="by-visit">
            By Visit ({bundle.byVisit.length})
          </TabsTrigger>
          <TabsTrigger value="by-subject">
            By Subject ({bundle.bySubject.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-visit" className="space-y-3 pt-3">
          <VisitRollupTable
            variant="panel"
            description="Aggregated across every subject at this site."
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
