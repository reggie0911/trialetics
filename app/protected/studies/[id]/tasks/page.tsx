import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getAllMilestones } from '@/lib/actions/milestones';
import { getAllTasks, getTaskDashboardCounts } from '@/lib/actions/tasks';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { TasksClient } from '@/components/ctms/tasks/tasks-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyTasksPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const [milestones, tasks, counts] = await Promise.all([
    getAllMilestones(studyId),
    getAllTasks({ studyId }),
    getTaskDashboardCounts(studyId),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Project Team Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Milestones and assignments for this study.
        </p>
      </div>
      <TasksClient
        initialMilestones={milestones}
        initialTasks={tasks}
        studies={[
          {
            id: study.id,
            title: study.title,
            study_name: study.study_name,
            protocol_number: study.protocol_number,
          },
        ]}
        initialCounts={counts}
        isAdmin={profile?.role === 'admin'}
        lockedStudyId={studyId}
      />
    </div>
  );
}
