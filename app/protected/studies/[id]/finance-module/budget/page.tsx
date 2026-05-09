import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getBudgetTrackerData } from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { BudgetKpiRow } from '@/components/ctms/finance-module/budget-kpi-row';
import { BudgetCategoryTable } from '@/components/ctms/finance-module/budget-category-table';
import { BudgetVsActualOverTimeChart } from '@/components/ctms/finance-module/budget-vs-actual-over-time-chart';
import { BudgetHealthDonut } from '@/components/ctms/finance-module/budget-health-donut';
import { BudgetVersionHistory } from '@/components/ctms/finance-module/budget-version-history';
import { BudgetRightRail } from '@/components/ctms/finance-module/budget-right-rail';
import { BudgetDraftPlanningCard } from '@/components/ctms/finance-module/budget-draft-planning-card';
import { BudgetVersionLifecycleCard } from '@/components/ctms/finance-module/budget-version-lifecycle-card';
import { CreateFirstBudgetCard } from '@/components/ctms/finance-module/create-first-budget-card';
import { AiFinanceInsightsPanel } from '@/components/ctms/finance-module/ai-finance-insights-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buildFinanceModulePath } from '@/lib/finance-module/types';

function parseVersionQuery(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : undefined;
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function StudyBudgetPage({ params, searchParams }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const sp = await searchParams;
  const { data, error } = await getBudgetTrackerData(studyId, parseVersionQuery(sp.version));
  if (error && !data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Study Budget Tracker"
        subtitle="Build and compare budget versions, organize categories and line items, monitor variance against actuals, and advance structural budget amendments through your approval gates while preserving version history."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }

  if (!data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Study Budget Tracker"
        subtitle="Build and compare budget versions, organize categories and line items, monitor variance against actuals, and advance structural budget amendments through your approval gates while preserving version history."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Study Budget Tracker"
      subtitle="Build and compare budget versions, organize categories and line items, monitor variance against actuals, and advance structural budget amendments through your approval gates while preserving version history."
    >
      {!data.budget ? <CreateFirstBudgetCard studyId={studyId} /> : null}

      {data.budget ? (
        <BudgetDraftPlanningCard
          studyId={studyId}
          budget={data.budget}
          versions={data.versions}
          selectedVersion={data.selectedVersion}
          categories={data.categories}
          lineItems={data.lineItems}
          baseCurrency={data.baseCurrency}
        />
      ) : null}

      <BudgetKpiRow kpis={data.kpis} baseCurrency={data.baseCurrency} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <BudgetCategoryTable
            studyId={studyId}
            rows={data.rows}
            baseCurrency={data.baseCurrency}
            selectedVersionId={data.selectedVersion?.id ?? null}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <BudgetVsActualOverTimeChart
              series={data.monthlySeries}
              baseCurrency={data.baseCurrency}
            />
            <BudgetHealthDonut health={data.health} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <BudgetVersionLifecycleCard studyId={studyId} selectedVersion={data.selectedVersion} />
          <Card className="border-dashed">
            <CardHeader className="py-3">
              <CardTitle className="text-xs font-medium">Change orders</CardTitle>
              <CardDescription className="text-[11px]">
                Formal amendments to budget versions or spend objects run through approvals.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href={buildFinanceModulePath(studyId, 'change-orders')}>Open change orders</Link>
              </Button>
            </CardContent>
          </Card>
          <BudgetRightRail budget={data.budget} selectedVersion={data.selectedVersion} />
          <AiFinanceInsightsPanel
            studyId={studyId}
            scope="budget"
            title="Budget Variance Insights"
            description="OpenAI-generated explanation of variance drivers. Advisory only."
          />
          <BudgetVersionHistory
            studyId={studyId}
            versions={data.versions}
            selectedVersionId={data.selectedVersion?.id ?? null}
          />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
