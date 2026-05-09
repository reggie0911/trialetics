import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import {
  getStudyFinanceForecast,
  getStudyFinanceWorkspace,
  listFinanceForecastScenarios,
} from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { ForecastKpiRow } from '@/components/ctms/finance-module/forecast-kpi-row';
import { CumulativeSpendForecastChart } from '@/components/ctms/finance-module/cumulative-spend-forecast-chart';
import { SpendForecastByCategoryDonut } from '@/components/ctms/finance-module/spend-forecast-by-category-donut';
import { MonthlySpendForecastChart } from '@/components/ctms/finance-module/monthly-spend-forecast-chart';
import { ScenarioComparisonTable } from '@/components/ctms/finance-module/scenario-comparison-table';
import { CategoryForecastDetailsTable } from '@/components/ctms/finance-module/category-forecast-details-table';
import { ForecastAssumptionsPanel } from '@/components/ctms/finance-module/forecast-assumptions-panel';
import { ForecastSummaryPanel } from '@/components/ctms/finance-module/forecast-summary-panel';
import { ForecastAlertsPanel } from '@/components/ctms/finance-module/forecast-alerts-panel';
import { ForecastDerivationNote } from '@/components/ctms/finance-module/forecast-derivation-note';
import { ForecastScenarioPanel } from '@/components/ctms/finance-module/forecast-scenario-panel';
import { ForecastScenarioLibraryCard } from '@/components/ctms/finance-module/forecast-scenario-library-card';
import { AiFinanceInsightsPanel } from '@/components/ctms/finance-module/ai-finance-insights-panel';
import { ForecastBaselineHealthBanner } from '@/components/ctms/finance-module/forecast-baseline-health-banner';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyForecastingPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const [{ data, error }, { data: workspace }, { data: scenarioRows }] = await Promise.all([
    getStudyFinanceForecast(studyId),
    getStudyFinanceWorkspace(studyId),
    listFinanceForecastScenarios(studyId),
  ]);

  if (error && !data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Forecasting"
        subtitle="Project future spend and runway using enrollment and operational drivers—scenario-style visibility into how timelines and recruitment affect costs compared with the active budget baseline."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }

  const baselineScenarioId =
    workspace?.settings && typeof workspace.settings.forecast_baseline_scenario_id === 'string'
      ? workspace.settings.forecast_baseline_scenario_id
      : null;

  if (!data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Forecasting"
        subtitle="Project future spend and runway using enrollment and operational drivers—scenario-style visibility into how timelines and recruitment affect costs compared with the active budget baseline."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Forecasting"
      subtitle="Project future spend and runway using enrollment and operational drivers—scenario-style visibility into how timelines and recruitment affect costs compared with the active budget baseline."
    >
      <ForecastKpiRow kpis={data.kpis} baseCurrency={data.baseCurrency} />

      <ForecastDerivationNote />

      <Suspense fallback={null}>
        <ForecastBaselineHealthBanner />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <CumulativeSpendForecastChart
              series={data.cumulativeSeries}
              baseCurrency={data.baseCurrency}
            />
            <SpendForecastByCategoryDonut
              rows={data.spendByCategory}
              baseCurrency={data.baseCurrency}
            />
          </div>

          <MonthlySpendForecastChart series={data.monthlySeries} baseCurrency={data.baseCurrency} />

          <ScenarioComparisonTable rows={data.scenarios} baseCurrency={data.baseCurrency} />

          <ForecastScenarioLibraryCard
            studyId={studyId}
            workspaceUpdatedAt={workspace?.updated_at ?? ''}
            rows={scenarioRows ?? []}
          />

          <CategoryForecastDetailsTable rows={data.categoryRows} baseCurrency={data.baseCurrency} />
        </div>

        <div className="flex flex-col gap-4">
          <ForecastAssumptionsPanel
            studyId={studyId}
            assumptions={data.assumptions}
            workspaceUpdatedAt={data.workspaceUpdatedAt}
          />
          <ForecastSummaryPanel kpis={data.kpis} baseCurrency={data.baseCurrency} />
          <ForecastScenarioPanel
            persistedScenarios={scenarioRows ?? []}
            projectedBaseTotal={data.kpis.projectedTotalSpend}
            baselineScenarioId={baselineScenarioId}
            baseCurrency={data.baseCurrency}
          />
          <AiFinanceInsightsPanel
            studyId={studyId}
            scope="forecast"
            title="Forecast Narrative"
            description="OpenAI-generated narrative summary of forecast drivers. Advisory only."
          />
          <ForecastAlertsPanel alerts={data.alerts} />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
