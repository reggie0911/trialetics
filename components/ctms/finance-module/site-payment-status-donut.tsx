'use client';

import { useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FM_SITE_PAYMENT_STATUS_LABELS,
  type FmSitePaymentSchedule,
  type FmSitePaymentStatus,
} from '@/lib/finance-module/types';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface SitePaymentStatusDonutProps {
  rows: FmSitePaymentSchedule[];
  baseCurrency: string;
}

const STATUS_ORDER: FmSitePaymentStatus[] = [
  'scheduled',
  'earned',
  'approved',
  'paid',
  'partial',
  'on_hold',
  'cancelled',
];

const STATUS_COLOR: Record<FmSitePaymentStatus, string> = {
  scheduled: 'oklch(0.7 0.05 230)',
  earned: 'oklch(0.7 0.12 220)',
  approved: 'oklch(0.7 0.13 200)',
  paid: 'oklch(0.65 0.18 145)',
  partial: 'oklch(0.78 0.16 80)',
  on_hold: 'oklch(0.65 0.16 35)',
  cancelled: 'oklch(0.55 0.05 250)',
};

export function SitePaymentStatusDonut({ rows, baseCurrency }: SitePaymentStatusDonutProps) {
  const data = useMemo(() => {
    return STATUS_ORDER.map((status) => {
      const items = rows.filter((r) => r.status === status);
      const total = items.reduce((sum, r) => sum + Number(r.amount), 0);
      return { status, total, count: items.length };
    });
  }, [rows]);

  const grand = data.reduce((sum, d) => sum + d.total, 0);
  let runningPct = 0;
  const stops: string[] = [];
  for (const segment of data) {
    if (grand <= 0 || segment.total <= 0) continue;
    const pct = (segment.total / grand) * 100;
    const start = runningPct;
    const end = runningPct + pct;
    stops.push(`${STATUS_COLOR[segment.status]} ${start}% ${end}%`);
    runningPct = end;
  }
  if (stops.length === 0) stops.push('var(--muted) 0% 100%');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
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
                {formatCompactCurrency(grand, baseCurrency)}
              </span>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5">
            {data.map((d) => (
              <li key={d.status} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block size-2.5 rounded-sm"
                    style={{ background: STATUS_COLOR[d.status] }}
                  />
                  {FM_SITE_PAYMENT_STATUS_LABELS[d.status]} ({d.count})
                </span>
                <span className="text-muted-foreground">
                  {formatCompactCurrency(d.total, baseCurrency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
