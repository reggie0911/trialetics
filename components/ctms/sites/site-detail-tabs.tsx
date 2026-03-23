'use client';

import { useState, useCallback, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  ArrowLeft,
  Users as UsersIcon,
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
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type {
  StudySiteWithDetails,
  Study,
  FinanceInvoiceWithRelations,
  SiteBudgetRow,
  PaymentScheduleWithSite,
} from '@/lib/types/ctms';
import { updateSite } from '@/lib/actions/sites';

import { SiteActivationStepper } from './site-activation-stepper';
import { SiteContactsPanel } from './site-contacts-panel';
import { SiteMap, type DirectionsInfo } from './site-map';
import { SiteWeather } from './site-weather';
import { SiteTasksTable } from './site-tasks-table';
import { SiteFinancialsPanel } from './site-financials-panel';
import type { TaskWithRelations } from '@/lib/types/tasks';

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
  study: Pick<Study, 'id' | 'title' | 'protocol_number'>;
  isAdmin: boolean;
  enrolledCount: number;
  siteTasks: TaskWithRelations[];
  directoryContactOptions?: { id: string; label: string }[];
  siteBudget: SiteBudgetRow | null;
  siteFinanceInvoices: FinanceInvoiceWithRelations[];
  sitePaymentSchedules: PaymentScheduleWithSite[];
}

export function SiteDetailTabs({
  site,
  study,
  isAdmin,
  enrolledCount,
  siteTasks,
  directoryContactOptions = [],
  siteBudget,
  siteFinanceInvoices,
  sitePaymentSchedules,
}: SiteDetailTabsProps) {
  const [emailCopied, setEmailCopied] = useState(false);
  const [siteCoords, setSiteCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [airportDirections, setAirportDirections] = useState<DirectionsInfo | null>(null);
  const [hotelDirections, setHotelDirections] = useState<DirectionsInfo | null>(null);
  const router = useRouter();

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href={`/protected/studies/${study.id}`} />}
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
            render={<Link href={`/protected/sites/${site.id}/edit`} />}
            nativeButton={false}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <SiteActivationStepper currentStatus={site.status} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Building2 className="mr-1 h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <UsersIcon className="mr-1 h-3.5 w-3.5" />
            Contacts ({site.site_contacts?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ListTodo className="mr-1 h-3.5 w-3.5" />
            Tasks ({siteTasks.length})
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
              siteId={site.id}
              studyId={site.study_id}
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
                <UsersIcon className="h-4 w-4 shrink-0" />
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
                    <p className="text-sm text-muted-foreground">No PI assigned</p>
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
            siteId={site.id}
            studyId={site.study_id}
            initialContacts={site.site_contacts ?? []}
            directoryContactOptions={directoryContactOptions}
          />
        </TabsContent>

        <TabsContent value="tasks">
          <SiteTasksTable tasks={siteTasks} onRefresh={() => router.refresh()} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="financials">
          <SiteFinancialsPanel
            studyId={study.id}
            siteId={site.id}
            siteBudget={siteBudget}
            invoices={siteFinanceInvoices}
            schedules={sitePaymentSchedules}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
