import { getKriDefinitions, getSavedReports, getStudyPortfolio } from '@/lib/actions/reports';
import { ReportsDashboard } from '@/components/ctms/reports/reports-dashboard';

export default async function ReportsPage() {
  const [kris, reports, portfolio] = await Promise.all([
    getKriDefinitions(),
    getSavedReports(),
    getStudyPortfolio(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Portfolio overview, KRI management, and saved reports.
        </p>
      </div>
      <ReportsDashboard
        initialKris={kris}
        initialReports={reports}
        portfolio={portfolio}
      />
    </div>
  );
}
