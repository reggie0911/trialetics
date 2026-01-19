import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ModuleNavbar } from '@/components/layout/module-navbar';
import { PatientsPageClient } from '@/components/patients/patients-page-client';
import { createClient } from '@/lib/server';

export default async function PatientsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  // Fetch user profile with company_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, display_name, company_id, role')
    .eq('user_id', data.user.id)
    .single();

  if (!profile || !profile.company_id) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header with Navigation */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
              MRace Performance Tracker
            </h1>
            <p className="text-xs text-muted-foreground">
              Upload and manage patient data for your company
            </p>
          </div>
          <ModuleNavbar />
        </div>

        {/* Client-side component for data management */}
        <PatientsPageClient 
          companyId={profile.company_id} 
          profileId={profile.id}
        />
      </main>
    </div>
  );
}
