import { notFound } from 'next/navigation';
import { getVisitById, getTripReport, getReportFindings, getFollowUpItems } from '@/lib/actions/visits';
import { VisitDetail } from '@/components/ctms/visits/visit-detail';

interface PageProps {
  params: Promise<{ id: string; visitId: string }>;
}

export default async function StudyVisitDetailPage({ params }: PageProps) {
  const { id: studyId, visitId } = await params;

  const visit = await getVisitById(visitId);
  if (!visit) notFound();
  if (visit.study_id !== studyId) notFound();

  const report = await getTripReport(visitId);
  let findings: Awaited<ReturnType<typeof getReportFindings>> = [];
  let followUps: Awaited<ReturnType<typeof getFollowUpItems>> = [];

  if (report) {
    [findings, followUps] = await Promise.all([
      getReportFindings(report.id),
      getFollowUpItems(report.id),
    ]);
  }

  return (
    <div className="p-6">
      <VisitDetail
        visit={visit}
        initialReport={report}
        initialFindings={findings}
        initialFollowUps={followUps}
        scopeStudyId={studyId}
      />
    </div>
  );
}
