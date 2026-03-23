import { startOfWeek, endOfWeek, format } from 'date-fns';

/** Week range Monday–Sunday in local date (ISO date strings yyyy-MM-dd). */
export function getWeekRangeForDate(d: Date) {
  const start = startOfWeek(d, { weekStartsOn: 1 });
  const end = endOfWeek(d, { weekStartsOn: 1 });
  return {
    weekStart: format(start, 'yyyy-MM-dd'),
    weekEnd: format(end, 'yyyy-MM-dd'),
  };
}
