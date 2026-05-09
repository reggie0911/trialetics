import { notFound } from 'next/navigation';

import { getStudyFinanceReports, listFinanceExportJobs } from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { ReportsLibraryCards } from '@/components/ctms/finance-module/reports-library-cards';
import { ReportsPopularTable } from '@/components/ctms/finance-module/reports-popular-table';
import { ReportsPreviewsRow } from '@/components/ctms/finance-module/reports-previews-row';
import { ReportsFavoriteList } from '@/components/ctms/finance-module/reports-favorite-list';
import { ReportsRecentList } from '@/components/ctms/finance-module/reports-recent-list';
import { ReportsActionsPanel } from '@/components/ctms/finance-module/reports-actions-panel';
import { ScheduledReportsTable } from '@/components/ctms/finance-module/scheduled-reports-table';
import { DataExportsTable } from '@/components/ctms/finance-module/data-exports-table';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyReportsPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const [{ data, error }, { data: exportJobs }] = await Promise.all([
    getStudyFinanceReports(studyId),
    listFinanceExportJobs(studyId),
  ]);

  if (error && !data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Reports"
        subtitle="Produce operational detail views and executive rollup summaries for oversight, audits, and stakeholder readouts—consumption-oriented outputs without editing underlying transactions here."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }

  if (!data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Reports"
        subtitle="Produce operational detail views and executive rollup summaries for oversight, audits, and stakeholder readouts—consumption-oriented outputs without editing underlying transactions here."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Reports"
      subtitle="Produce operational detail views and executive rollup summaries for oversight, audits, and stakeholder readouts—consumption-oriented outputs without editing underlying transactions here."
    >
      <ReportsLibraryCards rows={data.library} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <ReportsPopularTable studyId={studyId} rows={data.popularReports} />
          <ReportsPreviewsRow />
          <ScheduledReportsTable studyId={studyId} rows={data.scheduled} popularReports={data.popularReports} />
          <DataExportsTable studyId={studyId} jobs={exportJobs ?? []} />
        </div>

        <div className="flex flex-col gap-4">
          <ReportsFavoriteList rows={data.favorites} />
          <ReportsRecentList rows={data.recentRuns} />
          <ReportsActionsPanel studyId={studyId} />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
