import { notFound } from 'next/navigation';
import { getVisitById, getTripReport, getReportFindings, getFollowUpItems } from '@/lib/actions/visits';
import { VisitDetail } from '@/components/ctms/visits/visit-detail';

interface VisitDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VisitDetailPage({ params }: VisitDetailPageProps) {
  const { id } = await params;

  const visit = await getVisitById(id);
  if (!visit) notFound();

  const report = await getTripReport(id);
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
      />
    </div>
  );
}
