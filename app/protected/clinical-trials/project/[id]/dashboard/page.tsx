import { ProjectDashboardPage } from '@/components/clinical-trials/project-dashboard-page';

interface DashboardPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { id } = await params;
  return <ProjectDashboardPage projectId={id} />;
}
