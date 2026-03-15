import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getMyTasks, getTaskDashboardCounts } from '@/lib/actions/tasks';
import { getStudies } from '@/lib/actions/studies';
import { MyTasksClient } from '@/components/ctms/tasks/my-tasks-client';

export default async function MyTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();

  const [tasks, counts, studies] = await Promise.all([
    getMyTasks(),
    getTaskDashboardCounts(undefined, true),
    getStudies(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Tasks assigned to you.
        </p>
      </div>
      <MyTasksClient
        initialTasks={tasks}
        initialCounts={counts}
        studies={studies.map((s) => ({ id: s.id, title: s.title }))}
        profileId={profile?.id ?? ''}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  );
}
