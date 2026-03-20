import { notFound, redirect } from 'next/navigation';
import { getTripReportWithDetails, getTemplatesWithQuestionCount } from '@/lib/actions/visit-reports';
import { getCompanyLogoUrl } from '@/lib/actions/company';
import { VisitReportAuthoring } from '@/components/ctms/trip-reports/visit-report-authoring';

export default async function TripReportAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ visitId: string }>;
  searchParams: Promise<{ claimReview?: string; claimReviewError?: string }>;
}) {
  const { visitId } = await params;
  const sp = await searchParams;
  const [data, logoUrl] = await Promise.all([
    getTripReportWithDetails(visitId),
    getCompanyLogoUrl(),
  ]);
  if (!data) notFound();

  // Legacy ?claimReview=1: mutation + revalidatePath must not run during render; use route handler.
  if (sp?.claimReview === '1') {
    if (data.accessDenied || !data.report?.id) {
      redirect(`/protected/trip-reports/${visitId}/author`);
    }
    redirect(`/protected/trip-reports/${visitId}/claim-review`);
  }

  const claimReviewErrorRaw = sp?.claimReviewError?.trim();
  const claimReviewError = claimReviewErrorRaw
    ? (() => {
        try {
          return decodeURIComponent(claimReviewErrorRaw);
        } catch {
          return claimReviewErrorRaw;
        }
      })()
    : null;

  const templates =
    !data.accessDenied && !data.template && data.report
      ? await getTemplatesWithQuestionCount()
      : [];

  return (
    <div className="p-6">
      <VisitReportAuthoring
        visitId={visitId}
        visit={data.visit}
        report={data.report}
        template={data.template}
        questions={data.questions}
        initialResponses={data.responses}
        attendees={data.attendees}
        crfEntries={data.crfEntries}
        actionItems={data.actionItems}
        attachments={data.attachments}
        templates={templates}
        logoUrl={logoUrl}
        visitSequenceNumber={data.visitSequenceNumber}
        lastApprovedVisitDate={data.lastApprovedVisitDate}
        currentUserProfileId={data.currentUserProfileId}
        userIsAppAdmin={data.userIsAppAdmin}
        userIsStudyCra={data.userIsStudyCra}
        userIsStudyCpm={data.userIsStudyCpm}
        accessDenied={data.accessDenied}
        accessDeniedMessage={data.accessDeniedMessage}
        auditEvents={data.auditEvents}
        reportSignerNames={data.reportSignerNames}
        claimReviewError={claimReviewError}
      />
    </div>
  );
}
