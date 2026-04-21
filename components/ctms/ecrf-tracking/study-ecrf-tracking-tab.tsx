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
  SiteEcrfRollup,
  StudyEcrfRollupBundle,
  SubjectEcrfRollupRow,
  VisitEcrfRollup,
} from '@/lib/types/ctms';

import { EcrfTrackingHeader } from './ecrf-tracking-header';
import {
  EcrfRollupTable,
  metricColumns,
  type EcrfRollupColumn,
} from './ecrf-rollup-table';

interface StudyEcrfTrackingTabProps {
  studyId: string;
  scopeLabel: string;
  bundle: StudyEcrfRollupBundle;
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
 * Study-scope eCRF Tracking tab. Same composition as the site tab plus a
 * leading "By Site" rollup with drill-down into each site's own eCRF Tracking
 * tab. The three rollup tables are nested in an inner Tabs strip directly
 * under the KPI header so only one is visible at a time, and each tab body
 * has its own search + client-side pagination.
 */
export function StudyEcrfTrackingTab({
  studyId,
  scopeLabel,
  bundle,
}: StudyEcrfTrackingTabProps) {
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
    return bundle.byVisit.filter((row) =>
      row.visit_name.toLowerCase().includes(q),
    );
  }, [bundle.byVisit, visitSearch]);

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return bundle.bySubject;
    return bundle.bySubject.filter((row) => {
      const haystack = [row.subject_number, row.site_number ?? '', row.status]
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

  const siteColumns: EcrfRollupColumn<SiteEcrfRollup>[] = [
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
    ...metricColumns<SiteEcrfRollup>(),
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
              `/protected/studies/${studyId}/sites/${row.site_id}?tab=ecrf-tracking`,
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

  const visitColumns: EcrfRollupColumn<VisitEcrfRollup>[] = [
    {
      key: 'visit_name',
      header: 'Visit',
      className: 'min-w-[160px]',
      value: (row) => row.visit_name,
    },
    {
      key: 'subject_count',
      header: 'Subjects',
      className: 'text-center w-[90px]',
      value: (row) => row.subjectCount,
    },
    {
      key: 'expected',
      header: 'Expected',
      headerTooltip: 'Expected data points (sum across CRFs in this visit).',
      className: 'text-center w-[90px]',
      value: (row) => row.dataExpectedTotal,
    },
    ...metricColumns<VisitEcrfRollup>(),
  ];

  const subjectColumns: EcrfRollupColumn<SubjectEcrfRollupRow>[] = [
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
    ...metricColumns<SubjectEcrfRollupRow>(),
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
            router.push(`/protected/studies/${studyId}/subjects/${row.subject_id}`)
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
      <EcrfTrackingHeader
        scopeLabel={scopeLabel}
        totals={bundle.totals}
        subjectCount={bundle.bySubject.length}
        lastTemplateSyncedAt={bundle.lastTemplateSyncedAt}
        csvHref={`/api/studies/${studyId}/ecrf-tracking/export`}
        pdfHref={`/api/studies/${studyId}/ecrf-tracking/print`}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as 'by-site' | 'by-visit' | 'by-subject')
        }
        tabsId={`ecrf-${studyId}`}
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
          <EcrfRollupTable
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
          <EcrfRollupTable
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
          <EcrfRollupTable
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
