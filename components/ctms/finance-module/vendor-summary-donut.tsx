'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VendorSpendRow } from '@/lib/actions/study-finance-module';
import {
  FM_VENDOR_SERVICE_CATEGORY_LABELS,
  type FmVendorServiceCategory,
} from '@/lib/finance-module/types';

interface VendorSummaryDonutProps {
  rows: VendorSpendRow[];
}

const CATEGORY_COLORS = [
  'oklch(0.65 0.18 145)',
  'oklch(0.7 0.13 220)',
  'oklch(0.78 0.16 80)',
  'oklch(0.65 0.16 35)',
  'oklch(0.62 0.18 295)',
  'oklch(0.6 0.18 15)',
  'oklch(0.7 0.12 260)',
  'oklch(0.72 0.12 180)',
];

export function VendorSummaryDonut({ rows }: VendorSummaryDonutProps) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.serviceCategory, (counts.get(row.serviceCategory) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([category, count], idx) => ({
        category,
        label:
          FM_VENDOR_SERVICE_CATEGORY_LABELS[category as FmVendorServiceCategory] ?? category,
        count,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const total = data.reduce((sum, d) => sum + d.count, 0);
  let runningPct = 0;
  const stops: string[] = [];
  for (const segment of data) {
    if (total <= 0 || segment.count <= 0) continue;
    const pct = (segment.count / total) * 100;
    const start = runningPct;
    const end = runningPct + pct;
    stops.push(`${segment.color} ${start}% ${end}%`);
    runningPct = end;
  }
  if (stops.length === 0) stops.push('var(--muted) 0% 100%');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Vendor Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div
            className="relative size-[140px] rounded-full"
            style={{ background: `conic-gradient(${stops.join(', ')})` }}
            aria-hidden
          >
            <div className="absolute inset-3 rounded-full bg-background flex flex-col items-center justify-center">
              <span className="text-[11px] text-muted-foreground">Vendors</span>
              <span className="text-sm font-semibold">{total}</span>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5">
            {data.slice(0, 6).map((d) => (
              <li key={d.category} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 rounded-sm"
                    style={{ background: d.color }}
                  />
                  {d.label}
                </span>
                <span className="text-muted-foreground">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
