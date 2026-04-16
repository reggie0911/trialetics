import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listCompanyFinanceInvoicesForQueue } from '@/lib/actions/finance-invoices';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { FinancialsApprovalsClient } from '@/components/ctms/financials/financials-approvals-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyFinancialsApprovalsPage({ params }: PageProps) {
  const { id: studyId } = await params;
  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const invoices = await listCompanyFinanceInvoicesForQueue(studyId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoice Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve invoices for this study.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          <Link href={`/protected/studies/${studyId}/financials`} className="underline hover:text-foreground">
            Back to study financials
          </Link>
        </p>
      </div>
      <FinancialsApprovalsClient
        initialInvoices={invoices}
        studies={[{ id: study.id, title: study.title }]}
      />
    </div>
  );
}
