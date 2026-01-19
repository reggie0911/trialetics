import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { AdminPageClient } from '@/components/admin/admin-page-client';
import { createClient } from '@/lib/server';

export default async function AdminPage() {
  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id, role, email')
    .eq('user_id', data.user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  // Check if user is admin - redirect non-admins
  if (profile.role !== 'admin') {
    redirect('/protected');
  }

  // Ensure user has a company
  if (!profile.company_id) {
    redirect('/protected');
  }

  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
            Admin Panel
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Manage users, invite new members, and view module access
          </p>
        </div>

        {/* Client-side component for admin management */}
        <AdminPageClient 
          companyId={profile.company_id} 
          profileId={profile.id}
          userEmail={profile.email || ''}
        />
      </main>
    </div>
  );
}
