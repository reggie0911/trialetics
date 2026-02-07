import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { OrganizationDetailPageClient } from '@/components/contacts-organizations/organization-detail-page-client';
import { SiteDetailPageClient } from '@/components/contacts-organizations/site-detail-page-client';
import { createClient } from '@/lib/server';
import { getOrganization } from '@/lib/actions/organizations';
import { getOrganizationActivity } from '@/lib/utils/activity-logger';
import { getOrganizationNotes } from '@/lib/actions/organization-notes';

export default async function OrganizationDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Await params in Next.js 15+
  const { id } = await params;
  
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

  // Fetch activity history
  const activityResult = await getOrganizationActivity(id);
  const activities = activityResult.success && activityResult.data ? activityResult.data : [];

  // Fetch organization notes
  const notes = await getOrganizationNotes(id);

  // Route to specialized component for sites
  if (organizationResult.data.organization_type === 'site') {
    return (
      <div className="min-h-screen bg-[#E9E9E9]">
        <ProtectedNavbar />
        <SiteDetailPageClient 
          organization={organizationResult.data}
          activities={activities}
          notes={notes}
          companyId={profile.company_id}
          profileId={profile.id}
          userEmail={profile.email || data.user.email || ''}
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
        companyId={profile.company_id}
        profileId={profile.id}
        userEmail={profile.email || data.user.email || ''}
      />
    </div>
  );
}
