import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { OrganizationDetailPageClient } from '@/components/contacts-organizations/organization-detail-page-client';
import { SiteDetailPageClient } from '@/components/contacts-organizations/site-detail-page-client';
import { createClient } from '@/lib/server';
import { getOrganization, getOrganizationStatusHistory } from '@/lib/actions/organizations';
import { getAllContacts } from '@/lib/actions/contacts';
import { getOrganizationClinicalTrials } from '@/lib/actions/organization-clinical-trials';
import { getSiteVisits, getProfilesForCompany } from '@/lib/actions/site-visits';
import { getSiteContracts } from '@/lib/actions/site-contracts';
import { getSiteDocuments } from '@/lib/actions/site-documents';
import { getSatelliteSites, getParentSite } from '@/lib/actions/organizations';
import { getOrganizationTeamMembers } from '@/lib/actions/organization-team-members';
import { getOrganizationActivity } from '@/lib/utils/activity-logger';
import { getOrganizationNotes } from '@/lib/actions/organization-notes';
import { getTripReportsByOrganization } from '@/lib/actions/trip-reports';

export default async function OrganizationDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<Record<string, string | string[]>>;
  }
) {
  const searchParams = await props.searchParams;
  const { id } = await props.params;
  if (searchParams) await searchParams;

  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  // Fetch user profile with company_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id, role, email')
    .eq('user_id', data.user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/auth/login');
  }

  // Fetch organization data
  const organizationResult = await getOrganization(id);

  if (!organizationResult.success || !organizationResult.data) {
    redirect('/protected/contacts-organizations');
  }

  // Fetch Clinical Trials associations (clinical_sites, protocol_assignments)
  const clinicalTrialsResult = await getOrganizationClinicalTrials(id);
  const clinicalTrials = clinicalTrialsResult.success && clinicalTrialsResult.data
    ? clinicalTrialsResult.data
    : { clinical_sites: [], protocol_assignments: [] };

  // Fetch activity history
  const activityResult = await getOrganizationActivity(id);
  const activities = activityResult.success && activityResult.data ? activityResult.data : [];

  // Fetch organization notes
  const notes = await getOrganizationNotes(id);

  // Fetch status history and site visits for sites
  const statusHistory = organizationResult.data.organization_type === 'site'
    ? (await getOrganizationStatusHistory(id)).data ?? []
    : [];
  const siteVisits = organizationResult.data.organization_type === 'site'
    ? (await getSiteVisits(id)).data ?? []
    : [];
  const siteContracts = organizationResult.data.organization_type === 'site'
    ? (await getSiteContracts(id)).data ?? []
    : [];
  const siteDocuments = organizationResult.data.organization_type === 'site'
    ? (await getSiteDocuments(id)).data ?? []
    : [];
  const profiles = organizationResult.data.organization_type === 'site'
    ? (await getProfilesForCompany(profile.company_id)).data ?? []
    : [];
  const satelliteSites = organizationResult.data.organization_type === 'site'
    ? (await getSatelliteSites(id)).data ?? []
    : [];
  const parentSite = organizationResult.data.organization_type === 'site'
    ? (await getParentSite(id)).data ?? null
    : null;
  const siteTeamMembers = organizationResult.data.organization_type === 'site'
    ? (await getOrganizationTeamMembers(id)).data ?? []
    : [];
  const tripReportsResult = organizationResult.data.organization_type === 'site'
    ? await getTripReportsByOrganization(id)
    : { success: true, data: [] };
  const tripReports = tripReportsResult.success && tripReportsResult.data
    ? tripReportsResult.data
    : [];
  const contactsForSite = organizationResult.data.organization_type === 'site'
    ? (await getAllContacts(profile.company_id)).data ?? []
    : [];
  const siteVisitToTripReport: Record<string, string> = {};
  const sortedByVersion = [...tripReports].sort(
    (a, b) => ((b as { version?: number }).version ?? 0) - ((a as { version?: number }).version ?? 0)
  );
  for (const tr of sortedByVersion) {
    const trData = tr as { site_visit_id: string; id: string };
    if (!siteVisitToTripReport[trData.site_visit_id]) {
      siteVisitToTripReport[trData.site_visit_id] = trData.id;
    }
  }

  // Route to specialized component for sites
  if (organizationResult.data.organization_type === 'site') {
    return (
      <div className="min-h-screen bg-[#E9E9E9]">
        <ProtectedNavbar />
        <SiteDetailPageClient 
          organization={organizationResult.data}
          activities={activities}
          notes={notes}
          clinicalTrials={clinicalTrials}
          statusHistory={statusHistory}
          siteVisits={siteVisits}
          siteContracts={siteContracts}
          siteDocuments={siteDocuments}
          satelliteSites={satelliteSites}
          parentSite={parentSite}
          siteTeamMembers={siteTeamMembers}
          profiles={profiles}
          contacts={contactsForSite}
          companyId={profile.company_id}
          profileId={profile.id}
          userEmail={profile.email || data.user.email || ''}
          siteVisitToTripReport={siteVisitToTripReport}
        />
      </div>
    );
  }

  // Default organization detail page for non-sites
  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <OrganizationDetailPageClient 
        organization={organizationResult.data}
        activities={activities}
        notes={notes}
        clinicalTrials={clinicalTrials}
        companyId={profile.company_id}
        profileId={profile.id}
        userEmail={profile.email || data.user.email || ''}
      />
    </div>
  );
}
