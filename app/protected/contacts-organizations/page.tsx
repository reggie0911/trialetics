import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ContactsOrganizationsPageClient } from '@/components/contacts-organizations/contacts-organizations-page-client';
import { createClient } from '@/lib/server';

export default async function ContactsOrganizationsPage() {
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

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
            Contacts & Organizations
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage organizations, sites, sponsors, and contact information for your clinical trials
          </p>
        </div>

        {/* Client-side component for data management */}
        <ContactsOrganizationsPageClient 
          companyId={profile.company_id} 
          profileId={profile.id}
          userEmail={profile.email || data.user.email || ''}
        />
      </main>
    </div>
  );
}
