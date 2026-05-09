'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetTrackerKpis } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface BudgetKpiRowProps {
  kpis: BudgetTrackerKpis;
  baseCurrency: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  emphasis?: 'default' | 'positive' | 'warning' | 'destructive';
}

function KpiCard({ title, value, description, emphasis = 'default' }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={
            emphasis === 'positive'
              ? 'text-2xl font-semibold text-emerald-600 dark:text-emerald-400'
              : emphasis === 'warning'
                ? 'text-2xl font-semibold text-amber-600 dark:text-amber-400'
                : emphasis === 'destructive'
                  ? 'text-2xl font-semibold text-destructive'
                  : 'text-2xl font-semibold text-foreground'
          }
        >
          {value}
        </div>
        <CardDescription className="mt-1 text-[11px] text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function BudgetKpiRow({ kpis, baseCurrency }: BudgetKpiRowProps) {
  const total = kpis.totalApproved || 1;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        title="Total Approved Budget"
        value={formatCompactCurrency(kpis.totalApproved, baseCurrency)}
        description="Active version line items."
      />
      <KpiCard
        title="Total Committed"
        value={formatCompactCurrency(kpis.totalCommitted, baseCurrency)}
        description={`${((kpis.totalCommitted / total) * 100).toFixed(0)}% of approved`}
      />
      <KpiCard
        title="Total Actual Spend"
        value={formatCompactCurrency(kpis.totalActual, baseCurrency)}
        description={`${((kpis.totalActual / total) * 100).toFixed(0)}% of approved`}
      />
      <KpiCard
        title="Forecasted Spend"
        value={formatCompactCurrency(kpis.totalForecasted, baseCurrency)}
        description={`${((kpis.totalForecasted / total) * 100).toFixed(0)}% of approved`}
      />
      <KpiCard
        title="Remaining Budget"
        value={formatCompactCurrency(kpis.remaining, baseCurrency)}
        description={`${((kpis.remaining / total) * 100).toFixed(0)}% of approved`}
        emphasis={kpis.remaining > 0 ? 'positive' : 'warning'}
      />
      <KpiCard
        title="Projected Variance"
        value={formatCompactCurrency(kpis.projectedVariance, baseCurrency)}
        description={kpis.projectedVariance > 0 ? 'Over approved budget' : 'Within approved budget'}
        emphasis={kpis.projectedVariance > 0 ? 'destructive' : 'positive'}
      />
    </div>
  );
}
