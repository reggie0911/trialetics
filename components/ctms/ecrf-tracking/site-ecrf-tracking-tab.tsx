'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Search } from 'lucide-react';

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
import {
  SUBJECT_STATUS_OPTIONS,
  type SiteEcrfRollupBundle,
  type SubjectEcrfRollupRow,
  type SubjectStatus,
  type VisitEcrfRollup,
} from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

import { EcrfTrackingHeader } from './ecrf-tracking-header';
import {
  EcrfRollupTable,
  metricColumns,
  type EcrfRollupColumn,
} from './ecrf-rollup-table';

interface SiteEcrfTrackingTabProps {
  studyId: string;
  siteId: string;
  bundle: SiteEcrfRollupBundle;
}

interface TabSearchInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
  id?: string;
}

function TabSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  id,
}: TabSearchInputProps) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
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
 * with per-tab filters + client-side pagination. Each subject row exposes an
 * "Open" button that drills into the existing editable per-subject matrix in
 * `SubjectEcrfTrackingPanel`.
 */
export function SiteEcrfTrackingTab({
  studyId,
  siteId,
  bundle,
}: SiteEcrfTrackingTabProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'by-visit' | 'by-subject'>('by-visit');

  const [visitSearch, setVisitSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectStatusFilter, setSubjectStatusFilter] = useState<
    'all' | SubjectStatus
  >('all');

  const filteredVisits = useMemo(() => {
    const q = visitSearch.trim().toLowerCase();
    if (!q) return bundle.byVisit;
    return bundle.byVisit.filter((row) =>
      row.visit_name.toLowerCase().includes(q),
    );
  }, [bundle.byVisit, visitSearch]);

  const filteredSubjects = useMemo(() => {
    let rows = bundle.bySubject;
    if (subjectStatusFilter !== 'all') {
      rows = rows.filter((r) => r.status === subjectStatusFilter);
    }
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      row.subject_number.toLowerCase().includes(q),
    );
  }, [bundle.bySubject, subjectSearch, subjectStatusFilter]);

  const visitPagination = useClientPagination({
    totalItems: filteredVisits.length,
    initialPageSize: 10,
    resetKey: [visitSearch],
  });
  const visitPage = visitPagination.paginate(filteredVisits);

  const subjectPagination = useClientPagination({
    totalItems: filteredSubjects.length,
    initialPageSize: 10,
    resetKey: [subjectSearch, subjectStatusFilter],
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

  const subjectHasActiveFilters =
    Boolean(subjectSearch.trim()) || subjectStatusFilter !== 'all';
  const subjectEmpty =
    bundle.bySubject.length === 0
      ? 'No subjects enrolled at this site.'
      : 'No subjects match your filters.';

  const subjectNumberFilterId = `ecrf-site-by-subject-number-${siteId}`;
  const subjectStatusFilterId = `ecrf-site-by-subject-status-${siteId}`;

  const clearSubjectTableFilters = () => {
    setSubjectSearch('');
    setSubjectStatusFilter('all');
  };

  return (
    <div className="space-y-4">
      <EcrfTrackingHeader
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
              <div className="min-w-0 w-full max-w-full overflow-x-auto">
                <div className="flex w-max min-w-0 max-w-full flex-nowrap items-end gap-2 pb-0.5">
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Label
                      htmlFor={subjectNumberFilterId}
                      className="whitespace-nowrap text-xs text-muted-foreground"
                    >
                      Subject
                    </Label>
                    <TabSearchInput
                      id={subjectNumberFilterId}
                      value={subjectSearch}
                      onChange={setSubjectSearch}
                      placeholder="Filter by subject #..."
                      ariaLabel="Filter by subject number"
                      className="min-w-[10rem] max-w-sm w-[12rem] shrink-0 sm:min-w-[12rem] sm:max-w-md sm:w-64"
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Label
                      htmlFor={subjectStatusFilterId}
                      className="whitespace-nowrap text-xs text-muted-foreground"
                    >
                      Status
                    </Label>
                    <Select
                      value={subjectStatusFilter}
                      onValueChange={(v) =>
                        setSubjectStatusFilter(v as 'all' | SubjectStatus)
                      }
                    >
                      <SelectTrigger
                        id={subjectStatusFilterId}
                        className="h-9 w-[180px] text-xs"
                        aria-label="Filter by status"
                      >
                        <SelectValue
                          getDisplayLabel={(v) => {
                            if (v == null || v === 'all')
                              return 'All statuses';
                            return (
                              SUBJECT_STATUS_OPTIONS.find((o) => o.value === v)
                                ?.label ?? v
                            );
                          }}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {SUBJECT_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
              </div>
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
