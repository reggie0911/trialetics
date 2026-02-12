import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { TripReportTemplateNewPageClient } from '@/components/trip-reports/trip-report-template-new-page-client';
import { createClient } from '@/lib/server';

export default async function NewTemplatePage() {
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
              Create a new trip report template
            </p>
          </div>
          <ModuleNavbar />
        </div>

        <TripReportTemplateNewPageClient
          companyId={profile.company_id}
        />
      </main>
    </div>
  );
}
