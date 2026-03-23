import { format, subDays } from 'date-fns';

import type { TimeExpenseDashboardFilters } from '@/lib/types/time-expense';

export function buildDefaultTimeExpenseFilters(): TimeExpenseDashboardFilters {
  const to = new Date();
  const from = subDays(to, 90);
  return {
    dateFrom: format(from, 'yyyy-MM-dd'),
    dateTo: format(to, 'yyyy-MM-dd'),
    studyId: null,
    siteId: null,
    profileId: null,
    status: null,
  };
}
