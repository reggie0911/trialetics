import { ProjectSubjectsPage } from '@/components/clinical-trials/project-subjects-page';

interface SubjectsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectsPage({ params }: SubjectsPageProps) {
  const { id } = await params;
  return <ProjectSubjectsPage projectId={id} />;
}
