import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { DocumentManagementNavbar } from '@/components/document-management/document-management-navbar';
import { DocumentManagementInternalNavbar } from '@/components/document-management/document-management-internal-navbar';
import { ScorecardPageClient } from '@/components/document-management/scorecard/scorecard-page-client';
import { PasscodeProtection } from '@/components/document-management/passcode-protection';
import { createClient } from '@/lib/server';

export default async function ScorecardPage() {
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
    <PasscodeProtection>
      <div className="min-h-screen bg-[#E9E9E9]">
        <ProtectedNavbar />
        <main className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 py-4 sm:py-8">
          {/* Header with Navigation */}
          <div className="mb-6 sm:mb-8 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-[32px] font-semibold tracking-[-1px]">
                    Compliance Scorecard
                  </h1>
                  <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-md animate-pulse">
                    Beta
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Track regulatory document reconciliation completeness across all study sites
                </p>
              </div>
              <DocumentManagementNavbar />
            </div>
            <DocumentManagementInternalNavbar />
          </div>

          {/* Client-side component for scorecard */}
          <ScorecardPageClient companyId={profile.company_id || ""} />
        </main>
      </div>
    </PasscodeProtection>
  );
}
