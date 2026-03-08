import { ProjectDocumentsPage } from '@/components/clinical-trials/project-documents-page';

interface DocsPageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentsPage({ params }: DocsPageProps) {
  const { id } = await params;
  return <ProjectDocumentsPage projectId={id} />;
}
