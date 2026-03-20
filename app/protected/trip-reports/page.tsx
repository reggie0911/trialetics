import { Suspense } from 'react';
import {
  getTripReportSummaryList,
  getTemplateCount,
  getTemplatesWithQuestionCount,
  getTripReportTrackerList,
  getTripReportReviewQueue,
} from '@/lib/actions/visit-reports';
import { getStudies } from '@/lib/actions/studies';
import { TripReportsPageClient } from '@/components/ctms/trip-reports/trip-reports-page-client';

export default async function TripReportsPage() {
  const [summaryList, templateCount, templatesWithCount, studies, trackerData, reviewQueue] = await Promise.all([
    getTripReportSummaryList(),
    getTemplateCount(),
    getTemplatesWithQuestionCount(),
    getStudies(),
    getTripReportTrackerList(),
    getTripReportReviewQueue(),
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
          studies={studies.map((s) => ({ id: s.id, title: s.title, protocol_number: s.protocol_number }))}
          trackerRows={trackerData.rows}
          trackerMetrics={trackerData.metrics}
          initialReviewQueue={reviewQueue}
        />
      </Suspense>
    </div>
  );
}
