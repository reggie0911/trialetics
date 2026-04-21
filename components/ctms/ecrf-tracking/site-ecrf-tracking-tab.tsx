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
  SiteEcrfRollupBundle,
  SubjectEcrfRollupRow,
  VisitEcrfRollup,
} from '@/lib/types/ctms';

import { EcrfTrackingHeader } from './ecrf-tracking-header';
import {
  EcrfRollupTable,
  metricColumns,
  type EcrfRollupColumn,
} from './ecrf-rollup-table';

interface SiteEcrfTrackingTabProps {
  studyId: string;
  siteId: string;
  scopeLabel: string;
  bundle: SiteEcrfRollupBundle;
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
 * Site-scope eCRF Tracking tab. Read-only rollup composed of the shared header
 * (overall KPIs + export buttons) plus inner Tabs ("By Visit" / "By Subject")
 * with per-tab search + client-side pagination. Each subject row exposes an
 * "Open" button that drills into the existing editable per-subject matrix in
 * `SubjectEcrfTrackingPanel`.
 */
export function SiteEcrfTrackingTab({
  studyId,
  siteId,
  scopeLabel,
  bundle,
}: SiteEcrfTrackingTabProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'by-visit' | 'by-subject'>('by-visit');

  const [visitSearch, setVisitSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

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
      const haystack = [row.subject_number, row.status].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [bundle.bySubject, subjectSearch]);

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

  const visitEmpty = visitSearch.trim()
    ? 'No visits match your search.'
    : 'No visits have been snapshotted onto subjects at this site yet.';
  const subjectEmpty = subjectSearch.trim()
    ? 'No subjects match your search.'
    : 'No subjects enrolled at this site.';

  return (
    <div className="space-y-4">
      <EcrfTrackingHeader
        scopeLabel={scopeLabel}
        totals={bundle.totals}
        subjectCount={bundle.bySubject.length}
        lastTemplateSyncedAt={bundle.lastTemplateSyncedAt}
        csvHref={`/api/studies/${studyId}/sites/${siteId}/ecrf-tracking/export`}
        pdfHref={`/api/studies/${studyId}/sites/${siteId}/ecrf-tracking/print`}
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'by-visit' | 'by-subject')}
        tabsId={`ecrf-${siteId}`}
      >
        <TabsList>
          <TabsTrigger value="by-visit">
            By Visit ({bundle.byVisit.length})
          </TabsTrigger>
          <TabsTrigger value="by-subject">
            By Subject ({bundle.bySubject.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-visit" className="pt-3">
          <EcrfRollupTable
            variant="panel"
            description="Aggregated across every subject at this site."
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
