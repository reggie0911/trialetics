import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import {
  getPoTrackerData,
  getSitePaymentTrackerData,
  getStudyFinanceWorkspace,
  listBudgetVersions,
  listChangeOrders,
  listFinanceContracts,
} from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { ChangeOrdersPanel } from '@/components/ctms/finance-module/change-orders-panel';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyFinanceChangeOrdersPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const [
    { data: workspace },
    { data: orders, error: ordersError },
    { data: budgetVersions, error: bvError },
    { data: contracts, error: cError },
    { data: poData, error: poError },
    { data: siteData, error: spError },
  ] = await Promise.all([
    getStudyFinanceWorkspace(studyId),
    listChangeOrders(studyId),
    listBudgetVersions(studyId),
    listFinanceContracts(studyId),
    getPoTrackerData(studyId),
    getSitePaymentTrackerData(studyId),
  ]);

  const baseCurrency = workspace?.base_currency ?? 'USD';
  const blockingError = ordersError || bvError || cError || poError || spError;

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Change Orders"
      subtitle="Initiate and track governed amendments when economics or scope shift—covering budgets, vendor commitments, purchase orders, and site payment schedules—with clear review and approval before changes take effect."
    >
      {blockingError ? <p className="text-sm text-destructive">{blockingError}</p> : null}

      <Suspense fallback={<p className="text-xs text-muted-foreground">Loading change orders…</p>}>
        <ChangeOrdersPanel
          studyId={studyId}
          orders={orders ?? []}
          budgetVersions={budgetVersions ?? []}
          contracts={contracts ?? []}
          purchaseOrders={(poData?.rows ?? []).map((r) => ({ id: r.id, po_number: r.po_number }))}
          siteSchedules={(siteData?.rows ?? []).map((r) => ({ id: r.id, milestone_label: r.milestone_label }))}
          baseCurrency={baseCurrency}
        />
      </Suspense>
    </FinanceModuleShell>
  );
}
