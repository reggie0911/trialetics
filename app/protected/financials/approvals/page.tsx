import Link from 'next/link';
import { listCompanyFinanceInvoicesForQueue } from '@/lib/actions/finance-invoices';
import { FinancialsApprovalsClient } from '@/components/ctms/financials/financials-approvals-client';

export default async function FinancialsApprovalsPage() {
  const invoices = await listCompanyFinanceInvoicesForQueue();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoice approvals</h1>
        <p className="text-sm text-muted-foreground">
          Operational and financial review queue for invoices submitted across your studies.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          <Link href="/protected/financials" className="underline hover:text-foreground">
            Back to Financials overview
          </Link>
        </p>
      </div>
      <FinancialsApprovalsClient initialInvoices={invoices} />
    </div>
  );
}
