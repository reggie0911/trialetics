import { NextResponse } from 'next/server';
import { claimReportReviewForVisit } from '@/lib/actions/visit-reports';

/**
 * Runs claim + review assignment outside RSC render so nested server actions may call revalidatePath safely.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ visitId: string }> }
) {
  const { visitId } = await context.params;
  const { error } = await claimReportReviewForVisit(visitId);
  const base = new URL(`/protected/trip-reports/${visitId}/author`, request.url);
  if (error) {
    base.searchParams.set('claimReviewError', error);
    return NextResponse.redirect(base);
  }
  return NextResponse.redirect(base);
}
