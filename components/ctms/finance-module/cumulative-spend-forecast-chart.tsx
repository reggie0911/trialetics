'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface CumulativeSpendForecastChartProps {
  series: { month: string; actual: number; forecasted: number; approved: number }[];
  baseCurrency: string;
}

export function CumulativeSpendForecastChart({
  series,
  baseCurrency,
}: CumulativeSpendForecastChartProps) {
  const maxValue = Math.max(
    1,
    ...series.flatMap((p) => [p.actual, p.forecasted, p.approved]),
  );
  const widthScale = 100 / Math.max(1, series.length - 1);

  const buildPath = (key: 'actual' | 'forecasted' | 'approved') =>
    series
      .map((p, idx) => {
        const x = idx * widthScale;
        const y = 100 - (p[key] / maxValue) * 100;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cumulative Spend Forecast vs Budget</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No forecast data yet. Add invoices and budget categories to populate the curve.
          </p>
        ) : (
          <div>
            <div className="relative h-[180px] w-full">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full"
              >
                <path
                  d={buildPath('approved')}
                  fill="none"
                  stroke="oklch(0.6 0.05 250)"
                  strokeWidth="0.6"
                  strokeDasharray="2,1.5"
                />
                <path
                  d={buildPath('forecasted')}
                  fill="none"
                  stroke="oklch(0.7 0.13 220)"
                  strokeWidth="0.8"
                />
                <path
                  d={buildPath('actual')}
                  fill="none"
                  stroke="oklch(0.65 0.18 145)"
                  strokeWidth="1"
                />
              </svg>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500" />
                Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm bg-sky-400" />
                Forecasted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-3 rounded-sm border border-dashed border-muted-foreground" />
                Approved Budget
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{series[0]?.month}</span>
              <span>Max {formatCompactCurrency(maxValue, baseCurrency)}</span>
              <span>{series[series.length - 1]?.month}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
