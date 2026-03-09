import { SubjectDetailPage } from '@/components/clinical-trials/subject-detail-page';

interface SubjectPageProps {
  params: Promise<{ id: string; siteId: string; subjectId: string }>;
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { id, siteId, subjectId } = await params;
  return <SubjectDetailPage projectId={id} siteId={siteId} subjectId={subjectId} />;
}
