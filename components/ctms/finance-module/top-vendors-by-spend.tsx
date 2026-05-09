'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface TopVendorsBySpendProps {
  rows: { vendorId: string; vendorName: string; spend: number; pctOfTotal: number }[];
  baseCurrency: string;
}

export function TopVendorsBySpend({ rows, baseCurrency }: TopVendorsBySpendProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top Vendors by Spend (YTD)</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No vendor spend yet.</p>
        ) : (
          <ol className="flex flex-col gap-2 text-xs">
            {rows.map((row, index) => (
              <li key={row.vendorId} className="flex items-center justify-between gap-3">
                <span className="text-foreground">
                  {index + 1}. {row.vendorName}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCompactCurrency(row.spend, baseCurrency)} · {row.pctOfTotal.toFixed(0)}%
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
