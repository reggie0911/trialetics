'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Download,
  FileDown,
  Filter,
  Plus,
  Search,
  Star,
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
import { listDirectoryContacts, createDirectoryContact } from '@/lib/actions/directory-contacts';
import { listInstitutions, createInstitution as createInstitutionAction } from '@/lib/actions/directory-institutions';
import { importDirectoryContactsFromCsv, importInstitutionsFromCsv } from '@/lib/actions/directory-csv';
import type {
  DirectoryContactHealth,
  DirectoryContactListItem,
  DirectoryContactsSnapshot,
} from '@/lib/types/directory';
import type { InstitutionOrganizationType, InstitutionRow } from '@/lib/types/directory';
import { INSTITUTION_TYPE_OPTIONS } from '@/lib/types/directory';
import { cn } from '@/lib/utils';
import { DirectoryContactsKpiRow, type KpiPreset } from '@/components/ctms/directory/directory-contacts-kpi-row';
import { DirectoryGroupedContactsTable } from '@/components/ctms/directory/directory-grouped-contacts-table';
import { DirectoryFlatContactsTable } from '@/components/ctms/directory/directory-flat-contacts-table';
import {
  DirectoryContactsRightRail,
  RightRailOnMobileHint,
} from '@/components/ctms/directory/directory-contacts-right-rail';
import {
  filterByKind,
  normalizeAuditAndHistory,
  type ActivityEvent,
} from '@/lib/directory/activity-events';
import { DirectoryActivityKpiRow } from '@/components/ctms/directory/activity/directory-activity-kpi-row';
import {
  DirectoryActivityFilterBar,
  type ActivityKindFilter,
} from '@/components/ctms/directory/activity/directory-activity-filter-bar';
import { DirectoryActivityTimeline } from '@/components/ctms/directory/activity/directory-activity-timeline';
import { DirectoryActivityRightRail } from '@/components/ctms/directory/activity/directory-activity-right-rail';
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
  DIRECTORY_CONTACTS_TEMPLATE_FILENAME,
  DIRECTORY_ORGANIZATIONS_EXPORT_FILENAME,
  DIRECTORY_ORGANIZATIONS_TEMPLATE_FILENAME,
  getDirectoryContactsCsvTemplate,
  getDirectoryInstitutionsCsvTemplate,
  getDirectoryInstitutionsExportCsv,
} from '@/lib/data/directory-csv-templates';
import { OrganizationsKpiRow, type OrgKpiPreset } from '@/components/ctms/directory/organizations/organizations-kpi-row';
import { GroupedOrganizationsTable } from '@/components/ctms/directory/organizations/grouped-organizations-table';
import { DirectoryFlatOrganizationsTable } from '@/components/ctms/directory/organizations/directory-flat-organizations-table';
import { OrganizationsNeedsAttentionCard } from '@/components/ctms/directory/organizations/organizations-needs-attention-card';
import { OrganizationsInsightsCard } from '@/components/ctms/directory/organizations/organizations-insights-card';
import { OrganizationsSmartSuggestionsCard } from '@/components/ctms/directory/organizations/organizations-smart-suggestions-card';
import {
  type OrgAttentionKey,
  type OrgHealth,
  type DirectoryActivitySnapshot,
  type DirectoryOrganizationSnapshot,
  type ContactLastActivity,
  EMPTY_ACTIVITY_SNAPSHOT,
  EMPTY_ORGANIZATION_SNAPSHOT,
} from '@/lib/directory/live-directory-types';
import { ORG_TYPE_GROUP_LABEL } from '@/lib/directory/organization-display';
import { triggerCsvDownload } from '@/lib/utils/csv-download';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { getDirectoryAuditLog, getDirectoryAssignmentHistory } from '@/lib/actions/directory-audit';
import { getDirectoryActivitySnapshot } from '@/lib/actions/directory-dashboard';
import { computeContactHealth } from '@/lib/directory/contact-health';
import {
  CONTACT_SITE_UNASSIGNED,
  ContactHealthFilterChip,
  ContactRoleFilterChip,
  ContactSiteFilterChip,
} from '@/components/ctms/directory/directory-contacts-filter-chips';
import {
  OrganizationCountryFilterChip,
  OrganizationHealthFilterChip,
  OrganizationRecordStatusFilterChip,
  OrganizationTypeFilterChip,
} from '@/components/ctms/directory/organizations/directory-organizations-filter-chips';
import { getName } from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import * as isoCountries from 'i18n-iso-countries';
import { DirectoryEmptyState } from '@/components/ctms/directory/directory-empty-state';

isoCountries.registerLocale(en);

function formatIsoCountryLabel(code: string): string {
  return getName(code, 'en') ?? code;
}

function relativeDateLabel(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 'Not tracked';
  const days = Math.max(0, Math.round((Date.now() - time) / (1000 * 60 * 60 * 24)));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function shortDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not tracked';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysSinceIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.round((Date.now() - time) / (1000 * 60 * 60 * 24)));
}

const DIRECTORY_DEFAULT_PAGE_SIZE = 25;
const INSTITUTION_OPTIONS_PAGE_SIZE = 500;

const EMPTY_CONTACTS_SNAPSHOT: DirectoryContactsSnapshot = {
  totalContacts: 0,
  totalContactsDeltaWeek: null,
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

function directoryContactRowHealth(c: DirectoryContactListItem): DirectoryContactHealth {
  return c.study_enrichment?.contact_health ?? computeContactHealth(c);
}

type CatalogCat = QuickContactCatalogCategory;

interface DirectoryHomeClientProps {
  companyId: string;
  canEdit: boolean;
  canImportCsv: boolean;
  catalog: CatalogCat[];
  /** From `getDirectoryRoleCatalog().error` when the catalog query failed. */
  catalogError?: string | null;
  initialContacts: DirectoryContactListItem[];
  contactTotal: number;
  initialInstitutions: InstitutionRow[];
  institutionTotal: number;
  initialInstitutionOptions: InstitutionRow[];
  auditLog: Record<string, unknown>[];
  auditLogTotal: number;
  assignmentHistory: Record<string, unknown>[];
  assignmentHistoryTotal: number;
  /** Originating study id, used so detail pages can return to this Directory tab. */
  studyId?: string;
  /** Pre-fetched study-scoped KPI / right-rail snapshot. */
  initialSnapshot?: DirectoryContactsSnapshot | null;
  /** Pre-fetched contacts already enriched with study site info for grouping. */
  studyContactsEnriched?: DirectoryContactListItem[];
  initialOrganizationSnapshot?: DirectoryOrganizationSnapshot | null;
  initialActivitySnapshot?: DirectoryActivitySnapshot | null;
}

export function DirectoryHomeClient({
  companyId,
  canEdit,
  canImportCsv,
  catalog,
  catalogError = null,
  initialContacts,
  contactTotal,
  initialInstitutions,
  institutionTotal,
  initialInstitutionOptions,
  auditLog,
  auditLogTotal,
  assignmentHistory,
  assignmentHistoryTotal,
  studyId,
  initialSnapshot,
  studyContactsEnriched,
  initialOrganizationSnapshot,
  initialActivitySnapshot,
}: DirectoryHomeClientProps) {
  const router = useRouter();
  const fromQuery = studyId ? `?from=${studyId}` : '';
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState('contacts');

  const [, setContacts] = useState(initialContacts);
  const [cTotal, setCTotal] = useState(contactTotal);
  /** Server-side directory contacts search query (no UI wired yet). */
  const cQuery = '';
  const cSkipInitialLoad = useRef(true);

  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [iTotal, setITotal] = useState(institutionTotal);
  const [iSearch, setISearch] = useState('');
  const [iQuery, setIQuery] = useState('');
  const [iRefresh, setIRefresh] = useState(0);
  const iSkipInitialLoad = useRef(true);

  const [institutionOptions, setInstitutionOptions] = useState<InstitutionRow[]>(initialInstitutionOptions);

  const [auditRows, setAuditRows] = useState<Record<string, unknown>[]>(auditLog);
  const [auditCount, setAuditCount] = useState(auditLogTotal);
  const [historyRows, setHistoryRows] = useState<Record<string, unknown>[]>(assignmentHistory);
  const [historyCount, setHistoryCount] = useState(assignmentHistoryTotal);
  const aSkipInitialLoad = useRef(true);
  const hSkipInitialLoad = useRef(true);

  const snapshot: DirectoryContactsSnapshot = initialSnapshot ?? EMPTY_CONTACTS_SNAPSHOT;
  const studyContacts: DirectoryContactListItem[] = studyContactsEnriched ?? EMPTY_STUDY_CONTACTS;
  const organizationSnapshot = initialOrganizationSnapshot ?? EMPTY_ORGANIZATION_SNAPSHOT;
  const [activitySnapshot, setActivitySnapshot] = useState<DirectoryActivitySnapshot>(
    initialActivitySnapshot ?? EMPTY_ACTIVITY_SNAPSHOT
  );

  const displayedInstitutions: InstitutionRow[] = institutions;

  const [activePreset, setActivePreset] = useState<KpiPreset | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactRoleFilter, setContactRoleFilter] = useState<'all' | string>('all');
  const [contactSiteFilter, setContactSiteFilter] = useState<'all' | string>('all');
  const [contactHealthFilter, setContactHealthFilter] = useState<'all' | DirectoryContactHealth>('all');
  const [contactsView, setContactsView] = useState<'by-site' | 'all'>('by-site');
  const [organizationsView, setOrganizationsView] = useState<'by-type' | 'all'>('by-type');

  const [activityKind, setActivityKind] = useState<ActivityKindFilter>('all');
  const [activityVisibleCount, setActivityVisibleCount] = useState<number>(DIRECTORY_DEFAULT_PAGE_SIZE);

  const allActivityEvents = useMemo<ActivityEvent[]>(() => {
    return normalizeAuditAndHistory(auditRows, historyRows, { fromQuery });
  }, [auditRows, historyRows, fromQuery]);

  const filteredActivityEvents = useMemo(
    () => filterByKind(allActivityEvents, activityKind),
    [allActivityEvents, activityKind]
  );

  const contactLastActivityById = useMemo<Record<string, ContactLastActivity>>(() => {
    const map: Record<string, ContactLastActivity> = {};
    for (const contact of studyContacts) {
      if (!contact.updated_at) continue;
      map[contact.id] = {
        kind: 'none',
        date: shortDateLabel(contact.updated_at),
        relative: relativeDateLabel(contact.updated_at),
      };
    }
    for (const event of allActivityEvents) {
      const id = event.entity?.type === 'directory_contact' ? event.entity.id : null;
      if (!id) continue;
      const previous = map[id];
      if (previous) {
        const currentDate = new Date(previous.date).getTime();
        if (!Number.isNaN(currentDate) && currentDate > event.at.getTime()) continue;
      }
      map[id] = {
        kind: event.kind === 'visits' ? 'visit' : event.icon === 'mail' ? 'email' : 'none',
        date: shortDateLabel(event.at.toISOString()),
        relative: relativeDateLabel(event.at.toISOString()),
      };
    }
    return map;
  }, [allActivityEvents, studyContacts]);

  const visibleActivityEvents = useMemo(
    () => filteredActivityEvents.slice(0, activityVisibleCount),
    [filteredActivityEvents, activityVisibleCount]
  );

  const canLoadMoreActivity = activityVisibleCount < filteredActivityEvents.length;

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

  const { contactSiteSelectOptions, contactSiteHasUnassigned } = useMemo(() => {
    const siteMap = new Map<string, string>();
    let unassigned = false;
    for (const c of studyContacts) {
      const sid = c.study_enrichment?.primary_study_site_id;
      if (!sid) {
        unassigned = true;
        continue;
      }
      const label = c.study_enrichment?.primary_study_site_label?.trim() || sid;
      if (!siteMap.has(sid)) siteMap.set(sid, label);
    }
    const sites = Array.from(siteMap.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { contactSiteSelectOptions: sites, contactSiteHasUnassigned: unassigned };
  }, [studyContacts]);

  const filteredStudyContacts = useMemo(() => {
    let rows = studyContacts;
    if (statusFilter !== 'all') {
      rows = rows.filter((c) => c.status === statusFilter);
    }
    if (activePreset?.kind === 'missingRoles') {
      rows = rows.filter((c) => !c.primary_directory_role_id);
    } else if (activePreset?.kind === 'unassigned') {
      rows = rows.filter((c) => !c.study_enrichment?.primary_study_site_id);
    } else if (activePreset?.kind === 'recent') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      rows = rows.filter((c) => c.updated_at && new Date(c.updated_at).getTime() >= weekAgo);
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
    if (contactSiteFilter !== 'all') {
      if (contactSiteFilter === CONTACT_SITE_UNASSIGNED) {
        rows = rows.filter((c) => !c.study_enrichment?.primary_study_site_id);
      } else {
        rows = rows.filter((c) => c.study_enrichment?.primary_study_site_id === contactSiteFilter);
      }
    }
    if (contactHealthFilter !== 'all') {
      rows = rows.filter((c) => directoryContactRowHealth(c) === contactHealthFilter);
    }
    return rows;
  }, [
    studyContacts,
    statusFilter,
    activePreset,
    contactsSearch,
    contactRoleFilter,
    contactSiteFilter,
    contactHealthFilter,
  ]);

  const contactsEmptyCopy = useMemo(() => {
    if (studyContacts.length === 0) {
      return {
        title: 'No contacts linked to this study yet.',
        description:
          'Add a contact here, or open a company contact profile and link them under Study assignments.',
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
      contactSiteFilter,
      contactHealthFilter,
    ],
  });

  const paginatedStudyContacts = studyContactPagination.paginate(filteredStudyContacts);

  const handleKpiPreset = useCallback((p: KpiPreset) => {
    setActivePreset((prev) => (prev?.kind === p.kind ? null : p));
  }, []);

  const handleNeedsAttention = useCallback((key: 'missing' | 'sites' | 'inactive' | 'sites-missing-key') => {
    if (key === 'missing') setActivePreset({ kind: 'missingRoles' });
    else if (key === 'sites') setActivePreset({ kind: 'unassigned' });
    else if (key === 'inactive') setActivePreset({ kind: 'recent' });
    else setActivePreset({ kind: 'sites' });
  }, []);

  const handleSuggestion = useCallback((id: string) => {
    if (id === 'missing-roles') setActivePreset({ kind: 'missingRoles' });
    else if (id === 'unassigned') setActivePreset({ kind: 'unassigned' });
  }, []);

  const handleRoleRowClick = useCallback(() => {
    setActivePreset({ kind: 'sites' });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActivePreset(null);
    setStatusFilter('all');
    setContactsSearch('');
    setContactRoleFilter('all');
    setContactSiteFilter('all');
    setContactHealthFilter('all');
  }, []);

  const hasActiveFilters =
    activePreset !== null ||
    statusFilter !== 'all' ||
    contactsSearch.trim().length > 0 ||
    contactRoleFilter !== 'all' ||
    contactSiteFilter !== 'all' ||
    contactHealthFilter !== 'all';

  const [contactOpen, setContactOpen] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvKind, setCsvKind] = useState<'contacts' | 'institutions'>('contacts');
  const [csvText, setCsvText] = useState('');
  const [csvFileLabel, setCsvFileLabel] = useState('');
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const [favorite, setFavorite] = useState(false);
  const [orgHealthFilter, setOrgHealthFilter] = useState<OrgHealth | null>(null);
  const [orgAttentionFilter, setOrgAttentionFilter] = useState<OrgAttentionKey | null>(null);
  const [orgTypeFilter, setOrgTypeFilter] = useState<'all' | InstitutionOrganizationType>('all');
  const [orgRecordStatusFilter, setOrgRecordStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all'
  );
  const [orgCountryFilter, setOrgCountryFilter] = useState<'all' | string>('all');

  const handleOrgKpiPreset = useCallback((preset: OrgKpiPreset) => {
    if (preset.kind === 'activeSites') {
      setOrgTypeFilter('clinical_site');
      setOrgRecordStatusFilter('active');
      setOrgHealthFilter(null);
      setOrgAttentionFilter(null);
      return;
    }
    if (preset.kind === 'sitesAtRisk') {
      setOrgTypeFilter('clinical_site');
      setOrgRecordStatusFilter('all');
      setOrgHealthFilter('at_risk');
      setOrgAttentionFilter(null);
      return;
    }
    setOrgHealthFilter(null);
    setOrgAttentionFilter(null);
    setOrgTypeFilter('all');
    setOrgRecordStatusFilter('all');
    setOrgCountryFilter('all');
  }, []);

  const handleOrgAttention = useCallback((key: OrgAttentionKey) => {
    setOrgAttentionFilter(key);
    setOrgHealthFilter(null);
    if (key === 'sites_below_50' || key === 'no_visit_60') {
      setOrgTypeFilter('clinical_site');
      setOrgRecordStatusFilter('all');
    } else {
      setOrgTypeFilter('all');
      setOrgRecordStatusFilter('all');
    }
  }, []);

  const clearOrgFilters = useCallback(() => {
    setOrgHealthFilter(null);
    setOrgAttentionFilter(null);
    setOrgTypeFilter('all');
    setOrgRecordStatusFilter('all');
    setOrgCountryFilter('all');
  }, []);

  const orgFilterLabel = useMemo(() => {
    if (orgAttentionFilter) {
      switch (orgAttentionFilter) {
        case 'sites_below_50':
          return 'Sites below 50% enrollment';
        case 'no_visit_60':
          return 'No visit in 60+ days';
        case 'orgs_unassigned':
          return 'Orgs not assigned to study';
      }
    }
    if (orgHealthFilter === 'at_risk') return 'Health: At Risk';
    if (orgHealthFilter === 'critical') return 'Health: Critical';
    if (orgHealthFilter === 'healthy') return 'Health: Healthy';
    return null;
  }, [orgAttentionFilter, orgHealthFilter]);

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
    if (orgHealthFilter) {
      rows = rows.filter(
        (r) => organizationSnapshot.enrichmentByInstitutionId[r.id]?.health === orgHealthFilter
      );
    }
    if (orgAttentionFilter) {
      rows = rows.filter((r) => {
        const enrichment = organizationSnapshot.enrichmentByInstitutionId[r.id];
        if (orgAttentionFilter === 'sites_below_50') {
          return (
            !!enrichment?.enrollmentTarget &&
            enrichment.enrollmentCurrent / enrichment.enrollmentTarget < 0.5
          );
        }
        if (orgAttentionFilter === 'no_visit_60') {
          const days = daysSinceIso(enrichment?.lastVisitISO);
          return days != null && days >= 60;
        }
        return (enrichment?.studyInvolvement.length ?? 0) === 0;
      });
    }
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
    return rows;
  }, [
    displayedInstitutions,
    organizationSnapshot.enrichmentByInstitutionId,
    orgAttentionFilter,
    orgCountryFilter,
    orgHealthFilter,
    orgRecordStatusFilter,
    orgTypeFilter,
  ]);

  const flatOrgPagination = useClientPagination({
    totalItems: filteredOrgInstitutions.length,
    initialPageSize: DIRECTORY_DEFAULT_PAGE_SIZE,
    resetKey: [
      organizationsView,
      orgHealthFilter,
      orgAttentionFilter,
      orgTypeFilter,
      orgRecordStatusFilter,
      orgCountryFilter,
      iQuery,
      institutions.length,
      displayedInstitutions.length,
    ],
  });

  const paginatedFlatOrgInstitutions = flatOrgPagination.paginate(filteredOrgInstitutions);

  const handleExportOrgs = useCallback(() => {
    const csv = getDirectoryInstitutionsExportCsv(displayedInstitutions);
    triggerCsvDownload(DIRECTORY_ORGANIZATIONS_EXPORT_FILENAME, csv);
    toast.success(`Exported ${displayedInstitutions.length} organizations`);
  }, [displayedInstitutions]);

  const contactPag = useClientPagination({
    totalItems: cTotal,
    initialPageSize: DIRECTORY_DEFAULT_PAGE_SIZE,
  });
  const institutionPag = useClientPagination({
    totalItems: iTotal,
    initialPageSize: DIRECTORY_DEFAULT_PAGE_SIZE,
  });
  const auditPag = useClientPagination({ totalItems: auditCount, initialPageSize: DIRECTORY_DEFAULT_PAGE_SIZE });
  const historyPag = useClientPagination({ totalItems: historyCount, initialPageSize: DIRECTORY_DEFAULT_PAGE_SIZE });

  const cPage = contactPag.currentPage;
  const cSize = contactPag.pageSize;
  const iPage = institutionPag.currentPage;
  const iSize = institutionPag.pageSize;
  const aPage = auditPag.currentPage;
  const aSize = auditPag.pageSize;
  const hPage = historyPag.currentPage;
  const hSize = historyPag.pageSize;

  const goContactPage1 = contactPag.goToPage;
  const goInstPage1 = institutionPag.goToPage;
  const goAuditPage1 = auditPag.goToPage;
  const goHistoryPage1 = historyPag.goToPage;

  // Reset table state when the server revalidates (e.g. router.refresh); do not depend on goToPage
  // identity — it would reset pagination whenever client fetch updates totals.
  useEffect(() => {
    setContacts(initialContacts);
    setCTotal(contactTotal);
    goContactPage1(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- RSC data only; never list goToPage
  }, [initialContacts, contactTotal]);

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
    setAuditRows(auditLog);
    setAuditCount(auditLogTotal);
    goAuditPage1(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditLog, auditLogTotal]);

  useEffect(() => {
    setHistoryRows(assignmentHistory);
    setHistoryCount(assignmentHistoryTotal);
    goHistoryPage1(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentHistory, assignmentHistoryTotal]);

  useEffect(() => {
    setActivitySnapshot(initialActivitySnapshot ?? EMPTY_ACTIVITY_SNAPSHOT);
  }, [initialActivitySnapshot]);

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

  useEffect(() => {
    if (cSkipInitialLoad.current) {
      cSkipInitialLoad.current = false;
      return;
    }
    const run = async () => {
      const r = await listDirectoryContacts({
        search: cQuery || undefined,
        limit: cSize,
        offset: (cPage - 1) * cSize,
      });
      if (!r.error) {
        setContacts(r.data);
        setCTotal(r.count);
      }
    };
    startTransition(() => {
      void run();
    });
  }, [cPage, cSize, startTransition]);

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

  useEffect(() => {
    if (aSkipInitialLoad.current) {
      aSkipInitialLoad.current = false;
      return;
    }
    const run = async () => {
      const r = await getDirectoryAuditLog({
        limit: aSize,
        offset: (aPage - 1) * aSize,
      });
      if (!r.error) {
        setAuditRows(r.data);
        setAuditCount(r.count);
        const snap = await getDirectoryActivitySnapshot({
          limit: aSize,
          offset: (aPage - 1) * aSize,
          fromQuery,
        });
        if (!snap.error) setActivitySnapshot(snap.data);
      }
    };
    startTransition(() => {
      void run();
    });
  }, [aPage, aSize, fromQuery, startTransition]);

  useEffect(() => {
    if (hSkipInitialLoad.current) {
      hSkipInitialLoad.current = false;
      return;
    }
    const run = async () => {
      const r = await getDirectoryAssignmentHistory({
        limit: hSize,
        offset: (hPage - 1) * hSize,
      });
      if (!r.error) {
        setHistoryRows(r.data);
        setHistoryCount(r.count);
        const snap = await getDirectoryActivitySnapshot({
          limit: hSize,
          offset: (hPage - 1) * hSize,
          fromQuery,
        });
        if (!snap.error) setActivitySnapshot(snap.data);
      }
    };
    startTransition(() => {
      void run();
    });
  }, [hPage, hSize, fromQuery, startTransition]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Contacts &amp; Organizations</h1>
            <button
              type="button"
              aria-pressed={favorite}
              aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={() => setFavorite((f) => !f)}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors',
                'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                favorite ? 'text-amber-500' : 'text-muted-foreground'
              )}
            >
              <Star className={cn('h-4 w-4', favorite && 'fill-amber-400')} />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage contacts and organization relationships.
          </p>
        </div>
        {canImportCsv && (
          <div className="shrink-0 self-start md:self-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5 shrink-0" />
                  Import CSV
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <Tabs tabsId="directory-home" value={tab} onValueChange={setTab}>
        <TabsList className="h-9">
          <TabsTrigger value="contacts" className="text-xs">
            Contacts
          </TabsTrigger>
          <TabsTrigger value="institutions" className="text-xs">
            Organizations
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[3fr_1fr]">
            <div className="min-w-0 space-y-3">
              <DirectoryContactsKpiRow
                snapshot={snapshot}
                error={null}
                onPreset={handleKpiPreset}
              />

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px] max-w-xs">
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
                <ContactSiteFilterChip
                  value={contactSiteFilter}
                  onChange={setContactSiteFilter}
                  sites={contactSiteSelectOptions}
                  showUnassigned={contactSiteHasUnassigned}
                />
                <StatusFilterChip value={statusFilter} onChange={setStatusFilter} />
                <ContactHealthFilterChip value={contactHealthFilter} onChange={setContactHealthFilter} />
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
                <div className="flex-1" />
                {canEdit && (
                  <Button type="button" size="sm" className="text-xs h-9" onClick={() => setContactOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add contact
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">View</span>
                <div className="inline-flex rounded-md border bg-muted/30 p-0.5" role="group" aria-label="Contacts layout">
                  <Button
                    type="button"
                    variant={contactsView === 'by-site' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => setContactsView('by-site')}
                  >
                    By Site
                  </Button>
                  <Button
                    type="button"
                    variant={contactsView === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => setContactsView('all')}
                  >
                    All Contacts
                  </Button>
                </div>
              </div>

              {contactsView === 'by-site' ? (
                <>
                  <DirectoryGroupedContactsTable
                    contacts={filteredStudyContacts}
                    fromQuery={fromQuery}
                    lastActivityByContactId={contactLastActivityById}
                    emptyMessage={contactsEmptyCopy.title || 'No contacts in this list.'}
                    emptyDescription={contactsEmptyCopy.description}
                  />
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>
                      Showing {filteredStudyContacts.length} of {snapshot.totalContacts} contacts
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <DirectoryFlatContactsTable
                    contacts={paginatedStudyContacts}
                    fromQuery={fromQuery}
                    lastActivityByContactId={contactLastActivityById}
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

              <RightRailOnMobileHint />
            </div>

            <aside className="space-y-4">
              <DirectoryContactsRightRail
                snapshot={snapshot}
                onNeedsAttention={handleNeedsAttention}
                onSuggestion={handleSuggestion}
                onRoleRowClick={handleRoleRowClick}
              />
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="institutions" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="space-y-3 xl:col-span-9 min-w-0">
              <OrganizationsKpiRow snapshot={organizationSnapshot.kpi} onPreset={handleOrgKpiPreset} />

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="relative min-w-0 w-full min-w-[12rem] max-w-xl sm:w-[min(100%,36rem)] sm:shrink-0">
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
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    className="text-xs h-9 shrink-0"
                    onClick={() => setInstOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add organization
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-9 shrink-0"
                  onClick={handleExportOrgs}
                  disabled={displayedInstitutions.length === 0}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export
                </Button>
                {displayedInstitutions.length > 0 ? (
                  <>
                    <OrganizationTypeFilterChip
                      value={orgTypeFilter}
                      onChange={setOrgTypeFilter}
                      options={orgTypeFilterOptions}
                    />
                    <OrganizationHealthFilterChip value={orgHealthFilter} onChange={setOrgHealthFilter} />
                    <OrganizationRecordStatusFilterChip
                      value={orgRecordStatusFilter}
                      onChange={setOrgRecordStatusFilter}
                    />
                    <OrganizationCountryFilterChip
                      value={orgCountryFilter}
                      onChange={setOrgCountryFilter}
                      options={orgCountryFilterOptions}
                    />
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
                  title="No organizations yet."
                  description="Add or import organizations to build the live directory for this study."
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground shrink-0">View</span>
                    <div
                      className="inline-flex rounded-md border bg-muted/30 p-0.5"
                      role="group"
                      aria-label="Organizations layout"
                    >
                      <Button
                        type="button"
                        variant={organizationsView === 'by-type' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => setOrganizationsView('by-type')}
                      >
                        By type
                      </Button>
                      <Button
                        type="button"
                        variant={organizationsView === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => setOrganizationsView('all')}
                      >
                        All organizations
                      </Button>
                    </div>
                  </div>

                  {organizationsView === 'by-type' ? (
                    <>
                      <GroupedOrganizationsTable
                        institutions={filteredOrgInstitutions}
                        fromQuery={fromQuery}
                        rowsPerGroup={4}
                        enrichmentByInstitutionId={organizationSnapshot.enrichmentByInstitutionId}
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
                        enrichmentByInstitutionId={organizationSnapshot.enrichmentByInstitutionId}
                        emptyMessage={
                          orgHealthFilter ||
                          orgAttentionFilter ||
                          orgTypeFilter !== 'all' ||
                          orgRecordStatusFilter !== 'all' ||
                          orgCountryFilter !== 'all' ||
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

              <RightRailOnMobileHint />
            </div>

            <aside className="space-y-4 xl:col-span-3 min-w-0">
              <OrganizationsNeedsAttentionCard rows={organizationSnapshot.needsAttention} onSelect={handleOrgAttention} />
              <OrganizationsInsightsCard insights={organizationSnapshot.insights} />
              <OrganizationsSmartSuggestionsCard
                suggestions={organizationSnapshot.suggestions}
                onAttentionKey={handleOrgAttention}
              />
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[3fr_1fr]">
            <div className="min-w-0 space-y-3">
              <DirectoryActivityKpiRow summary={activitySnapshot.summary} />
              <DirectoryActivityFilterBar
                value={activityKind}
                onChange={(next) => {
                  setActivityKind(next);
                  setActivityVisibleCount(DIRECTORY_DEFAULT_PAGE_SIZE);
                }}
              />
              <DirectoryActivityTimeline
                events={visibleActivityEvents}
                emptyMessage={
                  activityKind === 'all'
                    ? 'No activity recorded yet.'
                    : 'No activity matches the selected filter.'
                }
                canLoadMore={canLoadMoreActivity}
                onLoadMore={() =>
                  setActivityVisibleCount((n) => n + DIRECTORY_DEFAULT_PAGE_SIZE)
                }
              />
              <RightRailOnMobileHint />
            </div>

            <aside className="space-y-4">
              <DirectoryActivityRightRail
                summary={activitySnapshot.summary}
                attention={activitySnapshot.attention}
                insightsTrend={activitySnapshot.insightsTrend}
                insightsTicks={activitySnapshot.insightsTicks}
                insightsTotalLabel={activitySnapshot.insightsTotalLabel}
              />
            </aside>
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
  const [primaryRoleId, setPrimaryRoleId] = useState('');
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
      primary_directory_role_id: primaryRoleId || null,
      primary_institution_id: String(form.get('primary_institution_id') ?? '') || null,
    };
    const parsed = directoryContactFormSchema.safeParse({
      ...raw,
      primary_directory_role_id: raw.primary_directory_role_id || null,
      primary_institution_id: raw.primary_institution_id || null,
    });
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
          setPrimaryRoleId('');
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
            primaryRoleId={primaryRoleId}
            onPrimaryRoleChange={setPrimaryRoleId}
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
