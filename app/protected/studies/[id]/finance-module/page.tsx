import { notFound } from 'next/navigation';

import {
  getBudgetTrackerData,
  getFinanceDataHealthSignals,
  getStudyFinanceDashboard,
  getStudyFinanceWorkspace,
  listFinanceVendors,
} from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { FinanceDashboardCards } from '@/components/ctms/finance-module/finance-dashboard-cards';
import { BudgetVsActualChart } from '@/components/ctms/finance-module/budget-vs-actual-chart';
import { SpendByCategoryChart } from '@/components/ctms/finance-module/spend-by-category-chart';
import { FinanceExceptionsPanel } from '@/components/ctms/finance-module/finance-exceptions-panel';
import { FinanceDashboardRightRail } from '@/components/ctms/finance-module/finance-dashboard-right-rail';
import { StudyFinancialHealthTable } from '@/components/ctms/finance-module/study-financial-health-table';
import { UpcomingPaymentObligations } from '@/components/ctms/finance-module/upcoming-payment-obligations';
import { InitializeFinanceWorkspaceCard } from '@/components/ctms/finance-module/initialize-finance-workspace-card';
import { FinanceDataHealthCard } from '@/components/ctms/finance-module/finance-data-health-card';
import { AiFinanceInsightsPanel } from '@/components/ctms/finance-module/ai-finance-insights-panel';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyFinanceDashboardPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const [{ data: dashboard, error }, { data: workspace }, { data: budgetTracker }, { data: vendors }, { data: healthSignals }] =
    await Promise.all([
      getStudyFinanceDashboard(studyId),
      getStudyFinanceWorkspace(studyId),
      getBudgetTrackerData(studyId),
      listFinanceVendors(studyId),
      getFinanceDataHealthSignals(studyId),
    ]);

  const activeCategories =
    budgetTracker?.categories?.filter((c) => !c.is_archived).length ?? 0;
  const activeVendors = vendors?.filter((v) => v.status !== 'archived').length ?? 0;

  if (error && !dashboard) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Finance Dashboard"
        subtitle="Real-time snapshot of finance performance—KPIs, budget utilization, spend patterns, exception signals, and upcoming payment obligations—so you can spot drift or risk early and drill into the right area."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }

  if (!dashboard) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Finance Dashboard"
        subtitle="Real-time snapshot of finance performance—KPIs, budget utilization, spend patterns, exception signals, and upcoming payment obligations—so you can spot drift or risk early and drill into the right area."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Finance Dashboard"
      subtitle="Real-time snapshot of finance performance—KPIs, budget utilization, spend patterns, exception signals, and upcoming payment obligations—so you can spot drift or risk early and drill into the right area."
    >
      {!workspace ? (
        <InitializeFinanceWorkspaceCard studyId={studyId} />
      ) : (
        <FinanceDataHealthCard
          studyId={studyId}
          hasBudget={Boolean(budgetTracker?.budget)}
          activeCategoryCount={activeCategories}
          activeVendorCount={activeVendors}
          signals={healthSignals}
        />
      )}

      <FinanceDashboardCards kpis={dashboard.kpis} baseCurrency={dashboard.baseCurrency} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <BudgetVsActualChart
              series={budgetTracker?.monthlySeries ?? []}
              baseCurrency={dashboard.baseCurrency}
            />
            <SpendByCategoryChart
              rows={dashboard.spendByCategory}
              baseCurrency={dashboard.baseCurrency}
            />
          </div>

          <StudyFinancialHealthTable
            studyId={studyId}
            rows={dashboard.spendByCategory}
            baseCurrency={dashboard.baseCurrency}
          />

          <UpcomingPaymentObligations studyId={studyId} rows={dashboard.upcomingObligations} />
        </div>

        <div className="flex flex-col gap-4">
          <FinanceDashboardRightRail
            studyId={studyId}
            kpis={dashboard.kpis}
            baseCurrency={dashboard.baseCurrency}
            suggestions={dashboard.suggestions}
          />
          <AiFinanceInsightsPanel studyId={studyId} scope="dashboard" />
          <FinanceExceptionsPanel alerts={dashboard.alerts} />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
