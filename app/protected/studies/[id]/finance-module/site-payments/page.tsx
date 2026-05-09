import { notFound } from 'next/navigation';

import {
  getSitePaymentTrackerData,
  listFinanceContracts,
  listFinanceVendors,
} from '@/lib/actions/study-finance-module';
import { getStudySites } from '@/lib/actions/sites';
import { getStudyByIdCached } from '@/lib/actions/studies';
import type { StudySite } from '@/lib/types/ctms';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { SitePaymentKpiRow } from '@/components/ctms/finance-module/site-payment-kpi-row';
import { SitePaymentScheduleTable } from '@/components/ctms/finance-module/site-payment-schedule-table';
import { SitePaymentStatusDonut } from '@/components/ctms/finance-module/site-payment-status-donut';
import { SitePaymentAlertsPanel } from '@/components/ctms/finance-module/site-payment-alerts-panel';
import { ContractSummaryCard } from '@/components/ctms/finance-module/contract-summary-card';
import { SitePaymentCreateCard } from '@/components/ctms/finance-module/site-payment-create-card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudySitePaymentsPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  let sites: StudySite[] = [];
  try {
    sites = await getStudySites(studyId);
  } catch {
    sites = [];
  }

  const [{ data, error }, { data: contracts }, { data: vendors }] = await Promise.all([
    getSitePaymentTrackerData(studyId),
    listFinanceContracts(studyId),
    listFinanceVendors(studyId),
  ]);

  if (error && !data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Site Payment Tracker"
        subtitle="Plan and execute investigator-site economics across startup, visits, milestones, holdbacks, and closeout—tracking schedules, earned amounts, approvals, and paid status from initiation through completion."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }

  if (!data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Site Payment Tracker"
        subtitle="Plan and execute investigator-site economics across startup, visits, milestones, holdbacks, and closeout—tracking schedules, earned amounts, approvals, and paid status from initiation through completion."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Site Payment Tracker"
      subtitle="Plan and execute investigator-site economics across startup, visits, milestones, holdbacks, and closeout—tracking schedules, earned amounts, approvals, and paid status from initiation through completion."
    >
      <SitePaymentKpiRow kpis={data.kpis} baseCurrency={data.baseCurrency} />

      <SitePaymentCreateCard studyId={studyId} sites={sites} baseCurrency={data.baseCurrency} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <SitePaymentScheduleTable studyId={studyId} rows={data.rows} />
          <ContractSummaryCard contracts={contracts ?? []} vendors={vendors ?? []} />
        </div>

        <div className="flex flex-col gap-4">
          <SitePaymentStatusDonut rows={data.rows} baseCurrency={data.baseCurrency} />
          <SitePaymentAlertsPanel rows={data.rows} baseCurrency={data.baseCurrency} />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
