import { TimeExpenseDashboardClient } from '@/components/ctms/time-expenses/time-expense-dashboard-client';
import { buildDefaultTimeExpenseFilters } from '@/lib/utils/time-expense-filters';
import { getTimeExpenseDashboardData } from '@/lib/actions/time-expense-dashboard';
import { getStudies } from '@/lib/actions/studies';

export default async function TimeExpensesDashboardPage() {
  const filters = buildDefaultTimeExpenseFilters();
  const [initialData, studies] = await Promise.all([
    getTimeExpenseDashboardData(filters),
    getStudies(),
  ]);

  return (
    <TimeExpenseDashboardClient
      initialData={initialData}
      studies={studies.map((s) => ({ id: s.id, title: s.title, protocol_number: s.protocol_number }))}
      initialFilters={filters}
    />
  );
}
