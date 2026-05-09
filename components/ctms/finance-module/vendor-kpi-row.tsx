'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { VendorSpendKpis } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface VendorKpiRowProps {
  kpis: VendorSpendKpis;
  baseCurrency: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
}

function KpiCard({ title, value, description }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <CardDescription className="mt-1 text-[11px] text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function VendorKpiRow({ kpis, baseCurrency }: VendorKpiRowProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard title="Total Vendors" value={`${kpis.totalVendors}`} description="Across categories." />
      <KpiCard
        title="Total Contract Value"
        value={formatCompactCurrency(kpis.totalContractValue, baseCurrency)}
        description="All approved contracts."
      />
      <KpiCard
        title="Total Invoiced"
        value={formatCompactCurrency(kpis.totalInvoiced, baseCurrency)}
        description="Submitted, reviewed, or approved invoices."
      />
      <KpiCard
        title="Total Paid"
        value={formatCompactCurrency(kpis.totalPaid, baseCurrency)}
        description="Recorded vendor payments."
      />
      <KpiCard
        title="Remaining Balance"
        value={formatCompactCurrency(kpis.remainingBalance, baseCurrency)}
        description="Contract value minus invoiced."
      />
      <KpiCard
        title="Vendors At Risk"
        value={`${kpis.vendorsAtRisk}`}
        description="Health, risk, or >80% utilization."
      />
    </div>
  );
}
