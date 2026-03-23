import { requireCtmsAccess } from '@/lib/server/require-ctms-access';
import { TimeExpenseSubnav } from '@/components/ctms/time-expenses/time-expense-subnav';

export default async function TimeExpensesLayout({ children }: { children: React.ReactNode }) {
  await requireCtmsAccess();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Time & expenses</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Log hours and expenses by study. Totals here are for operational reporting and are not posted to Financials or
          Clinical Payments.
        </p>
      </div>
      <TimeExpenseSubnav />
      {children}
    </div>
  );
}
