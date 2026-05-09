'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SitePaymentTrackerKpis } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface SitePaymentKpiRowProps {
  kpis: SitePaymentTrackerKpis;
  baseCurrency: string;
}

export function SitePaymentKpiRow({ kpis, baseCurrency }: SitePaymentKpiRowProps) {
  const items: { title: string; value: number; description: string }[] = [
    { title: 'Scheduled', value: kpis.scheduled, description: 'Planned but not yet earned.' },
    { title: 'Earned', value: kpis.earned, description: 'Triggered milestones.' },
    { title: 'Approved', value: kpis.approved, description: 'Approved for payment.' },
    { title: 'Paid', value: kpis.paid, description: 'Disbursed to sites.' },
    { title: 'Held', value: kpis.held, description: 'On hold or holdback retained.' },
    { title: 'Projected', value: kpis.projected, description: 'Total projected payments.' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {item.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {formatCompactCurrency(item.value, baseCurrency)}
            </div>
            <CardDescription className="mt-1 text-[11px] text-muted-foreground">
              {item.description}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
