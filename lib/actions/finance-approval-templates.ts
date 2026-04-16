'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { FinanceApprovalTemplateOption, FinanceApprovalTemplateRow } from '@/lib/types/ctms';
import {
  financeApprovalTemplateFormSchema,
  normalizeTemplateSteps,
  parseStepsFromDb,
  stepsToJsonb,
} from '@/lib/validation/finance-approval-template';

function revalidateTemplatePaths() {
  revalidatePath('/protected/financials');
  revalidatePath('/protected/financials/approvals');
  revalidatePath('/protected/financials/approval-templates');
  revalidatePath('/protected');
  revalidatePath('/protected/studies');
  revalidatePath('/protected/studies', 'layout');
}

async function requireCompanyAdmin(): Promise<{ companyId: string; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { companyId: '', error: 'Not signed in.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) return { companyId: '', error: 'Profile not found.' };
  if (profile.role !== 'admin') return { companyId: '', error: 'Only company administrators can manage approval templates.' };
  return { companyId: profile.company_id, error: null };
}

/** Any company member: dropdown options for invoice / study settings. */
export async function listFinanceApprovalTemplateOptions(): Promise<FinanceApprovalTemplateOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) return [];

  const { data, error } = await supabase
    .from('finance_approval_templates')
    .select('id, name, is_default')
    .eq('company_id', profile.company_id)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinanceApprovalTemplateOption[];
}

export async function listFinanceApprovalTemplates(): Promise<FinanceApprovalTemplateRow[]> {
  const { companyId, error } = await requireCompanyAdmin();
  if (error) throw new Error(error);

  const supabase = await createClient();
  const { data, error: qErr } = await supabase
    .from('finance_approval_templates')
    .select('*')
    .eq('company_id', companyId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });
  if (qErr) throw new Error(qErr.message);
  return (data ?? []) as FinanceApprovalTemplateRow[];
}

export async function getFinanceApprovalTemplate(id: string): Promise<FinanceApprovalTemplateRow | null> {
  const { companyId, error } = await requireCompanyAdmin();
  if (error) throw new Error(error);

  const supabase = await createClient();
  const { data, error: qErr } = await supabase
    .from('finance_approval_templates')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle();
  if (qErr) throw new Error(qErr.message);
  return data as FinanceApprovalTemplateRow | null;
}

export async function createFinanceApprovalTemplate(input: {
  name: string;
  is_default: boolean;
  steps: unknown;
  escalation_threshold_cents: number;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const { companyId, error: authErr } = await requireCompanyAdmin();
  if (authErr) return { data: null, error: authErr };

  const parsed = financeApprovalTemplateFormSchema.safeParse({
    name: input.name,
    is_default: input.is_default,
    escalation_threshold_cents: input.escalation_threshold_cents,
    steps: parseStepsFromDb(input.steps).map((s, i) => ({ ...s, order: i })),
  });
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid template.' };
  }

  const steps = normalizeTemplateSteps(parsed.data.steps);
  const stepsJson = stepsToJsonb(steps);

  const supabase = await createClient();
  if (parsed.data.is_default) {
    const { error: clearErr } = await supabase
      .from('finance_approval_templates')
      .update({ is_default: false })
      .eq('company_id', companyId)
      .eq('is_default', true);
    if (clearErr) return { data: null, error: clearErr.message };
  }

  const { data, error } = await supabase
    .from('finance_approval_templates')
    .insert({
      company_id: companyId,
      name: parsed.data.name.trim(),
      is_default: parsed.data.is_default,
      steps: stepsJson,
      escalation_threshold_cents: parsed.data.escalation_threshold_cents,
    })
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  revalidateTemplatePaths();
  return { data: { id: data.id }, error: null };
}

export async function updateFinanceApprovalTemplate(input: {
  id: string;
  name: string;
  is_default: boolean;
  steps: unknown;
  escalation_threshold_cents: number;
}): Promise<{ error: string | null }> {
  const { companyId, error: authErr } = await requireCompanyAdmin();
  if (authErr) return { error: authErr };

  const parsed = financeApprovalTemplateFormSchema.safeParse({
    name: input.name,
    is_default: input.is_default,
    escalation_threshold_cents: input.escalation_threshold_cents,
    steps: parseStepsFromDb(input.steps).map((s, i) => ({ ...s, order: i })),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid template.' };
  }

  const steps = normalizeTemplateSteps(parsed.data.steps);
  const stepsJson = stepsToJsonb(steps);

  const supabase = await createClient();
  if (parsed.data.is_default) {
    const { error: clearErr } = await supabase
      .from('finance_approval_templates')
      .update({ is_default: false })
      .eq('company_id', companyId)
      .eq('is_default', true)
      .neq('id', input.id);
    if (clearErr) return { error: clearErr.message };
  }

  const { error } = await supabase
    .from('finance_approval_templates')
    .update({
      name: parsed.data.name.trim(),
      is_default: parsed.data.is_default,
      steps: stepsJson,
      escalation_threshold_cents: parsed.data.escalation_threshold_cents,
    })
    .eq('id', input.id)
    .eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidateTemplatePaths();
  return { error: null };
}

export async function setDefaultFinanceApprovalTemplate(id: string): Promise<{ error: string | null }> {
  const { companyId, error: authErr } = await requireCompanyAdmin();
  if (authErr) return { error: authErr };

  const supabase = await createClient();
  const { error: clearErr } = await supabase
    .from('finance_approval_templates')
    .update({ is_default: false })
    .eq('company_id', companyId)
    .eq('is_default', true);
  if (clearErr) return { error: clearErr.message };

  const { error } = await supabase
    .from('finance_approval_templates')
    .update({ is_default: true })
    .eq('id', id)
    .eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidateTemplatePaths();
  return { error: null };
}

export async function deleteFinanceApprovalTemplate(id: string): Promise<{ error: string | null }> {
  const { companyId, error: authErr } = await requireCompanyAdmin();
  if (authErr) return { error: authErr };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('finance_approval_templates')
    .select('id, is_default')
    .eq('id', id)
    .eq('company_id', companyId)
    .maybeSingle();
  if (!row) return { error: 'Template not found.' };

  const { count } = await supabase
    .from('finance_approval_templates')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);
  if ((count ?? 0) <= 1) return { error: 'You cannot delete the only approval template.' };

  if (row.is_default) {
    const { data: fallback } = await supabase
      .from('finance_approval_templates')
      .select('id')
      .eq('company_id', companyId)
      .neq('id', id)
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!fallback) return { error: 'Cannot delete default without another template.' };
    const { error: defErr } = await supabase
      .from('finance_approval_templates')
      .update({ is_default: true })
      .eq('id', fallback.id)
      .eq('company_id', companyId);
    if (defErr) return { error: defErr.message };
  }

  const { error } = await supabase.from('finance_approval_templates').delete().eq('id', id).eq('company_id', companyId);
  if (error) return { error: error.message };
  revalidateTemplatePaths();
  return { error: null };
}
