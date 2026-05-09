import { Suspense } from 'react';
import { notFound } from 'next/navigation';

import { listStudySitesForDirectoryFilter } from '@/lib/actions/directory-contacts';
import {
  getInvoice,
  getInvoiceTrackerData,
  listBudgetCategories,
  listFinanceContracts,
  listFinancePurchaseOrders,
  listFinanceVendors,
} from '@/lib/actions/study-finance-module';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { createClient } from '@/lib/server';
import { FinanceModuleShell } from '@/components/ctms/finance-module/finance-module-shell';
import { InvoiceKpiRow } from '@/components/ctms/finance-module/invoice-kpi-row';
import { InvoiceTable } from '@/components/ctms/finance-module/invoice-table';
import { InvoiceIntakeUploader } from '@/components/ctms/finance-module/invoice-intake-uploader';
import { InvoiceAiInsightsPanel } from '@/components/ctms/finance-module/invoice-ai-insights-panel';
import { InvoiceWorkflowPanel } from '@/components/ctms/finance-module/invoice-workflow-panel';
import { InvoiceSummaryCard } from '@/components/ctms/finance-module/invoice-summary-card';
import { InvoiceAgingDonut } from '@/components/ctms/finance-module/invoice-aging-donut';
import { InvoiceSmartAlertsPanel } from '@/components/ctms/finance-module/invoice-smart-alerts-panel';
import { AiFinanceInsightsPanel } from '@/components/ctms/finance-module/ai-finance-insights-panel';

function parseInvoiceQuery(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : undefined;
}

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invoice?: string }>;
}

export default async function StudyInvoicesPage({ params, searchParams }: PageProps) {
  const { id: studyId } = await params;
  const sp = await searchParams;
  const selectedInvoiceId = parseInvoiceQuery(sp.invoice);
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data, error },
    { data: categories = [] },
    { data: vendors = [] },
    { data: contracts = [] },
    { data: purchaseOrders = [] },
    { data: studySites = [] },
    invoiceDetail,
  ] = await Promise.all([
    getInvoiceTrackerData(studyId),
    listBudgetCategories(studyId),
    listFinanceVendors(studyId),
    listFinanceContracts(studyId),
    listFinancePurchaseOrders(studyId),
    listStudySitesForDirectoryFilter(studyId),
    selectedInvoiceId
      ? getInvoice(studyId, selectedInvoiceId)
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (error && !data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Invoice Tracker"
        subtitle="Manage the invoice lifecycle from intake and coding through review and approval to payment and dispute handling—one place to see bottlenecks and cash-out timing before funds move."
      >
        <p className="text-sm text-destructive">{error}</p>
      </FinanceModuleShell>
    );
  }
  if (!data) {
    return (
      <FinanceModuleShell
        studyId={studyId}
        title="Invoice Tracker"
        subtitle="Manage the invoice lifecycle from intake and coding through review and approval to payment and dispute handling—one place to see bottlenecks and cash-out timing before funds move."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FinanceModuleShell>
    );
  }

  const selectedInvoice =
    selectedInvoiceId && invoiceDetail.data
      ? invoiceDetail.data.invoice
      : selectedInvoiceId
        ? data.invoices.find((i) => i.id === selectedInvoiceId) ?? null
        : null;
  const selectedLineItems = invoiceDetail.data?.lineItems ?? [];

  return (
    <FinanceModuleShell
      studyId={studyId}
      title="Invoice Tracker"
      subtitle="Manage the invoice lifecycle from intake and coding through review and approval to payment and dispute handling—one place to see bottlenecks and cash-out timing before funds move."
    >
      <InvoiceKpiRow kpis={data.kpis} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Suspense fallback={<p className="text-xs text-muted-foreground">Loading invoices…</p>}>
            <InvoiceTable
              studyId={studyId}
              invoices={data.invoices}
              selectedInvoiceId={selectedInvoiceId ?? null}
              vendors={vendors}
              contracts={contracts}
              categories={categories}
              purchaseOrders={purchaseOrders}
              studySites={studySites}
              currentUserId={user?.id ?? null}
            />
          </Suspense>

          <InvoiceWorkflowPanel
            studyId={studyId}
            invoice={selectedInvoice}
            lineItems={selectedLineItems}
            categories={categories}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <InvoiceIntakeUploader studyId={studyId} baseCurrency={data.baseCurrency} />
            <InvoiceAiInsightsPanel invoices={data.invoices} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <InvoiceSummaryCard summary={data.summary} baseCurrency={data.baseCurrency} />
          <InvoiceAgingDonut rows={data.aging} baseCurrency={data.baseCurrency} />
          <AiFinanceInsightsPanel
            studyId={studyId}
            scope="invoices"
            title="Invoice Anomaly Insights"
            description="OpenAI-generated heuristics highlighting overdue, aging, and unusually large invoices."
          />
          <InvoiceSmartAlertsPanel invoices={data.invoices} />
        </div>
      </div>
    </FinanceModuleShell>
  );
}
