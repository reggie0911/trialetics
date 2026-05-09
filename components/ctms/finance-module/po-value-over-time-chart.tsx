'use client';

import { Bar, ComposedChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface PoValueOverTimeChartProps {
  series: { month: string; poValue: number; invoiced: number }[];
  baseCurrency: string;
}

export function PoValueOverTimeChart({ series, baseCurrency }: PoValueOverTimeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">PO Value Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            No purchase orders yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
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
              <Bar dataKey="poValue" name="PO Value" fill="hsl(217 91% 60%)" />
              <Line
                type="monotone"
                dataKey="invoiced"
                name="Amount Invoiced"
                stroke="hsl(38 92% 50%)"
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
