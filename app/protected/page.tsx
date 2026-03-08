import { redirect } from 'next/navigation';

import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { NoProjectsFallback } from '@/components/no-projects-fallback';
import { ProjectSelectorPage } from '@/components/protected/project-selector-page';
import { createClient } from '@/lib/server';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, onboarding_completed_at, company_id, email, first_name')
    .eq('user_id', data.user.id)
    .single();

  if (profile?.role === 'admin' && !profile?.onboarding_completed_at) {
    redirect('/protected/onboarding');
  }

  if (!profile || !profile.company_id) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <ProjectSelectorPage
          companyId={profile.company_id}
          profileId={profile.id}
          email={profile.email ?? data.user.email ?? ''}
          firstName={profile.first_name}
        />
      </main>
    </div>
  );
}
