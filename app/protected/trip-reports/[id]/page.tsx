import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { TripReportDetailPageClient } from '@/components/trip-reports/trip-report-detail-page-client';
import { createClient } from '@/lib/server';
import { getTripReport } from '@/lib/actions/trip-reports';
import { getProfilesForCompany } from '@/lib/actions/site-visits';
import { getTripReportTemplates } from '@/lib/actions/trip-report-templates';
import { getOrganizationContacts } from '@/lib/actions/organizations';

export default async function TripReportDetailPage(
  props: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<Record<string, string | string[]>>;
  }
) {
  const searchParams = await props.searchParams;
  const { id } = await props.params;
  if (searchParams) await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id, role, email')
    .eq('user_id', data.user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/auth/login');
  }

  const reportResult = await getTripReport(id);
  if (!reportResult.success || !reportResult.data) {
    redirect('/protected/trip-reports');
  }

  const [profilesRes, templatesRes, contactsRes] = await Promise.all([
    getProfilesForCompany(profile.company_id),
    getTripReportTemplates(profile.company_id),
    (() => {
      const sv = reportResult.data!.site_visit as { organization_id?: string } | undefined;
      const orgId = sv?.organization_id;
      return orgId ? getOrganizationContacts(orgId) : Promise.resolve({ success: true, data: [] });
    })(),
  ]);

  const profiles = profilesRes.success && profilesRes.data ? profilesRes.data : [];
  const templates = templatesRes.success && templatesRes.data ? templatesRes.data : [];
  const orgContacts = contactsRes.success && contactsRes.data ? contactsRes.data : [];

  return (
    <div className="min-h-screen bg-[#E9E9E9] font-[var(--font-poppins)]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <TripReportDetailPageClient
          moduleNavbar={<ModuleNavbar />}
          report={reportResult.data}
          profiles={profiles}
          templates={templates}
          orgContacts={orgContacts}
          companyId={profile.company_id}
          profileId={profile.id}
          userEmail={profile.email || data.user.email || ''}
        />
      </main>
    </div>
  );
}
