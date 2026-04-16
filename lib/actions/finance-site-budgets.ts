'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type {
  SiteBudgetRow,
  SiteBudgetPaymentInfo,
  SiteBudgetLineItemPaidTo,
  SiteNegotiationStatus,
  SitePaymentTermsType,
  SiteBudgetWithLineItems,
  InvoiceBudgetAllocationContext,
  InvoiceBudgetAllocationListRow,
  InvoiceBudgetLineAllocationRef,
} from '@/lib/types/ctms';

async function getStudyIdForSiteBudgetLineItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lineItemId: string
): Promise<string | null> {
  const { data: li } = await supabase
    .from('site_budget_line_items')
    .select('site_budget_id')
    .eq('id', lineItemId)
    .maybeSingle();
  const sbid = (li as { site_budget_id: string } | null)?.site_budget_id;
  if (!sbid) return null;
  const { data: sb } = await supabase.from('site_budgets').select('study_id').eq('id', sbid).maybeSingle();
  return (sb as { study_id: string } | null)?.study_id ?? null;
}

export async function getSiteBudgetForSite(
  studyId: string,
  siteId: string
): Promise<SiteBudgetRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_budgets')
    .select('*')
    .eq('study_id', studyId)
    .eq('site_id', siteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SiteBudgetRow) ?? null;
}

export async function upsertSiteBudget(input: {
  studyId: string;
  siteId: string;
  proposedAmount: number;
  approvedAmount?: number | null;
  currency?: string;
  negotiationStatus?: SiteNegotiationStatus;
  paymentTermsType?: SitePaymentTermsType;
  notes?: string | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.studyId);
  if (writeGuard) return { error: writeGuard };

  const { error } = await supabase.from('site_budgets').upsert(
    {
      study_id: input.studyId,
      site_id: input.siteId,
      proposed_amount: input.proposedAmount,
      approved_amount: input.approvedAmount ?? null,
      currency: input.currency ?? 'USD',
      negotiation_status: input.negotiationStatus ?? 'draft',
      payment_terms_type: input.paymentTermsType ?? 'invoice',
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'study_id,site_id' }
  );
  if (error) return { error: error.message };
  revalidatePath(`/protected/sites/${input.siteId}`);
  revalidateStudyCtmsLayout(input.studyId);
  return { error: null };
}

export async function getSiteBudgetWithLineItems(
  studyId: string,
  siteId: string
): Promise<SiteBudgetWithLineItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_budgets')
    .select('*, site_budget_line_items(*)')
    .eq('study_id', studyId)
    .eq('site_id', siteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as SiteBudgetWithLineItems) ?? null;
}

export async function updateSiteBudgetExtras(input: {
  studyId: string;
  siteId: string;
  documentPath?: string | null;
  overheadRate?: number | null;
  paymentInfo?: SiteBudgetPaymentInfo | null;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.studyId);
  if (writeGuard) return { error: writeGuard };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.documentPath !== undefined) updates.document_path = input.documentPath;
  if (input.overheadRate !== undefined) updates.overhead_rate = input.overheadRate;
  if (input.paymentInfo !== undefined) updates.payment_info = input.paymentInfo;

  const { error } = await supabase
    .from('site_budgets')
    .update(updates)
    .eq('study_id', input.studyId)
    .eq('site_id', input.siteId);
  if (error) return { error: error.message };
  revalidatePath(`/protected/sites/${input.siteId}`);
  return { error: null };
}

/** Set every line item's overhead_rate on this site budget (e.g. match Default overhead %). */
export async function applySiteDefaultOverheadToLineItems(
  siteBudgetId: string,
  siteId: string,
  overheadRate: number | null
): Promise<{ updated: number; error: string | null }> {
  const supabase = await createClient();
  const { data: budget, error: bErr } = await supabase
    .from('site_budgets')
    .select('id, study_id')
    .eq('id', siteBudgetId)
    .eq('site_id', siteId)
    .maybeSingle();
  if (bErr) return { updated: 0, error: bErr.message };
  if (!budget) return { updated: 0, error: 'Site budget not found.' };

  const sid = (budget as { study_id: string }).study_id;
  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, sid);
  if (writeGuard) return { updated: 0, error: writeGuard };

  const { count, error: cErr } = await supabase
    .from('site_budget_line_items')
    .select('*', { count: 'exact', head: true })
    .eq('site_budget_id', siteBudgetId);
  if (cErr) return { updated: 0, error: cErr.message };

  const { error } = await supabase
    .from('site_budget_line_items')
    .update({ overhead_rate: overheadRate })
    .eq('site_budget_id', siteBudgetId);
  if (error) return { updated: 0, error: error.message };

  revalidatePath(`/protected/sites/${siteId}`);
  return { updated: count ?? 0, error: null };
}

export async function addSiteBudgetLineItem(
  siteBudgetId: string,
  siteId: string,
  input: {
    section: string;
    description: string;
    costBasis?: string | null;
    unitCost: number;
    quantity: number;
    overheadRate?: number | null;
    paidTo?: SiteBudgetLineItemPaidTo;
    notes?: string | null;
    sortOrder?: number;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: sb } = await supabase.from('site_budgets').select('study_id').eq('id', siteBudgetId).maybeSingle();
  const sid = (sb as { study_id: string } | null)?.study_id;
  if (sid) {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, sid);
    if (writeGuard) return { error: writeGuard };
  }

  const { error } = await supabase.from('site_budget_line_items').insert({
    site_budget_id: siteBudgetId,
    section: input.section,
    description: input.description,
    cost_basis: input.costBasis ?? null,
    unit_cost: input.unitCost,
    quantity: input.quantity,
    overhead_rate: input.overheadRate ?? null,
    paid_to: input.paidTo ?? 'site',
    notes: input.notes ?? null,
    sort_order: input.sortOrder ?? 0,
  });
  if (error) return { error: error.message };
  revalidatePath(`/protected/sites/${siteId}`);
  return { error: null };
}

export async function bulkInsertSiteBudgetLineItems(
  siteBudgetId: string,
  siteId: string,
  items: Array<{
    section: string;
    description: string;
    costBasis?: string | null;
    unitCost: number;
    quantity: number;
    overheadRate?: number | null;
    paidTo?: SiteBudgetLineItemPaidTo;
    notes?: string | null;
    sortOrder?: number;
  }>
): Promise<{ error: string | null }> {
  if (items.length === 0) return { error: null };
  const supabase = await createClient();
  const { data: sb } = await supabase.from('site_budgets').select('study_id').eq('id', siteBudgetId).maybeSingle();
  const sid = (sb as { study_id: string } | null)?.study_id;
  if (sid) {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, sid);
    if (writeGuard) return { error: writeGuard };
  }

  const rows = items.map((item, i) => ({
    site_budget_id: siteBudgetId,
    section: item.section,
    description: item.description,
    cost_basis: item.costBasis ?? null,
    unit_cost: item.unitCost,
    quantity: item.quantity,
    overhead_rate: item.overheadRate ?? null,
    paid_to: item.paidTo ?? 'site',
    notes: item.notes ?? null,
    sort_order: item.sortOrder ?? i,
  }));
  const { error } = await supabase.from('site_budget_line_items').insert(rows);
  if (error) return { error: error.message };
  revalidatePath(`/protected/sites/${siteId}`);
  return { error: null };
}

export async function updateSiteBudgetLineItem(
  id: string,
  siteId: string,
  updates: {
    section?: string;
    description?: string;
    costBasis?: string | null;
    unitCost?: number;
    quantity?: number;
    overheadRate?: number | null;
    paidTo?: SiteBudgetLineItemPaidTo;
    notes?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const studyId = await getStudyIdForSiteBudgetLineItem(supabase, id);
  if (studyId) {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };
  }

  const clean: Record<string, unknown> = {};
  if (updates.section !== undefined) clean.section = updates.section;
  if (updates.description !== undefined) clean.description = updates.description;
  if (updates.costBasis !== undefined) clean.cost_basis = updates.costBasis;
  if (updates.unitCost !== undefined) clean.unit_cost = updates.unitCost;
  if (updates.quantity !== undefined) clean.quantity = updates.quantity;
  if (updates.overheadRate !== undefined) clean.overhead_rate = updates.overheadRate;
  if (updates.paidTo !== undefined) clean.paid_to = updates.paidTo;
  if (updates.notes !== undefined) clean.notes = updates.notes;
  if (updates.sortOrder !== undefined) clean.sort_order = updates.sortOrder;
  if (updates.isActive !== undefined) clean.is_active = updates.isActive;

  const { error } = await supabase.from('site_budget_line_items').update(clean).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/protected/sites/${siteId}`);
  return { error: null };
}

export async function deleteSiteBudgetLineItem(
  id: string,
  siteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const studyId = await getStudyIdForSiteBudgetLineItem(supabase, id);
  if (studyId) {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };
  }

  const { error } = await supabase.from('site_budget_line_items').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/protected/sites/${siteId}`);
  return { error: null };
}

export async function getSiteBudgetDocumentUrl(
  documentPath: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('finance-documents')
    .createSignedUrl(documentPath, 3600);
  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

export async function createSiteBudgetAmendment(
  studyId: string,
  siteId: string
): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createClient();

  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
  if (writeGuard) return { data: null, error: writeGuard };

  const { data: current, error: fetchErr } = await supabase
    .from('site_budgets')
    .select('*, site_budget_line_items(*)')
    .eq('study_id', studyId)
    .eq('site_id', siteId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchErr || !current) {
    return { data: null, error: fetchErr?.message ?? 'No current budget found.' };
  }

  const { data: newBudget, error: insertErr } = await supabase
    .from('site_budgets')
    .insert({
      study_id: studyId,
      site_id: siteId,
      study_budget_id: current.study_budget_id,
      proposed_amount: current.proposed_amount,
      approved_amount: current.approved_amount,
      currency: current.currency,
      negotiation_status: 'draft',
      payment_terms_type: current.payment_terms_type,
      terms: current.terms,
      document_path: current.document_path,
      overhead_rate: current.overhead_rate,
      payment_info: current.payment_info,
      notes: current.notes,
      version: (current.version ?? 1) + 1,
      supersedes_budget_id: current.id,
      effective_from: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr || !newBudget) {
    return { data: null, error: insertErr?.message ?? 'Could not create amendment.' };
  }

  const lineItems = (current as unknown as SiteBudgetWithLineItems).site_budget_line_items ?? [];
  if (lineItems.length > 0) {
    const rows = lineItems.map((li) => ({
      site_budget_id: newBudget.id,
      section: li.section,
      description: li.description,
      cost_basis: li.cost_basis,
      unit_cost: li.unit_cost,
      quantity: li.quantity,
      overhead_rate: li.overhead_rate,
      paid_to: li.paid_to,
      notes: li.notes,
      sort_order: li.sort_order,
      is_active: li.is_active !== false,
    }));
    await supabase.from('site_budget_line_items').insert(rows);
  }

  revalidatePath(`/protected/sites/${siteId}`);
  return { data: { id: newBudget.id }, error: null };
}

export async function getSiteBudgetVersions(
  studyId: string,
  siteId: string
): Promise<Array<{ id: string; version: number; effective_from: string; negotiation_status: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_budgets')
    .select('id, version, effective_from, negotiation_status')
    .eq('study_id', studyId)
    .eq('site_id', siteId)
    .order('version', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBudgetAllocationsForSite(
  siteBudgetId: string
): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoice_budget_allocations')
    .select('site_budget_line_item_id, amount')
    .in(
      'site_budget_line_item_id',
      (await supabase
        .from('site_budget_line_items')
        .select('id')
        .eq('site_budget_id', siteBudgetId)
        .then((r) => r.data?.map((x) => x.id) ?? []))
    );
  if (error) return new Map();
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.site_budget_line_item_id) continue;
    map.set(
      row.site_budget_line_item_id,
      (map.get(row.site_budget_line_item_id) ?? 0) + Number(row.amount)
    );
  }
  return map;
}

export async function upsertInvoiceBudgetAllocation(input: {
  invoiceId: string;
  siteBudgetLineItemId: string;
  amount: number;
  siteId: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: inv } = await supabase.from('finance_invoices').select('study_id').eq('id', input.invoiceId).maybeSingle();
  const stid = (inv as { study_id: string } | null)?.study_id;
  if (stid) {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, stid);
    if (writeGuard) return { error: writeGuard };
  }

  const { error } = await supabase.from('invoice_budget_allocations').upsert(
    {
      invoice_id: input.invoiceId,
      site_budget_line_item_id: input.siteBudgetLineItemId,
      amount: input.amount,
    },
    { onConflict: 'invoice_id,site_budget_line_item_id' }
  );
  if (error) return { error: error.message };
  revalidatePath(`/protected/sites/${input.siteId}`);
  return { error: null };
}

/** Line items + running invoiced totals for the current site budget (allocation UI). */
export async function getSiteBudgetAllocationBundle(
  studyId: string,
  siteId: string
): Promise<InvoiceBudgetAllocationContext | null> {
  const budget = await getSiteBudgetWithLineItems(studyId, siteId);
  if (!budget) return null;
  const invoicedMap = await getBudgetAllocationsForSite(budget.id);
  const lineItems = (budget.site_budget_line_items ?? []).map((li) => ({
    id: li.id,
    description: li.description,
    section: li.section,
    cost_with_overhead: Number(li.cost_with_overhead),
    is_active: li.is_active !== false,
  }));
  return {
    siteId,
    siteBudgetId: budget.id,
    lineItems,
    invoicedByLineId: Object.fromEntries(invoicedMap),
  };
}

export async function listInvoiceBudgetAllocations(
  invoiceId: string
): Promise<InvoiceBudgetAllocationListRow[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from('invoice_budget_allocations')
    .select('id, site_budget_line_item_id, amount')
    .eq('invoice_id', invoiceId);
  if (error) throw new Error(error.message);
  const lineIds = [
    ...new Set(
      (rows ?? [])
        .map((r) => r.site_budget_line_item_id)
        .filter((id): id is string => id != null)
    ),
  ];
  if (lineIds.length === 0) return [];
  const { data: lines } = await supabase
    .from('site_budget_line_items')
    .select('id, description, section')
    .in('id', lineIds);
  const map = new Map((lines ?? []).map((l) => [l.id, l]));
  return (rows ?? []).map((row) => {
    const li = row.site_budget_line_item_id
      ? map.get(row.site_budget_line_item_id)
      : undefined;
    return {
      id: row.id,
      site_budget_line_item_id: row.site_budget_line_item_id!,
      amount: Number(row.amount),
      description: li?.description ?? null,
      section: li?.section ?? null,
    };
  });
}

async function sumAllocationsByLineExcludingInvoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteBudgetLineIds: string[],
  excludeInvoiceId: string
): Promise<Map<string, number>> {
  if (siteBudgetLineIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('invoice_budget_allocations')
    .select('site_budget_line_item_id, amount, invoice_id')
    .in('site_budget_line_item_id', siteBudgetLineIds)
    .neq('invoice_id', excludeInvoiceId);
  if (error) return new Map();
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.site_budget_line_item_id) continue;
    const id = row.site_budget_line_item_id;
    map.set(id, (map.get(id) ?? 0) + Number(row.amount));
  }
  return map;
}

const AMOUNT_EPS = 0.01;

export async function replaceInvoiceBudgetAllocations(input: {
  invoiceId: string;
  studyId: string;
  siteId: string;
  siteBudgetId: string;
  allocations: { siteBudgetLineItemId: string; amount: number }[];
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.company_id) return { error: 'Profile not found.' };

  const { data: invoice, error: invErr } = await supabase
    .from('finance_invoices')
    .select('id, company_id, study_id, site_id, amount')
    .eq('id', input.invoiceId)
    .maybeSingle();
  if (invErr || !invoice) return { error: 'Invoice not found.' };
  if (invoice.company_id !== profile.company_id) return { error: 'Access denied.' };
  if (!invoice.site_id) {
    return { error: 'Only site-linked invoices can be allocated to a site budget.' };
  }
  if (invoice.site_id !== input.siteId || invoice.study_id !== input.studyId) {
    return { error: 'Invoice does not match this site budget.' };
  }

  const { data: budget, error: budErr } = await supabase
    .from('site_budgets')
    .select('id, study_id, site_id')
    .eq('id', input.siteBudgetId)
    .maybeSingle();
  if (budErr || !budget) return { error: 'Site budget not found.' };
  if (budget.study_id !== input.studyId || budget.site_id !== input.siteId) {
    return { error: 'Site budget does not match this site.' };
  }

  const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.studyId);
  if (writeGuard) return { error: writeGuard };

  const { data: lineRows, error: lineErr } = await supabase
    .from('site_budget_line_items')
    .select('id, cost_with_overhead')
    .eq('site_budget_id', input.siteBudgetId);
  if (lineErr) return { error: lineErr.message };
  const lineById = new Map(
    (lineRows ?? []).map((r) => [r.id, { cap: Number(r.cost_with_overhead) }])
  );

  let sumNew = 0;
  const cleaned: { siteBudgetLineItemId: string; amount: number }[] = [];
  for (const row of input.allocations) {
    const amt = Number(row.amount);
    if (Number.isNaN(amt) || amt < 0) return { error: 'Amounts must be zero or positive.' };
    if (amt < AMOUNT_EPS) continue;
    if (!lineById.has(row.siteBudgetLineItemId)) {
      return { error: 'Invalid budget line for this site budget.' };
    }
    sumNew += amt;
    cleaned.push({ siteBudgetLineItemId: row.siteBudgetLineItemId, amount: Math.round(amt * 100) / 100 });
  }

  const invTotal = Number(invoice.amount);
  if (sumNew > invTotal + AMOUNT_EPS) {
    return { error: `Total allocated (${sumNew.toFixed(2)}) cannot exceed the invoice amount (${invTotal.toFixed(2)}).` };
  }

  const lineIds = [...lineById.keys()];
  const otherByLine = await sumAllocationsByLineExcludingInvoice(
    supabase,
    lineIds,
    input.invoiceId
  );

  for (const { siteBudgetLineItemId, amount } of cleaned) {
    const meta = lineById.get(siteBudgetLineItemId)!;
    const other = otherByLine.get(siteBudgetLineItemId) ?? 0;
    const remaining = meta.cap - other;
    if (amount > remaining + AMOUNT_EPS) {
      return {
        error: `Amount for one budget line exceeds what is left after other invoices (${remaining.toFixed(2)} remaining).`,
      };
    }
  }

  const { error: delErr } = await supabase
    .from('invoice_budget_allocations')
    .delete()
    .eq('invoice_id', input.invoiceId);
  if (delErr) return { error: delErr.message };

  if (cleaned.length > 0) {
    const { error: insErr } = await supabase.from('invoice_budget_allocations').insert(
      cleaned.map((c) => ({
        invoice_id: input.invoiceId,
        site_budget_line_item_id: c.siteBudgetLineItemId,
        amount: c.amount,
      }))
    );
    if (insErr) return { error: insErr.message };
  }

  revalidatePath(`/protected/sites/${input.siteId}`);
  revalidateStudyCtmsLayout(input.studyId);
  revalidatePath('/protected/financials');
  return { error: null };
}

/** For each budget line id, invoice references that allocated to that line (read-only UI). */
export async function listInvoiceAllocationRefsBySiteBudget(
  siteBudgetId: string
): Promise<Record<string, InvoiceBudgetLineAllocationRef[]>> {
  const supabase = await createClient();
  const { data: lineIdsRes } = await supabase
    .from('site_budget_line_items')
    .select('id')
    .eq('site_budget_id', siteBudgetId);
  const lineIds = (lineIdsRes ?? []).map((r) => r.id);
  if (lineIds.length === 0) return {};

  const { data, error } = await supabase
    .from('invoice_budget_allocations')
    .select('invoice_id, site_budget_line_item_id, amount, finance_invoices(external_invoice_id)')
    .in('site_budget_line_item_id', lineIds);
  if (error) return {};

  const out: Record<string, InvoiceBudgetLineAllocationRef[]> = {};
  for (const row of data ?? []) {
    const lineId = row.site_budget_line_item_id;
    const invoiceId = row.invoice_id;
    if (!lineId || !invoiceId) continue;
    const fin = row.finance_invoices as unknown;
    const inv = Array.isArray(fin) ? fin[0] : fin;
    const ref =
      inv && typeof inv === 'object' && 'external_invoice_id' in inv
        ? String((inv as { external_invoice_id: string }).external_invoice_id)
        : null;
    if (!ref) continue;
    if (!out[lineId]) out[lineId] = [];
    out[lineId].push({
      invoice_id: String(invoiceId),
      external_invoice_id: ref,
      amount: Number(row.amount),
    });
  }
  return out;
}
