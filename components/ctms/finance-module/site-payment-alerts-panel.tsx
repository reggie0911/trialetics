'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  daysUntil,
  formatCompactCurrency,
} from '@/lib/finance-module/calculations';
import {
  FM_SITE_PAYMENT_STATUS_LABELS,
  type FmSitePaymentSchedule,
} from '@/lib/finance-module/types';

interface SitePaymentAlertsPanelProps {
  rows: FmSitePaymentSchedule[];
  baseCurrency: string;
}

export function SitePaymentAlertsPanel({ rows, baseCurrency }: SitePaymentAlertsPanelProps) {
  const today = new Date();
  const overdue = rows.filter((r) => {
    if (r.status === 'paid' || r.status === 'cancelled') return false;
    const days = daysUntil(r.due_date, today);
    return days !== null && days < 0;
  });
  const upcoming = rows.filter((r) => {
    if (r.status === 'paid' || r.status === 'cancelled') return false;
    const days = daysUntil(r.due_date, today);
    return days !== null && days >= 0 && days <= 14;
  });
  const onHold = rows.filter((r) => r.status === 'on_hold');
  const partial = rows.filter((r) => r.status === 'partial');

  const rawBlocks = [
    { label: 'Overdue', rows: overdue, tone: 'destructive' as const },
    { label: 'Due in 14 days', rows: upcoming, tone: 'warning' as const },
    { label: 'On hold', rows: onHold, tone: 'warning' as const },
    { label: 'Partial payments', rows: partial, tone: 'info' as const },
  ];
  const items = rawBlocks.filter((item) => item.rows.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Site Payment Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No site payment alerts. All scheduled milestones are on track.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.label}>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>{item.label}</span>
                  <Badge variant={item.tone}>{item.rows.length}</Badge>
                </div>
                <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                  {item.rows.slice(0, 3).map((row) => (
                    <li key={row.id} className="flex items-center justify-between">
                      <span className="truncate pr-2">
                        {row.milestone_label} · {FM_SITE_PAYMENT_STATUS_LABELS[row.status]}
                      </span>
                      <span>{formatCompactCurrency(Number(row.amount), baseCurrency)}</span>
                    </li>
                  ))}
                  {item.rows.length > 3 ? (
                    <li className="text-[10px] italic">+{item.rows.length - 3} more</li>
                  ) : null}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
