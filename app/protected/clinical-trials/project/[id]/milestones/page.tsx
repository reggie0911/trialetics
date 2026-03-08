import { ProjectMilestonesPage } from '@/components/clinical-trials/project-milestones-page';

interface MilestonesPageProps {
  params: Promise<{ id: string }>;
}

export default async function MilestonesPage({ params }: MilestonesPageProps) {
  const { id } = await params;
  return <ProjectMilestonesPage projectId={id} />;
}
