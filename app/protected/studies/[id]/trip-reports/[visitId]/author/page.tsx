import { notFound, redirect } from 'next/navigation';
import { getTripReportWithDetails, getTemplatesWithQuestionCount } from '@/lib/actions/visit-reports';
import { getCompanyLogoUrl } from '@/lib/actions/company';
import { VisitReportAuthoring } from '@/components/ctms/trip-reports/visit-report-authoring';

export default async function StudyTripReportAuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; visitId: string }>;
  searchParams: Promise<{ claimReview?: string; claimReviewError?: string }>;
}) {
  const { id: studyId, visitId } = await params;
  const sp = await searchParams;
  const tripReportsBasePath = `/protected/studies/${studyId}/trip-reports`;

  const [data, logoUrl] = await Promise.all([
    getTripReportWithDetails(visitId),
    getCompanyLogoUrl(),
  ]);
  if (!data) notFound();

  const visitStudyId = (data.visit as { study_id?: string | null })?.study_id;
  if (visitStudyId !== studyId) notFound();

  if (sp?.claimReview === '1') {
    if (data.accessDenied || !data.report?.id) {
      redirect(`${tripReportsBasePath}/${visitId}/author`);
    }
    redirect(`${tripReportsBasePath}/${visitId}/claim-review`);
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
        siteSubjects={data.siteSubjects}
        visitTotalsBySubjectVisitId={data.visitTotalsBySubjectVisitId}
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
        primarySitePhone={data.primarySitePhone}
        claimReviewError={claimReviewError}
        tripReportsBasePath={tripReportsBasePath}
      />
    </div>
  );
}
