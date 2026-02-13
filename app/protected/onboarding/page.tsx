import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { AdminOnboardingWizard } from '@/components/onboarding/admin-onboarding-wizard';
import { createClient } from '@/lib/server';

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, company_id, role, email, onboarding_completed_at')
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

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, logo_url')
    .eq('id', profile.company_id)
    .single();

  if (!company) {
    redirect('/protected');
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E9E9E9' }}>
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Trialetics</h1>
          <p className="text-[12px] text-muted-foreground">
            Complete a few steps to set up your organization
          </p>
        </div>
        <AdminOnboardingWizard
          companyId={company.id}
          profileId={profile.id}
          companyLogoUrl={company.logo_url}
          userEmail={profile.email || ''}
        />
      </main>
    </div>
  );
}
