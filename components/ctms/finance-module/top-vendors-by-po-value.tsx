'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface TopVendorsByPoValueProps {
  rows: { vendorId: string; vendorName: string; poValue: number; pctOfTotal: number }[];
  baseCurrency: string;
}

export function TopVendorsByPoValue({ rows, baseCurrency }: TopVendorsByPoValueProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top Vendors by PO Value</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No purchase orders yet.</p>
        ) : (
          <ol className="flex flex-col gap-3 text-xs">
            {rows.map((row, index) => (
              <li key={row.vendorId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground">
                    {index + 1}. {row.vendorName}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatCompactCurrency(row.poValue, baseCurrency)} · {row.pctOfTotal.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(row.pctOfTotal, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
