import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { AENavbar } from '@/components/ae/ae-navbar';
import { AEPageClient } from '@/components/ae/ae-page-client';
import { createClient } from '@/lib/server';

export default async function AEPage() {
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
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header with Navigation */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold mb-1">
              AE Metrics
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Upload and manage adverse event data
            </p>
          </div>
          <AENavbar />
        </div>

        {/* Client-side component for data management */}
        <AEPageClient companyId={profile.company_id || ""} profileId={profile.id} />
      </main>
    </div>
  );
}
