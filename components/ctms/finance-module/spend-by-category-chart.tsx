'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinanceDashboardCategoryRow } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface SpendByCategoryChartProps {
  rows: FinanceDashboardCategoryRow[];
  baseCurrency: string;
}

const PALETTE = [
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
  'hsl(0 72% 56%)',
  'hsl(189 94% 43%)',
  'hsl(322 75% 50%)',
  'hsl(50 93% 50%)',
];

export function SpendByCategoryChart({ rows, baseCurrency }: SpendByCategoryChartProps) {
  const totalSpend = rows.reduce((sum, r) => sum + r.actual, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Spend by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {totalSpend === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            No actual spend recorded yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={rows.filter((r) => r.actual > 0)}
                  dataKey="actual"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {rows.map((row, index) => (
                    <Cell key={row.categoryId} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCompactCurrency(Number(value ?? 0), baseCurrency)}
                  contentStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex flex-col gap-1.5 text-xs">
              {rows
                .filter((r) => r.actual > 0)
                .sort((a, b) => b.actual - a.actual)
                .map((row, index) => (
                  <li key={row.categoryId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                      />
                      <span className="text-foreground">{row.name}</span>
                    </div>
                    <span className="text-muted-foreground">{row.pctOfActual.toFixed(0)}%</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
