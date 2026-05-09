'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ForecastKpis } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency, formatPercent } from '@/lib/finance-module/calculations';

interface ForecastSummaryPanelProps {
  kpis: ForecastKpis;
  baseCurrency: string;
}

export function ForecastSummaryPanel({ kpis, baseCurrency }: ForecastSummaryPanelProps) {
  const items: { label: string; value: string }[] = [
    {
      label: 'Total Forecasted Spend',
      value: formatCompactCurrency(kpis.projectedTotalSpend, baseCurrency),
    },
    {
      label: 'Forecasted Variance',
      value: `${kpis.forecastedVariance > 0 ? '+' : ''}${formatCompactCurrency(kpis.forecastedVariance, baseCurrency)}`,
    },
    {
      label: 'Next 6 Months',
      value: formatCompactCurrency(kpis.projectedNext6Months, baseCurrency),
    },
    {
      label: 'Overrun Probability',
      value: formatPercent(kpis.budgetOverrunProbability, 0),
    },
    {
      label: 'Cost per Patient',
      value:
        kpis.projectedCostPerPatient !== null
          ? formatCompactCurrency(kpis.projectedCostPerPatient, baseCurrency)
          : '—',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Forecast Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between text-xs border-b border-border last:border-0 pb-1.5 last:pb-0"
            >
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
