import { notFound, redirect } from 'next/navigation';

import { getSubjectById } from '@/lib/actions/subjects';

interface SubjectDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Legacy URL: canonical subject detail is under `/protected/studies/[studyId]/subjects/[subjectId]`. */
export default async function SubjectDetailPage({ params }: SubjectDetailPageProps) {
  const { id } = await params;
  const subject = await getSubjectById(id);
  if (!subject) notFound();
  redirect(`/protected/studies/${subject.study_id}/subjects/${id}`);
}
