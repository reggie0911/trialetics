import { ProjectSvrPage } from '@/components/clinical-trials/project-svr-page';

interface SvrPageProps {
  params: Promise<{ id: string }>;
}

export default async function SvrPage({ params }: SvrPageProps) {
  const { id } = await params;
  return <ProjectSvrPage projectId={id} />;
}
