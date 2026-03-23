import { TimeExpenseApprovalsClient } from '@/components/ctms/time-expenses/time-expense-approvals-client';
import { listCompanyExpenseReportsForApprovalQueue } from '@/lib/actions/expense-reports';
import { listCompanyTimesheetsForApprovalQueue } from '@/lib/actions/timesheets';

export default async function TimeExpenseApprovalsPage() {
  const [timesheets, expenses] = await Promise.all([
    listCompanyTimesheetsForApprovalQueue(),
    listCompanyExpenseReportsForApprovalQueue(),
  ]);

  return <TimeExpenseApprovalsClient initialTimesheets={timesheets} initialExpenses={expenses} />;
}
