import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { DemoModeClient } from '@/components/clinical-payments/demo-mode-client';
import { createClient } from '@/lib/server';

export default async function ClinicalPaymentsDemoPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, email')
    .eq('user_id', user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/protected');
  }

  return (
    <div className="min-h-screen bg-[#E9E9E9] font-sans">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
              Clinical Payments Demo
            </h1>
            <p className="text-xs text-muted-foreground">
              Seed realistic demo data, follow the guided walkthrough, and present the full Clinical Payments flow
            </p>
          </div>
          <ModuleNavbar />
        </div>

        <DemoModeClient
          companyId={profile.company_id}
          profileId={profile.id}
        />
      </main>
    </div>
  );
}
