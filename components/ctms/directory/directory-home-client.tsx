'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  FileDown,
  Filter,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  createDirectoryContact,
  listAllDirectoryContactsForStudy,
} from '@/lib/actions/directory-contacts';
import {
  listInstitutions,
  listAllInstitutionsForExport,
  createInstitution as createInstitutionAction,
} from '@/lib/actions/directory-institutions';
import { importDirectoryContactsFromCsv, importInstitutionsFromCsv } from '@/lib/actions/directory-csv';
import type {
  DirectoryContactListItem,
  DirectoryContactsSnapshot,
} from '@/lib/types/directory';
import type { InstitutionOrganizationType, InstitutionRow } from '@/lib/types/directory';
import { INSTITUTION_TYPE_OPTIONS } from '@/lib/types/directory';
import { cn } from '@/lib/utils';
import { DirectoryContactsKpiRow, type KpiPreset } from '@/components/ctms/directory/directory-contacts-kpi-row';
import { DirectoryGroupedContactsTable } from '@/components/ctms/directory/directory-grouped-contacts-table';
import { DirectoryFlatContactsTable } from '@/components/ctms/directory/directory-flat-contacts-table';
import { directoryContactFormSchema, institutionFormSchema } from '@/lib/validation/directory';
import {
  QuickContactFormFields,
  type QuickContactCatalogCategory,
} from '@/components/ctms/directory/quick-contact-form-fields';
import { DirectoryCountryRegionFields } from '@/components/ctms/directory/directory-country-region-fields';
import {
  PlacesAddressAutocomplete,
  type ParsedPlace,
} from '@/components/ui/places-address-autocomplete';
import {
  DIRECTORY_CONTACTS_EXPORT_FILENAME,
  DIRECTORY_CONTACTS_TEMPLATE_FILENAME,
  DIRECTORY_ORGANIZATIONS_EXPORT_FILENAME,
  DIRECTORY_ORGANIZATIONS_TEMPLATE_FILENAME,
  getDirectoryContactsCsvTemplate,
  getDirectoryInstitutionsCsvTemplate,
} from '@/lib/data/directory-csv-templates';
import {
  getDirectoryContactsDisplayExportCsv,
  getDirectoryOrganizationsDisplayExportCsv,
} from '@/lib/data/directory-display-export';
import { OrganizationsKpiRow, type OrgKpiPreset } from '@/components/ctms/directory/organizations/organizations-kpi-row';
import { GroupedOrganizationsTable } from '@/components/ctms/directory/organizations/grouped-organizations-table';
import { DirectoryFlatOrganizationsTable } from '@/components/ctms/directory/organizations/directory-flat-organizations-table';
import {
  type DirectoryOrganizationSnapshot,
  EMPTY_ORGANIZATION_SNAPSHOT,
} from '@/lib/directory/live-directory-types';
import { ORG_TYPE_GROUP_LABEL } from '@/lib/directory/organization-display';
import { triggerCsvDownload } from '@/lib/utils/csv-download';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { ContactRoleFilterChip } from '@/components/ctms/directory/directory-contacts-filter-chips';
import {
  OrganizationCountryFilterChip,
  type OrgCountryOption,
  OrganizationRecordStatusFilterChip,
  OrganizationTypeFilterChip,
} from '@/components/ctms/directory/organizations/directory-organizations-filter-chips';
import { getName } from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import * as isoCountries from 'i18n-iso-countries';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';
import { buildContactDirectorySiteGroups } from '@/lib/directory/contact-directory-site-groups';
import {
  getContactCompleteness,
  getOrganizationCompleteness,
  summarizeContactCompleteness,
} from '@/lib/directory/record-completeness';

isoCountries.registerLocale(en);

function formatIsoCountryLabel(code: string): string {
  return getName(code, 'en') ?? code;
}

const DIRECTORY_DEFAULT_PAGE_SIZE = 25;
const INSTITUTION_OPTIONS_PAGE_SIZE = 500;

const EMPTY_CONTACTS_SNAPSHOT: DirectoryContactsSnapshot = {
  totalContacts: 0,
  totalContactsDeltaWeek: null,
  formCompleteness: {
    total: 0,
    complete: 0,
    percent: 0,
    missingTitle: 0,
    missingRole: 0,
    missingOrganization: 0,
    missingEmail: 0,
    missingPhone: 0,
    missingContactInfo: 0,
  },
  sitesCovered: { covered: 0, total: 0, percent: 0 },
  missingRoles: 0,
  unassignedToSite: 0,
  recentlyActive7d: 0,
  needsAttention: {
    missingRoleCount: 0,
    sitesMissingKeyRoles: 0,
  },
  roleCoverageBySite: [],
  smartSuggestionFilters: [],
};
const EMPTY_STUDY_CONTACTS: DirectoryContactListItem[] = [];

/** KPI row only when server snapshot failed but we still have contacts to show. */
function buildMinimalDirectoryContactsSnapshot(
  contacts: DirectoryContactListItem[]
): DirectoryContactsSnapshot {
  const formCompleteness = summarizeContactCompleteness(contacts);
  return {
    totalContacts: contacts.length,
    totalContactsDeltaWeek: null,
    formCompleteness,
    sitesCovered: { covered: 0, total: 0, percent: 0 },
    missingRoles: formCompleteness.missingRole,
    unassignedToSite: 0,
    recentlyActive7d: 0,
    needsAttention: {
      missingRoleCount: formCompleteness.missingRole,
      sitesMissingKeyRoles: 0,
    },
    roleCoverageBySite: [],
    smartSuggestionFilters: [],
  };
}

type CatalogCat = QuickContactCatalogCategory;

type CompletenessFilter = 'all' | 'needs-completion';

interface DirectoryHomeClientProps {
  companyId: string;
  canEdit: boolean;
  canImportCsv: boolean;
  catalog: CatalogCat[];
  /** From `getDirectoryRoleCatalog().error` when the catalog query failed. */
  catalogError?: string | null;
  initialInstitutions: InstitutionRow[];
  institutionTotal: number;
  initialInstitutionOptions: InstitutionRow[];
  /** Originating study id, used so detail pages can return to this Directory tab. */
  studyId?: string;
  /** Pre-fetched study-scoped KPI / right-rail snapshot. */
  initialSnapshot?: DirectoryContactsSnapshot | null;
  /** When `getDirectoryContactsSnapshot` fails; surfaced on KPI row if there is no contact list to derive from. */
  contactsSnapshotError?: string | null;
  /** Pre-fetched contacts already enriched with study site info for grouping. */
  studyContactsEnriched?: DirectoryContactListItem[];
  initialOrganizationSnapshot?: DirectoryOrganizationSnapshot | null;
}

export function DirectoryHomeClient({
  companyId,
  canEdit,
  canImportCsv,
  catalog,
  catalogError = null,
  initialInstitutions,
  institutionTotal,
  initialInstitutionOptions,
  studyId,
  initialSnapshot,
  contactsSnapshotError = null,
  studyContactsEnriched,
  initialOrganizationSnapshot,
}: DirectoryHomeClientProps) {
  const router = useRouter();
  const fromQuery = studyId ? `?from=${studyId}` : '';
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState('contacts');
  const [exportBusy, setExportBusy] = useState(false);

  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [iTotal, setITotal] = useState(institutionTotal);
  const [iSearch, setISearch] = useState('');
  const [iQuery, setIQuery] = useState('');
  const [iRefresh, setIRefresh] = useState(0);
  const iSkipInitialLoad = useRef(true);

  const [institutionOptions, setInstitutionOptions] = useState<InstitutionRow[]>(initialInstitutionOptions);

  const studyContacts: DirectoryContactListItem[] = studyContactsEnriched ?? EMPTY_STUDY_CONTACTS;

  const contactsSnapshot = useMemo(() => {
    if (initialSnapshot) return initialSnapshot;
    if (studyContacts.length > 0) return buildMinimalDirectoryContactsSnapshot(studyContacts);
    return EMPTY_CONTACTS_SNAPSHOT;
  }, [initialSnapshot, studyContacts]);

  const contactsKpiRowError =
    contactsSnapshotError && studyContacts.length === 0 ? contactsSnapshotError : null;
  const organizationSnapshot = initialOrganizationSnapshot ?? EMPTY_ORGANIZATION_SNAPSHOT;

  const displayedInstitutions: InstitutionRow[] = institutions;

  const [activePreset, setActivePreset] = useState<KpiPreset | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactRoleFilter, setContactRoleFilter] = useState<'all' | string>('all');
  const [contactCompletenessFilter, setContactCompletenessFilter] = useState<CompletenessFilter>('all');
  const [contactCountryFilter, setContactCountryFilter] = useState<'all' | string>('all');
  const [contactsView, setContactsView] = useState<'by-site' | 'all'>('all');
  const [organizationsView, setOrganizationsView] = useState<'by-type' | 'all'>('all');
  const [orgCompletenessFilter, setOrgCompletenessFilter] = useState<CompletenessFilter>('all');

  const contactRoleOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of studyContacts) {
      const pr = c.primary_role;
      if (!pr?.name?.trim()) continue;
      const key = pr.id ?? `name:${pr.name.trim().toLowerCase()}`;
      if (!map.has(key)) map.set(key, pr.name);
    }
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [studyContacts]);

  const contactCountryFilterOptions = useMemo((): OrgCountryOption[] => {
    const codes = new Set<string>();
    for (const c of studyContacts) {
      const code = c.country_code?.trim();
      if (code) codes.add(code.toUpperCase());
    }
    return Array.from(codes)
      .sort((a, b) => a.localeCompare(b))
      .map((code) => ({
        code,
        label: `${code} · ${formatIsoCountryLabel(code)}`,
      }));
  }, [studyContacts]);

  const filteredStudyContacts = useMemo(() => {
    let rows = studyContacts;
    if (statusFilter !== 'all') {
      rows = rows.filter((c) => c.status === statusFilter);
    }
    if (activePreset?.kind === 'missingRole') {
      rows = rows.filter((c) => getContactCompleteness(c).missingFields.includes('role'));
    } else if (activePreset?.kind === 'missingTitle') {
      rows = rows.filter((c) => getContactCompleteness(c).missingFields.includes('title'));
    } else if (activePreset?.kind === 'missingInfo') {
      rows = rows.filter((c) => {
        const missing = getContactCompleteness(c).missingFields;
        return missing.includes('email') || missing.includes('phone');
      });
    } else if (activePreset?.kind === 'complete') {
      rows = rows.filter((c) => getContactCompleteness(c).complete);
    }
    const q = contactsSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        [c.first_name, c.last_name, c.email, c.primary_role?.name, c.primary_institution?.name]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q))
      );
    }
    if (contactRoleFilter !== 'all') {
      rows = rows.filter((c) => {
        const pr = c.primary_role;
        if (!pr?.name?.trim()) return false;
        const key = pr.id ?? `name:${pr.name.trim().toLowerCase()}`;
        return key === contactRoleFilter;
      });
    }
    if (contactCompletenessFilter === 'needs-completion') {
      rows = rows.filter((c) => !getContactCompleteness(c).complete);
    }
    if (contactCountryFilter !== 'all') {
      const target = contactCountryFilter.toUpperCase();
      rows = rows.filter((c) => (c.country_code ?? '').trim().toUpperCase() === target);
    }
    rows = [...rows].sort((a, b) => {
      const aName = `${a.last_name} ${a.first_name}`.trim();
      const bName = `${b.last_name} ${b.first_name}`.trim();
      return aName.localeCompare(bName);
    });
    return rows;
  }, [
    studyContacts,
    statusFilter,
    activePreset,
    contactsSearch,
    contactRoleFilter,
    contactCompletenessFilter,
    contactCountryFilter,
  ]);

  const contactSiteGroupCount = useMemo(
    () => buildContactDirectorySiteGroups(filteredStudyContacts).length,
    [filteredStudyContacts]
  );

  const contactsEmptyCopy = useMemo(() => {
    if (studyContacts.length === 0) {
      return {
        title: 'Add your first contact.',
        description: 'Create a study directory contact with title, role, organization, and contact information.',
      };
    }
    if (filteredStudyContacts.length === 0) {
      return {
        title: 'No contacts match the current filters.',
        description: 'Clear filters or adjust search to see contacts linked to this study.',
      };
    }
    return { title: '', description: '' };
  }, [studyContacts.length, filteredStudyContacts.length]);

  const studyContactPagination = useClientPagination({
    totalItems: filteredStudyContacts.length,
    initialPageSize: DIRECTORY_DEFAULT_PAGE_SIZE,
    resetKey: [
      contactsView,
      statusFilter,
      activePreset?.kind,
      contactsSearch,
      contactRoleFilter,
      contactCompletenessFilter,
      contactCountryFilter,
    ],
  });

  const paginatedStudyContacts = studyContactPagination.paginate(filteredStudyContacts);

  const handleKpiPreset = useCallback((p: KpiPreset) => {
    setActivePreset((prev) => (prev?.kind === p.kind ? null : p));
  }, []);

  const clearAllFilters = useCallback(() => {
    setActivePreset(null);
    setStatusFilter('all');
    setContactsSearch('');
    setContactRoleFilter('all');
    setContactCompletenessFilter('all');
    setContactCountryFilter('all');
  }, []);

  const hasActiveFilters =
    activePreset !== null ||
    statusFilter !== 'all' ||
    contactsSearch.trim().length > 0 ||
    contactRoleFilter !== 'all' ||
    contactCompletenessFilter !== 'all' ||
    contactCountryFilter !== 'all';

  const [contactOpen, setContactOpen] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvKind, setCsvKind] = useState<'contacts' | 'institutions'>('contacts');
  const [csvText, setCsvText] = useState('');
  const [csvFileLabel, setCsvFileLabel] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [orgTypeFilter, setOrgTypeFilter] = useState<'all' | InstitutionOrganizationType>('all');
  const [orgRecordStatusFilter, setOrgRecordStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all'
  );
  const [orgCountryFilter, setOrgCountryFilter] = useState<'all' | string>('all');

  const handleOrgKpiPreset = useCallback((preset: OrgKpiPreset) => {
    if (preset.kind === 'complete') {
      setOrgCompletenessFilter('all');
      return;
    }
    if (preset.kind === 'missingAddress') {
      setOrgCompletenessFilter('needs-completion');
      setOrgCountryFilter('all');
      return;
    }
    if (preset.kind === 'missingLocation') {
      setOrgCompletenessFilter('needs-completion');
      return;
    }
    setOrgTypeFilter('all');
    setOrgRecordStatusFilter('all');
    setOrgCountryFilter('all');
    setOrgCompletenessFilter('all');
  }, []);

  const orgFilterLabel = useMemo(() => {
    if (orgCompletenessFilter === 'needs-completion') return 'Needs completion';
    return null;
  }, [orgCompletenessFilter]);

  const orgTypeFilterOptions = useMemo(() => {
    const types = new Set<InstitutionOrganizationType>();
    for (const r of displayedInstitutions) {
      types.add(r.organization_type);
    }
    return Array.from(types)
      .sort((a, b) => a.localeCompare(b))
      .map((t) => ({
        value: t,
        label: ORG_TYPE_GROUP_LABEL[t]?.singular ?? t,
      }));
  }, [displayedInstitutions]);

  const orgCountryFilterOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const r of displayedInstitutions) {
      const c = r.country_code?.trim();
      if (c) codes.add(c.toUpperCase());
    }
    return Array.from(codes)
      .sort((a, b) => a.localeCompare(b))
      .map((code) => ({
        code,
        label: `${code} · ${formatIsoCountryLabel(code)}`,
      }));
  }, [displayedInstitutions]);

  const orgToolbarFilterSummary = useMemo(() => {
    const parts: string[] = [];
    if (orgTypeFilter !== 'all') {
      parts.push(`Type: ${ORG_TYPE_GROUP_LABEL[orgTypeFilter]?.singular ?? orgTypeFilter}`);
    }
    if (orgRecordStatusFilter !== 'all') {
      parts.push(`Status: ${orgRecordStatusFilter === 'active' ? 'Active' : 'Inactive'}`);
    }
    if (orgCountryFilter !== 'all') {
      parts.push(`Country: ${formatIsoCountryLabel(orgCountryFilter)} (${orgCountryFilter})`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }, [orgTypeFilter, orgRecordStatusFilter, orgCountryFilter]);

  const filteredOrgInstitutions = useMemo(() => {
    let rows = displayedInstitutions;
    if (orgTypeFilter !== 'all') {
      rows = rows.filter((r) => r.organization_type === orgTypeFilter);
    }
    if (orgRecordStatusFilter !== 'all') {
      rows = rows.filter((r) => r.status === orgRecordStatusFilter);
    }
    if (orgCountryFilter !== 'all') {
      const target = orgCountryFilter.toUpperCase();
      rows = rows.filter((r) => (r.country_code ?? '').trim().toUpperCase() === target);
    }
    if (orgCompletenessFilter === 'needs-completion') {
      rows = rows.filter((r) => !getOrganizationCompleteness(r).complete);
    }
    rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [
    displayedInstitutions,
    orgCountryFilter,
    orgCompletenessFilter,
    orgRecordStatusFilter,
    orgTypeFilter,
  ]);

  const filteredOrganizationTypeCount = useMemo(
    () => new Set(filteredOrgInstitutions.map((institution) => institution.organization_type)).size,
    [filteredOrgInstitutions]
  );

  const flatOrgPagination = useClientPagination({
    totalItems: filteredOrgInstitutions.length,
    initialPageSize: DIRECTORY_DEFAULT_PAGE_SIZE,
    resetKey: [
      organizationsView,
      orgTypeFilter,
      orgRecordStatusFilter,
      orgCountryFilter,
      orgCompletenessFilter,
      iQuery,
      institutions.length,
      displayedInstitutions.length,
    ],
  });

  const paginatedFlatOrgInstitutions = flatOrgPagination.paginate(filteredOrgInstitutions);

  const handleExportOrgs = useCallback(async () => {
    setExportBusy(true);
    try {
      const { data, error } = await listAllInstitutionsForExport();
      if (error) {
        toast.error(error);
        return;
      }
      const csv = getDirectoryOrganizationsDisplayExportCsv(data);
      triggerCsvDownload(DIRECTORY_ORGANIZATIONS_EXPORT_FILENAME, csv);
      toast.success(`Exported ${data.length} organizations`);
    } finally {
      setExportBusy(false);
    }
  }, []);

  const handleExportContacts = useCallback(async () => {
    if (!studyId) {
      toast.error('Study context is required to export contacts.');
      return;
    }
    setExportBusy(true);
    try {
      const { data, error } = await listAllDirectoryContactsForStudy(studyId);
      if (error) {
        toast.error(error);
        return;
      }
      const csv = getDirectoryContactsDisplayExportCsv(data);
      triggerCsvDownload(DIRECTORY_CONTACTS_EXPORT_FILENAME, csv);
      toast.success(`Exported ${data.length} contacts`);
    } finally {
      setExportBusy(false);
    }
  }, [studyId]);

  const institutionPag = useClientPagination({
    totalItems: iTotal,
    initialPageSize: DIRECTORY_DEFAULT_PAGE_SIZE,
  });

  const iPage = institutionPag.currentPage;
  const iSize = institutionPag.pageSize;

  const goInstPage1 = institutionPag.goToPage;

  useEffect(() => {
    setInstitutions(initialInstitutions);
    setITotal(institutionTotal);
    goInstPage1(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInstitutions, institutionTotal]);

  useEffect(() => {
    setInstitutionOptions(initialInstitutionOptions);
  }, [initialInstitutionOptions]);

  useEffect(() => {
    if (csvOpen) {
      setCsvText('');
      setCsvFileLabel('');
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  }, [csvOpen]);

  const resyncInstitutionOptions = useCallback(() => {
    startTransition(async () => {
      const r = await listInstitutions({ limit: INSTITUTION_OPTIONS_PAGE_SIZE, offset: 0 });
      if (!r.error) setInstitutionOptions(r.data);
    });
  }, []);

  const applyInstitutionSearch = useCallback(() => {
    setIQuery(iSearch.trim());
    goInstPage1(1);
    setIRefresh((n) => n + 1);
  }, [iSearch, goInstPage1]);

  const clearOrgFilters = useCallback(() => {
    setOrgTypeFilter('all');
    setOrgRecordStatusFilter('all');
    setOrgCountryFilter('all');
    setOrgCompletenessFilter('all');
    setISearch('');
    setIQuery('');
    goInstPage1(1);
    setIRefresh((n) => n + 1);
  }, [goInstPage1]);

  const hasActiveOrgToolbarFilters = useMemo(
    () =>
      orgTypeFilter !== 'all' ||
      orgRecordStatusFilter !== 'all' ||
      orgCountryFilter !== 'all' ||
      orgCompletenessFilter !== 'all' ||
      iSearch.trim().length > 0 ||
      iQuery.trim().length > 0,
    [
      orgTypeFilter,
      orgRecordStatusFilter,
      orgCountryFilter,
      orgCompletenessFilter,
      iSearch,
      iQuery,
    ]
  );

  useEffect(() => {
    if (iSkipInitialLoad.current) {
      iSkipInitialLoad.current = false;
      return;
    }
    const run = async () => {
      const r = await listInstitutions({
        search: iQuery || undefined,
        limit: iSize,
        offset: (iPage - 1) * iSize,
      });
      if (!r.error) {
        setInstitutions(r.data);
        setITotal(r.count);
      }
    };
    startTransition(() => {
      void run();
    });
  }, [iQuery, iPage, iSize, iRefresh, startTransition]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Study Directory</h1>
          <p className="text-sm text-muted-foreground">
            Contacts, organizations, roles, and form completeness for this study.
          </p>
        </div>
        <div className="shrink-0 self-start md:self-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="text-xs h-8 gap-1.5">
                More
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {canImportCsv ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      setCsvKind('contacts');
                      setCsvOpen(true);
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    Import contacts CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setCsvKind('institutions');
                      setCsvOpen(true);
                    }}
                  >
                    <Upload className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    Import organizations CSV
                  </DropdownMenuItem>
                </>
              ) : null}
              {tab === 'contacts' ? (
                <DropdownMenuItem
                  onClick={() => {
                    void handleExportContacts();
                  }}
                  disabled={exportBusy || !studyId || contactsSnapshot.totalContacts === 0}
                >
                  <FileDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  Export contacts CSV
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    void handleExportOrgs();
                  }}
                  disabled={exportBusy || iTotal === 0}
                >
                  <FileDown className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  Export organizations CSV
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs tabsId="directory-home" value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="contacts" className="text-xs">
            Contacts
          </TabsTrigger>
          <TabsTrigger value="institutions" className="text-xs">
            Organizations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="min-w-0 space-y-3">
              <DirectoryContactsKpiRow
                snapshot={contactsSnapshot}
                error={contactsKpiRowError}
                onPreset={handleKpiPreset}
              />

              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 text-xs h-9"
                    placeholder="Search by name, email, or role..."
                    value={contactsSearch}
                    onChange={(e) => setContactsSearch(e.target.value)}
                  />
                </div>
                <ContactRoleFilterChip
                  value={contactRoleFilter}
                  onChange={setContactRoleFilter}
                  options={contactRoleOptions}
                />
                <CompletenessFilterChip value={contactCompletenessFilter} onChange={setContactCompletenessFilter} />
                <StatusFilterChip value={statusFilter} onChange={setStatusFilter} />
                <OrganizationCountryFilterChip
                  value={contactCountryFilter}
                  onChange={setContactCountryFilter}
                  options={contactCountryFilterOptions}
                />
                {hasActiveFilters && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-9 text-sky-600 dark:text-sky-400 px-1"
                    onClick={clearAllFilters}
                  >
                    Clear all
                  </Button>
                )}
                <span className="hidden sm:block h-6 w-px shrink-0 bg-border mx-0.5" aria-hidden />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">
                  Layout
                </span>
                <div
                  className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 shadow-sm"
                  role="group"
                  aria-label="Contacts layout"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={contactsView === 'all'}
                    className={cn(
                      'h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      contactsView === 'all'
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70'
                        : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                    )}
                    onClick={() => setContactsView('all')}
                  >
                    <span>All Contacts</span>
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {filteredStudyContacts.length}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={contactsView === 'by-site'}
                    aria-label={`By site: ${contactSiteGroupCount} site group${contactSiteGroupCount === 1 ? '' : 's'} in the current list`}
                    className={cn(
                      'h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      contactsView === 'by-site'
                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70'
                        : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                    )}
                    onClick={() => setContactsView('by-site')}
                  >
                    <span>By Site</span>
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {contactSiteGroupCount}
                    </span>
                  </Button>
                </div>
                {canEdit ? (
                  <Button type="button" size="sm" className="text-xs h-9 shrink-0" onClick={() => setContactOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add contact
                  </Button>
                ) : null}
              </div>

              {contactsView === 'by-site' ? (
                <>
                  <DirectoryGroupedContactsTable
                    contacts={filteredStudyContacts}
                    fromQuery={fromQuery}
                    emptyMessage={contactsEmptyCopy.title || 'No contacts in this list.'}
                    emptyDescription={contactsEmptyCopy.description}
                  />
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>
                      Showing {filteredStudyContacts.length} of {contactsSnapshot.totalContacts} contacts
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <DirectoryFlatContactsTable
                    contacts={paginatedStudyContacts}
                    fromQuery={fromQuery}
                    emptyMessage={contactsEmptyCopy.title || 'No contacts in this list.'}
                    emptyDescription={contactsEmptyCopy.description}
                  />
                  <div className="px-1 pt-2">
                    <TablePaginationFooter
                      pagination={studyContactPagination}
                      totalItems={filteredStudyContacts.length}
                      itemNoun="contact"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="institutions" className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-3 min-w-0">
              <OrganizationsKpiRow snapshot={organizationSnapshot.kpi} onPreset={handleOrgKpiPreset} />

              <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                <div className="relative flex-1 min-w-[12rem] max-w-xl sm:w-[min(100%,36rem)] sm:shrink-0">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 text-xs h-9 w-full"
                    placeholder="Search organization name…"
                    value={iSearch}
                    onChange={(e) => setISearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyInstitutionSearch();
                    }}
                  />
                </div>
                {displayedInstitutions.length > 0 ? (
                  <>
                    <OrganizationTypeFilterChip
                      value={orgTypeFilter}
                      onChange={setOrgTypeFilter}
                      options={orgTypeFilterOptions}
                    />
                    <CompletenessFilterChip value={orgCompletenessFilter} onChange={setOrgCompletenessFilter} />
                    <OrganizationRecordStatusFilterChip
                      value={orgRecordStatusFilter}
                      onChange={setOrgRecordStatusFilter}
                    />
                    <OrganizationCountryFilterChip
                      value={orgCountryFilter}
                      onChange={setOrgCountryFilter}
                      options={orgCountryFilterOptions}
                    />
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      disabled={!hasActiveOrgToolbarFilters}
                      className="text-xs h-9 px-1 text-sky-600 dark:text-sky-400 disabled:pointer-events-none disabled:opacity-40"
                      onClick={clearOrgFilters}
                    >
                      Clear all
                    </Button>
                    <span className="hidden sm:block h-6 w-px shrink-0 bg-border mx-0.5" aria-hidden />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground shrink-0">
                      Layout
                    </span>
                    <div
                      className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 shadow-sm"
                      role="group"
                      aria-label="Organizations layout"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-pressed={organizationsView === 'all'}
                        className={cn(
                          'h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                          organizationsView === 'all'
                            ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70'
                            : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                        )}
                        onClick={() => setOrganizationsView('all')}
                      >
                        <span>All organizations</span>
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {filteredOrgInstitutions.length}
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-pressed={organizationsView === 'by-type'}
                        className={cn(
                          'h-8 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                          organizationsView === 'by-type'
                            ? 'bg-background text-foreground shadow-sm ring-1 ring-border/70'
                            : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                        )}
                        onClick={() => setOrganizationsView('by-type')}
                      >
                        <span>By type</span>
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {filteredOrganizationTypeCount}
                        </span>
                      </Button>
                    </div>
                    {canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        className="text-xs h-9 shrink-0"
                        onClick={() => setInstOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add organization
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>

              {displayedInstitutions.length > 0 && (orgToolbarFilterSummary || orgFilterLabel) ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                  <span className="text-muted-foreground shrink-0">Filtered by:</span>
                  {orgToolbarFilterSummary ? (
                    <span className="text-muted-foreground">{orgToolbarFilterSummary}</span>
                  ) : null}
                  {orgToolbarFilterSummary && orgFilterLabel ? (
                    <span className="text-muted-foreground" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {orgFilterLabel ? (
                    <Badge
                      variant="secondary"
                      className="text-[10px] py-0 px-1.5 bg-sky-100 text-sky-700 border-0 dark:bg-sky-500/15 dark:text-sky-300"
                    >
                      {orgFilterLabel}
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-[11px] text-sky-600 dark:text-sky-400"
                    onClick={clearOrgFilters}
                  >
                    Clear
                  </Button>
                </div>
              ) : null}

              {displayedInstitutions.length === 0 ? (
                <DirectoryEmptyState
                  title="Add your first organization."
                  description="Create an organization record with type, status, address, country, and region."
                  action={
                    canEdit ? (
                      <Button type="button" size="sm" className="text-xs h-8" onClick={() => setInstOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add organization
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <>
                  {organizationsView === 'by-type' ? (
                    <>
                      <GroupedOrganizationsTable
                        institutions={filteredOrgInstitutions}
                        fromQuery={fromQuery}
                        rowsPerGroup={4}
                      />
                      <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>
                          Showing {filteredOrgInstitutions.length} organization
                          {filteredOrgInstitutions.length !== 1 ? 's' : ''}
                          {institutions.length > 0 && iTotal > 0
                            ? ` (${iTotal} total in directory)`
                            : null}
                        </span>
                      </div>
                      <div className="px-1">
                        <TablePaginationFooter
                          totalItems={institutions.length > 0 ? iTotal : displayedInstitutions.length}
                          pagination={institutionPag}
                          itemNoun="organization"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <DirectoryFlatOrganizationsTable
                        institutions={paginatedFlatOrgInstitutions}
                        fromQuery={fromQuery}
                        emptyMessage={
                          orgTypeFilter !== 'all' ||
                          orgRecordStatusFilter !== 'all' ||
                          orgCountryFilter !== 'all' ||
                          orgCompletenessFilter !== 'all' ||
                          orgFilterLabel
                            ? 'No organizations match the current filters.'
                            : 'No organizations in this list.'
                        }
                      />
                      <div className="px-1 pt-2">
                        <TablePaginationFooter
                          pagination={flatOrgPagination}
                          totalItems={filteredOrgInstitutions.length}
                          itemNoun="organization"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

      </Tabs>

      <QuickContactDialog
        companyId={companyId}
        open={contactOpen}
        onOpenChange={setContactOpen}
        studyId={studyId}
        catalog={catalog}
        catalogError={catalogError}
        institutions={institutionOptions}
        onCreated={(id) => {
          setContactOpen(false);
          resyncInstitutionOptions();
          router.push(`/protected/directory/contacts/${id}${fromQuery}`);
          router.refresh();
        }}
      />
      <QuickInstitutionDialog
        open={instOpen}
        onOpenChange={setInstOpen}
        institutions={institutionOptions}
        onCreated={(id) => {
          setInstOpen(false);
          resyncInstitutionOptions();
          router.push(`/protected/directory/institutions/${id}${fromQuery}`);
          router.refresh();
        }}
      />

      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="sm:max-w-xl gap-0 p-0 overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle className="text-base">
                Import {csvKind === 'contacts' ? 'contacts' : 'organizations'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Upload a UTF-8 CSV with a header row. Use{' '}
                <span className="font-medium text-foreground">Download template</span> for the exact columns and a sample
                row.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4">
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              aria-label="Upload CSV file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  setCsvText(text);
                  setCsvFileLabel(file.name);
                } catch {
                  toast.error('Could not read file');
                }
                e.target.value = '';
              }}
            />

            <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 px-6 py-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border shadow-xs">
                <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Choose a CSV file</p>
                <p className="text-xs text-muted-foreground">.csv files only</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="text-xs"
                  onClick={() => csvFileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Browse files
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    triggerCsvDownload(
                      csvKind === 'contacts'
                        ? DIRECTORY_CONTACTS_TEMPLATE_FILENAME
                        : DIRECTORY_ORGANIZATIONS_TEMPLATE_FILENAME,
                      csvKind === 'contacts'
                        ? getDirectoryContactsCsvTemplate()
                        : getDirectoryInstitutionsCsvTemplate()
                    )
                  }
                >
                  <FileDown className="h-3.5 w-3.5 mr-1.5" />
                  Download template
                </Button>
              </div>
            </div>

            {csvFileLabel ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate" title={csvFileLabel}>
                    {csvFileLabel}
                  </p>
                  <p className="text-muted-foreground">Ready to import</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs shrink-0 h-8"
                  onClick={() => {
                    setCsvText('');
                    setCsvFileLabel('');
                    if (csvFileInputRef.current) csvFileInputRef.current.value = '';
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground">No file selected yet.</p>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/15 px-6 py-4 sm:justify-end gap-2">
            <Button type="button" variant="outline" className="text-xs" onClick={() => setCsvOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="text-xs"
              disabled={!csvText.trim()}
              onClick={async () => {
                if (!csvText.trim()) {
                  toast.error('Choose a CSV file first');
                  return;
                }
                const fn =
                  csvKind === 'contacts' ? importDirectoryContactsFromCsv : importInstitutionsFromCsv;
                const res = await fn(csvText);
                if (res.errors.length) toast.error(res.errors.slice(0, 3).join('; '));
                else toast.success(`Imported ${res.imported} rows`);
                if (res.skipped && res.errors.length === 0) toast.message(`${res.skipped} rows skipped`);
                setCsvOpen(false);
                setCsvText('');
                setCsvFileLabel('');
                if (csvKind === 'institutions') resyncInstitutionOptions();
                router.refresh();
              }}
            >
              Run import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusFilterChip({
  value,
  onChange,
}: {
  value: 'all' | 'active' | 'inactive';
  onChange: (v: 'all' | 'active' | 'inactive') => void;
}) {
  const active = value !== 'all';
  const labelText = value === 'all' ? 'Status' : value === 'active' ? 'Status: Active' : 'Status: Inactive';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal',
            active && 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          {labelText}
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem onClick={() => onChange('all')}>All</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('active')}>Active</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('inactive')}>Inactive</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CompletenessFilterChip({
  value,
  onChange,
}: {
  value: CompletenessFilter;
  onChange: (v: CompletenessFilter) => void;
}) {
  const active = value !== 'all';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'text-xs h-9 font-normal',
            active &&
              'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30 dark:text-sky-300'
          )}
        >
          {active ? 'Needs completion' : 'Completeness'}
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => onChange('all')}>All records</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChange('needs-completion')}>Needs completion</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickContactDialog({
  companyId,
  open,
  onOpenChange,
  studyId,
  catalog,
  catalogError = null,
  institutions,
  onCreated,
}: {
  companyId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  studyId?: string;
  catalog: CatalogCat[];
  catalogError?: string | null;
  institutions: InstitutionRow[];
  onCreated: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [contactCountryCode, setContactCountryCode] = useState('');
  const [contactRegion, setContactRegion] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAvatarUrl, setContactAvatarUrl] = useState('');

  const submit = async (form: FormData) => {
    const raw = {
      first_name: String(form.get('first_name') ?? ''),
      last_name: String(form.get('last_name') ?? ''),
      title: String(form.get('title') ?? '') || undefined,
      email: String(form.get('email') ?? '') || undefined,
      avatar_url: String(form.get('avatar_url') ?? '').trim() || undefined,
      phone: String(form.get('phone') ?? '') || undefined,
      department: String(form.get('department') ?? '') || undefined,
      country_code: contactCountryCode || undefined,
      region: contactRegion || undefined,
      status: (form.get('status') as string) === 'inactive' ? 'inactive' : 'active',
      notes: String(form.get('notes') ?? '') || undefined,
    };
    const parsed = directoryContactFormSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Invalid form');
      return;
    }
    setPending(true);
    const res = await createDirectoryContact(parsed.data, { studyId });
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.duplicateEmailWarning) toast.message('Another contact shares this email — please verify.');
    if (res.data) {
      const displayName = [parsed.data.first_name, parsed.data.last_name].filter(Boolean).join(' ').trim();
      if (res.data.linkWarnings.length > 0) {
        toast.warning(`Contact created, but ${res.data.linkWarnings.join('; ')}`);
      } else if (studyId && res.data.linkedStudy) {
        toast.success(displayName ? `Contact created and linked to this study: ${displayName}` : 'Contact created and linked to this study');
      } else {
        toast.success(displayName ? `Contact created: ${displayName}` : 'Contact created');
      }
      onCreated(res.data.id);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setContactCountryCode('');
          setContactRegion('');
          setContactPhone('');
          setContactAvatarUrl('');
        }
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto [&_[data-slot=dialog-close]]:text-sky-500 [&_[data-slot=dialog-close]]:hover:text-sky-600">
        <DialogHeader>
          <DialogTitle className="text-sky-500">New contact</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await submit(new FormData(e.currentTarget));
          }}
        >
          <QuickContactFormFields
            catalog={catalog}
            catalogError={catalogError}
            institutions={institutions}
            contactCountryCode={contactCountryCode}
            contactRegion={contactRegion}
            onContactCountryChange={setContactCountryCode}
            onContactRegionChange={setContactRegion}
            phone={contactPhone}
            onPhoneChange={setContactPhone}
            companyId={companyId}
            avatarUrl={contactAvatarUrl}
            onAvatarUrlChange={setContactAvatarUrl}
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickInstitutionDialog({
  open,
  onOpenChange,
  institutions,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  institutions: InstitutionRow[];
  onCreated: (id: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [instAddressLine1, setInstAddressLine1] = useState('');
  const [instCity, setInstCity] = useState('');
  const [instPostalCode, setInstPostalCode] = useState('');
  const [instStateRegion, setInstStateRegion] = useState('');
  const [instCountryCode, setInstCountryCode] = useState('');
  const [instRegion, setInstRegion] = useState('');

  const onNewInstitutionAddressPlaceSelected = (parsed: ParsedPlace) => {
    setInstCity(parsed.city ?? '');
    setInstPostalCode(parsed.postalCode ?? '');
    const regionLabel = parsed.stateLong ?? parsed.state ?? '';
    setInstStateRegion(regionLabel);
    setInstRegion(regionLabel);
    setInstCountryCode((prev) => {
      if (!parsed.countryCode) return prev;
      if (!prev || prev === parsed.countryCode) return parsed.countryCode;
      return prev;
    });
  };

  const submit = async (form: FormData) => {
    const raw = {
      name: String(form.get('name') ?? ''),
      organization_type: String(form.get('organization_type') ?? 'other'),
      address_line1: instAddressLine1 || undefined,
      city: instCity || undefined,
      state_region: instStateRegion || undefined,
      postal_code: instPostalCode || undefined,
      country_code: instCountryCode || undefined,
      region: instRegion || undefined,
      status: (form.get('status') as string) === 'inactive' ? 'inactive' : 'active',
      notes: String(form.get('notes') ?? '') || undefined,
      parent_institution_id: String(form.get('parent_institution_id') ?? '') || null,
    };
    const parsed = institutionFormSchema.safeParse({
      ...raw,
      parent_institution_id: raw.parent_institution_id || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? 'Invalid form');
      return;
    }
    setPending(true);
    const res = await createInstitutionAction(parsed.data);
    setPending(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (res.duplicateNameWarning) toast.message('Another organization shares this name — please review before merging links.');
    if (res.data) onCreated(res.data.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setInstAddressLine1('');
          setInstCity('');
          setInstPostalCode('');
          setInstStateRegion('');
          setInstCountryCode('');
          setInstRegion('');
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">New organization</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await submit(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1">
            <Label className="text-xs">Organization name</Label>
            <Input name="name" className="text-xs h-9" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Organization type</Label>
            <select
              name="organization_type"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              defaultValue="other"
            >
              {INSTITUTION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Parent organization (optional hierarchy)</Label>
            <select
              name="parent_institution_id"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              defaultValue=""
            >
              <option value="">None</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Address line 1</Label>
            <PlacesAddressAutocomplete
              value={instAddressLine1}
              onChange={setInstAddressLine1}
              onPlaceSelected={onNewInstitutionAddressPlaceSelected}
              countryBias={instCountryCode || null}
              className="text-xs h-9"
            />
          </div>
          <DirectoryCountryRegionFields
            variant="institutionAddress"
            countryCode={instCountryCode}
            region={instRegion}
            onCountryChange={setInstCountryCode}
            onRegionChange={setInstRegion}
            citySlot={
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input
                  className="text-xs h-9"
                  value={instCity}
                  onChange={(e) => setInstCity(e.target.value)}
                />
              </div>
            }
          />
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <select
              name="status"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              defaultValue="active"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea name="notes" className="text-xs min-h-[60px]" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="text-xs" disabled={pending}>
              {pending ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
