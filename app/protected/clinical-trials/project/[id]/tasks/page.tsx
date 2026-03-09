import { ProjectTasksPage } from '@/components/clinical-trials/project-tasks-page';

interface TasksPageProps {
  params: Promise<{ id: string }>;
}

export default async function TasksPage({ params }: TasksPageProps) {
  const { id } = await params;
  return <ProjectTasksPage projectId={id} />;
}
