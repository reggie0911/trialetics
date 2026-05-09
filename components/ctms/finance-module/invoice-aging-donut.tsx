'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InvoiceAgingBucketRow } from '@/lib/actions/study-finance-module';
import { FM_AGING_BUCKET_LABELS, formatCompactCurrency } from '@/lib/finance-module/calculations';

interface InvoiceAgingDonutProps {
  rows: InvoiceAgingBucketRow[];
  baseCurrency: string;
}

const COLOR_BY_BUCKET: Record<InvoiceAgingBucketRow['bucket'], string> = {
  '0_30': 'hsl(142 71% 45%)',
  '31_60': 'hsl(38 92% 50%)',
  '61_90': 'hsl(24 95% 53%)',
  '90_plus': 'hsl(0 72% 56%)',
};

export function InvoiceAgingDonut({ rows, baseCurrency }: InvoiceAgingDonutProps) {
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Aging Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-xs text-muted-foreground">No outstanding invoices.</p>
        ) : (
          <div className="grid gap-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={rows} dataKey="amount" innerRadius={36} outerRadius={64} paddingAngle={2}>
                  {rows.map((row) => (
                    <Cell key={row.bucket} fill={COLOR_BY_BUCKET[row.bucket]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCompactCurrency(Number(value ?? 0), baseCurrency)}
                  contentStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex flex-col gap-1.5 text-xs">
              {rows.map((row) => (
                <li key={row.bucket} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLOR_BY_BUCKET[row.bucket] }}
                    />
                    <span className="text-foreground">{FM_AGING_BUCKET_LABELS[row.bucket]}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatCompactCurrency(row.amount, baseCurrency)} · {row.pctOfPending.toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
