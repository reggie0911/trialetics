import { notFound } from 'next/navigation';
import {
  getKriDefinitions,
  getSavedReports,
  listReportExportsAudit,
  listReportRunsAudit,
  listSavedReportDefinitions,
  getStudyPortfolioForStudy,
} from '@/lib/actions/reports';
import { ReportsAnalyticsClient } from '@/components/ctms/reports/reports-analytics-client';
import { ReportsDashboard } from '@/components/ctms/reports/reports-dashboard';
import { getStudyByIdCached } from '@/lib/actions/studies';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyReportsPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const reportsAnalyticsEnabled = process.env.NEXT_PUBLIC_ENABLE_CTMS_REPORTS_ANALYTICS !== 'false';

  if (!reportsAnalyticsEnabled) {
    const [kris, reports, portfolio] = await Promise.all([
      getKriDefinitions(),
      getSavedReports(),
      getStudyPortfolioForStudy(studyId),
    ]);

    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Legacy reports view is active for this environment.
          </p>
        </div>
        <ReportsDashboard initialKris={kris} initialReports={reports} portfolio={portfolio} />
      </div>
    );
  }

  const [kris, portfolio, savedReports, runAudit, exportAudit] = await Promise.all([
    getKriDefinitions(),
    getStudyPortfolioForStudy(studyId),
    listSavedReportDefinitions({ studyId }),
    listReportRunsAudit({ studyId, limit: 100 }),
    listReportExportsAudit({ studyId, limit: 100 }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">
          KRIs, saved reports, and portfolio metrics for {study.title}.
        </p>
      </div>
      <ReportsAnalyticsClient
        studyId={studyId}
        portfolio={portfolio}
        kriDefinitions={kris}
        initialSavedReports={savedReports.data}
        initialRunAudit={runAudit.data}
        initialExportAudit={exportAudit.data}
      />
    </div>
  );
}
