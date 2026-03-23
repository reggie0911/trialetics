'use server';

import { createClient } from '@/lib/server';
import type { TimeExpenseDashboardFilters } from '@/lib/types/time-expense';

export type { TimeExpenseDashboardFilters } from '@/lib/types/time-expense';

export type HoursOverTimePoint = { bucket: string; hours: number };
export type NamedAmount = { name: string; value: number };
export type PipelineCount = { status: string; timesheets: number; expenses: number };

export async function getTimeExpenseDashboardData(filters: TimeExpenseDashboardFilters) {
  const empty = {
    hoursOverTime: [] as HoursOverTimePoint[],
    hoursByStudy: [] as NamedAmount[],
    hoursByActivity: [] as NamedAmount[],
    billableVsNon: { billable: 0, nonBillable: 0 },
    expensesByCategory: [] as NamedAmount[],
    expensesByStudy: [] as NamedAmount[],
    pipeline: [] as PipelineCount[],
    summaryText: '',
    currenciesPresent: [] as string[],
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.company_id) return empty;

  const { data: teRows, error: teErr } = await supabase
    .from('timesheet_entries')
    .select(
      `hours, is_billable, work_date, site_id,
       time_activity_types (label),
       timesheet_periods!inner (
         company_id, profile_id, study_id, status, week_start_date,
         studies (title)
       )`,
    )
    .eq('timesheet_periods.company_id', profile.company_id)
    .gte('work_date', filters.dateFrom)
    .lte('work_date', filters.dateTo);

  if (teErr) throw new Error(teErr.message);

  const { data: elRows, error: elErr } = await supabase
    .from('expense_lines')
    .select(
      `amount, currency, expense_date, site_id,
       expense_categories (label),
       expense_reports!inner (company_id, profile_id, study_id, status, studies (title))`,
    )
    .eq('expense_reports.company_id', profile.company_id)
    .gte('expense_date', filters.dateFrom)
    .lte('expense_date', filters.dateTo);

  if (elErr) throw new Error(elErr.message);

  type TeRow = {
    hours: number;
    is_billable: boolean;
    work_date: string;
    site_id: string | null;
    time_activity_types: { label: string } | null;
    timesheet_periods: {
      profile_id: string;
      study_id: string;
      status: string;
      studies: { title: string } | null;
    };
  };

  type ElRow = {
    amount: number;
    currency: string;
    site_id: string | null;
    expense_categories: { label: string } | null;
    expense_reports: {
      profile_id: string;
      study_id: string;
      status: string;
      studies: { title: string } | null;
    };
  };

  const teAll = (teRows ?? []) as unknown as TeRow[];
  const elAll = (elRows ?? []) as unknown as ElRow[];

  const te = teAll.filter((r) => {
    if (filters.studyId && r.timesheet_periods.study_id !== filters.studyId) return false;
    if (filters.profileId && r.timesheet_periods.profile_id !== filters.profileId) return false;
    if (filters.status && r.timesheet_periods.status !== filters.status) return false;
    if (filters.siteId && r.site_id !== filters.siteId) return false;
    return true;
  });

  const el = elAll.filter((r) => {
    if (filters.studyId && r.expense_reports.study_id !== filters.studyId) return false;
    if (filters.profileId && r.expense_reports.profile_id !== filters.profileId) return false;
    if (filters.status && r.expense_reports.status !== filters.status) return false;
    if (filters.siteId && r.site_id !== filters.siteId) return false;
    return true;
  });

  const hoursByWeek = new Map<string, number>();
  for (const r of te) {
    const key = r.work_date.slice(0, 7);
    hoursByWeek.set(key, (hoursByWeek.get(key) ?? 0) + Number(r.hours));
  }
  const hoursOverTime: HoursOverTimePoint[] = [...hoursByWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, hours]) => ({ bucket, hours }));

  const byStudy = new Map<string, number>();
  for (const r of te) {
    const name = r.timesheet_periods.studies?.title ?? 'Study';
    byStudy.set(name, (byStudy.get(name) ?? 0) + Number(r.hours));
  }
  const hoursByStudy: NamedAmount[] = [...byStudy.entries()].map(([name, value]) => ({ name, value }));

  const byAct = new Map<string, number>();
  for (const r of te) {
    const name = r.time_activity_types?.label ?? 'Activity';
    byAct.set(name, (byAct.get(name) ?? 0) + Number(r.hours));
  }
  const hoursByActivity: NamedAmount[] = [...byAct.entries()].map(([name, value]) => ({ name, value }));

  let billable = 0;
  let nonBillable = 0;
  for (const r of te) {
    if (r.is_billable) billable += Number(r.hours);
    else nonBillable += Number(r.hours);
  }

  const currSet = new Set<string>();
  const byCat = new Map<string, number>();
  for (const r of el) {
    const cur = r.currency || 'USD';
    currSet.add(cur);
    const name = `${cur} — ${r.expense_categories?.label ?? 'Category'}`;
    byCat.set(name, (byCat.get(name) ?? 0) + Number(r.amount));
  }
  const expensesByCategory: NamedAmount[] = [...byCat.entries()].map(([name, value]) => ({ name, value }));

  const expByStudy = new Map<string, number>();
  for (const r of el) {
    const cur = r.currency || 'USD';
    const name = `${cur} — ${r.expense_reports.studies?.title ?? 'Study'}`;
    expByStudy.set(name, (expByStudy.get(name) ?? 0) + Number(r.amount));
  }
  const expensesByStudy: NamedAmount[] = [...expByStudy.entries()].map(([name, value]) => ({ name, value }));

  const tpPipeline = await supabase
    .from('timesheet_periods')
    .select('status')
    .eq('company_id', profile.company_id);
  const erPipeline = await supabase
    .from('expense_reports')
    .select('status')
    .eq('company_id', profile.company_id);

  const pMap = new Map<string, { timesheets: number; expenses: number }>();
  const statuses = ['draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected'];
  for (const s of statuses) pMap.set(s, { timesheets: 0, expenses: 0 });
  for (const r of tpPipeline.data ?? []) {
    const st = (r as { status: string }).status;
    const cur = pMap.get(st) ?? { timesheets: 0, expenses: 0 };
    cur.timesheets += 1;
    pMap.set(st, cur);
  }
  for (const r of erPipeline.data ?? []) {
    const st = (r as { status: string }).status;
    const cur = pMap.get(st) ?? { timesheets: 0, expenses: 0 };
    cur.expenses += 1;
    pMap.set(st, cur);
  }
  const pipeline: PipelineCount[] = statuses.map((status) => ({
    status,
    timesheets: pMap.get(status)?.timesheets ?? 0,
    expenses: pMap.get(status)?.expenses ?? 0,
  }));

  const totalHours = te.reduce((s, r) => s + Number(r.hours), 0);
  const studyTitles = new Set(te.map((r) => r.timesheet_periods.studies?.title).filter(Boolean));
  const summaryText = `${studyTitles.size} studies, ${totalHours.toFixed(1)} hours in range (timesheet lines). Expense lines: ${el.length}.`;

  return {
    hoursOverTime,
    hoursByStudy,
    hoursByActivity,
    billableVsNon: { billable, nonBillable },
    expensesByCategory,
    expensesByStudy,
    pipeline,
    summaryText,
    currenciesPresent: [...currSet],
  };
}
