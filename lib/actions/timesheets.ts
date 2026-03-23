'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { TimeExpenseSubmissionStatus } from '@/lib/types/time-expense';

function revalidateTimesheets(studyId?: string) {
  revalidatePath('/protected/time-expenses');
  revalidatePath('/protected/time-expenses/timesheets');
  revalidatePath('/protected/time-expenses/approvals');
  if (studyId) revalidatePath(`/protected/studies/${studyId}`);
}

export type TimesheetPeriodRow = {
  id: string;
  company_id: string;
  profile_id: string;
  study_id: string;
  week_start_date: string;
  week_end_date: string;
  status: TimeExpenseSubmissionStatus;
  approval_step: number;
  submitted_at: string | null;
  total_hours: number | null;
  billable_hours: number | null;
  overtime_hours: number | null;
  version: number;
  notes: string | null;
  studies?: { title: string } | null;
};

export async function listMyTimesheetPeriods(): Promise<TimesheetPeriodRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.id) return [];

  const { data, error } = await supabase
    .from('timesheet_periods')
    .select('*, studies(title)')
    .eq('profile_id', profile.id)
    .order('week_start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TimesheetPeriodRow[];
}

export async function getTimesheetPeriod(periodId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('timesheet_periods')
    .select('*, studies(title)')
    .eq('id', periodId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as TimesheetPeriodRow | null;
}

export async function listTimesheetEntries(periodId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('timesheet_entries')
    .select(
      '*, time_activity_types(label, code), study_sites(site_number, name)'
    )
    .eq('period_id', periodId)
    .order('work_date', { ascending: true })
    .order('sort_index', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listTimeActivityTypesForCompany() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: p } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  if (!p?.company_id) return [];

  const { data, error } = await supabase
    .from('time_activity_types')
    .select('id, label, code')
    .eq('company_id', p.company_id)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCompanyTimeExpenseSettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.company_id) return null;
  const { data } = await supabase
    .from('company_time_expense_settings')
    .select('*')
    .eq('company_id', profile.company_id)
    .maybeSingle();
  return data;
}

export async function ensureTimesheetPeriod(input: {
  studyId: string;
  weekStartDate: string;
  weekEndDate: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) return { data: null, error: 'Profile not found.' };

  const { data: study } = await supabase.from('studies').select('company_id').eq('id', input.studyId).single();
  if (!study || study.company_id !== profile.company_id) {
    return { data: null, error: 'Study not found.' };
  }

  const { data: existing } = await supabase
    .from('timesheet_periods')
    .select('id')
    .eq('profile_id', profile.id)
    .eq('study_id', input.studyId)
    .eq('week_start_date', input.weekStartDate)
    .maybeSingle();

  if (existing?.id) {
    return { data: { id: existing.id }, error: null };
  }

  const { data: tpl } = await supabase
    .from('time_expense_approval_templates')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('applies_to', 'timesheet')
    .eq('is_default', true)
    .maybeSingle();

  const { data, error } = await supabase
    .from('timesheet_periods')
    .insert({
      company_id: profile.company_id,
      profile_id: profile.id,
      study_id: input.studyId,
      week_start_date: input.weekStartDate,
      week_end_date: input.weekEndDate,
      status: 'draft',
      template_id: tpl?.id ?? null,
    })
    .select('id')
    .single();

  if (error) return { data: null, error: error.message };
  revalidateTimesheets(input.studyId);
  return { data: { id: data.id }, error: null };
}

export async function upsertTimesheetEntry(input: {
  id?: string;
  periodId: string;
  workDate: string;
  activityTypeId: string;
  hours: number;
  isBillable: boolean;
  siteId?: string | null;
  notes?: string | null;
  sortIndex?: number;
  expectedVersion?: number;
}): Promise<{ error: string | null; userMessage?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.', userMessage: 'Not signed in.' };

  const { data: period } = await supabase
    .from('timesheet_periods')
    .select('id, study_id, profile_id, status, version, company_id')
    .eq('id', input.periodId)
    .single();

  if (!period) return { error: 'Period not found.', userMessage: 'Timesheet not found.' };
  const { data: me } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (period.profile_id !== me?.id) return { error: 'Forbidden.', userMessage: 'You cannot edit this timesheet.' };
  if (!['draft', 'changes_requested'].includes(period.status)) {
    return { error: 'locked', userMessage: 'This timesheet is no longer editable.' };
  }

  const payload = {
    period_id: input.periodId,
    work_date: input.workDate,
    study_id: period.study_id,
    site_id: input.siteId ?? null,
    activity_type_id: input.activityTypeId,
    hours: input.hours,
    is_billable: input.isBillable,
    notes: input.notes ?? null,
    sort_index: input.sortIndex ?? 0,
  };

  if (input.id) {
    const { error } = await supabase
      .from('timesheet_entries')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', input.id);
    if (error) return { error: error.message, userMessage: error.message };
  } else {
    const { error } = await supabase.from('timesheet_entries').insert(payload);
    if (error) return { error: error.message, userMessage: error.message };
  }

  await supabase
    .from('timesheet_periods')
    .update({ version: period.version + 1, updated_at: new Date().toISOString() })
    .eq('id', input.periodId);

  revalidateTimesheets(period.study_id);
  return { error: null };
}

export async function deleteTimesheetEntry(entryId: string, periodId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: period } = await supabase.from('timesheet_periods').select('study_id, version').eq('id', periodId).single();
  const { error } = await supabase.from('timesheet_entries').delete().eq('id', entryId);
  if (error) return { error: error.message };
  if (period) {
    await supabase
      .from('timesheet_periods')
      .update({ version: (period.version ?? 1) + 1, updated_at: new Date().toISOString() })
      .eq('id', periodId);
    revalidateTimesheets(period.study_id);
  }
  return { error: null };
}

export async function submitTimesheetPeriod(
  periodId: string,
  expectedVersion: number
): Promise<{ error: string | null; userMessage?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'auth', userMessage: 'Not signed in.' };

  const { data: period } = await supabase
    .from('timesheet_periods')
    .select('id, profile_id, status, version, study_id')
    .eq('id', periodId)
    .single();
  if (!period) return { error: 'missing', userMessage: 'Timesheet not found.' };
  const { data: me } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (period.profile_id !== me?.id) return { error: 'forbidden', userMessage: 'You cannot submit this timesheet.' };
  if (!['draft', 'changes_requested'].includes(period.status)) {
    return { error: 'state', userMessage: 'This timesheet cannot be submitted now.' };
  }
  if (period.version !== expectedVersion) {
    return { error: 'stale', userMessage: 'This timesheet was updated elsewhere. Refresh and try again.' };
  }

  const { error } = await supabase
    .from('timesheet_periods')
    .update({
      status: 'submitted',
      approval_step: 0,
      submitted_at: new Date().toISOString(),
      version: period.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', periodId)
    .eq('version', expectedVersion);

  if (error) return { error: error.message, userMessage: error.message };
  revalidateTimesheets(period.study_id);
  // Future: in-app notifications + Resend email to approvers when RESEND_API_KEY is set.
  return { error: null };
}

export async function listCompanyTimesheetsForApprovalQueue(): Promise<TimesheetPeriodRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) return [];

  const { data, error } = await supabase
    .from('timesheet_periods')
    .select('*, studies(title)')
    .eq('company_id', profile.company_id)
    .in('status', ['submitted', 'under_review'])
    .order('submitted_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TimesheetPeriodRow[];
}

export async function timesheetPeriodRecordDecisionRpc(
  periodId: string,
  decision: 'approved' | 'rejected' | 'changes_requested',
  comment: string
): Promise<{ error: string | null; userMessage?: string; ok?: boolean }> {
  const supabase = await createClient();
  const { data: period } = await supabase.from('timesheet_periods').select('study_id').eq('id', periodId).single();
  const { data, error } = await supabase.rpc('timesheet_period_record_decision', {
    p_period_id: periodId,
    p_decision: decision,
    p_comment: comment,
  });
  if (error) return { error: error.message, userMessage: error.message };
  const j = data as { ok?: boolean; error?: string };
  if (j?.ok === false) return { error: j.error ?? 'rpc_failed', userMessage: j.error ?? 'Action failed.' };
  if (period?.study_id) revalidateTimesheets(period.study_id);
  revalidatePath('/protected/time-expenses/approvals');
  return { error: null, ok: true };
}
