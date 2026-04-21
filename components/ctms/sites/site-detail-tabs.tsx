'use client';

import { useState, useCallback, useTransition, useMemo, useSyncExternalStore, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Pencil,
  ArrowLeft,
  Users,
  Building2,
  Mail,
  Copy,
  Check,
  CalendarDays,
  TrendingUp,
  NotebookPen,
  Loader2,
  ListTodo,
  DollarSign,
  ClipboardList,
  CalendarClock,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type {
  StudySiteWithDetails,
  Study,
  StudySite,
  FinanceInvoiceWithRelations,
  FinanceApprovalTemplateOption,
  InvoiceBudgetLineAllocationRef,
  SiteBudgetWithLineItems,
  PaymentScheduleWithSite,
  SiteEcrfRollupBundle,
  SiteVisitScheduleBundle,
  SubjectWithSite,
  EnrollmentFunnelData,
} from '@/lib/types/ctms';
import type { InstitutionRow } from '@/lib/types/directory';
import type { QuickContactCatalogCategory } from '@/components/ctms/directory/quick-contact-form-fields';
import { updateSite } from '@/lib/actions/sites';

import { SiteActivationStepper } from './site-activation-stepper';
import { SiteContactsPanel } from './site-contacts-panel';
import { SiteMap, type DirectionsInfo } from './site-map';
import { SiteWeather } from './site-weather';
import { SiteTasksTable } from './site-tasks-table';
import { SiteFinancialsPanel } from './site-financials-panel';
import type { SiteBudgetStudyOption } from '@/components/ctms/financials/site-budget-from-study-dialog';
import { SubjectsTab } from '@/components/ctms/subjects/subjects-tab';
import { SiteEcrfTrackingTab } from '@/components/ctms/ecrf-tracking/site-ecrf-tracking-tab';
import { SiteVisitScheduleTab } from '@/components/ctms/visit-schedule/site-visit-schedule-tab';
import type { TaskWithRelations } from '@/lib/types/tasks';

const noOpSubscribe = () => () => {};

const SITE_MAIN_TABS = new Set([
  'overview',
  'contacts',
  'tasks',
  'subjects',
  'ecrf-tracking',
  'visit-schedule',
  'financials',
]);

/** Radix Tabs uses @radix-ui/react-id, which can disagree with React 19 SSR useId(); mount tabs only on the client. */
function useIsClient() {
  return useSyncExternalStore(noOpSubscribe, () => true, () => false);
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm">{value || '—'}</dd>
    </div>
  );
}

function TravelNotesCard({
  siteId,
  studyId,
  initialNotes,
}: {
  siteId: string;
  studyId: string;
  initialNotes: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      await updateSite({ id: siteId, study_id: studyId, travel_notes: notes });
      router.refresh();
      setIsEditing(false);
      toast.success('Travel notes saved');
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <NotebookPen className="h-4 w-4" />
            Travel Notes
          </CardTitle>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add parking directions, building entry info, nearby restaurants..."
              rows={4}
              className="resize-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNotes(initialNotes ?? '');
                  setIsEditing(false);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {initialNotes || 'No travel notes yet. Click Edit to add parking directions, building entry info, nearby restaurants, etc.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface SiteDetailTabsProps {
  site: StudySiteWithDetails;
  study: Pick<Study, 'id' | 'title' | 'protocol_number' | 'company_id'>;
  isAdmin: boolean;
  enrolledCount: number;
  siteTasks: TaskWithRelations[];
  directoryContactOptions?: { id: string; label: string }[];
  directoryCatalog: QuickContactCatalogCategory[];
  /** Set when `getDirectoryRoleCatalog` failed (RLS, network, etc.). */
  directoryCatalogError?: string | null;
  institutionsForQuickContact: InstitutionRow[];
  /** Institution row id linked to this study site (parent organization for new site contacts). */
  siteInstitutionId?: string | null;
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
  studySitesForSubjects: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  financeApprovalTemplateOptions: FinanceApprovalTemplateOption[];
  studyBudgetOptions?: SiteBudgetStudyOption[];
  /** Study id for study-scoped CTMS URLs (sites list, edit). */
  ctmsStudyRouteId?: string;
}

export function SiteDetailTabs({
  site,
  study,
  isAdmin,
  enrolledCount,
  siteTasks,
  directoryContactOptions = [],
  directoryCatalog,
  directoryCatalogError = null,
  institutionsForQuickContact,
  siteInstitutionId = null,
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
  studySitesForSubjects,
  financeApprovalTemplateOptions,
  studyBudgetOptions = [],
  ctmsStudyRouteId,
}: SiteDetailTabsProps) {
  const isClient = useIsClient();
  const searchParams = useSearchParams();
  const [mainTab, setMainTab] = useState('overview');
  const [addContactIntent, setAddContactIntent] = useState<'pi' | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [siteCoords, setSiteCoords] = useState<{ lat: number; lng: number } | null>(
    site.latitude != null && site.longitude != null
      ? { lat: site.latitude, lng: site.longitude }
      : null
  );
  const [airportDirections, setAirportDirections] = useState<DirectionsInfo | null>(null);
  const [hotelDirections, setHotelDirections] = useState<DirectionsInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && SITE_MAIN_TABS.has(t)) setMainTab(t);
  }, [searchParams]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const countryDisplay = site.study_countries
    ? `${site.study_countries.country_name} (${site.study_countries.country_code})`
    : null;

  const enrollmentPct = site.target_enrollment > 0
    ? Math.min(100, Math.round((enrolledCount / site.target_enrollment) * 100))
    : 0;

  const daysSinceActivation = useMemo(() => {
    if (!site.activation_date) return null;
    return Math.floor((Date.now() - new Date(site.activation_date).getTime()) / (1000 * 60 * 60 * 24));
  }, [site.activation_date]);

  const piInitials = site.pi_name
    ? site.pi_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
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

  const studyBackHref = ctmsStudyRouteId
    ? `/protected/studies/${ctmsStudyRouteId}/sites`
    : `/protected/studies/${study.id}`;
  const siteEditHref = ctmsStudyRouteId
    ? `/protected/studies/${ctmsStudyRouteId}/sites/${site.id}/edit`
    : `/protected/studies/${study.id}/sites/${site.id}/edit`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={studyBackHref} />}
              nativeButton={false}
              className="-ml-2"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {study.protocol_number}
            </Button>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={siteEditHref} />}
            nativeButton={false}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <SiteActivationStepper currentStatus={site.status} />

      {!isClient ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-10 max-w-xl rounded-md bg-muted/50 animate-pulse" />
          <div className="min-h-[280px] rounded-md border border-dashed border-border/60 bg-muted/20 animate-pulse" />
        </div>
      ) : (
      <Tabs tabsId="site-detail" value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 className="mr-1 h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <Users className="mr-1 h-3.5 w-3.5" />
            Contacts ({site.site_contacts?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ListTodo className="mr-1 h-3.5 w-3.5" />
            Tasks ({siteTasks.length})
          </TabsTrigger>
          <TabsTrigger value="subjects">
            <Users className="mr-1 h-3.5 w-3.5" />
            Subjects ({initialSiteSubjects.length})
          </TabsTrigger>
          <TabsTrigger value="ecrf-tracking">
            <ClipboardList className="mr-1 h-3.5 w-3.5" />
            eCRF Tracking
          </TabsTrigger>
          <TabsTrigger value="visit-schedule">
            <CalendarClock className="mr-1 h-3.5 w-3.5" />
            Visit Window Compliance
          </TabsTrigger>
          <TabsTrigger value="financials">
            <DollarSign className="mr-1 h-3.5 w-3.5" />
            Financials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Map with nearby places */}
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

            {/* Stats strip + Weather */}
            <div className="flex flex-wrap items-center gap-3 px-1">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 shrink-0" />
                <span className="font-medium text-foreground">{enrolledCount}</span>
                <span>/ {site.target_enrollment} enrolled</span>
              </div>
              <span className="text-muted-foreground/40">&middot;</span>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">{site.site_contacts?.length ?? 0}</span> contacts
                </span>
              </div>
              <span className="text-muted-foreground/40">&middot;</span>
              <SiteWeather lat={siteCoords?.lat ?? null} lng={siteCoords?.lng ?? null} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Site Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Site Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y">
                    <DetailRow label="Site Number" value={site.site_number} />
                    <DetailRow label="Site Name" value={site.name} />
                    <DetailRow label="Status" value={site.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />
                    <DetailRow label="Country" value={countryDisplay} />
                    <DetailRow label="Study" value={study.title} />
                    <DetailRow label="Address" value={[site.address, site.city, site.state, site.postal_code].filter(Boolean).join(', ')} />
                  </dl>
                </CardContent>
              </Card>

              {/* PI Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Principal Investigator</CardTitle>
                </CardHeader>
                <CardContent>
                  {site.pi_name || site.pi_email ? (
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {piInitials ?? '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{site.pi_name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Principal Investigator</p>
                        {site.pi_email && (
                          <div className="flex items-center gap-2 mt-2">
                            <a
                              href={`mailto:${site.pi_email}`}
                              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                            >
                              <Mail className="h-3 w-3" />
                              {site.pi_email}
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={handleCopyEmail}
                            >
                              {emailCopied
                                ? <Check className="h-3 w-3 text-green-500" />
                                : <Copy className="h-3 w-3" />
                              }
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">No PI assigned</p>
                      <Button
                        type="button"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setMainTab('contacts');
                          setAddContactIntent('pi');
                        }}
                      >
                        Add Principal Investigator
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Creates a directory contact and links them as Principal Investigator on this site.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enrollment Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Enrollment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{enrolledCount}</p>
                      <p className="text-sm text-muted-foreground">of {site.target_enrollment} target</p>
                    </div>
                    <p className="text-2xl font-semibold text-muted-foreground">{enrollmentPct}%</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${enrollmentPct}%` }}
                    />
                  </div>
                  {daysSinceActivation !== null && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>Activated {daysSinceActivation} days ago ({formatDate(site.activation_date)})</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y">
                    <DetailRow label="Activation Date" value={formatDate(site.activation_date)} />
                    <DetailRow label="Created" value={formatDate(site.created_at)} />
                    <DetailRow label="Last Updated" value={formatDate(site.updated_at)} />
                  </dl>
                </CardContent>
              </Card>
            </div>

            {/* Travel Notes */}
            <TravelNotesCard
              siteId={site.id}
              studyId={site.study_id}
              initialNotes={site.travel_notes}
            />
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
            sites={studySitesForSubjects}
            siteScopeId={site.id}
          />
        </TabsContent>

        <TabsContent value="ecrf-tracking">
          <SiteEcrfTrackingTab
            studyId={site.study_id}
            siteId={site.id}
            scopeLabel={`Site ${site.site_number}${site.name ? ` — ${site.name}` : ''}`}
            bundle={ecrfRollup}
          />
        </TabsContent>

        <TabsContent value="visit-schedule">
          <SiteVisitScheduleTab
            studyId={site.study_id}
            siteId={site.id}
            scopeLabel={`Site ${site.site_number}${site.name ? ` — ${site.name}` : ''}`}
            bundle={visitSchedule}
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
