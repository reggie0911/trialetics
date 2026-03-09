import { ProjectTeamPage } from '@/components/clinical-trials/project-team-page';

interface TeamPageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { id } = await params;
  return <ProjectTeamPage projectId={id} />;
}
