'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import type {
  StudyVisitScheduleBundle,
  VisitScheduleSiteRow,
  VisitScheduleSubjectRow,
  VisitScheduleVisitRow,
} from '@/lib/types/ctms';
import { formatPlanDate } from '@/lib/utils/visit-window';

import { VisitScheduleHeader } from './visit-schedule-header';
import {
  VisitRollupTable,
  bucketColumns,
  type VisitRollupColumn,
} from './visit-rollup-table';

interface StudyVisitScheduleTabProps {
  studyId: string;
  scopeLabel: string;
  bundle: StudyVisitScheduleBundle;
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

interface TabSearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
}

function TabSearchInput({ value, onChange, placeholder, ariaLabel }: TabSearchInputProps) {
  return (
    <div className="relative w-full sm:w-64">
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

/**
 * Study-scope Visit Schedule tab. Same composition as the site tab plus a
 * leading "By Site" rollup with drill-down into each site's own Visit
 * Schedule tab. The three rollup tables are nested in an inner Tabs strip
 * directly under the KPI header so only one is visible at a time, and each
 * tab body has its own search + client-side pagination.
 */
export function StudyVisitScheduleTab({
  studyId,
  scopeLabel,
  bundle,
}: StudyVisitScheduleTabProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'by-site' | 'by-visit' | 'by-subject'>(
    'by-site',
  );

  const [siteSearch, setSiteSearch] = useState('');
  const [visitSearch, setVisitSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

  const filteredSites = useMemo(() => {
    const q = siteSearch.trim().toLowerCase();
    if (!q) return bundle.bySite;
    return bundle.bySite.filter((row) => {
      const haystack = [row.site_number, row.site_name, row.country ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bundle.bySite, siteSearch]);

  const filteredVisits = useMemo(() => {
    const q = visitSearch.trim().toLowerCase();
    if (!q) return bundle.byVisit;
    return bundle.byVisit.filter((row) => {
      const haystack = [
        row.visit_name,
        row.timepoint_label ?? '',
        row.visit_number !== null && row.visit_number !== undefined
          ? String(row.visit_number)
          : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bundle.byVisit, visitSearch]);

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return bundle.bySubject;
    return bundle.bySubject.filter((row) => {
      const haystack = [
        row.subject_number,
        row.site_number ?? '',
        row.status,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [bundle.bySubject, subjectSearch]);

  const sitePagination = useClientPagination({
    totalItems: filteredSites.length,
    initialPageSize: 10,
    resetKey: [siteSearch],
  });
  const sitePage = sitePagination.paginate(filteredSites);

  const visitPagination = useClientPagination({
    totalItems: filteredVisits.length,
    initialPageSize: 10,
    resetKey: [visitSearch],
  });
  const visitPage = visitPagination.paginate(filteredVisits);

  const subjectPagination = useClientPagination({
    totalItems: filteredSubjects.length,
    initialPageSize: 10,
    resetKey: [subjectSearch],
  });
  const subjectPage = subjectPagination.paginate(filteredSubjects);

  const siteColumns: VisitRollupColumn<VisitScheduleSiteRow>[] = [
    {
      key: 'site_number',
      header: 'Site #',
      className: 'min-w-[140px] font-medium',
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
      className: 'text-center w-[90px]',
      value: (row) => row.subjectCount,
    },
    ...bucketColumns<VisitScheduleSiteRow>(),
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[110px]',
      value: () => null,
      render: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() =>
            router.push(
              `/protected/studies/${studyId}/sites/${row.site_id}?tab=visit-schedule`,
            )
          }
          aria-label={`Open site ${row.site_number}`}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open
        </Button>
      ),
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
      className: 'min-w-[140px] text-xs text-muted-foreground',
      value: (row) => renderTimepoint(row),
    },
    {
      key: 'subject_count',
      header: 'Subjects',
      headerTooltip: '# subjects with this visit on the schedule.',
      className: 'text-center w-[90px]',
      value: (row) => row.subjectCount,
    },
    ...bucketColumns<VisitScheduleVisitRow>(),
  ];

  const subjectColumns: VisitRollupColumn<VisitScheduleSubjectRow>[] = [
    {
      key: 'subject_number',
      header: 'Subject #',
      className: 'min-w-[140px] font-medium',
      value: (row) => row.subject_number,
    },
    {
      key: 'site_number',
      header: 'Site',
      className: 'w-[120px]',
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
      key: 'anchor',
      header: 'Anchor',
      headerTooltip:
        'Which subject date drives the schedule (Screening or Randomization) + the date itself.',
      className: 'min-w-[160px] text-xs',
      value: (row) =>
        `${row.visit_anchor_kind === 'screening' ? 'Scrn' : 'Rand'} · ${formatPlanDate(row.anchor_date)}`,
    },
    {
      key: 'last_actual',
      header: 'Last actual',
      headerTooltip: 'Most recent actual_date across this subject\u2019s visits.',
      className: 'w-[120px] text-xs text-muted-foreground',
      value: (row) => formatPlanDate(row.last_actual_date),
    },
    ...bucketColumns<VisitScheduleSubjectRow>(),
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[110px]',
      value: () => null,
      render: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() =>
            router.push(
              `/protected/studies/${studyId}/subjects/${row.subject_id}?tab=visits`,
            )
          }
          aria-label={`Open subject ${row.subject_number}`}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Open
        </Button>
      ),
    },
  ];

  const siteEmpty = siteSearch.trim()
    ? 'No sites match your search.'
    : 'No sites yet.';
  const visitEmpty = visitSearch.trim()
    ? 'No visits match your search.'
    : 'No visits have been snapshotted onto subjects yet.';
  const subjectEmpty = subjectSearch.trim()
    ? 'No subjects match your search.'
    : 'No subjects enrolled in this study.';

  return (
    <div className="space-y-4">
      <VisitScheduleHeader
        scopeLabel={scopeLabel}
        overall={bundle.overall}
        subjectCount={bundle.subjectCount}
        lastActualDate={bundle.lastActualDate}
        csvHref={`/api/studies/${studyId}/visit-schedule/export`}
        pdfHref={`/api/studies/${studyId}/visit-schedule/print`}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as 'by-site' | 'by-visit' | 'by-subject')
        }
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

        <TabsContent value="by-site" className="pt-3">
          <VisitRollupTable
            variant="panel"
            description="One row per site, summed across that site's subjects."
            toolbar={
              <TabSearchInput
                value={siteSearch}
                onChange={setSiteSearch}
                placeholder="Search sites..."
                ariaLabel="Search By Site rows"
              />
            }
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
        </TabsContent>

        <TabsContent value="by-visit" className="pt-3">
          <VisitRollupTable
            variant="panel"
            description="One row per visit, summed across every site in the study."
            toolbar={
              <TabSearchInput
                value={visitSearch}
                onChange={setVisitSearch}
                placeholder="Search visits..."
                ariaLabel="Search By Visit rows"
              />
            }
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
        </TabsContent>

        <TabsContent value="by-subject" className="pt-3">
          <VisitRollupTable
            variant="panel"
            toolbar={
              <TabSearchInput
                value={subjectSearch}
                onChange={setSubjectSearch}
                placeholder="Search subjects..."
                ariaLabel="Search By Subject rows"
              />
            }
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
