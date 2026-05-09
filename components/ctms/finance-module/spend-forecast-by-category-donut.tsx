'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface SpendForecastByCategoryDonutProps {
  rows: { categoryId: string; name: string; amount: number; pctOfTotal: number }[];
  baseCurrency: string;
}

const COLORS = [
  'oklch(0.65 0.18 145)',
  'oklch(0.7 0.13 220)',
  'oklch(0.78 0.16 80)',
  'oklch(0.65 0.16 35)',
  'oklch(0.62 0.18 295)',
  'oklch(0.6 0.18 15)',
  'oklch(0.7 0.12 260)',
  'oklch(0.72 0.12 180)',
];

export function SpendForecastByCategoryDonut({ rows, baseCurrency }: SpendForecastByCategoryDonutProps) {
  const data = useMemo(() => {
    const filtered = rows.filter((r) => r.amount > 0);
    return filtered.map((row, idx) => ({
      ...row,
      color: COLORS[idx % COLORS.length],
    }));
  }, [rows]);

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  let runningPct = 0;
  const stops: string[] = [];
  for (const segment of data) {
    if (total <= 0) continue;
    const pct = (segment.amount / total) * 100;
    const start = runningPct;
    const end = runningPct + pct;
    stops.push(`${segment.color} ${start}% ${end}%`);
    runningPct = end;
  }
  if (stops.length === 0) stops.push('var(--muted) 0% 100%');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Spend Forecast by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div
            className="relative size-[140px] rounded-full"
            style={{ background: `conic-gradient(${stops.join(', ')})` }}
            aria-hidden
          >
            <div className="absolute inset-3 rounded-full bg-background flex flex-col items-center justify-center">
              <span className="text-[11px] text-muted-foreground">Total</span>
              <span className="text-sm font-semibold">
                {formatCompactCurrency(total, baseCurrency)}
              </span>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5">
            {data.slice(0, 6).map((d) => (
              <li key={d.categoryId} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 truncate">
                  <span
                    className="inline-block size-2.5 rounded-sm"
                    style={{ background: d.color }}
                  />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="text-muted-foreground">
                  {formatCompactCurrency(d.amount, baseCurrency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
