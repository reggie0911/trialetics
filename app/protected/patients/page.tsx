import { redirect } from 'next/navigation';
import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { PatientsNavbar } from '@/components/patients/patients-navbar';
import { PatientsPageClient } from '@/components/patients/patients-page-client';
import { createClient } from '@/lib/server';

export default async function PatientsPage() {
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

  // Fetch user's projects based on role
  let projectsQuery = supabase
    .from('projects')
    .select('id, protocol_number, protocol_name, protocol_status, trial_phase')
    .eq('company_id', profile.company_id!)
    .order('protocol_number', { ascending: true });

  // For non-admin users, only show projects they're assigned to
  if (profile.role !== 'admin') {
    const { data: userProjects } = await supabase
      .from('user_projects')
      .select('project_id')
      .eq('user_id', profile.id);

    const projectIds = userProjects?.map(up => up.project_id) || [];
    projectsQuery = projectsQuery.in('id', projectIds);
  }

  const { data: projects } = await projectsQuery;

  return (
    <div className="min-h-screen bg-background">
      <ProtectedNavbar />
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header with Navigation */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold mb-1">
              Patient Data Tracker
            </h1>
            <p className="text-xs text-muted-foreground">
              Upload and manage monthly patient data exports
            </p>
          </div>
          <PatientsNavbar />
        </div>

        {/* Client-side component for data management */}
        <PatientsPageClient 
          projects={projects || []} 
          profileId={profile.id}
        />
      </main>
    </div>
  );
}
