import { notFound } from 'next/navigation';

import { TimesheetPeriodEditor } from '@/components/ctms/time-expenses/timesheet-period-editor';
import { getStudySites } from '@/lib/actions/sites';
import {
  getTimesheetPeriod,
  listTimesheetEntries,
  listTimeActivityTypesForCompany,
} from '@/lib/actions/timesheets';

type PageProps = { params: Promise<{ periodId: string }> };

export default async function TimesheetPeriodPage({ params }: PageProps) {
  const { periodId } = await params;
  const period = await getTimesheetPeriod(periodId);
  if (!period) notFound();

  const [entries, activityTypes, sites] = await Promise.all([
    listTimesheetEntries(periodId),
    listTimeActivityTypesForCompany(),
    getStudySites(period.study_id),
  ]);

  const initialEntries = (entries as Record<string, unknown>[]).map((e) => ({
    id: e.id as string,
    work_date: String(e.work_date).slice(0, 10),
    activity_type_id: e.activity_type_id as string,
    hours: Number(e.hours),
    is_billable: Boolean(e.is_billable),
    site_id: (e.site_id as string | null) ?? null,
    notes: (e.notes as string | null) ?? null,
  }));

  return (
    <TimesheetPeriodEditor
      period={period}
      initialEntries={initialEntries}
      activityTypes={activityTypes}
      sites={sites}
    />
  );
}
