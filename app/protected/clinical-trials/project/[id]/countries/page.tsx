import { ProjectCountriesPage } from '@/components/clinical-trials/project-countries-page';

interface CountriesPageProps {
  params: Promise<{ id: string }>;
}

export default async function CountriesPage({ params }: CountriesPageProps) {
  const { id } = await params;
  return <ProjectCountriesPage projectId={id} />;
}
