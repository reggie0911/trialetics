import { Suspense } from 'react';
import {
  getTripReportSummaryList,
  getTemplateCount,
  getTemplatesWithQuestionCount,
  getTripReportTrackerList,
  getTripReportReviewQueue,
} from '@/lib/actions/visit-reports';
import {
  TRIP_REPORT_DEFAULT_PAGE_SIZE,
  TRIP_REPORT_MAX_PAGE_SIZE,
} from '@/lib/trip-report-compliance';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { TripReportsPageClient } from '@/components/ctms/trip-reports/trip-reports-page-client';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getProfileIsCpmOnAnyStudy } from '@/lib/visit-report-permissions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parsePageNumber(raw: string | string[] | undefined, fallback = 1): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

function parsePageSize(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n) || n < 1) return TRIP_REPORT_DEFAULT_PAGE_SIZE;
  return Math.min(TRIP_REPORT_MAX_PAGE_SIZE, n);
}

function parseSort(raw: string | string[] | undefined): { column: string; direction: 'asc' | 'desc' } | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const [column, direction] = value.split(':');
  if (!column) return null;
  return { column, direction: direction === 'desc' ? 'desc' : 'asc' };
}

export default async function StudyTripReportsPage({ params, searchParams }: PageProps) {
  const { id: studyId } = await params;
  const sp = await searchParams;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const summaryPage = parsePageNumber(sp.sPage);
  const summaryPageSize = parsePageSize(sp.sPs);
  const summarySort = parseSort(sp.sSort);
  const trackerPage = parsePageNumber(sp.tPage);
  const trackerPageSize = parsePageSize(sp.tPs);
  const trackerSort = parseSort(sp.tSort);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isCpmOnAnyStudy = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profile?.id) {
      isCpmOnAnyStudy = await getProfileIsCpmOnAnyStudy(supabase, profile.id);
    }
  }

  const [summaryResult, templateCount, templatesWithCount, trackerData, reviewQueue] = await Promise.all([
    getTripReportSummaryList(studyId, { page: summaryPage, pageSize: summaryPageSize, sort: summarySort }),
    getTemplateCount(),
    getTemplatesWithQuestionCount(),
    getTripReportTrackerList(studyId, { page: trackerPage, pageSize: trackerPageSize, sort: trackerSort }),
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
          initialSummaryList={summaryResult.rows}
          summaryTotal={summaryResult.total}
          summaryPage={summaryResult.page}
          summaryPageSize={summaryResult.pageSize}
          summarySort={summarySort}
          templateCount={templateCount}
          initialTemplates={templatesWithCount}
          studies={[{ id: study.id, title: study.title, protocol_number: study.protocol_number }]}
          trackerRows={trackerData.rows}
          trackerTotal={trackerData.total}
          trackerPage={trackerData.page}
          trackerPageSize={trackerData.pageSize}
          trackerSort={trackerSort}
          trackerMetrics={trackerData.metrics}
          initialReviewQueue={reviewQueue}
          studyId={studyId}
          isCpmOnAnyStudy={isCpmOnAnyStudy}
        />
      </Suspense>
    </div>
  );
}
