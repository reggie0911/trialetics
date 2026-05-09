'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ContractUtilizationChartProps {
  rows: { vendorId: string; vendorName: string; utilizationPct: number }[];
}

export function ContractUtilizationChart({ rows }: ContractUtilizationChartProps) {
  const sorted = [...rows].sort((a, b) => b.utilizationPct - a.utilizationPct).slice(0, 8);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Contract Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground">No contracts yet.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-xs">
            {sorted.map((row) => (
              <li key={row.vendorId} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground">{row.vendorName}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.utilizationPct.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      row.utilizationPct >= 100
                        ? 'h-full bg-destructive'
                        : row.utilizationPct >= 80
                          ? 'h-full bg-amber-500'
                          : 'h-full bg-emerald-500'
                    }
                    style={{ width: `${Math.min(row.utilizationPct, 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
