'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/server';
import type { TimeExpenseSubmissionStatus } from '@/lib/types/time-expense';

function revalidateExpenses(studyId?: string) {
  revalidatePath('/protected/time-expenses');
  revalidatePath('/protected/time-expenses/expenses');
  revalidatePath('/protected/time-expenses/approvals');
  if (studyId) revalidatePath(`/protected/studies/${studyId}`);
}

export type ExpenseReportRow = {
  id: string;
  company_id: string;
  profile_id: string;
  study_id: string;
  title: string;
  status: TimeExpenseSubmissionStatus;
  approval_step: number;
  submitted_at: string | null;
  total_amount: number | null;
  version: number;
  notes: string | null;
  studies?: { title: string } | null;
};

export async function listMyExpenseReports(): Promise<ExpenseReportRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
  if (!profile?.id) return [];

  const { data, error } = await supabase
    .from('expense_reports')
    .select('*, studies(title)')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseReportRow[];
}

export async function getExpenseReport(reportId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expense_reports')
    .select('*, studies(title)')
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ExpenseReportRow | null;
}

export async function listExpenseLines(reportId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expense_lines')
    .select('*, expense_categories(label, code), study_sites(site_number, name), expense_receipt_files(id, file_name, storage_object_path)')
    .eq('report_id', reportId)
    .order('expense_date', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listExpenseCategoriesForCompany() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: p } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  if (!p?.company_id) return [];
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, label, code')
    .eq('company_id', p.company_id)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createExpenseReportDraft(input: {
  studyId: string;
  title?: string;
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
  if (!study || study.company_id !== profile.company_id) return { data: null, error: 'Study not found.' };

  const { data: tpl } = await supabase
    .from('time_expense_approval_templates')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('applies_to', 'expense')
    .eq('is_default', true)
    .maybeSingle();

  const { data, error } = await supabase
    .from('expense_reports')
    .insert({
      company_id: profile.company_id,
      profile_id: profile.id,
      study_id: input.studyId,
      title: input.title?.trim() || 'Expense report',
      status: 'draft',
      template_id: tpl?.id ?? null,
    })
    .select('id')
    .single();

  if (error) return { data: null, error: error.message };
  revalidateExpenses(input.studyId);
  return { data: { id: data.id }, error: null };
}

export async function upsertExpenseLine(input: {
  id?: string;
  reportId: string;
  expenseDate: string;
  categoryId: string;
  amount: number;
  currency?: string;
  description?: string | null;
  merchant?: string | null;
  siteId?: string | null;
  expectedVersion?: number;
}): Promise<{ error: string | null; userMessage?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'auth', userMessage: 'Not signed in.' };

  const { data: report } = await supabase
    .from('expense_reports')
    .select('id, study_id, profile_id, status, version, company_id')
    .eq('id', input.reportId)
    .single();
  if (!report) return { error: 'missing', userMessage: 'Report not found.' };
  const { data: me } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (report.profile_id !== me?.id) return { error: 'forbidden', userMessage: 'You cannot edit this report.' };
  if (!['draft', 'changes_requested'].includes(report.status)) {
    return { error: 'locked', userMessage: 'This report is no longer editable.' };
  }

  const payload = {
    report_id: input.reportId,
    expense_date: input.expenseDate,
    study_id: report.study_id,
    site_id: input.siteId ?? null,
    category_id: input.categoryId,
    amount: input.amount,
    currency: input.currency ?? 'USD',
    description: input.description ?? null,
    merchant: input.merchant ?? null,
  };

  if (input.id) {
    const { error } = await supabase.from('expense_lines').update(payload).eq('id', input.id);
    if (error) return { error: error.message, userMessage: error.message };
  } else {
    const { error } = await supabase.from('expense_lines').insert(payload);
    if (error) return { error: error.message, userMessage: error.message };
  }

  await supabase
    .from('expense_reports')
    .update({ version: report.version + 1, updated_at: new Date().toISOString() })
    .eq('id', input.reportId);

  revalidateExpenses(report.study_id);
  return { error: null };
}

export async function deleteExpenseLine(lineId: string, reportId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: report } = await supabase.from('expense_reports').select('study_id, version').eq('id', reportId).single();
  const { error } = await supabase.from('expense_lines').delete().eq('id', lineId);
  if (error) return { error: error.message };
  if (report) {
    await supabase
      .from('expense_reports')
      .update({ version: (report.version ?? 1) + 1, updated_at: new Date().toISOString() })
      .eq('id', reportId);
    revalidateExpenses(report.study_id);
  }
  return { error: null };
}

export async function submitExpenseReport(
  reportId: string,
  expectedVersion: number
): Promise<{ error: string | null; userMessage?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'auth', userMessage: 'Not signed in.' };

  const { data: report } = await supabase
    .from('expense_reports')
    .select('id, profile_id, status, version, study_id')
    .eq('id', reportId)
    .single();
  if (!report) return { error: 'missing', userMessage: 'Report not found.' };
  const { data: me } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (report.profile_id !== me?.id) return { error: 'forbidden', userMessage: 'You cannot submit this report.' };
  if (!['draft', 'changes_requested'].includes(report.status)) {
    return { error: 'state', userMessage: 'This report cannot be submitted now.' };
  }
  if (report.version !== expectedVersion) {
    return { error: 'stale', userMessage: 'This report was updated elsewhere. Refresh and try again.' };
  }

  const { count } = await supabase
    .from('expense_lines')
    .select('*', { count: 'exact', head: true })
    .eq('report_id', reportId);
  if (!count || count < 1) {
    return { error: 'empty', userMessage: 'Add at least one expense line before submitting.' };
  }

  const { error } = await supabase
    .from('expense_reports')
    .update({
      status: 'submitted',
      approval_step: 0,
      submitted_at: new Date().toISOString(),
      version: report.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('version', expectedVersion);

  if (error) return { error: error.message, userMessage: error.message };
  revalidateExpenses(report.study_id);
  // Future: in-app notifications + Resend email to approvers when RESEND_API_KEY is set.
  return { error: null };
}

export async function listCompanyExpenseReportsForApprovalQueue(): Promise<ExpenseReportRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).maybeSingle();
  if (!profile?.company_id) return [];

  const { data, error } = await supabase
    .from('expense_reports')
    .select('*, studies(title)')
    .eq('company_id', profile.company_id)
    .in('status', ['submitted', 'under_review'])
    .order('submitted_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseReportRow[];
}

export async function expenseReportRecordDecisionRpc(
  reportId: string,
  decision: 'approved' | 'rejected' | 'changes_requested',
  comment: string
): Promise<{ error: string | null; userMessage?: string; ok?: boolean }> {
  const supabase = await createClient();
  const { data: report } = await supabase.from('expense_reports').select('study_id').eq('id', reportId).single();
  const { data, error } = await supabase.rpc('expense_report_record_decision', {
    p_report_id: reportId,
    p_decision: decision,
    p_comment: comment,
  });
  if (error) return { error: error.message, userMessage: error.message };
  const j = data as { ok?: boolean; error?: string };
  if (j?.ok === false) return { error: j.error ?? 'rpc_failed', userMessage: j.error ?? 'Action failed.' };
  if (report?.study_id) revalidateExpenses(report.study_id);
  revalidatePath('/protected/time-expenses/approvals');
  return { error: null, ok: true };
}

export async function uploadExpenseReceipt(formData: FormData): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const reportId = formData.get('reportId') as string;
  const lineId = formData.get('lineId') as string;
  const file = formData.get('file');
  if (!reportId || !lineId || !(file instanceof Blob)) {
    return { error: 'Missing file or identifiers.' };
  }

  const { data: profile } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
  if (!profile?.company_id) return { error: 'No profile.' };

  const { data: line } = await supabase
    .from('expense_lines')
    .select('id, report_id, expense_reports!inner(profile_id, company_id, status)')
    .eq('id', lineId)
    .eq('report_id', reportId)
    .maybeSingle();

  const er = line?.expense_reports as unknown as { profile_id: string; company_id: string; status: string } | undefined;
  if (!er || er.profile_id !== profile.id || er.company_id !== profile.company_id) {
    return { error: 'Invalid line or report.' };
  }
  if (!['draft', 'changes_requested'].includes(er.status)) {
    return { error: 'Report is not editable.' };
  }

  const origName = (file as File).name || 'receipt';
  const safeName = origName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${profile.company_id}/${reportId}/${lineId}/${crypto.randomUUID()}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = (file as File).type || 'application/octet-stream';

  const { error: upErr } = await supabase.storage.from('expense-receipts').upload(path, buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { error: dbErr } = await supabase.from('expense_receipt_files').insert({
    line_id: lineId,
    storage_object_path: path,
    file_name: origName,
    mime_type: mime,
    uploaded_by_profile_id: profile.id,
  });
  if (dbErr) {
    await supabase.storage.from('expense-receipts').remove([path]);
    return { error: dbErr.message };
  }

  const { data: report } = await supabase.from('expense_reports').select('study_id').eq('id', reportId).single();
  if (report?.study_id) revalidateExpenses(report.study_id);
  return { error: null };
}
