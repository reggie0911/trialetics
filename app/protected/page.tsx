import { redirect } from 'next/navigation';

import { ProtectedNavbar } from '@/components/layout/protected-navbar';
import { ProtectedProjects } from '@/components/protected-projects';
import { createClient } from '@/lib/server';
import { getUserProjects } from '@/lib/actions/projects';
import { Project } from '@/lib/types/database.types';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  // Fetch user's projects
  const projectsResponse = await getUserProjects();
  const projects: Project[] = projectsResponse.success
    ? projectsResponse.data || []
    : [];

  return (
    <div className="min-h-screen bg-muted/20">
      <ProtectedNavbar />
      <main>
        <ProtectedProjects projects={projects} />
      </main>
    </div>
  );
}
