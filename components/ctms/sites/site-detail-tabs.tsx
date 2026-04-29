'use client';

import { useState, useCallback, useMemo, useSyncExternalStore, useEffect, useTransition, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users,
  Building2,
  Mail,
  Copy,
  Check,
  ListTodo,
  DollarSign,
  ClipboardList,
  CalendarClock,
} from 'lucide-react';

import { useStudyHub } from '@/components/ctms/study-hub-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format, isValid, max, parseISO } from 'date-fns';
import type {
  StudySiteWithDetails,
  Study,
  StudyCountryWithSubmissions,
  StudySite,
  FinanceInvoiceWithRelations,
  FinanceApprovalTemplateOption,
  InvoiceBudgetLineAllocationRef,
  SiteBudgetWithLineItems,
  PaymentScheduleWithSite,
  SiteEcrfRollupBundle,
  SiteVisitScheduleBundle,
  SiteVisitWindowComplianceBundle,
  SubjectWithSite,
  EnrollmentFunnelData,
} from '@/lib/types/ctms';
import type { AttentionItem, SiteOverviewServerMetrics } from '@/lib/site-page-metrics';
import type { InstitutionRow } from '@/lib/types/directory';
import type { QuickContactCatalogCategory } from '@/components/ctms/directory/quick-contact-form-fields';
import { SiteContactsPanel } from './site-contacts-panel';
import { SiteMap, type DirectionsInfo } from './site-map';
import { SiteWeather } from './site-weather';
import { SitePageHeader } from './site-page-header';
import { SitePiAndLocationCard } from './site-pi-and-location-card';
import { SiteNeedsAttention } from './site-needs-attention';
import { SiteMilestoneTimeline, type SiteMilestone } from './site-milestone-timeline';
import { SiteOverviewKpiSix } from './site-overview-kpi-six';
import { SiteEnrollmentPerformance } from './site-enrollment-performance';
import { SiteMonitoringOverviewColumn } from './site-monitoring-overview-column';
import { SiteOverviewFooter } from './site-overview-footer';
import { SiteTasksTable } from './site-tasks-table';
import { SiteFinancialsPanel } from './site-financials-panel';
import type { SiteBudgetStudyOption } from '@/components/ctms/financials/site-budget-from-study-dialog';
import { SubjectsTab } from '@/components/ctms/subjects/subjects-tab';
import { SiteEcrfTrackingTab } from '@/components/ctms/ecrf-tracking/site-ecrf-tracking-tab';
import { SiteVisitScheduleTab } from '@/components/ctms/visit-window-compliance/site-visit-window-compliance-tab';
import { useStudyBreadcrumbLeaf } from '@/components/ctms/studies/study-breadcrumb-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TaskWithRelations } from '@/lib/types/tasks';
import { repairSiteDirectoryInstitution } from '@/lib/actions/sites';
import { toast } from 'sonner';

const noOpSubscribe = () => () => {};

const SITE_MAIN_TABS = new Set([
  'overview',
  'contacts',
  'tasks',
  'subjects',
  'ecrf-tracking',
  'visit-window-compliance',
  'financials',
]);

const LEGACY_SITE_TAB_REDIRECTS: Record<string, string> = {
  'visit-schedule': 'visit-window-compliance',
};

const tabTooltipClassName = 'max-w-xs text-left text-xs leading-snug';

function SiteTabWithTooltip({
  value,
  children,
  tooltip,
}: {
  value: string;
  children: ReactNode;
  /** Short help shown on hover; matches `TooltipContent` used elsewhere in CTMS. */
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <TabsTrigger value={value}>
            {children}
          </TabsTrigger>
        }
      />
      <TooltipContent side="bottom" align="start" className={tabTooltipClassName}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/** Radix Tabs uses @radix-ui/react-id, which can disagree with React 19 SSR useId(); mount tabs only on the client. */
function useIsClient() {
  return useSyncExternalStore(noOpSubscribe, () => true, () => false);
}

interface SiteDetailTabsProps {
  site: StudySiteWithDetails;
  study: Pick<Study, 'id' | 'title' | 'protocol_number' | 'company_id' | 'phase' | 'status' | 'end_date'>;
  isAdmin: boolean;
  siteOverviewMetrics: SiteOverviewServerMetrics;
  enrolledCount: number;
  siteTasks: TaskWithRelations[];
  directoryContactOptions?: { id: string; label: string }[];
  directoryCatalog: QuickContactCatalogCategory[];
  /** Set when `getDirectoryRoleCatalog` failed (RLS, network, etc.). */
  directoryCatalogError?: string | null;
  institutionsForQuickContact: InstitutionRow[];
  /** Institution row id linked to this study site (parent organization for new site contacts). */
  siteInstitutionId?: string | null;
  linkedSiteInstitution?: Pick<InstitutionRow, 'id' | 'name' | 'status' | 'organization_type'> | null;
  siteBudget: SiteBudgetWithLineItems | null;
  studyBudgetName?: string | null;
  budgetAllocations?: Record<string, number>;
  invoiceAllocationRefsByLine?: Record<string, InvoiceBudgetLineAllocationRef[]>;
  siteFinanceInvoices: FinanceInvoiceWithRelations[];
  sitePaymentSchedules: PaymentScheduleWithSite[];
  initialSiteSubjects: SubjectWithSite[];
  siteFunnel: EnrollmentFunnelData;
  ecrfRollup: SiteEcrfRollupBundle;
  visitSchedule: SiteVisitScheduleBundle;
  visitWindowCompliance: SiteVisitWindowComplianceBundle;
  studySitesForSubjects: Pick<StudySite, 'id' | 'site_number' | 'name' | 'study_country_id'>[];
  /** Used with `studySitesForSubjects` to resolve country names in the Subjects table. */
  studyCountries: StudyCountryWithSubmissions[];
  financeApprovalTemplateOptions: FinanceApprovalTemplateOption[];
  studyBudgetOptions?: SiteBudgetStudyOption[];
  /** Study id for study-scoped CTMS URLs (sites list, edit). */
  ctmsStudyRouteId?: string;
}

export function SiteDetailTabs({
  site,
  study,
  isAdmin,
  siteOverviewMetrics,
  enrolledCount,
  siteTasks,
  directoryContactOptions = [],
  directoryCatalog,
  directoryCatalogError = null,
  institutionsForQuickContact,
  siteInstitutionId = null,
  linkedSiteInstitution = null,
  siteBudget,
  studyBudgetName,
  budgetAllocations = {},
  invoiceAllocationRefsByLine = {},
  siteFinanceInvoices,
  sitePaymentSchedules,
  initialSiteSubjects,
  siteFunnel,
  ecrfRollup,
  visitSchedule,
  visitWindowCompliance,
  studySitesForSubjects,
  studyCountries,
  financeApprovalTemplateOptions,
  studyBudgetOptions = [],
  ctmsStudyRouteId,
}: SiteDetailTabsProps) {
  const studyHub = useStudyHub();
  const readOnly = studyHub?.isStudyReadOnly ?? false;
  const isClient = useIsClient();
  const searchParams = useSearchParams();
  const [addContactIntent, setAddContactIntent] = useState<'pi' | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [siteCoords, setSiteCoords] = useState<{ lat: number; lng: number } | null>(
    site.latitude != null && site.longitude != null
      ? { lat: site.latitude, lng: site.longitude }
      : null
  );
  const [airportDirections, setAirportDirections] = useState<DirectionsInfo | null>(null);
  const [hotelDirections, setHotelDirections] = useState<DirectionsInfo | null>(null);
  const [repairInstitutionPending, startRepairInstitutionTransition] = useTransition();
  const router = useRouter();

  const { taskRollup, enrollmentActivity, needsAttention, enrollmentChart } = siteOverviewMetrics;
  const hasPi = Boolean(site.pi_name || site.pi_email);
  const studyBasePath = ctmsStudyRouteId
    ? `/protected/studies/${ctmsStudyRouteId}`
    : `/protected/studies/${study.id}`;
  const requestedTab = searchParams.get('tab');
  const redirectedTab = requestedTab ? LEGACY_SITE_TAB_REDIRECTS[requestedTab] : undefined;
  const mainTab = redirectedTab ?? (requestedTab && SITE_MAIN_TABS.has(requestedTab) ? requestedTab : 'overview');
  const fullAddress =
    [site.address, [site.city, site.state].filter(Boolean).join(', ') || null, site.postal_code]
      .filter(Boolean)
      .join(', ') || null;

  const setTab = useCallback(
    (tab: string, options?: { pi?: boolean }) => {
      if (options?.pi) setAddContactIntent('pi');
      const p = new URLSearchParams(searchParams.toString());
      p.set('tab', tab);
      router.replace(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const onAttentionItem = useCallback(
    (item: AttentionItem) => {
      if (item.ctaAction === 'assign_pi' || item.id === 'no-pi') {
        setAddContactIntent('pi');
      }
      if (item.tab) setTab(item.tab);
    },
    [setTab],
  );

  useEffect(() => {
    const t = searchParams.get('tab');
    if (!t) return;
    const redirected = LEGACY_SITE_TAB_REDIRECTS[t];
    if (redirected) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', redirected);
      router.replace(`?${params.toString()}`, { scroll: false });
      return;
    }
  }, [searchParams, router]);

  const countryDisplay = site.study_countries
    ? `${site.study_countries.country_name} (${site.study_countries.country_code})`
    : null;

  const piInitials = site.pi_name
    ? site.pi_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : site.pi_email
      ? site.pi_email.slice(0, 2).toUpperCase()
      : null;

  const handleCopyEmail = () => {
    if (!site.pi_email) return;
    navigator.clipboard.writeText(site.pi_email);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleGeocode = useCallback((lat: number, lng: number) => {
    setSiteCoords({ lat, lng });
  }, []);

  const handleDirections = useCallback(
    (type: 'airport' | 'hotel', info: DirectionsInfo) => {
      if (type === 'airport') setAirportDirections(info);
      else setHotelDirections(info);
    },
    []
  );

  const siteEditHref = ctmsStudyRouteId
    ? `/protected/studies/${ctmsStudyRouteId}/sites/${site.id}/edit`
    : `/protected/studies/${study.id}/sites/${site.id}/edit`;

  const repairDirectoryOrganization = useCallback(() => {
    startRepairInstitutionTransition(async () => {
      const { error, institutionId } = await repairSiteDirectoryInstitution(site.id, site.study_id);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(institutionId ? 'Directory organization linked' : 'Directory organization sync completed');
      router.refresh();
    });
  }, [router, site.id, site.study_id]);

  const lastPatientEnrolledAt = useMemo(() => {
    const en = new Set<SubjectWithSite['status']>(['randomized', 'active', 'completed']);
    const dates: Date[] = [];
    for (const s of initialSiteSubjects) {
      if (!en.has(s.status)) continue;
      const d = s.randomization_date ? new Date(s.randomization_date) : new Date(s.created_at);
      if (!Number.isNaN(d.getTime())) dates.push(d);
    }
    if (dates.length === 0) return null;
    return max(dates);
  }, [initialSiteSubjects]);

  const milestones: SiteMilestone[] = useMemo(() => {
    const lineFmt = (iso: string | null | undefined) => {
      if (!iso) return null;
      const head = String(iso).slice(0, 10);
      const d0 = parseISO(head);
      if (isValid(d0)) return format(d0, 'MMM d, yyyy');
      const d1 = new Date(String(iso));
      return isValid(d1) ? format(d1, 'MMM d, yyyy') : null;
    };
    return [
      {
        id: 'tl-site',
        label: 'Site activated',
        dateDisplay: lineFmt(site.activation_date),
        icon: 'blue-dot' as const,
      },
      { id: 'tl-fp-pl', label: 'First patient enrolled (Planned)', dateDisplay: null, icon: 'check-sky' as const },
      {
        id: 'tl-fp-ac',
        label: 'First patient enrolled (Actual)',
        dateDisplay: enrollmentActivity.firstSubjectEnrolledAt
          ? lineFmt(enrollmentActivity.firstSubjectEnrolledAt)
          : null,
        icon: 'user-gray' as const,
      },
      {
        id: 'tl-lp-pl',
        label: 'Last patient enrolled (Planned)',
        dateDisplay:
          enrollmentChart.planCompletionDateIso != null
            ? lineFmt(enrollmentChart.planCompletionDateIso)
            : lineFmt(study.end_date),
        icon: 'check-green' as const,
      },
      {
        id: 'tl-lp-ac',
        label: 'Last patient enrolled (Actual)',
        dateDisplay:
          lastPatientEnrolledAt && enrolledCount > 0
            ? format(lastPatientEnrolledAt, 'MMM d, yyyy')
            : null,
        icon: 'clock-gray' as const,
      },
      {
        id: 'tl-dm',
        label: 'Database lock (Planned)',
        dateDisplay: lineFmt(study.end_date),
        icon: 'lock-sky' as const,
      },
    ] satisfies SiteMilestone[];
  }, [
    site.activation_date,
    study.end_date,
    enrollmentActivity.firstSubjectEnrolledAt,
    enrolledCount,
    lastPatientEnrolledAt,
    enrollmentChart.planCompletionDateIso,
  ]);

  useStudyBreadcrumbLeaf(site.name ?? site.site_number ?? null);

  return (
    <div className="space-y-6">
      <SitePageHeader
        siteName={site.name ?? (site.site_number != null ? `Site ${site.site_number}` : 'Site')}
        fullAddress={fullAddress}
        studyHref={studyBasePath}
        studyPhase={study.phase}
        siteStatus={site.status}
      />

      {!isClient ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-10 max-w-xl rounded-md bg-muted/50 animate-pulse" />
          <div className="min-h-[280px] rounded-md border border-dashed border-border/60 bg-muted/20 animate-pulse" />
        </div>
      ) : (
      <Tabs
        tabsId="site-detail"
        value={mainTab}
        onValueChange={(v) => {
          if (SITE_MAIN_TABS.has(v)) setTab(v);
        }}
        className="space-y-4"
      >
        <TooltipProvider delay={200}>
        <TabsList>
          <SiteTabWithTooltip
            value="overview"
            tooltip="Site overview: key KPIs, enrollment performance, site monitoring, milestones, and when metrics were last updated."
          >
            <Building2 className="mr-1 h-3.5 w-3.5" />
            Overview
          </SiteTabWithTooltip>
          <SiteTabWithTooltip
            value="contacts"
            tooltip="Site and directory contacts for this study site."
          >
            <Users className="mr-1 h-3.5 w-3.5" />
            Contacts ({site.site_contacts?.length ?? 0})
          </SiteTabWithTooltip>
          <SiteTabWithTooltip
            value="tasks"
            tooltip="Open and overdue tasks for this site."
          >
            <ListTodo className="mr-1 h-3.5 w-3.5" />
            Tasks ({taskRollup.openCount})
          </SiteTabWithTooltip>
          <SiteTabWithTooltip
            value="subjects"
            tooltip="Subjects enrolled or managed at this site, including the enrollment funnel."
          >
            <Users className="mr-1 h-3.5 w-3.5" />
            Subjects ({initialSiteSubjects.length})
          </SiteTabWithTooltip>
          <SiteTabWithTooltip
            value="ecrf-tracking"
            tooltip="eCRF data entry status, open queries, and protocol deviations for this site."
          >
            <ClipboardList className="mr-1 h-3.5 w-3.5" />
            eCRF Tracking
          </SiteTabWithTooltip>
          <SiteTabWithTooltip
            value="visit-window-compliance"
            tooltip="Visit schedule and visit-window compliance (on time vs. overdue) for this site."
          >
            <CalendarClock className="mr-1 h-3.5 w-3.5" />
            Visit Window Compliance
          </SiteTabWithTooltip>
          <SiteTabWithTooltip
            value="financials"
            tooltip="Invoices, site budget, and payment schedules for this site."
          >
            <DollarSign className="mr-1 h-3.5 w-3.5" />
            Financials
          </SiteTabWithTooltip>
        </TabsList>
        </TooltipProvider>

        <TabsContent value="overview">
          <div className="space-y-6">
            <SiteOverviewKpiSix
              siteOverviewMetrics={siteOverviewMetrics}
              enrolledCount={enrolledCount}
              targetEnrollment={site.target_enrollment}
              enrollmentBehindPlan={enrollmentChart.behindPlan}
              hasPi={hasPi}
              piDisplay={site.pi_name ?? site.pi_email}
              onTab={setTab}
            />

            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 min-w-0 lg:col-span-8">
                <SiteEnrollmentPerformance
                  className="h-full"
                  chart={enrollmentChart}
                  enrolledCount={enrolledCount}
                  onViewEnrollmentPlan={() => setTab('subjects')}
                />
              </div>
              <div className="min-w-0 lg:col-span-4">
                <SiteNeedsAttention
                  variant="v2"
                  items={needsAttention}
                  onNavigate={onAttentionItem}
                  onViewAll={() => setTab('tasks')}
                  readOnly={readOnly}
                />
              </div>
            </div>

            <div
              className="grid grid-cols-1 gap-4 xl:grid-cols-12"
              id="site-overview-enrollment"
            >
              <div className="min-w-0 xl:col-span-6">
                <SiteMonitoringOverviewColumn
                  visitSchedule={visitSchedule}
                  visitWindowCompliance={visitWindowCompliance}
                  ecrfRollup={ecrfRollup}
                  protocolDeviationCount={siteOverviewMetrics.protocolDeviationCount}
                  openQueryDeltaHint={siteOverviewMetrics.openQueryDeltaHint}
                  onTab={setTab}
                />
              </div>

              <div className="min-w-0 space-y-4 xl:col-span-3">
                <SitePiAndLocationCard
                  readOnly={readOnly}
                  siteNumber={site.site_number}
                  countryDisplay={countryDisplay}
                  studyTitle={study.title}
                  addressLine={fullAddress}
                  siteEditHref={siteEditHref}
                  linkedInstitution={linkedSiteInstitution}
                  onRepairDirectoryOrganization={repairDirectoryOrganization}
                  repairDirectoryOrganizationPending={repairInstitutionPending}
                  onViewMap={() => setMapOpen(true)}
                  hasPi={hasPi}
                  piName={site.pi_name ?? site.pi_email}
                  piInitials={piInitials}
                  onAddPi={() => setTab('contacts', { pi: true })}
                  onAssignFromContacts={() => setTab('contacts', { pi: true })}
                  mailSection={
                    site.pi_email ? (
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={`mailto:${site.pi_email}`}
                          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3" />
                          {site.pi_email}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={handleCopyEmail}
                        >
                          {emailCopied ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ) : null
                  }
                />
              </div>

              <div className="min-w-0 xl:col-span-3">
                <SiteMilestoneTimeline
                  milestones={milestones}
                  onViewFullTimeline={() => setTab('tasks')}
                />
              </div>
            </div>

            <SiteOverviewFooter
              siteUpdatedAtIso={site.updated_at}
              dataAsOfIso={siteOverviewMetrics.generatedAtIso}
            />

            <Dialog open={mapOpen} onOpenChange={setMapOpen}>
              <DialogContent
                className="max-w-3xl w-[min(100vw-2rem,48rem)] max-h-[min(90vh,720px)] overflow-y-auto p-0 gap-0"
                showCloseButton
              >
                <DialogHeader className="px-6 py-4 border-b border-border/60">
                  <DialogTitle>Site location</DialogTitle>
                </DialogHeader>
                <div className="p-4">
                  <SiteMap
                    siteName={site.name}
                    address={site.address}
                    city={site.city}
                    state={site.state}
                    postalCode={site.postal_code}
                    persistence={{ kind: 'study_site', siteId: site.id, studyId: site.study_id }}
                    savedAirport={{
                      placeId: site.nearest_airport_place_id,
                      name: site.nearest_airport_name,
                      address: site.nearest_airport_address,
                    }}
                    savedHotel={{
                      placeId: site.nearest_hotel_place_id,
                      name: site.nearest_hotel_name,
                      address: site.nearest_hotel_address,
                    }}
                    onGeocode={handleGeocode}
                    onDirections={handleDirections}
                    airportDirections={airportDirections}
                    hotelDirections={hotelDirections}
                  />
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <SiteWeather lat={siteCoords?.lat ?? null} lng={siteCoords?.lng ?? null} />
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <SiteContactsPanel
            companyId={study.company_id}
            siteId={site.id}
            studyId={site.study_id}
            initialContacts={site.site_contacts ?? []}
            directoryContactOptions={directoryContactOptions}
            directoryCatalog={directoryCatalog}
            directoryCatalogError={directoryCatalogError}
            institutions={institutionsForQuickContact}
            siteInstitutionId={siteInstitutionId}
            openAddContactIntent={addContactIntent}
            onAddContactIntentConsumed={() => setAddContactIntent(null)}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <SiteTasksTable tasks={siteTasks} onRefresh={() => router.refresh()} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectsTab
            studyId={site.study_id}
            initialSubjects={initialSiteSubjects}
            initialFunnel={siteFunnel}
            countries={studyCountries}
            sites={studySitesForSubjects}
            siteScopeId={site.id}
          />
        </TabsContent>

        <TabsContent value="ecrf-tracking">
          <SiteEcrfTrackingTab
            studyId={site.study_id}
            siteId={site.id}
            bundle={ecrfRollup}
          />
        </TabsContent>

        <TabsContent value="visit-window-compliance">
          <SiteVisitScheduleTab
            studyId={site.study_id}
            siteId={site.id}
            bundle={visitSchedule}
            complianceBundle={visitWindowCompliance}
          />
        </TabsContent>

        <TabsContent value="financials">
          <SiteFinancialsPanel
            studyId={study.id}
            siteId={site.id}
            siteDetailPath={
              ctmsStudyRouteId
                ? `/protected/studies/${ctmsStudyRouteId}/sites/${site.id}`
                : undefined
            }
            companyId={study.company_id}
            siteLabel={site.name ?? (site.site_number != null ? `Site ${site.site_number}` : site.id)}
            studyLabel={study.title ?? study.protocol_number ?? study.id}
            siteBudget={siteBudget}
            studyBudgetName={studyBudgetName}
            budgetAllocations={budgetAllocations}
            invoiceAllocationRefsByLine={invoiceAllocationRefsByLine}
            invoices={siteFinanceInvoices}
            schedules={sitePaymentSchedules}
            invoiceSites={[
              { id: site.id, site_number: site.site_number, name: site.name },
            ]}
            financeApprovalTemplateOptions={financeApprovalTemplateOptions}
            studyBudgetOptions={studyBudgetOptions}
            initialFinancialsSubTab={searchParams.get('siteFinTab')}
            highlightInvoiceId={searchParams.get('invoice')}
          />
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
