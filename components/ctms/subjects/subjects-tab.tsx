'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useStudyHub } from '@/components/ctms/study-hub-context';
import {
  BulkUploadDialog,
  type BulkUploadColumn,
  type ValidatedRow,
} from '@/components/bulk-upload/bulk-upload-dialog';
import { CopilotImportTrigger } from '@/components/copilot/tables/copilot-import-trigger';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import {
  createSubject,
  deactivateSubject,
  deleteSubject,
  getEnrollmentFunnel,
  getEnrollmentFunnelForSite,
  getStudySubjects,
} from '@/lib/actions/subjects';
import {
  getSubjectsImportCsvTemplate,
  SUBJECTS_IMPORT_TEMPLATE_FILENAME,
} from '@/lib/data/subjects-csv-templates';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { enrichSubjectRow } from '@/lib/subjects/derive';
import type {
  EnrollmentFunnelData,
  StudyCountryWithSubmissions,
  StudySite,
  SubjectStatus,
  SubjectWithSite,
} from '@/lib/types/ctms';
import { SUBJECT_STATUS_OPTIONS } from '@/lib/types/ctms';
import { triggerCsvDownload } from '@/lib/utils/csv-download';
import { parseFlexibleDateToIso } from '@/lib/utils/parse-flexible-date';

import {
  SubjectsFilterBar,
  type SubjectCountryFilter,
  type SubjectSiteFilter,
  type SubjectStatusFilter,
} from './subjects-filter-bar';
import { SubjectsKpiStrip } from './subjects-kpi-strip';
import { SubjectsPageHeader } from './subjects-page-header';
import { SubjectsTable } from './subjects-table';

const SUBJECTS_BULK_UPLOAD_COLUMNS: BulkUploadColumn[] = [
  { header: 'Subject number', field: 'subject_number', required: true, example: 'S-001' },
  { header: 'Site number', field: 'site_id', required: true, example: '001' },
  { header: 'Status', field: 'status', example: 'pre_screening' },
  { header: 'Screening number', field: 'screening_number', example: 'SCR-001' },
  { header: 'Randomization number', field: 'randomization_number', example: '' },
  { header: 'Screening date', field: 'screening_date', example: '2026-01-20' },
  { header: 'Randomization date', field: 'randomization_date', example: '' },
];

interface SubjectsTabProps {
  studyId: string;
  initialSubjects: SubjectWithSite[];
  initialFunnel: EnrollmentFunnelData;
  /** Study country rows; used to resolve `country_name` per site via `study_country_id`. */
  countries: StudyCountryWithSubmissions[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name' | 'study_country_id'>[];
  /** When set, list and funnel are scoped to this clinical site. */
  siteScopeId?: string;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export function SubjectsTab({
  studyId,
  initialSubjects,
  initialFunnel,
  countries,
  sites,
  siteScopeId,
  createOpen,
  onCreateOpenChange,
}: SubjectsTabProps) {
  const router = useRouter();
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const disabledTooltip = readOnly ? STUDY_DEACTIVATED_TOOLTIP : undefined;

  const [subjects, setSubjects] = useState(initialSubjects);
  const [funnel, setFunnel] = useState(initialFunnel);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubjectStatusFilter>('all');
  const [countryFilter, setCountryFilter] = useState<SubjectCountryFilter>('all');
  const [siteFilter, setSiteFilter] = useState<SubjectSiteFilter>('all');
  const [, startTransition] = useTransition();

  // Controlled-open state for the import dialogs so the page-header dropdown
  // can launch them while the dialogs themselves stay self-contained.
  const [copilotImportOpen, setCopilotImportOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  const refreshData = useCallback(() => {
    startTransition(async () => {
      try {
        const [subs, funnelData] = siteScopeId
          ? await Promise.all([
              getStudySubjects(studyId, { siteId: siteScopeId }),
              getEnrollmentFunnelForSite(siteScopeId),
            ])
          : await Promise.all([
              getStudySubjects(studyId),
              getEnrollmentFunnel(studyId),
            ]);
        setSubjects(subs);
        setFunnel(funnelData);
        router.refresh();
      } catch {
        toast.error('Failed to refresh subject data');
      }
    });
  }, [studyId, siteScopeId, router]);

  const enrichedSubjects = useMemo(
    () => subjects.map(enrichSubjectRow),
    [subjects],
  );

  const sitesForSelect = useMemo(
    () => [...sites].sort((a, b) => a.name.localeCompare(b.name)),
    [sites],
  );

  const countriesForSelect = useMemo(
    () =>
      [...countries].sort((a, b) =>
        a.country_name.localeCompare(b.country_name, undefined, { sensitivity: 'base' }),
      ),
    [countries],
  );

  const countryNameBySiteId = useMemo(() => {
    if (siteScopeId) {
      return new Map<string, string>();
    }
    const nameByCountryId = new Map(countries.map((c) => [c.id, c.country_name] as const));
    const m = new Map<string, string>();
    for (const s of sites) {
      m.set(
        s.id,
        s.study_country_id
          ? (nameByCountryId.get(s.study_country_id) ?? '\u2014')
          : '\u2014',
      );
    }
    return m;
  }, [siteScopeId, countries, sites]);

  const filteredSubjects = useMemo(() => {
    let result = enrichedSubjects;

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (!siteScopeId && countryFilter !== 'all') {
      const siteIdsInCountry = new Set(
        sites.filter((s) => s.study_country_id === countryFilter).map((s) => s.id),
      );
      result = result.filter((s) => siteIdsInCountry.has(s.site_id));
    }

    if (!siteScopeId && siteFilter !== 'all') {
      result = result.filter((s) => s.site_id === siteFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.subject_number.toLowerCase().includes(q) ||
          (s.screening_number?.toLowerCase().includes(q) ?? false) ||
          (s.randomization_number?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [
    enrichedSubjects,
    searchQuery,
    statusFilter,
    countryFilter,
    siteFilter,
    siteScopeId,
    sites,
  ]);

  const pagination = useClientPagination({
    totalItems: filteredSubjects.length,
    resetKey: [searchQuery, statusFilter, countryFilter, siteFilter, siteScopeId],
  });
  const paginatedSubjects = pagination.paginate(filteredSubjects);

  // Reset siteFilter if the selected site is no longer in the list.
  useEffect(() => {
    if (siteFilter !== 'all' && !sites.some((s) => s.id === siteFilter)) {
      setSiteFilter('all');
    }
  }, [sites, siteFilter]);

  // Reset countryFilter if the id is no longer in the study (e.g. after refresh).
  useEffect(() => {
    if (countryFilter !== 'all' && !countries.some((c) => c.id === countryFilter)) {
      setCountryFilter('all');
    }
  }, [countries, countryFilter]);

  // If the site filter no longer matches the selected country, clear site to "all".
  useEffect(() => {
    if (siteScopeId || countryFilter === 'all' || siteFilter === 'all') return;
    const site = sites.find((s) => s.id === siteFilter);
    if (site?.study_country_id !== countryFilter) {
      setSiteFilter('all');
    }
  }, [countryFilter, siteFilter, siteScopeId, sites]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setCountryFilter('all');
    setSiteFilter('all');
  }, []);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    statusFilter !== 'all' ||
    (!siteScopeId && countryFilter !== 'all') ||
    (!siteScopeId && siteFilter !== 'all');

  const handleDownloadTemplate = useCallback(() => {
    triggerCsvDownload(
      SUBJECTS_IMPORT_TEMPLATE_FILENAME,
      getSubjectsImportCsvTemplate(),
    );
  }, []);

  // Bulk-create subjects from a list of normalized row payloads.
  // Used by both the Copilot import path AND the standard CSV uploader.
  const applySubjectRows = useCallback(
    async (
      rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[],
    ): Promise<{ created: number; updated: number; failed: number }> => {
      if (rows.length === 0) {
        toast.message('No rows to import.');
        return { created: 0, updated: 0, failed: 0 };
      }
      const CHUNK_SIZE = 10;
      const created: string[] = [];
      const failed: { row: number; reason: string }[] = [];

      const processRow = async (row: (typeof rows)[number]): Promise<void> => {
        if (row.op !== 'insert') return;
        const v = row.values as Record<string, unknown>;

        const rawSite = v.site_id;
        const targetSiteId = (() => {
          if (typeof rawSite !== 'string' || !rawSite) {
            return siteScopeId ?? '';
          }
          if (sites.some((s) => s.id === rawSite)) return rawSite;
          const byNumber = sites.find(
            (s) => s.site_number.toLowerCase() === rawSite.toLowerCase(),
          );
          if (byNumber) return byNumber.id;
          const byName = sites.find(
            (s) => s.name.toLowerCase() === rawSite.toLowerCase(),
          );
          if (byName) return byName.id;
          return '';
        })();

        if (!targetSiteId) {
          failed.push({
            row: row.rowIndex + 2,
            reason: `Site "${String(rawSite ?? '')}" not found on this study`,
          });
          return;
        }

        const status = (typeof v.status === 'string' && v.status
          ? v.status
          : 'pre_screening') as SubjectStatus;

        const subjectNumber = String(v.subject_number ?? '').trim();
        if (!subjectNumber) {
          failed.push({ row: row.rowIndex + 2, reason: 'Subject number is required' });
          return;
        }

        const { error } = await createSubject({
          study_id: studyId,
          site_id: targetSiteId,
          subject_number: subjectNumber,
          screening_number: (v.screening_number as string | undefined) || undefined,
          randomization_number: (v.randomization_number as string | undefined) || undefined,
          status,
          screening_date: (v.screening_date as string | undefined) || undefined,
          randomization_date: (v.randomization_date as string | undefined) || undefined,
        });
        if (error) failed.push({ row: row.rowIndex + 2, reason: error });
        else created.push(subjectNumber);
      };

      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(processRow));
      }

      if (created.length) {
        toast.success(
          `${created.length} subject${created.length === 1 ? '' : 's'} enrolled`,
        );
      }
      if (failed.length) {
        const sample = failed
          .slice(0, 3)
          .map((f) => `Row ${f.row}: ${f.reason}`)
          .join('\n');
        const more = failed.length > 3 ? `\n+${failed.length - 3} more` : '';
        toast.error(
          `${failed.length} row${failed.length === 1 ? '' : 's'} couldn\u2019t be enrolled`,
          { description: `${sample}${more}` },
        );
      }
      if (!created.length && !failed.length) {
        toast.message('No rows imported.');
      }
      refreshData();
      return { created: created.length, updated: 0, failed: failed.length };
    },
    [studyId, sites, siteScopeId, refreshData],
  );

  const handleCopilotImport = useCallback(
    (rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]) =>
      applySubjectRows(rows),
    [applySubjectRows],
  );

  const validateSubjectRows = useCallback(
    async (rawRows: Record<string, string>[]): Promise<ValidatedRow[]> => {
      const VALID_STATUSES = new Set<SubjectStatus>(
        SUBJECT_STATUS_OPTIONS.map((o) => o.value),
      );

      const sitesByNumber = new Map(
        sites.map((s) => [String(s.site_number).trim().toLowerCase(), s]),
      );
      const sitesByName = new Map(sites.map((s) => [s.name.trim().toLowerCase(), s]));

      const seenSubjectNumbers = new Set(
        subjects.map((s) => s.subject_number.trim().toLowerCase()),
      );

      return rawRows.map((raw, rowIndex) => {
        const errors: string[] = [];

        const subjectNumber = (raw['Subject number'] ?? '').trim();
        if (!subjectNumber) {
          errors.push('Subject number is required');
        } else if (seenSubjectNumbers.has(subjectNumber.toLowerCase())) {
          errors.push(`Subject number "${subjectNumber}" already exists`);
        }

        const rawSite = (raw['Site number'] ?? '').trim();
        let siteId: string | undefined;
        if (!rawSite) {
          if (siteScopeId) siteId = siteScopeId;
          else errors.push('Site number is required');
        } else {
          const match =
            sitesByNumber.get(rawSite.toLowerCase()) ??
            sitesByName.get(rawSite.toLowerCase());
          if (match) siteId = match.id;
          else errors.push(`Site "${rawSite}" not found on this study`);
        }

        const rawStatus = (raw['Status'] ?? '').trim().toLowerCase();
        let status: SubjectStatus = 'pre_screening';
        if (rawStatus) {
          if (VALID_STATUSES.has(rawStatus as SubjectStatus)) {
            status = rawStatus as SubjectStatus;
          } else {
            errors.push(
              `Status "${rawStatus}" is not one of: ${SUBJECT_STATUS_OPTIONS.map((o) => o.value).join(', ')}`,
            );
          }
        }

        const checkDate = (label: string, value: string): string | undefined => {
          if (!value) return undefined;
          const parsed = parseFlexibleDateToIso(value);
          if (!parsed) {
            errors.push(
              `${label} "${value}" couldn\u2019t be parsed. Try YYYY-MM-DD or M/D/YYYY.`,
            );
            return undefined;
          }
          return parsed;
        };
        const screening_date = checkDate(
          'Screening date',
          (raw['Screening date'] ?? '').trim(),
        );
        const randomization_date = checkDate(
          'Randomization date',
          (raw['Randomization date'] ?? '').trim(),
        );

        const values: Record<string, unknown> = {
          subject_number: subjectNumber,
          site_id: siteId ?? rawSite,
          status,
          screening_number: (raw['Screening number'] ?? '').trim() || undefined,
          randomization_number: (raw['Randomization number'] ?? '').trim() || undefined,
          screening_date,
          randomization_date,
        };

        return { rowIndex, raw, values, op: 'insert' as const, errors };
      });
    },
    [sites, siteScopeId, subjects],
  );

  const handleStandardCsvApply = useCallback(
    async (validRows: ValidatedRow[]) => {
      return applySubjectRows(
        validRows.map((r) => ({ rowIndex: r.rowIndex, values: r.values, op: r.op })),
      );
    },
    [applySubjectRows],
  );

  const handleDeactivate = useCallback(
    async (id: string, subjectSiteId: string | null) => {
      const { error } = await deactivateSubject(id, studyId, null);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Subject deactivated');
      refreshData();
    },
    [studyId, refreshData],
  );

  const handleDelete = useCallback(
    async (id: string, subjectSiteId: string | null) => {
      const { error } = await deleteSubject(
        id,
        studyId,
        siteScopeId ?? subjectSiteId ?? undefined,
      );
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Subject deleted');
      refreshData();
    },
    [studyId, siteScopeId, refreshData],
  );

  return (
    <div className="space-y-4">
      <SubjectsPageHeader
        studyId={studyId}
        sites={sites}
        siteScopeId={siteScopeId}
        createOpen={createOpen}
        onCreateOpenChange={onCreateOpenChange}
        defaultSiteIdWhenCreate={siteScopeId}
        lockSiteSelection={Boolean(siteScopeId)}
        onCreateSuccess={refreshData}
        onOpenCopilotImport={() => setCopilotImportOpen(true)}
        onOpenCsvImport={() => setCsvImportOpen(true)}
        onDownloadTemplate={handleDownloadTemplate}
        readOnly={readOnly}
        disabledTooltip={disabledTooltip}
      />

      <SubjectsKpiStrip funnel={funnel} subjects={subjects} />

      <SubjectsFilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        countriesForSelect={countriesForSelect}
        siteFilter={siteFilter}
        onSiteFilterChange={setSiteFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sitesForSelect={sitesForSelect}
        hideSiteFilter={Boolean(siteScopeId)}
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <SubjectsTable
        studyId={studyId}
        subjects={paginatedSubjects}
        countryNameBySiteId={countryNameBySiteId}
        hideSiteColumn={Boolean(siteScopeId)}
        emptyTotalSubjects={subjects.length === 0}
        hasActiveFilters={hasActiveFilters}
        readOnly={readOnly}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
      />

      {subjects.length > 0 ? (
        <TablePaginationFooter
          pagination={pagination}
          totalItems={filteredSubjects.length}
          itemNoun="subject"
        />
      ) : null}

      {/* Controlled import dialogs — launched from the page-header Import menu. */}
      <CopilotImportTrigger
        tableId="ctms.subject"
        tableLabel="Subjects"
        studyId={studyId}
        scope={{ kind: 'study', id: studyId }}
        downloadTemplateLabel="Download template"
        onDownloadTemplate={handleDownloadTemplate}
        duplicateKey="subject_number"
        existingRows={subjects.map((s) => ({
          id: s.id,
          values: {
            subject_number: s.subject_number,
            screening_number: s.screening_number,
            randomization_number: s.randomization_number,
          },
        }))}
        targetFields={[
          { path: 'subject_number', label: 'Subject number' },
          { path: 'site_id', label: 'Site' },
          { path: 'screening_number', label: 'Screening number' },
          { path: 'randomization_number', label: 'Randomization number' },
          { path: 'status', label: 'Status' },
          { path: 'screening_date', label: 'Screening date' },
          { path: 'randomization_date', label: 'Randomization date' },
        ]}
        onApplied={handleCopilotImport}
        controlledOpen={copilotImportOpen}
        onControlledOpenChange={setCopilotImportOpen}
      />
      <BulkUploadDialog
        tableLabel="Subjects"
        templateColumns={SUBJECTS_BULK_UPLOAD_COLUMNS}
        templateFilename={SUBJECTS_IMPORT_TEMPLATE_FILENAME}
        getTemplateCsv={getSubjectsImportCsvTemplate}
        validateRows={validateSubjectRows}
        onApply={handleStandardCsvApply}
        controlledOpen={csvImportOpen}
        onControlledOpenChange={setCsvImportOpen}
      />
    </div>
  );
}
