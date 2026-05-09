import { notFound } from 'next/navigation';

import { getVendorSpendData, listFinanceContracts, listFinanceVendors } from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { VendorKpiRow } from '@/components/ctms/finance-module/vendor-kpi-row';
import { VendorSpendTable } from '@/components/ctms/finance-module/vendor-spend-table';
import { VendorSpendTrendChart } from '@/components/ctms/finance-module/vendor-spend-trend-chart';
import { ContractUtilizationChart } from '@/components/ctms/finance-module/contract-utilization-chart';
import { TopVendorsBySpend } from '@/components/ctms/finance-module/top-vendors-by-spend';
import { VendorAlertsPanel } from '@/components/ctms/finance-module/vendor-alerts-panel';
import { VendorSummaryDonut } from '@/components/ctms/finance-module/vendor-summary-donut';
import { VendorRecentInvoices } from '@/components/ctms/finance-module/vendor-recent-invoices';
import { AiFinanceInsightsPanel } from '@/components/ctms/finance-module/ai-finance-insights-panel';
import { VendorMasterDataCard } from '@/components/ctms/finance-module/vendor-master-data-card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyVendorsPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const [{ data, error }, { data: vendorRows }, { data: contractRows }] = await Promise.all([
    getVendorSpendData(studyId),
    listFinanceVendors(studyId),
    listFinanceContracts(studyId),
  ]);
  if (error && !data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Vendor Spend Tracker"
        subtitle="Maintain a consolidated view of vendor relationships: contracts, service categories, cumulative spend, invoicing activity, and remaining balances so supplier exposure and contract performance stay visible."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }
  if (!data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Vendor Spend Tracker"
        subtitle="Maintain a consolidated view of vendor relationships: contracts, service categories, cumulative spend, invoicing activity, and remaining balances so supplier exposure and contract performance stay visible."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Vendor Spend Tracker"
      subtitle="Maintain a consolidated view of vendor relationships: contracts, service categories, cumulative spend, invoicing activity, and remaining balances so supplier exposure and contract performance stay visible."
    >
      <VendorKpiRow kpis={data.kpis} baseCurrency={data.baseCurrency} />

      <VendorMasterDataCard
        studyId={studyId}
        vendors={vendorRows ?? []}
        contracts={contractRows ?? []}
        baseCurrency={data.baseCurrency}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <VendorSpendTable rows={data.vendors} baseCurrency={data.baseCurrency} />

          <div className="grid gap-4 lg:grid-cols-2">
            <VendorSpendTrendChart series={data.monthlyTrend} baseCurrency={data.baseCurrency} />
            <ContractUtilizationChart rows={data.utilization} />
          </div>

          <VendorRecentInvoices studyId={studyId} baseCurrency={data.baseCurrency} />
        </div>

        <div className="flex flex-col gap-4">
          <VendorSummaryDonut rows={data.vendors} />
          <TopVendorsBySpend rows={data.topVendors} baseCurrency={data.baseCurrency} />
          <AiFinanceInsightsPanel
            studyId={studyId}
            scope="vendors"
            title="Vendor Spend Outliers"
            description="OpenAI-generated outlier detection across vendors. Advisory only."
          />
          <VendorAlertsPanel rows={data.vendors} />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
