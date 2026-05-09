import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import {
  getPoTrackerData,
  listBudgetCategories,
  listFinanceContracts,
  listFinanceVendors,
} from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { PoKpiRow } from '@/components/ctms/finance-module/po-kpi-row';
import { PurchaseOrderTable } from '@/components/ctms/finance-module/purchase-order-table';
import { PoValueOverTimeChart } from '@/components/ctms/finance-module/po-value-over-time-chart';
import { TopVendorsByPoValue } from '@/components/ctms/finance-module/top-vendors-by-po-value';
import { PoBalanceStatusPanel } from '@/components/ctms/finance-module/po-balance-status-panel';
import { PoAlertsPanel } from '@/components/ctms/finance-module/po-alerts-panel';
import { PurchaseOrderCreateCard } from '@/components/ctms/finance-module/purchase-order-create-card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyPurchaseOrdersPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const [
    { data, error },
    { data: vendors },
    { data: contracts },
    { data: categories },
  ] = await Promise.all([
    getPoTrackerData(studyId),
    listFinanceVendors(studyId),
    listFinanceContracts(studyId),
    listBudgetCategories(studyId),
  ]);
  if (error && !data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Purchase Order Tracker"
        subtitle="Issue and maintain purchase orders to encumber spend against contracts, monitor open commitments and remaining balances, and align commitments with incoming invoices and delivery milestones."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }
  if (!data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Purchase Order Tracker"
        subtitle="Issue and maintain purchase orders to encumber spend against contracts, monitor open commitments and remaining balances, and align commitments with incoming invoices and delivery milestones."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Purchase Order Tracker"
      subtitle="Issue and maintain purchase orders to encumber spend against contracts, monitor open commitments and remaining balances, and align commitments with incoming invoices and delivery milestones."
    >
      <PoKpiRow kpis={data.kpis} baseCurrency={data.baseCurrency} />

      <PurchaseOrderCreateCard
        studyId={studyId}
        vendors={vendors ?? []}
        contracts={contracts ?? []}
        categories={categories ?? []}
        baseCurrency={data.baseCurrency}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Suspense fallback={<p className="text-xs text-muted-foreground">Loading purchase orders…</p>}>
            <PurchaseOrderTable
              studyId={studyId}
              rows={data.rows}
              vendors={vendors ?? []}
              contracts={contracts ?? []}
              categories={categories ?? []}
            />
          </Suspense>

          <div className="grid gap-4 lg:grid-cols-2">
            <PoValueOverTimeChart series={data.monthlySeries} baseCurrency={data.baseCurrency} />
            <TopVendorsByPoValue rows={data.topVendors} baseCurrency={data.baseCurrency} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <PoBalanceStatusPanel buckets={data.balanceBuckets} />
          <PoAlertsPanel rows={data.rows} />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
