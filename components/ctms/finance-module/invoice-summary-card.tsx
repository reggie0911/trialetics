'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { InvoiceTrackerSummary } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface InvoiceSummaryCardProps {
  summary: InvoiceTrackerSummary;
  baseCurrency: string;
}

export function InvoiceSummaryCard({ summary, baseCurrency }: InvoiceSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Invoice Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-xs">
          <dt className="text-muted-foreground">Total Invoiced</dt>
          <dd className="text-foreground tabular-nums">
            {formatCompactCurrency(summary.totalInvoiced, baseCurrency)}
          </dd>
          <dt className="text-muted-foreground">Total Paid</dt>
          <dd className="text-foreground tabular-nums">
            {formatCompactCurrency(summary.totalPaid, baseCurrency)}
          </dd>
          <dt className="text-muted-foreground">Total Pending</dt>
          <dd className="text-foreground tabular-nums">
            {formatCompactCurrency(summary.totalPending, baseCurrency)}
          </dd>
          <dt className="text-muted-foreground">Total Overdue</dt>
          <dd className="text-foreground tabular-nums">
            {formatCompactCurrency(summary.totalOverdue, baseCurrency)}
          </dd>
          <dt className="text-muted-foreground">Total Disputed</dt>
          <dd className="text-foreground tabular-nums">
            {formatCompactCurrency(summary.totalDisputed, baseCurrency)}
          </dd>
        </dl>
      </CardContent>
    </Card>
  );
}
