'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { useStudyHub } from '@/components/ctms/study-hub-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

import type {
  MonitoringVisitWithRelations,
  SiteStatus,
  StudySite,
  SubjectWithSite,
} from '@/lib/types/ctms';
import { SITE_STATUS_OPTIONS } from '@/lib/types/ctms';
import { getStudySites, createSite, updateSite } from '@/lib/actions/sites';
import { getStudyCountries } from '@/lib/actions/countries';
import { CopilotImportTrigger } from '@/components/copilot/tables/copilot-import-trigger';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { triggerCsvDownload } from '@/lib/utils/csv-download';
import {
  getSitesImportCsvTemplate,
  SITES_IMPORT_TEMPLATE_FILENAME,
} from '@/lib/data/sites-csv-templates';
import {
  BulkUploadDialog,
  type BulkUploadColumn,
  type ValidatedRow,
} from '@/components/bulk-upload/bulk-upload-dialog';
import { parseFlexibleDateToIso } from '@/lib/utils/parse-flexible-date';
import {
  buildStudyCountryLookup,
  resolveCountryFromInput,
} from '@/lib/utils/country-aliases';

import { enrichSitesWithMetrics } from '@/lib/sites/derive';
import { SitesPageHeader } from './sites-page-header';
import { SitesKpiStrip } from './sites-kpi-strip';
import { SitesFilterBar, type SiteIdFilter, type SiteStatusFilter } from './sites-filter-bar';
import { SitesTable } from './sites-table';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SITES_BULK_UPLOAD_COLUMNS: BulkUploadColumn[] = [
  { header: 'Site number', field: 'site_number', required: true, example: '001' },
  { header: 'Site name', field: 'name', required: true, example: 'Example Research Center' },
  { header: 'Country', field: 'study_country_id', example: 'US' },
  { header: 'Address', field: 'address', example: '100 Research Way' },
  { header: 'City', field: 'city', example: 'Boston' },
  { header: 'State / Province', field: 'state', example: 'MA' },
  { header: 'Postal code', field: 'postal_code', example: '02101' },
  { header: 'Status', field: 'status', example: 'identified' },
  { header: 'Activation date', field: 'activation_date', example: '2026-01-15' },
  { header: 'Target enrollment', field: 'target_enrollment', example: '100' },
];

interface SitesTabProps {
  studyId: string;
  initialSites: StudySite[];
  /** Live subject roster — drives the Enrolled / Target KPI and the at-risk staleness check. */
  subjects: SubjectWithSite[];
  /** Monitoring visits for this study — drives the at-risk overdue + staleness checks. */
  monitoringVisits: MonitoringVisitWithRelations[];
}

export function SitesTab({
  studyId,
  initialSites,
  subjects,
  monitoringVisits,
}: SitesTabProps) {
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const [sites, setSites] = useState(initialSites);
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState<SiteIdFilter>('all');
  const [statusFilter, setStatusFilter] = useState<SiteStatusFilter>('all');
  const [, startTransition] = useTransition();

  // Controlled-open state for the import dialogs so the page-header dropdown
  // can launch them while the dialogs themselves stay self-contained.
  const [copilotImportOpen, setCopilotImportOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  const enrichedSites = useMemo(
    () => enrichSitesWithMetrics(sites, subjects, monitoringVisits),
    [sites, subjects, monitoringVisits],
  );

  const sitesSortedForSelect = useMemo(
    () => [...sites].sort((a, b) => a.name.localeCompare(b.name)),
    [sites],
  );

  const filteredSites = useMemo(() => {
    let list =
      siteFilter === 'all' ? enrichedSites : enrichedSites.filter((s) => s.id === siteFilter);
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const location = [s.city, s.state].filter(Boolean).join(', ');
      return (
        s.site_number.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.pi_name?.toLowerCase().includes(q) ?? false) ||
        location.toLowerCase().includes(q)
      );
    });
  }, [enrichedSites, siteFilter, statusFilter, searchQuery]);

  const pagination = useClientPagination({
    totalItems: filteredSites.length,
    resetKey: [searchQuery, siteFilter, statusFilter],
  });
  const paginatedSites = pagination.paginate(filteredSites);

  const refreshSites = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getStudySites(studyId);
        setSites(data);
      } catch {
        toast.error('Failed to refresh site data');
      }
    });
  }, [studyId]);

  useEffect(() => {
    if (siteFilter !== 'all' && !sites.some((s) => s.id === siteFilter)) {
      setSiteFilter('all');
    }
  }, [sites, siteFilter]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSiteFilter('all');
    setStatusFilter('all');
  }, []);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) || siteFilter !== 'all' || statusFilter !== 'all';

  const handleDownloadTemplate = useCallback(() => {
    triggerCsvDownload(SITES_IMPORT_TEMPLATE_FILENAME, getSitesImportCsvTemplate());
  }, []);

  // KPI subtitle counts — derived from the same enriched list so the page
  // header and the strip can never disagree.
  const headerCounts = useMemo(() => {
    const activated = enrichedSites.filter(
      (s) => s.status === 'activated' || s.status === 'enrolling',
    ).length;
    const enrolled = enrichedSites.reduce((sum, s) => sum + s.enrolled, 0);
    const target = enrichedSites.reduce((sum, s) => sum + (s.target_enrollment || 0), 0);
    return { activated, enrolled, target };
  }, [enrichedSites]);

  // Bulk-write sites from a list of normalized row payloads (used by both
  // the Copilot import path AND the standard CSV uploader).
  const applySiteRows = useCallback(
    async (
      rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[],
    ): Promise<{ created: number; updated: number; failed: number }> => {
      if (rows.length === 0) {
        toast.message('No rows to import.');
        return { created: 0, updated: 0, failed: 0 };
      }

      const VALID_STATUSES = new Set<SiteStatus>(SITE_STATUS_OPTIONS.map((o) => o.value));
      const CHUNK_SIZE = 10;

      let countryLookup: Map<string, string> = new Map();
      try {
        const studyCountries = await getStudyCountries(studyId);
        countryLookup = buildStudyCountryLookup(studyCountries);
      } catch {
        countryLookup = new Map();
      }
      const resolveCountry = (raw: unknown): string | undefined => {
        if (raw == null) return undefined;
        const key = String(raw).trim();
        if (!key) return undefined;
        if (UUID_RE.test(key)) return key;
        return resolveCountryFromInput(key, countryLookup);
      };

      const sitesById = new Map(sites.map((s) => [s.id, s]));
      const sitesByNumber = new Map(
        sites.map((s) => [String(s.site_number).trim().toLowerCase(), s]),
      );

      const created: string[] = [];
      const updated: string[] = [];
      const failed: { row: number; reason: string }[] = [];

      const processRow = async (row: (typeof rows)[number]): Promise<void> => {
        const v = row.values as Record<string, unknown>;
        const siteNumber = String(v.site_number ?? '').trim();
        const name = String(v.name ?? '').trim();
        if (!siteNumber || !name) {
          failed.push({ row: row.rowIndex + 2, reason: 'Missing site number or name' });
          return;
        }
        const targetEnrollmentRaw = v.target_enrollment;
        const targetEnrollment =
          typeof targetEnrollmentRaw === 'number'
            ? targetEnrollmentRaw
            : Number.isFinite(Number(targetEnrollmentRaw))
              ? Number(targetEnrollmentRaw)
              : 0;
        const rawStatus = String(v.status ?? '').trim().toLowerCase();
        const status: SiteStatus = VALID_STATUSES.has(rawStatus as SiteStatus)
          ? (rawStatus as SiteStatus)
          : 'identified';
        const study_country_id = resolveCountry(v.study_country_id);
        if (
          v.study_country_id != null &&
          String(v.study_country_id).trim() &&
          !study_country_id
        ) {
          failed.push({
            row: row.rowIndex + 2,
            reason: `Country "${String(v.study_country_id).trim()}" isn't on this study yet`,
          });
          return;
        }

        const common = {
          site_number: siteNumber,
          name,
          study_country_id,
          address: (v.address as string | undefined) || undefined,
          city: (v.city as string | undefined) || undefined,
          state: (v.state as string | undefined) || undefined,
          postal_code: (v.postal_code as string | undefined) || undefined,
          pi_name: (v.pi_name as string | undefined) || undefined,
          pi_email: (v.pi_email as string | undefined) || undefined,
          status,
          activation_date: (v.activation_date as string | undefined) || undefined,
          target_enrollment: targetEnrollment,
        };

        if (row.op === 'update') {
          const matchId =
            (typeof v.id === 'string' && sitesById.get(v.id)?.id) ||
            sitesByNumber.get(siteNumber.toLowerCase())?.id;
          if (!matchId) {
            failed.push({ row: row.rowIndex + 2, reason: `No existing site for "${siteNumber}"` });
            return;
          }
          const result = await updateSite({ id: matchId, study_id: studyId, ...common });
          if (result.error) failed.push({ row: row.rowIndex + 2, reason: result.error });
          else updated.push(siteNumber);
          return;
        }

        const result = await createSite({
          study_id: studyId,
          pi_directory_contact_id: null,
          ...common,
        });
        if (result.error) failed.push({ row: row.rowIndex + 2, reason: result.error });
        else created.push(siteNumber);
      };

      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(processRow));
      }

      if (created.length) {
        toast.success(`${created.length} site${created.length === 1 ? '' : 's'} created`);
      }
      if (updated.length) {
        toast.success(`${updated.length} site${updated.length === 1 ? '' : 's'} updated`);
      }
      if (failed.length) {
        const sample = failed
          .slice(0, 3)
          .map((f) => `Row ${f.row}: ${f.reason}`)
          .join('\n');
        const more = failed.length > 3 ? `\n+${failed.length - 3} more` : '';
        toast.error(`${failed.length} row${failed.length === 1 ? '' : 's'} couldn\u2019t be saved`, {
          description: `${sample}${more}`,
        });
      }
      if (!created.length && !updated.length && !failed.length) {
        toast.message('No rows imported.');
      }
      refreshSites();
      return { created: created.length, updated: updated.length, failed: failed.length };
    },
    [studyId, sites, refreshSites],
  );

  const handleCopilotImport = useCallback(
    (rows: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]) =>
      applySiteRows(rows),
    [applySiteRows],
  );

  const validateSiteRows = useCallback(
    async (rawRows: Record<string, string>[]): Promise<ValidatedRow[]> => {
      const VALID_STATUSES = new Set<SiteStatus>(SITE_STATUS_OPTIONS.map((o) => o.value));

      let countryLookup: Map<string, string> = new Map();
      try {
        const studyCountries = await getStudyCountries(studyId);
        countryLookup = buildStudyCountryLookup(studyCountries);
      } catch {
        countryLookup = new Map();
      }
      const resolveCountry = (raw: string): { ok: true; id?: string } | { ok: false } => {
        const key = raw.trim();
        if (!key) return { ok: true };
        if (UUID_RE.test(key)) return { ok: true, id: key };
        const id = resolveCountryFromInput(key, countryLookup);
        return id ? { ok: true, id } : { ok: false };
      };

      const sitesByNumber = new Map(
        sites.map((s) => [String(s.site_number).trim().toLowerCase(), s]),
      );

      return rawRows.map((raw, rowIndex) => {
        const errors: string[] = [];
        const siteNumber = (raw['Site number'] ?? '').trim();
        const name = (raw['Site name'] ?? '').trim();
        if (!siteNumber) errors.push('Site number is required');
        if (!name) errors.push('Site name is required');

        const rawStatus = (raw['Status'] ?? '').trim();
        let status: SiteStatus = 'identified';
        if (rawStatus) {
          const normalized = rawStatus.toLowerCase();
          if (VALID_STATUSES.has(normalized as SiteStatus)) {
            status = normalized as SiteStatus;
          } else {
            errors.push(
              `Status "${rawStatus}" is not one of: ${SITE_STATUS_OPTIONS.map((o) => o.value).join(', ')}`,
            );
          }
        }

        const rawCountry = (raw['Country'] ?? '').trim();
        let study_country_id: string | undefined;
        if (rawCountry) {
          const resolved = resolveCountry(rawCountry);
          if (!resolved.ok) {
            errors.push(`Country "${rawCountry}" isn't on this study yet`);
          } else {
            study_country_id = resolved.id;
          }
        }

        const rawTarget = (raw['Target enrollment'] ?? '').trim();
        let target_enrollment = 0;
        if (rawTarget) {
          const n = Number(rawTarget);
          if (!Number.isFinite(n) || n < 0) {
            errors.push(`Target enrollment "${rawTarget}" must be a non-negative number`);
          } else {
            target_enrollment = n;
          }
        }

        const rawActivation = (raw['Activation date'] ?? '').trim();
        let activation_date: string | undefined;
        if (rawActivation) {
          const parsed = parseFlexibleDateToIso(rawActivation);
          if (!parsed) {
            errors.push(
              `Activation date "${rawActivation}" couldn\u2019t be parsed. Try YYYY-MM-DD or M/D/YYYY.`,
            );
          } else {
            activation_date = parsed;
          }
        }

        const op: 'insert' | 'update' = sitesByNumber.has(siteNumber.toLowerCase())
          ? 'update'
          : 'insert';

        const values: Record<string, unknown> = {
          site_number: siteNumber,
          name,
          study_country_id,
          address: (raw['Address'] ?? '').trim() || undefined,
          city: (raw['City'] ?? '').trim() || undefined,
          state: (raw['State / Province'] ?? '').trim() || undefined,
          postal_code: (raw['Postal code'] ?? '').trim() || undefined,
          status,
          activation_date,
          target_enrollment,
        };

        return { rowIndex, raw, values, op, errors };
      });
    },
    [sites, studyId],
  );

  const handleStandardCsvApply = useCallback(
    async (validRows: ValidatedRow[]) => {
      return applySiteRows(
        validRows.map((r) => ({ rowIndex: r.rowIndex, values: r.values, op: r.op })),
      );
    },
    [applySiteRows],
  );

  return (
    <div className="space-y-4">
      <SitesPageHeader
        studyId={studyId}
        activatedCount={headerCounts.activated}
        enrolled={headerCounts.enrolled}
        target={headerCounts.target}
        onOpenCopilotImport={() => setCopilotImportOpen(true)}
        onOpenCsvImport={() => setCsvImportOpen(true)}
        onDownloadTemplate={handleDownloadTemplate}
        readOnly={readOnly}
        disabledTooltip={STUDY_DEACTIVATED_TOOLTIP}
      />

      <SitesKpiStrip sites={enrichedSites} />

      <SitesFilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        siteFilter={siteFilter}
        onSiteFilterChange={setSiteFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sitesForSelect={sitesSortedForSelect}
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <SitesTable
        studyId={studyId}
        sites={paginatedSites}
        emptyTotalSites={sites.length === 0}
      />

      {sites.length > 0 ? (
        <TablePaginationFooter
          pagination={pagination}
          totalItems={filteredSites.length}
          itemNoun="site"
        />
      ) : null}

      {/* Controlled import dialogs — launched from the page-header Import menu. */}
      <CopilotImportTrigger
        tableId="ctms.site-activation"
        tableLabel="Sites"
        studyId={studyId}
        scope={{ kind: 'study', id: studyId }}
        downloadTemplateLabel="Download template"
        onDownloadTemplate={handleDownloadTemplate}
        duplicateKey="site_number"
        existingRows={sites.map((s) => ({
          id: s.id,
          values: {
            site_number: s.site_number,
            name: s.name,
            pi_email: s.pi_email,
          },
        }))}
        targetFields={[
          { path: 'site_number', label: 'Site number' },
          { path: 'name', label: 'Site name' },
          { path: 'study_country_id', label: 'Country' },
          { path: 'address', label: 'Address' },
          { path: 'city', label: 'City' },
          { path: 'state', label: 'State / Province' },
          { path: 'postal_code', label: 'Postal code' },
          { path: 'pi_name', label: 'PI name' },
          { path: 'pi_email', label: 'PI email' },
          { path: 'status', label: 'Status' },
          { path: 'activation_date', label: 'Activation date' },
          { path: 'target_enrollment', label: 'Target enrollment' },
        ]}
        onApplied={handleCopilotImport}
        controlledOpen={copilotImportOpen}
        onControlledOpenChange={setCopilotImportOpen}
      />
      <BulkUploadDialog
        tableLabel="Sites"
        templateColumns={SITES_BULK_UPLOAD_COLUMNS}
        templateFilename={SITES_IMPORT_TEMPLATE_FILENAME}
        getTemplateCsv={getSitesImportCsvTemplate}
        validateRows={validateSiteRows}
        onApply={handleStandardCsvApply}
        controlledOpen={csvImportOpen}
        onControlledOpenChange={setCsvImportOpen}
      />
    </div>
  );
}
