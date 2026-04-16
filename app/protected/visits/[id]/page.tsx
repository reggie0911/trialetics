import { notFound, redirect } from 'next/navigation';

import { getVisitById } from '@/lib/actions/visits';

interface VisitDetailPageProps {
  params: Promise<{ id: string }>;
}

/** Legacy URL: canonical visit detail is under `/protected/studies/[studyId]/visits/[visitId]`. */
export default async function VisitDetailPage({ params }: VisitDetailPageProps) {
  const { id } = await params;
  const visit = await getVisitById(id);
  if (!visit) notFound();
  redirect(`/protected/studies/${visit.study_id}/visits/${id}`);
}
