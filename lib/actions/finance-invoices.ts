'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import { logFinanceEvent } from '@/lib/finance/log';
import type {
  FinanceInvoiceEntityType,
  FinanceInvoiceStatus,
  FinanceInvoiceWithRelations,
  InvoiceDecisionRecord,
  InvoiceTimelineEntry,
} from '@/lib/types/ctms';

function revalidateFinancials(studyId: string) {
  revalidatePath('/protected/financials');
  revalidatePath('/protected/financials/approvals');
  revalidatePath('/protected/financials/approval-templates');
  revalidatePath(`/protected/studies/${studyId}`);
  revalidatePath(`/protected/sites`);
}

function invoiceAuditSummary(action: string): string {
  switch (action) {
    case 'draft_created':
      return 'Draft saved';
    case 'submitted':
      return 'Submitted for approval';
    case 'resubmitted':
      return 'Resubmitted for approval';
    case 'payment_recorded':
      return 'Payment recorded';
    default:
      return action.replace(/_/g, ' ');
  }
}

async function resolveFinanceInvoiceWorkflowTemplateId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inv: { company_id: string; template_id: string | null },
  studyId: string
): Promise<string | null> {
  const { data: studyRow } = await supabase
    .from('studies')
    .select('finance_approval_template_id')
    .eq('id', studyId)
    .single();

  let resolvedId: string | null = null;

  if (inv.template_id) {
    const { data: t } = await supabase
      .from('finance_approval_templates')
      .select('id')
      .eq('id', inv.template_id)
      .eq('company_id', inv.company_id)
      .maybeSingle();
    if (t) resolvedId = t.id;
  }

  if (!resolvedId && studyRow?.finance_approval_template_id) {
    const { data: t } = await supabase
      .from('finance_approval_templates')
      .select('id')
      .eq('id', studyRow.finance_approval_template_id)
      .eq('company_id', inv.company_id)
      .maybeSingle();
    if (t) resolvedId = t.id;
  }

  if (!resolvedId) {
    const { data: t } = await supabase
      .from('finance_approval_templates')
      .select('id')
      .eq('company_id', inv.company_id)
      .eq('is_default', true)
      .maybeSingle();
    resolvedId = t?.id ?? null;
  }

  return resolvedId;
}

async function tryInsertInvoiceTransactionLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: {
    company_id: string;
    study_id: string;
    entity_id: string;
    action: string;
    actor_profile_id: string;
    from_state: string | null;
    to_state: string | null;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from('finance_transaction_log').insert({
    company_id: row.company_id,
    study_id: row.study_id,
    entity_type: 'finance_invoice',
    entity_id: row.entity_id,
    action: row.action,
    actor_profile_id: row.actor_profile_id,
    from_state: row.from_state,
    to_state: row.to_state,
    payload: row.payload ?? {},
  });
  if (error) {
    logFinanceEvent('finance.invoice.transaction_log', { result: 'insert_failed', message: error.message });
  }
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
  documentPath?: string | null;
  extractedData?: Record<string, unknown> | null;
  /** When set, this workflow is used on submit (overrides study default). */
  templateId?: string | null;
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

  let templateId: string | null = null;
  if (input.templateId) {
    const { data: t } = await supabase
      .from('finance_approval_templates')
      .select('id')
      .eq('id', input.templateId)
      .eq('company_id', profile.company_id)
      .maybeSingle();
    if (!t) return { data: null, error: 'Approval workflow not found.' };
    templateId = t.id;
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
        template_id: templateId,
        notes: input.notes?.trim() || null,
        created_by_profile_id: profile.id,
        document_path: input.documentPath ?? null,
        extracted_data: input.extractedData ?? null,
        extracted_at: input.extractedData ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error) return { data: null, error: error.message };
    await tryInsertInvoiceTransactionLog(supabase, {
      company_id: profile.company_id,
      study_id: input.studyId,
      entity_id: data.id,
      action: 'draft_created',
      actor_profile_id: profile.id,
      from_state: null,
      to_state: 'draft',
      payload: {},
    });
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
  const { data: inv } = await supabase
    .from('finance_invoices')
    .select('company_id, status, template_id, study_id')
    .eq('id', invoiceId)
    .single();
  if (!inv) return { error: 'Invoice not found.' };
  if (inv.study_id !== studyId) return { error: 'Invoice does not belong to this study.' };
  if (inv.status !== 'draft') return { error: 'Only draft invoices can be submitted.' };

  const resolvedId = await resolveFinanceInvoiceWorkflowTemplateId(supabase, inv, studyId);

  const { error } = await supabase
    .from('finance_invoices')
    .update({
      status: 'under_review',
      approval_step: 0,
      template_id: resolvedId,
    })
    .eq('id', invoiceId);
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: actor } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
    if (actor?.id) {
      await tryInsertInvoiceTransactionLog(supabase, {
        company_id: inv.company_id,
        study_id: inv.study_id,
        entity_id: invoiceId,
        action: 'submitted',
        actor_profile_id: actor.id,
        from_state: 'draft',
        to_state: 'under_review',
        payload: {},
      });
    }
  }

  logFinanceEvent('finance.invoice.submit', { invoiceId, studyId });
  revalidateFinancials(studyId);
  return { error: null };
}

export async function resubmitRejectedFinanceInvoice(
  invoiceId: string,
  studyId: string
): Promise<{ error: string | null; userMessage?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'not_authenticated', userMessage: 'You must be signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single();
  if (!profile?.id) return { error: 'no_profile', userMessage: 'Profile not found.' };

  const { data: inv } = await supabase
    .from('finance_invoices')
    .select('company_id, status, template_id, study_id, created_by_profile_id')
    .eq('id', invoiceId)
    .single();
  if (!inv) return { error: 'not_found', userMessage: 'Invoice not found.' };
  if (inv.study_id !== studyId) return { error: 'wrong_study', userMessage: 'Invoice does not belong to this study.' };
  if (inv.status !== 'rejected') {
    return { error: 'not_rejected', userMessage: 'Only rejected invoices can be resubmitted.' };
  }

  const isCreator = inv.created_by_profile_id != null && inv.created_by_profile_id === profile.id;
  const isAdmin = profile.role === 'admin';
  if (!isCreator && !isAdmin) {
    return {
      error: 'not_allowed',
      userMessage:
        'Only the teammate who created this invoice, or a company admin, can send it back for review.',
    };
  }

  const resolvedId = await resolveFinanceInvoiceWorkflowTemplateId(supabase, inv, studyId);

  const { error } = await supabase
    .from('finance_invoices')
    .update({
      status: 'under_review',
      approval_step: 0,
      template_id: resolvedId,
      received_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);
  if (error) return { error: error.message, userMessage: error.message };

  await tryInsertInvoiceTransactionLog(supabase, {
    company_id: inv.company_id,
    study_id: inv.study_id,
    entity_id: invoiceId,
    action: 'resubmitted',
    actor_profile_id: profile.id,
    from_state: 'rejected',
    to_state: 'under_review',
    payload: {},
  });

  logFinanceEvent('finance.invoice.resubmit', { invoiceId, studyId });
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
    .select('company_id, amount, status, study_id')
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: actor } = await supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
    if (actor?.id) {
      await tryInsertInvoiceTransactionLog(supabase, {
        company_id: inv.company_id,
        study_id: inv.study_id,
        entity_id: input.invoiceId,
        action: 'payment_recorded',
        actor_profile_id: actor.id,
        from_state: 'approved',
        to_state: 'paid',
        payload: { payment_id: pay.id },
      });
    }
  }

  logFinanceEvent('finance.payment.create', { paymentId: pay.id, invoiceId: input.invoiceId });
  revalidateFinancials(input.studyId);
  return { error: null };
}

export async function getInvoiceDocumentUrl(
  documentPath: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('finance-documents')
    .createSignedUrl(documentPath, 3600);
  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

export async function getInvoiceDecisionHistory(
  invoiceId: string
): Promise<InvoiceDecisionRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('finance_invoice_decisions')
    .select('*, profiles(display_name, first_name, last_name, email)')
    .eq('invoice_id', invoiceId)
    .order('step_index', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InvoiceDecisionRecord[];
}

type LogRowWithProfile = {
  id: string;
  action: string;
  from_state: string | null;
  to_state: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
  profiles: InvoiceDecisionRecord['profiles'];
};

export async function getInvoiceActivityTimeline(invoiceId: string): Promise<InvoiceTimelineEntry[]> {
  const supabase = await createClient();
  const [decRes, logRes] = await Promise.all([
    supabase
      .from('finance_invoice_decisions')
      .select('*, profiles(display_name, first_name, last_name, email)')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true }),
    supabase
      .from('finance_transaction_log')
      .select(
        'id, action, from_state, to_state, payload, created_at, profiles:profiles!finance_transaction_log_actor_profile_id_fkey(display_name, first_name, last_name, email)'
      )
      .eq('entity_type', 'finance_invoice')
      .eq('entity_id', invoiceId)
      .not('action', 'in', '("approve_step","reject")')
      .order('created_at', { ascending: true }),
  ]);
  if (decRes.error) throw new Error(decRes.error.message);
  if (logRes.error) throw new Error(logRes.error.message);

  const decisions = (decRes.data ?? []) as unknown as InvoiceDecisionRecord[];
  const logRows = (logRes.data ?? []) as unknown as LogRowWithProfile[];

  const fromDecisions: InvoiceTimelineEntry[] = decisions.map((d) => ({
    source: 'decision',
    id: d.id,
    created_at: d.created_at,
    step_index: d.step_index,
    decision: d.decision,
    comment: d.comment,
    profiles: d.profiles,
  }));

  const fromLog: InvoiceTimelineEntry[] = logRows.map((row) => {
    const payload =
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};
    return {
      source: 'audit',
      id: row.id,
      created_at: row.created_at,
      action: row.action,
      summary: invoiceAuditSummary(row.action),
      from_state: row.from_state,
      to_state: row.to_state,
      profiles: row.profiles,
      payload,
    };
  });

  const merged = [...fromDecisions, ...fromLog];
  merged.sort((a, b) => {
    const t = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
  return merged;
}

// ─── Phase 5: Invoice Budget Validation ──────────────────────────────────────

import {
  validateInvoiceAgainstBudget as _validateInvoice,
  type ValidationResult,
} from '@/lib/invoice-budget-validation';

/**
 * Load all data and run invoice budget validation.
 * Returns a ValidationResult that the UI renders as badges and progress bars.
 */
export async function validateInvoiceAgainstBudget(invoiceId: string): Promise<ValidationResult & { error: string | null }> {
  const supabase = await createClient();

  try {
    // Load invoice
    const { data: invoice, error: invErr } = await supabase
      .from('finance_invoices')
      .select('id, total_amount, currency, site_id')
      .eq('id', invoiceId)
      .single();
    if (invErr || !invoice) return emptyResult('Invoice not found.');

    const inv = invoice as unknown as { id: string; total_amount: number; currency: string; site_id: string | null };

    // Find the active site budget for this site + study
    if (!inv.site_id) return emptyResult('Invoice has no site.');
    const { data: siteBudgetRows } = await supabase
      .from('site_budgets')
      .select('id, approved_amount, currency, overhead_rate')
      .eq('site_id', inv.site_id)
      .eq('negotiation_status', 'approved')
      .limit(1);
    const siteBudgetRow = (siteBudgetRows ?? [])[0] as unknown as { id: string; approved_amount: number | null; currency: string } | undefined;
    if (!siteBudgetRow) return emptyResult('No approved site budget found.');

    // Load site budget line items
    const { data: lineItems } = await supabase
      .from('site_budget_line_items')
      .select('*')
      .eq('site_budget_id', siteBudgetRow.id);

    // Load allocations for this invoice
    const { data: allocations } = await supabase
      .from('invoice_budget_allocations')
      .select('site_budget_line_item_id, amount')
      .eq('invoice_id', invoiceId);

    // Load existing usage for all lines (excluding this invoice)
    const { data: existingAllocations } = await supabase
      .from('invoice_budget_allocations')
      .select('site_budget_line_item_id, amount')
      .neq('invoice_id', invoiceId);

    const existingUsageByLine: Record<string, number> = {};
    for (const a of (existingAllocations ?? []) as Array<{ site_budget_line_item_id: string; amount: number }>) {
      existingUsageByLine[a.site_budget_line_item_id] =
        (existingUsageByLine[a.site_budget_line_item_id] ?? 0) + a.amount;
    }

    const result = _validateInvoice(
      { id: inv.id, total_amount: inv.total_amount, currency: inv.currency },
      { approved_amount: siteBudgetRow.approved_amount, currency: siteBudgetRow.currency },
      (lineItems ?? []) as unknown as import('@/lib/types/ctms').SiteBudgetLineItem[],
      (allocations ?? []) as unknown as Array<{ site_budget_line_item_id: string; amount: number }>,
      existingUsageByLine,
      0
    );

    return { ...result, error: null };
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : 'Unexpected error.');
  }
}

function emptyResult(error: string): ValidationResult & { error: string | null } {
  return {
    errors: [],
    warnings: [],
    info: [],
    totalAllocated: 0,
    remainingAfter: null,
    sectionUtilization: {},
    error,
  };
}
