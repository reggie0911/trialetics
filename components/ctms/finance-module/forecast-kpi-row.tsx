'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ForecastKpis } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency, formatPercent } from '@/lib/finance-module/calculations';

interface ForecastKpiRowProps {
  kpis: ForecastKpis;
  baseCurrency: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
}

function KpiCard({ title, value, description, tone = 'default' }: KpiCardProps) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'critical'
          ? 'text-destructive'
          : 'text-foreground';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${valueClass}`}>{value}</div>
        <CardDescription className="mt-1 text-[11px] text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function ForecastKpiRow({ kpis, baseCurrency }: ForecastKpiRowProps) {
  const overrunTone: KpiCardProps['tone'] =
    kpis.budgetOverrunProbability >= 60
      ? 'critical'
      : kpis.budgetOverrunProbability >= 30
        ? 'warning'
        : 'positive';
  const varianceTone: KpiCardProps['tone'] = kpis.forecastedVariance > 0 ? 'critical' : 'positive';
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        title="Projected Total Spend"
        value={formatCompactCurrency(kpis.projectedTotalSpend, baseCurrency)}
        description="Actual + remaining forecast."
      />
      <KpiCard
        title="Forecasted Over/Under"
        value={`${kpis.forecastedVariance > 0 ? '+' : ''}${formatCompactCurrency(kpis.forecastedVariance, baseCurrency)}`}
        description="Vs approved budget."
        tone={varianceTone}
      />
      <KpiCard
        title="Projected Spend (Next 6M)"
        value={formatCompactCurrency(kpis.projectedNext6Months, baseCurrency)}
        description="Sum of next six forecast months."
      />
      <KpiCard
        title="Budget Overrun Probability"
        value={formatPercent(kpis.budgetOverrunProbability, 0)}
        description={
          kpis.budgetOverrunProbability >= 60
            ? 'High — review category drivers.'
            : kpis.budgetOverrunProbability >= 30
              ? 'Medium — monitor variance trend.'
              : 'Low — within acceptable range.'
        }
        tone={overrunTone}
      />
      <KpiCard
        title="Projected Cost per Patient"
        value={
          kpis.projectedCostPerPatient !== null
            ? formatCompactCurrency(kpis.projectedCostPerPatient, baseCurrency)
            : '—'
        }
        description="Total projected ÷ enrollment target."
      />
    </div>
  );
}
