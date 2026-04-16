import { NextResponse } from 'next/server';

import { claimReportReviewForVisit } from '@/lib/actions/visit-reports';
import { getVisitById } from '@/lib/actions/visits';

/**
 * Legacy URL: claim runs on the study-scoped route; this handler forwards after resolving `studyId`.
 */
export async function GET(request: Request, context: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await context.params;
  const visit = await getVisitById(visitId);
  if (!visit?.study_id) {
    return NextResponse.redirect(new URL('/protected/studies', request.url));
  }
  const studyId = visit.study_id;

  const { error } = await claimReportReviewForVisit(visitId);
  const base = new URL(`/protected/studies/${studyId}/trip-reports/${visitId}/author`, request.url);
  if (error) {
    base.searchParams.set('claimReviewError', error);
  }
  return NextResponse.redirect(base);
}
