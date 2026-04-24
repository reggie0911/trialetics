import OldProjectOverviewPage from '@/app/protected/brand-forge/[projectId]/page';

interface StudyBrandForgeProjectPageProps {
  params: Promise<{ id: string; projectId: string }>;
}

export default async function StudyBrandForgeProjectPage({ params }: StudyBrandForgeProjectPageProps) {
  const { projectId } = await params;
  return <OldProjectOverviewPage params={Promise.resolve({ projectId })} />;
}
