'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency, formatCurrency } from '@/lib/finance-module/calculations';
import type { FinanceDashboardKpis } from '@/lib/actions/study-finance-module';

interface FinanceDashboardCardsProps {
  kpis: FinanceDashboardKpis;
  baseCurrency: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  description: string;
  emphasis?: 'default' | 'positive' | 'warning';
}

function KpiCard({ title, value, description, emphasis = 'default' }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={
            emphasis === 'positive'
              ? 'text-2xl font-semibold text-emerald-600 dark:text-emerald-400'
              : emphasis === 'warning'
                ? 'text-2xl font-semibold text-amber-600 dark:text-amber-400'
                : 'text-2xl font-semibold text-foreground'
          }
        >
          {value}
        </div>
        <CardDescription className="mt-1 text-[11px] text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export function FinanceDashboardCards({ kpis, baseCurrency }: FinanceDashboardCardsProps) {
  const totalApprovedShare = kpis.totalApprovedBudget > 0
    ? `${((kpis.totalCommittedSpend / kpis.totalApprovedBudget) * 100).toFixed(0)}% of approved`
    : 'No approved budget';

  const remainingPct =
    kpis.totalApprovedBudget > 0
      ? `${((kpis.remainingBudget / kpis.totalApprovedBudget) * 100).toFixed(0)}% of approved`
      : '—';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Total Approved Budget"
        value={formatCompactCurrency(kpis.totalApprovedBudget, baseCurrency)}
        description="Sum of approved line items in the active budget version."
      />
      <KpiCard
        title="Total Committed Spend"
        value={formatCompactCurrency(kpis.totalCommittedSpend, baseCurrency)}
        description={totalApprovedShare}
      />
      <KpiCard
        title="Total Actual Spend"
        value={formatCompactCurrency(kpis.totalActualSpend, baseCurrency)}
        description="Approved invoices and recorded payments."
      />
      <KpiCard
        title="Forecasted Spend"
        value={formatCompactCurrency(kpis.totalForecastedSpend, baseCurrency)}
        description="Projected spend through end of forecast horizon."
      />
      <KpiCard
        title="Remaining Budget"
        value={formatCompactCurrency(kpis.remainingBudget, baseCurrency)}
        description={remainingPct}
        emphasis={kpis.remainingBudget > 0 ? 'positive' : 'warning'}
      />
      <KpiCard
        title="Invoices Pending Approval"
        value={`${kpis.invoicesPendingApproval}`}
        description={`${formatCurrency(kpis.invoicesPendingApprovalAmount, baseCurrency)} pending approval`}
      />
      <KpiCard
        title="Site Payments Due"
        value={`${kpis.sitePaymentsDue}`}
        description={`${formatCurrency(kpis.sitePaymentsDueAmount, baseCurrency)} due`}
      />
      <KpiCard
        title="Vendor Payments Due"
        value={`${kpis.vendorPaymentsDue}`}
        description={`${formatCurrency(kpis.vendorPaymentsDueAmount, baseCurrency)} due`}
      />
    </div>
  );
}
