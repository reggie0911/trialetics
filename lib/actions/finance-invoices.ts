'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { logFinanceEvent } from '@/lib/finance/log';
import type {
  FinanceInvoiceEntityType,
  FinanceInvoiceStatus,
  FinanceInvoiceWithRelations,
} from '@/lib/types/ctms';

function revalidateFinancials(studyId: string) {
  revalidatePath('/protected/financials');
  revalidatePath('/protected/financials/approvals');
  revalidatePath(`/protected/studies/${studyId}`);
  revalidatePath(`/protected/sites`);
}

export async function listFinanceInvoicesForStudy(studyId: string): Promise<FinanceInvoiceWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('finance_invoices')
    .select(
      '*, studies(title), study_sites(site_number, name), institutions(name)'
    )
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinanceInvoiceWithRelations[];
}

export async function listFinanceInvoicesForSite(siteId: string): Promise<FinanceInvoiceWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('finance_invoices')
    .select('*, studies(title), study_sites(site_number, name), institutions(name)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinanceInvoiceWithRelations[];
}

export async function listCompanyFinanceInvoicesForQueue(): Promise<FinanceInvoiceWithRelations[]> {
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
    .from('finance_invoices')
    .select('*, studies(title), study_sites(site_number, name), institutions(name)')
    .eq('company_id', profile.company_id)
    .in('status', ['submitted', 'under_review'])
    .order('received_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FinanceInvoiceWithRelations[];
}

export async function createFinanceInvoiceDraft(input: {
  studyId: string;
  entityType: FinanceInvoiceEntityType;
  siteId?: string | null;
  institutionId?: string | null;
  externalInvoiceId: string;
  amount: number;
  currency?: string;
  dueAt?: string | null;
  notes?: string | null;
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

  const { data: study } = await supabase
    .from('studies')
    .select('company_id')
    .eq('id', input.studyId)
    .single();
  if (!study || study.company_id !== profile.company_id) {
    return { data: null, error: 'Study not found.' };
  }

  try {
    const { data, error } = await supabase
      .from('finance_invoices')
      .insert({
        study_id: input.studyId,
        company_id: profile.company_id,
        entity_type: input.entityType,
        site_id: input.siteId ?? null,
        institution_id: input.institutionId ?? null,
        external_invoice_id: input.externalInvoiceId.trim(),
        amount: input.amount,
        currency: input.currency ?? 'USD',
        due_at: input.dueAt || null,
        status: 'draft' satisfies FinanceInvoiceStatus,
        approval_step: 0,
        notes: input.notes?.trim() || null,
        created_by_profile_id: profile.id,
      })
      .select('id')
      .single();
    if (error) return { data: null, error: error.message };
    logFinanceEvent('finance.invoice.create', { invoiceId: data.id, studyId: input.studyId });
    revalidateFinancials(input.studyId);
    return { data: { id: data.id }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Unexpected error.' };
  }
}

export async function submitFinanceInvoice(
  invoiceId: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: inv } = await supabase.from('finance_invoices').select('company_id, status').eq('id', invoiceId).single();
  if (!inv) return { error: 'Invoice not found.' };
  if (inv.status !== 'draft') return { error: 'Only draft invoices can be submitted.' };

  const { data: tmpl } = await supabase
    .from('finance_approval_templates')
    .select('id')
    .eq('company_id', inv.company_id)
    .eq('is_default', true)
    .maybeSingle();

  const { error } = await supabase
    .from('finance_invoices')
    .update({
      status: 'under_review',
      approval_step: 0,
      template_id: tmpl?.id ?? null,
    })
    .eq('id', invoiceId);
  if (error) return { error: error.message };
  logFinanceEvent('finance.invoice.submit', { invoiceId, studyId });
  revalidateFinancials(studyId);
  return { error: null };
}

export async function financeInvoiceRecordDecisionRpc(
  invoiceId: string,
  studyId: string,
  decision: 'approved' | 'rejected',
  comment?: string | null
): Promise<{ error: string | null; userMessage?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('finance_invoice_record_decision', {
    p_invoice_id: invoiceId,
    p_decision: decision,
    p_comment: comment ?? '',
  });
  if (error) {
    logFinanceEvent('finance.invoice.decision.rpc', { invoiceId, result: 'rpc_error', message: error.message });
    return { error: error.message };
  }
  const row = data as { ok?: boolean; error?: string; status?: string } | null;
  if (!row?.ok) {
    const code = row?.error ?? 'unknown';
    logFinanceEvent('finance.invoice.decision.rpc', { invoiceId, result: 'denied', code });
    const userMessage =
      code === 'not_authorized_for_step'
        ? 'You are not allowed to approve this step for this study.'
        : code === 'invoice_not_in_review'
          ? 'This invoice is not waiting for approval.'
          : 'This action could not be completed.';
    return { error: code, userMessage };
  }
  logFinanceEvent('finance.invoice.decision.rpc', { invoiceId, result: 'ok', status: row.status ?? '' });
  revalidateFinancials(studyId);
  return { error: null };
}

export async function recordFinancePaymentForInvoice(input: {
  studyId: string;
  invoiceId: string;
  amount: number;
  currency?: string;
  method?: 'ach' | 'wire' | 'check';
  reference?: string | null;
  paidAt?: string | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from('finance_invoices')
    .select('company_id, amount, status')
    .eq('id', input.invoiceId)
    .single();
  if (!inv) return { error: 'Invoice not found.' };
  if (inv.status !== 'approved') return { error: 'Invoice must be approved before recording payment.' };

  const paidAt = input.paidAt ?? new Date().toISOString();

  const { data: pay, error: payErr } = await supabase
    .from('finance_payments')
    .insert({
      study_id: input.studyId,
      company_id: inv.company_id,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      method: input.method ?? 'ach',
      status: 'paid',
      paid_at: paidAt,
      reference: input.reference ?? null,
    })
    .select('id')
    .single();
  if (payErr) return { error: payErr.message };

  const { error: allocErr } = await supabase.from('finance_payment_allocations').insert({
    payment_id: pay.id,
    invoice_id: input.invoiceId,
    amount: input.amount,
  });
  if (allocErr) return { error: allocErr.message };

  const { error: upErr } = await supabase
    .from('finance_invoices')
    .update({ status: 'paid' })
    .eq('id', input.invoiceId);
  if (upErr) return { error: upErr.message };

  logFinanceEvent('finance.payment.create', { paymentId: pay.id, invoiceId: input.invoiceId });
  revalidateFinancials(input.studyId);
  return { error: null };
}
