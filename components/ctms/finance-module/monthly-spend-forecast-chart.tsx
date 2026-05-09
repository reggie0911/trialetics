'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface MonthlySpendForecastChartProps {
  series: { month: string; actual: number; forecasted: number; budgetAvg: number }[];
  baseCurrency: string;
}

export function MonthlySpendForecastChart({ series, baseCurrency }: MonthlySpendForecastChartProps) {
  const maxValue = Math.max(
    1,
    ...series.flatMap((p) => [p.actual, p.forecasted, p.budgetAvg]),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Monthly Spend Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No monthly forecast yet. Approve a budget version and record invoices to populate.
          </p>
        ) : (
          <div>
            <div className="flex h-[180px] items-end gap-1.5">
              {series.map((point) => (
                <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative w-full flex items-end gap-0.5">
                    <div
                      className="flex-1 rounded-sm bg-emerald-500/70"
                      style={{ height: `${(point.actual / maxValue) * 160}px` }}
                      aria-hidden
                    />
                    <div
                      className="flex-1 rounded-sm bg-sky-400/70"
                      style={{ height: `${(point.forecasted / maxValue) * 160}px` }}
                      aria-hidden
                    />
                    <div
                      className="absolute inset-x-0 border-t border-dashed border-muted-foreground/60"
                      style={{ bottom: `${(point.budgetAvg / maxValue) * 160}px` }}
                      aria-hidden
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {point.month.slice(5)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500/70" />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-sky-400/70" />
                Forecast
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm border border-dashed border-muted-foreground" />
                Budget Average
              </span>
              <span className="ml-auto">Max {formatCompactCurrency(maxValue, baseCurrency)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
