'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface VendorSpendTrendChartProps {
  series: { month: string; actual: number; forecasted: number }[];
  baseCurrency: string;
}

export function VendorSpendTrendChart({ series, baseCurrency }: VendorSpendTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Vendor Spend Trend (Actual vs Forecast)</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-xs text-muted-foreground">
            No vendor spend yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
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
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Spend"
                stroke="hsl(217 91% 60%)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="forecasted"
                name="Forecasted Spend"
                stroke="hsl(38 92% 50%)"
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
