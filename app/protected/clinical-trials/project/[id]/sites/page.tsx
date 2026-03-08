import { ProjectSitesPage } from '@/components/clinical-trials/project-sites-page';

interface SitesPageProps {
  params: Promise<{ id: string }>;
}

export default async function SitesPage({ params }: SitesPageProps) {
  const { id } = await params;
  return <ProjectSitesPage projectId={id} />;
}
