import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getMyTasks, getTaskDashboardCounts } from '@/lib/actions/tasks';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { MyTasksClient } from '@/components/ctms/tasks/my-tasks-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyMyTasksPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  const [tasks, counts] = await Promise.all([
    getMyTasks(studyId),
    getTaskDashboardCounts(studyId, true),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">Tasks assigned to you for this study.</p>
      </div>
      <MyTasksClient
        initialTasks={tasks}
        initialCounts={counts}
        studies={[{ id: study.id, title: study.title }]}
        profileId={profile?.id ?? ''}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  );
}
