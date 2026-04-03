import Link from 'next/link';
import { getPortfolioFinancials } from '@/lib/actions/financials';
import { FinancialsOverview } from '@/components/ctms/financials/financials-overview';
import { createClient } from '@/lib/server';

export default async function FinancialsPage() {
  const { studies, totals, monthlySpend, monthlySpendByStudyId } = await getPortfolioFinancials();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isCompanyAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle();
    isCompanyAdmin = profile?.role === 'admin';
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financials</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Trial budgets, invoices, approvals, and site payments for your studies live here. This is the{' '}
          <span className="font-medium text-foreground">canonical</span> place in CTMS for that financial
          lifecycle. The separate <span className="font-medium text-foreground">Clinical Payments</span> module
          is a different workspace and does not sync amounts automatically.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          <Link href="/protected/clinical-payments" className="underline hover:text-foreground">
            Open Clinical Payments
          </Link>{' '}
          (operational payment tools) — use Financials for study budgets and invoice-to-payment traceability.
        </p>
        {isCompanyAdmin && (
          <p className="text-xs text-muted-foreground mt-2">
            <Link href="/protected/financials/approval-templates" className="underline hover:text-foreground">
              Configure invoice approval workflows
            </Link>{' '}
            (steps, roles, and escalation thresholds).
          </p>
        )}
      </div>
      <FinancialsOverview
        studies={studies}
        totals={totals}
        monthlySpend={monthlySpend}
        monthlySpendByStudyId={monthlySpendByStudyId}
      />
    </div>
  );
}
