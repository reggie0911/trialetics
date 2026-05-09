'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PoTrackerKpis } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface PoKpiRowProps {
  kpis: PoTrackerKpis;
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

export function PoKpiRow({ kpis, baseCurrency }: PoKpiRowProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <KpiCard title="Total POs" value={`${kpis.totalPos}`} description="All purchase orders." />
      <KpiCard
        title="Total PO Value"
        value={formatCompactCurrency(kpis.totalPoValue, baseCurrency)}
        description="Sum of approved PO commitments."
      />
      <KpiCard
        title="Amount Invoiced"
        value={formatCompactCurrency(kpis.totalInvoiced, baseCurrency)}
        description="Invoices linked to POs."
      />
      <KpiCard
        title="Remaining PO Balance"
        value={formatCompactCurrency(kpis.remainingBalance, baseCurrency)}
        description="PO value minus invoiced amount."
      />
      <KpiCard
        title="Fully Utilized"
        value={`${kpis.fullyUtilized}`}
        description="POs with 100% utilization."
      />
      <KpiCard
        title="Expiring Soon"
        value={`${kpis.expiringSoon}`}
        description="Expire within 30 days."
      />
    </div>
  );
}
