import { ProjectHomePage } from '@/components/clinical-trials/project-home-page';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  return <ProjectHomePage projectId={id} />;
}
