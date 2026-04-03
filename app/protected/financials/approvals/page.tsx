import Link from 'next/link';
import { listCompanyFinanceInvoicesForQueue } from '@/lib/actions/finance-invoices';
import { getStudies } from '@/lib/actions/studies';
import { FinancialsApprovalsClient } from '@/components/ctms/financials/financials-approvals-client';

export default async function FinancialsApprovalsPage() {
  const [invoices, studies] = await Promise.all([
    listCompanyFinanceInvoicesForQueue(),
    getStudies(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoice Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve invoices submitted by your team across all studies.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          <Link href="/protected/financials" className="underline hover:text-foreground">
            Back to Financials overview
          </Link>
        </p>
      </div>
      <FinancialsApprovalsClient
        initialInvoices={invoices}
        studies={studies.map((s) => ({ id: s.id, title: s.title }))}
      />
    </div>
  );
}
