import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { SDVTrackerPageClient } from '@/components/sdv-tracker/sdv-tracker-page-client';
import { createClient } from '@/lib/server';

export default async function SDVTrackerPage() {
  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id, role')
    .eq('user_id', data.user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-[#E9E9E9]">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header with Navigation */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-[32px] font-semibold tracking-[-1px]">
                Source Data Verification Report
              </h1>
              <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-md animate-pulse">
                Beta
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Monitor SDV completion rates across clinical trials with real-time percentage dashboards
            </p>
          </div>
          <ModuleNavbar />
        </div>

        {/* Client-side component for data management */}
        <SDVTrackerPageClient companyId={profile.company_id || ""} profileId={profile.id} />
      </main>
    </div>
  );
}
