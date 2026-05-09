'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { InvoiceTrackerKpis } from '@/lib/actions/study-finance-module';

interface InvoiceKpiRowProps {
  kpis: InvoiceTrackerKpis;
}

const STAT_DEFINITIONS: Array<{
  key: keyof InvoiceTrackerKpis;
  title: string;
  description: string;
}> = [
  { key: 'total', title: 'Total Invoices', description: 'All invoices for this study.' },
  { key: 'draft', title: 'Draft', description: 'Not yet submitted.' },
  { key: 'submitted', title: 'Submitted', description: 'Awaiting initial review.' },
  { key: 'underReview', title: 'Under Review', description: 'Reviewed by finance team.' },
  { key: 'approved', title: 'Approved', description: 'Approved for payment.' },
  { key: 'paid', title: 'Paid', description: 'Payment recorded.' },
  { key: 'overdue', title: 'Overdue', description: 'Past due date.' },
  { key: 'disputed', title: 'Disputed', description: 'Active dispute.' },
];

export function InvoiceKpiRow({ kpis }: InvoiceKpiRowProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {STAT_DEFINITIONS.map((stat) => (
        <Card key={stat.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">{kpis[stat.key]}</div>
            <CardDescription className="mt-1 text-[11px] text-muted-foreground">
              {stat.description}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
