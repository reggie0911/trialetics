import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ContactDetailPageClient } from '@/components/contacts-organizations/contact-detail-page-client';
import { createClient } from '@/lib/server';
import { getContact } from '@/lib/actions/contacts';
import { getContactActivity } from '@/lib/utils/activity-logger';

export default async function ContactDetailPage({ 
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

  // Fetch contact data
  const contactResult = await getContact(id);
  
  if (!contactResult.success || !contactResult.data) {
    redirect('/protected/contacts-organizations');
  }

  // Fetch activity history
  const activityResult = await getContactActivity(id);
  const activities = activityResult.success && activityResult.data ? activityResult.data : [];

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <ContactDetailPageClient 
        contact={contactResult.data}
        activities={activities}
        companyId={profile.company_id}
        profileId={profile.id}
        userEmail={profile.email || data.user.email || ''}
      />
    </div>
  );
}
