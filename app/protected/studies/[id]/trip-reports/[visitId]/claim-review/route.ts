import { NextResponse } from 'next/server';
import { claimReportReviewForVisit } from '@/lib/actions/visit-reports';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; visitId: string }> }
) {
  const { id: studyId, visitId } = await context.params;
  const { error } = await claimReportReviewForVisit(visitId);
  const base = new URL(`/protected/studies/${studyId}/trip-reports/${visitId}/author`, request.url);
  if (error) {
    base.searchParams.set('claimReviewError', error);
    return NextResponse.redirect(base);
  }
  return NextResponse.redirect(base);
}
