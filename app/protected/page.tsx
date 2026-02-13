import { redirect } from 'next/navigation';

import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ProtectedProjects } from '@/components/protected-projects';
import { createClient } from '@/lib/server';
import { getUserProjects } from '@/lib/actions/projects';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, onboarding_completed_at')
    .eq('user_id', data.user.id)
    .single();

  if (profile?.role === 'admin' && !profile?.onboarding_completed_at) {
    redirect('/protected/onboarding');
  }

  // Fetch user's assigned protocols (formerly projects)
  const projectsResponse = await getUserProjects();
  const projects = (projectsResponse.success ? projectsResponse.data || [] : []) as import('@/lib/actions/projects').AssignedProtocol[];

  return (
    <div className="min-h-screen bg-muted/20">
      <ProtectedNavbar />
      <main>
        <ProtectedProjects projects={projects} />
      </main>
    </div>
  );
}
