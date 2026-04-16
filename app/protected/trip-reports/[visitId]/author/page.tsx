import { notFound, redirect } from 'next/navigation';

import { getVisitById } from '@/lib/actions/visits';

/**
 * Legacy URL: canonical authoring is under
 * `/protected/studies/[studyId]/trip-reports/[visitId]/author`.
 */
export default async function TripReportAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ visitId: string }>;
  searchParams: Promise<{ claimReview?: string; claimReviewError?: string }>;
}) {
  const { visitId } = await params;
  const sp = await searchParams;

  const visit = await getVisitById(visitId);
  if (!visit) notFound();

  const studyId = visit.study_id;
  const authorPath = `/protected/studies/${studyId}/trip-reports/${visitId}/author`;

  if (sp?.claimReview === '1') {
    redirect(`/protected/studies/${studyId}/trip-reports/${visitId}/claim-review`);
  }

  const err = sp?.claimReviewError?.trim();
  if (err) {
    const qs = new URLSearchParams();
    qs.set('claimReviewError', err);
    redirect(`${authorPath}?${qs.toString()}`);
  }

  redirect(authorPath);
}
