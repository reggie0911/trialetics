import {
  getTripReportSummaryList,
  getTemplateCount,
  getTemplatesWithQuestionCount,
  getTripReportTrackerList,
  getTripReportReviewQueue,
} from '@/lib/actions/visit-reports';
import { getStudies } from '@/lib/actions/studies';
import { TripReportsPageClient } from '@/components/ctms/trip-reports/trip-reports-page-client';

type PageProps = { searchParams?: Promise<{ tab?: string; createVisit?: string; templateId?: string }> | { tab?: string; createVisit?: string; templateId?: string } };

export default async function TripReportsPage(props: PageProps) {
  const searchParams = await Promise.resolve(props.searchParams ?? {});
  const tab = searchParams?.tab;
  const initialTab =
    tab === 'admin' || tab === 'tracker' || tab === 'summary' || tab === 'review' ? tab : 'summary';
  const createVisit = searchParams?.createVisit === '1';
  const templateId = searchParams?.templateId ?? null;

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
      <TripReportsPageClient
        initialTab={createVisit ? 'summary' : initialTab}
        initialSummaryList={summaryList}
        templateCount={templateCount}
        initialTemplates={templatesWithCount}
        studies={studies.map((s) => ({ id: s.id, title: s.title, protocol_number: s.protocol_number }))}
        trackerRows={trackerData.rows}
        trackerMetrics={trackerData.metrics}
        initialReviewQueue={reviewQueue}
        initialCreateVisitOpen={createVisit}
        initialTemplateId={templateId}
      />
    </div>
  );
}
