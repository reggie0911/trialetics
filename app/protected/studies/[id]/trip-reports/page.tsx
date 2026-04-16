import { Suspense } from 'react';
import {
  getTripReportSummaryList,
  getTemplateCount,
  getTemplatesWithQuestionCount,
  getTripReportTrackerList,
  getTripReportReviewQueue,
} from '@/lib/actions/visit-reports';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { TripReportsPageClient } from '@/components/ctms/trip-reports/trip-reports-page-client';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyTripReportsPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const [summaryList, templateCount, templatesWithCount, trackerData, reviewQueue] = await Promise.all([
    getTripReportSummaryList(studyId),
    getTemplateCount(),
    getTemplatesWithQuestionCount(),
    getTripReportTrackerList(studyId),
    getTripReportReviewQueue(studyId),
  ]);

  return (
    <div className="p-6 space-y-6">
      <Suspense
        fallback={
          <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        }
      >
        <TripReportsPageClient
          initialSummaryList={summaryList}
          templateCount={templateCount}
          initialTemplates={templatesWithCount}
          studies={[{ id: study.id, title: study.title, protocol_number: study.protocol_number }]}
          trackerRows={trackerData.rows}
          trackerMetrics={trackerData.metrics}
          initialReviewQueue={reviewQueue}
          studyId={studyId}
        />
      </Suspense>
    </div>
  );
}
