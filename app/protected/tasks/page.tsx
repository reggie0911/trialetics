import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getAllMilestones } from '@/lib/actions/milestones';
import { getAllTasks, getTaskDashboardCounts } from '@/lib/actions/tasks';
import { getStudies } from '@/lib/actions/studies';
import { TasksClient } from '@/components/ctms/tasks/tasks-client';

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const [milestones, tasks, studies, counts] = await Promise.all([
    getAllMilestones(),
    getAllTasks(),
    getStudies(),
    getTaskDashboardCounts(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Project Team Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Manage milestone-based task groups and assign work to team members and sites.
        </p>
      </div>
      <TasksClient
        initialMilestones={milestones}
        initialTasks={tasks}
        studies={studies.map((s) => ({ id: s.id, title: s.title }))}
        initialCounts={counts}
        isAdmin={profile?.role === 'admin'}
      />
    </div>
  );
}
