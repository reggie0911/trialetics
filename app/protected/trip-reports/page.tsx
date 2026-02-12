import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { TripReportsPageClient } from '@/components/trip-reports/trip-reports-page-client';
import { createClient } from '@/lib/server';

export default async function TripReportsPage() {
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

  return (
    <div className="min-h-screen bg-[#E9E9E9] font-[var(--font-poppins)]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
              Clinical Trip Reports
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage trip reports for site visits: templates, checklists, follow-ups, and approval workflow
            </p>
          </div>
          <ModuleNavbar />
        </div>

        <Suspense fallback={<div className="py-12 text-center text-xs">Loading...</div>}>
          <TripReportsPageClient
            companyId={profile.company_id}
            profileId={profile.id}
            userEmail={profile.email || data.user.email || ''}
          />
        </Suspense>
      </main>
    </div>
  );
}
