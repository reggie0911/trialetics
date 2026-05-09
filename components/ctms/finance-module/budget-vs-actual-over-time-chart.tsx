'use client';

import { Bar, ComposedChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface BudgetVsActualOverTimeChartProps {
  series: { month: string; approved: number; actual: number; forecasted: number }[];
  baseCurrency: string;
}

export function BudgetVsActualOverTimeChart({
  series,
  baseCurrency,
}: BudgetVsActualOverTimeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Budget vs Actual Spend Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            No invoiced spend yet for the selected budget version.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) => formatCompactCurrency(value, baseCurrency)}
              />
              <Tooltip
                formatter={(value) => formatCompactCurrency(Number(value ?? 0), baseCurrency)}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="actual" name="Actual" fill="hsl(217 91% 60%)" />
              <Line
                type="monotone"
                dataKey="forecasted"
                name="Forecasted"
                stroke="hsl(38 92% 50%)"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="approved"
                name="Approved (Avg)"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
