import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { PermissionsPageClient } from '@/components/permissions/permissions-page-client';
import { createClient } from '@/lib/server';

export default async function PermissionsPage() {
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

  if (!profile) {
    redirect('/auth/login');
  }

  if (profile.role !== 'admin') {
    redirect('/protected');
  }

  if (!profile.company_id) {
    redirect('/protected');
  }

  return (
    <div className="min-h-screen bg-[#E9E9E9] font-[var(--font-poppins)]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <PermissionsPageClient companyId={profile.company_id} />
      </main>
    </div>
  );
}
