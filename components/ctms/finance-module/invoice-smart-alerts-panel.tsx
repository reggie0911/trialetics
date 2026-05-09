'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FmInvoice } from '@/lib/finance-module/types';

interface InvoiceSmartAlertsPanelProps {
  invoices: FmInvoice[];
}

export function InvoiceSmartAlertsPanel({ invoices }: InvoiceSmartAlertsPanelProps) {
  const overdue = invoices.filter((i) => i.payment_status === 'overdue');
  const longPending = invoices.filter((i) => {
    if (i.approval_status !== 'submitted' && i.approval_status !== 'under_review') return false;
    const days = Math.round(
      (Date.now() - new Date(i.invoice_date).getTime()) / (1000 * 60 * 60 * 24),
    );
    return days > 7;
  });

  const items = [
    overdue.length > 0
      ? `${overdue.length} invoice${overdue.length === 1 ? ' is' : 's are'} overdue.`
      : null,
    longPending.length > 0
      ? `${longPending.length} invoice${longPending.length === 1 ? ' has' : 's have'} been pending approval over 7 days.`
      : null,
  ].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Smart Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No alerts right now.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-xs">
            {items.map((item) => (
              <li key={item} className="text-foreground">
                {item}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
