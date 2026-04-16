'use server';

import { revalidatePath } from 'next/cache';
import { revalidateStudyCtmsLayout } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type {
  StudyBudget,
  StudyBudgetWithItems,
  StudyBudgetSection,
  BudgetSectionType,
  BudgetLineItem,
  BudgetStatus,
  SitePayment,
  SitePaymentWithSite,
  PaymentType,
  PaymentStatus,
  PaymentSchedule,
  PaymentScheduleWithSite,
  ScheduleStatus,
  FinancialSummary,
} from '@/lib/types/ctms';

// =====================================================
// Budgets
// =====================================================

export async function getStudyBudgetMeta(
  budgetId: string
): Promise<{ id: string; name: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_budgets')
    .select('id, name')
    .eq('id', budgetId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; name: string };
}

/** Lightweight list for site Financials (propagate picker) — no line items. */
export async function listStudyBudgetOptions(studyId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_budgets')
    .select('id, name')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as { id: string; name: string }[]) ?? [];
}

/**
 * Revalidates the study page + all site pages linked to the study.
 * Call this whenever a study budget is created or materially updated so that
 * linked site Financials tabs reflect the change promptly.
 */
export async function revalidateStudyFinancialsTree(studyId: string): Promise<void> {
  const supabase = await createClient();
  revalidateStudyCtmsLayout(studyId);
  revalidatePath('/protected/financials');
  const { data: sites } = await supabase
    .from('study_sites')
    .select('id')
    .eq('study_id', studyId);
  for (const site of sites ?? []) {
    revalidatePath(`/protected/sites/${site.id}`);
  }
}

export async function getStudyBudgets(studyId: string): Promise<StudyBudgetWithItems[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_budgets')
    .select('*, budget_line_items(*), study_budget_sections(*)')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data as unknown as StudyBudgetWithItems[]) ?? [];
  // Normalize: ensure sections are sorted by sort_order
  return rows.map((b) => ({
    ...b,
    study_budget_sections: (b.study_budget_sections ?? []).sort((a, b) => a.sort_order - b.sort_order),
    budget_line_items: (b.budget_line_items ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function createBudget(
  studyId: string,
  name: string,
  totalAmount: number,
  currency?: string
): Promise<{ data: StudyBudget | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { data: null, error: writeGuard };

    const { data, error } = await supabase
      .from('study_budgets')
      .insert({
        study_id: studyId,
        name,
        total_amount: totalAmount,
        currency: currency || 'USD',
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/financials');
    return { data: data as unknown as StudyBudget, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateBudget(
  id: string,
  studyId: string,
  updates: { name?: string; total_amount?: number; currency?: string; status?: BudgetStatus }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    const { error } = await supabase.from('study_budgets').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteBudget(id: string, studyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('study_budgets').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Budget Line Items
// =====================================================

export async function addLineItem(
  budgetId: string,
  studyId: string,
  input: { category: string; description: string; unit_cost: number; quantity: number; notes?: string; section_id?: string | null }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('budget_line_items').insert({
      budget_id: budgetId,
      category: input.category,
      description: input.description,
      unit_cost: input.unit_cost,
      quantity: input.quantity,
      notes: input.notes || null,
      section_id: input.section_id ?? null,
    });
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateLineItem(
  id: string,
  studyId: string,
  updates: { category?: string; description?: string; unit_cost?: number; quantity?: number; notes?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value === '' ? null : value;
    }
    const { error } = await supabase.from('budget_line_items').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteLineItem(id: string, studyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('budget_line_items').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function bulkInsertStudyBudgetLineItems(
  budgetId: string,
  studyId: string,
  items: Array<{
    category: string;
    description: string;
    unitCost: number;
    quantity: number;
    notes?: string | null;
    sortOrder?: number;
    sectionId?: string | null;
    sectionName?: string | null;
    costBasis?: string | null;
  }>
): Promise<{ error: string | null }> {
  if (items.length === 0) return { error: null };
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    // Build a name -> section_id map for CSV rows that reference sections by name.
    const sectionNameCache: Record<string, string> = {};
    const itemsWithSectionNames = items.filter((i) => i.sectionName && !i.sectionId);
    if (itemsWithSectionNames.length > 0) {
      const { data: existingSections } = await supabase
        .from('study_budget_sections')
        .select('id, name')
        .eq('budget_id', budgetId);
      for (const s of existingSections ?? []) {
        sectionNameCache[(s as { id: string; name: string }).name.toLowerCase()] = (s as { id: string; name: string }).id;
      }
      // Create any sections that don't exist yet
      const uniqueNewNames = [
        ...new Set(
          itemsWithSectionNames
            .map((i) => i.sectionName!)
            .filter((n) => !sectionNameCache[n.toLowerCase()])
        ),
      ];
      for (let idx = 0; idx < uniqueNewNames.length; idx++) {
        const name = uniqueNewNames[idx];
        const { data: newSec, error: secErr } = await supabase
          .from('study_budget_sections')
          .insert({
            budget_id: budgetId,
            section_type: 'other',
            name,
            sort_order: Object.keys(sectionNameCache).length + idx,
          })
          .select()
          .single();
        if (!secErr && newSec) {
          sectionNameCache[name.toLowerCase()] = (newSec as { id: string }).id;
        }
      }
    }

    const rows = items.map((item, i) => {
      const sectionId =
        item.sectionId ??
        (item.sectionName ? (sectionNameCache[item.sectionName.toLowerCase()] ?? null) : null);
      return {
        budget_id: budgetId,
        category: item.category,
        description: item.description,
        unit_cost: item.unitCost,
        quantity: item.quantity,
        notes: item.notes ?? null,
        sort_order: item.sortOrder ?? i,
        section_id: sectionId,
        cost_basis: item.costBasis ?? null,
      };
    });
    const { error } = await supabase.from('budget_line_items').insert(rows);
    if (error) return { error: error.message };
    await tryInsertBudgetTransactionLog(supabase, budgetId, studyId, 'csv_import', {
      count: rows.length,
    });
    revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Budget Sections (Phase 1)
// =====================================================

async function tryInsertBudgetTransactionLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  budgetId: string,
  studyId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('finance_transaction_log').insert({
      entity_type: 'study_budget',
      entity_id: budgetId,
      related_id: studyId,
      action,
      payload,
    });
  } catch {
    // Non-fatal: audit log failures must not block the primary operation
  }
}

export async function listStudyBudgetSections(budgetId: string): Promise<StudyBudgetSection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_budget_sections')
    .select('*')
    .eq('budget_id', budgetId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as StudyBudgetSection[]) ?? [];
}

export async function createStudyBudgetSection(
  budgetId: string,
  studyId: string,
  input: {
    section_type: BudgetSectionType;
    name: string;
    indirect_rate?: number | null;
    sort_order?: number;
  }
): Promise<{ data: StudyBudgetSection | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { data: null, error: writeGuard };

    const { data, error } = await supabase
      .from('study_budget_sections')
      .insert({
        budget_id: budgetId,
        section_type: input.section_type,
        name: input.name,
        indirect_rate: input.indirect_rate ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    await tryInsertBudgetTransactionLog(supabase, budgetId, studyId, 'section_added', {
      section_type: input.section_type,
      name: input.name,
    });
    revalidateStudyCtmsLayout(studyId);
    return { data: data as unknown as StudyBudgetSection, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateStudyBudgetSection(
  id: string,
  budgetId: string,
  studyId: string,
  updates: { name?: string; indirect_rate?: number | null; sort_order?: number }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase
      .from('study_budget_sections')
      .update(updates)
      .eq('id', id)
      .eq('budget_id', budgetId);
    if (error) return { error: error.message };
    await tryInsertBudgetTransactionLog(supabase, budgetId, studyId, 'section_updated', {
      section_id: id,
      ...updates,
    });
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteStudyBudgetSection(
  id: string,
  budgetId: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    // Unassign lines from this section before deleting (ON DELETE SET NULL handles it via DB)
    const { error } = await supabase
      .from('study_budget_sections')
      .delete()
      .eq('id', id)
      .eq('budget_id', budgetId);
    if (error) return { error: error.message };
    await tryInsertBudgetTransactionLog(supabase, budgetId, studyId, 'section_deleted', {
      section_id: id,
    });
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function upgradeToStructuredBudget(
  budgetId: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    // Create a catch-all "Other" section
    const { data: section, error: secErr } = await supabase
      .from('study_budget_sections')
      .insert({
        budget_id: budgetId,
        section_type: 'other',
        name: 'Other',
        sort_order: 0,
      })
      .select()
      .single();
    if (secErr) return { error: secErr.message };
    // Assign all existing unsectioned line items to it
    const { error: updateErr } = await supabase
      .from('budget_line_items')
      .update({ section_id: (section as unknown as StudyBudgetSection).id })
      .eq('budget_id', budgetId)
      .is('section_id', null);
    if (updateErr) return { error: updateErr.message };
    await tryInsertBudgetTransactionLog(supabase, budgetId, studyId, 'upgraded_to_structured', {});
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function assignLineItemToSection(
  lineItemId: string,
  sectionId: string | null,
  budgetId: string,
  studyId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase
      .from('budget_line_items')
      .update({ section_id: sectionId })
      .eq('id', lineItemId)
      .eq('budget_id', budgetId);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Site Payments
// =====================================================

export async function getStudyPayments(studyId: string): Promise<SitePaymentWithSite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_payments')
    .select('*, study_sites(site_number, name)')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as SitePaymentWithSite[]) ?? [];
}

export async function getAllPayments(): Promise<(SitePaymentWithSite & { studies: { title: string } })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_payments')
    .select('*, study_sites(site_number, name), studies(title)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as (SitePaymentWithSite & { studies: { title: string } })[];
}

export interface CreatePaymentInput {
  site_id: string;
  study_id: string;
  payment_type: PaymentType;
  amount: number;
  currency?: string;
  invoice_number?: string;
  invoice_date?: string;
  notes?: string;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<{ data: SitePayment | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { data: null, error: writeGuard };

    const { data, error } = await supabase
      .from('site_payments')
      .insert({
        site_id: input.site_id,
        study_id: input.study_id,
        payment_type: input.payment_type,
        amount: input.amount,
        currency: input.currency || 'USD',
        invoice_number: input.invoice_number || null,
        invoice_date: input.invoice_date || null,
        notes: input.notes || null,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidateStudyCtmsLayout(input.study_id);
    revalidatePath('/protected/financials');
    return { data: data as unknown as SitePayment, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updatePayment(
  id: string,
  studyId: string,
  updates: { status?: PaymentStatus; payment_date?: string; notes?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value === '' ? null : value;
    }
    if (updates.status === 'paid' && !updates.payment_date) {
      cleanUpdates.payment_date = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase.from('site_payments').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deletePayment(id: string, studyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('site_payments').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Payment Schedules
// =====================================================

export async function getStudySchedules(studyId: string): Promise<PaymentScheduleWithSite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payment_schedules')
    .select('*, study_sites(site_number, name)')
    .eq('study_id', studyId)
    .order('due_date', { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data as unknown as PaymentScheduleWithSite[]) ?? [];
}

export async function createSchedule(
  studyId: string,
  siteId: string,
  milestoneName: string,
  amount: number,
  dueDate?: string,
  currency?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('payment_schedules').insert({
      study_id: studyId,
      site_id: siteId,
      milestone_name: milestoneName,
      amount,
      due_date: dueDate || null,
      currency: currency || 'USD',
    });
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath(`/protected/sites/${siteId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateSchedule(
  id: string,
  studyId: string,
  siteId: string,
  updates: { milestone_name?: string; amount?: number; due_date?: string; status?: ScheduleStatus; currency?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value === '' ? null : value;
    }
    const { error } = await supabase.from('payment_schedules').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath(`/protected/sites/${siteId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSchedule(
  id: string,
  studyId: string,
  siteId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, studyId);
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('payment_schedules').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout(studyId);
    revalidatePath(`/protected/sites/${siteId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// =====================================================
// Financial Summary
// =====================================================

export async function getStudyFinancialSummary(studyId: string): Promise<FinancialSummary> {
  const supabase = await createClient();

  const { data: budgets } = await supabase
    .from('study_budgets')
    .select('total_amount, currency')
    .eq('study_id', studyId);

  const { data: payments } = await supabase
    .from('site_payments')
    .select('amount, status')
    .eq('study_id', studyId);

  const totalBudget = (budgets ?? []).reduce((sum, b) => sum + Number(b.total_amount), 0);
  const totalPaid = (payments ?? []).filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
  const totalApproved = (payments ?? []).filter((p) => p.status === 'approved').reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = (payments ?? []).filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0);

  return {
    totalBudget,
    totalPaid,
    totalPending,
    totalApproved,
    currency: budgets?.[0]?.currency ?? 'USD',
  };
}

export type PortfolioStudyFinancialRow = {
  id: string;
  title: string;
  totalBudget: number;
  totalPaid: number;
  totalPending: number;
  currency: string;
  /** Open finance invoices (not paid, not rejected). */
  invoiceOpenAmount: number;
};

export type PortfolioMonthlySpendPoint = { month: string; amount: number };

export async function getPortfolioFinancials(): Promise<{
  studies: PortfolioStudyFinancialRow[];
  totals: FinancialSummary & { invoiceOpenAmount: number };
  monthlySpend: PortfolioMonthlySpendPoint[];
  /** Keys are study UUIDs; series for `finance_payments` (paid) only. */
  monthlySpendByStudyId: Record<string, PortfolioMonthlySpendPoint[]>;
}> {
  const supabase = await createClient();

  const { data: budgets } = await supabase
    .from('study_budgets')
    .select('study_id, total_amount, currency, studies(title)')
    .order('study_id');

  const { data: payments } = await supabase
    .from('site_payments')
    .select('study_id, amount, status');

  const { data: finInv, error: finInvErr } = await supabase
    .from('finance_invoices')
    .select('study_id, amount, status');

  const { data: finPay, error: finPayErr } = await supabase
    .from('finance_payments')
    .select('study_id, paid_at, amount, status')
    .eq('status', 'paid');

  const openStatuses = new Set(['draft', 'submitted', 'under_review', 'approved']);
  const invoiceOpenByStudy = new Map<string, number>();
  if (!finInvErr && finInv) {
    for (const row of finInv) {
      if (!openStatuses.has(row.status as string)) continue;
      const sid = row.study_id as string;
      invoiceOpenByStudy.set(sid, (invoiceOpenByStudy.get(sid) ?? 0) + Number(row.amount));
    }
  }

  const studyMap = new Map<string, PortfolioStudyFinancialRow>();

  for (const b of budgets ?? []) {
    const existing = studyMap.get(b.study_id) ?? {
      id: b.study_id,
      title: (b.studies as unknown as Record<string, unknown>)?.title as string ?? '—',
      totalBudget: 0,
      totalPaid: 0,
      totalPending: 0,
      currency: b.currency,
      invoiceOpenAmount: 0,
    };
    existing.totalBudget += Number(b.total_amount);
    studyMap.set(b.study_id, existing);
  }

  for (const p of payments ?? []) {
    const existing = studyMap.get(p.study_id) ?? {
      id: p.study_id,
      title: '—',
      totalBudget: 0,
      totalPaid: 0,
      totalPending: 0,
      currency: 'USD',
      invoiceOpenAmount: 0,
    };
    if (p.status === 'paid') existing.totalPaid += Number(p.amount);
    else if (p.status === 'pending') existing.totalPending += Number(p.amount);
    studyMap.set(p.study_id, existing);
  }

  for (const [sid, amt] of invoiceOpenByStudy) {
    const existing = studyMap.get(sid) ?? {
      id: sid,
      title: '—',
      totalBudget: 0,
      totalPaid: 0,
      totalPending: 0,
      currency: 'USD',
      invoiceOpenAmount: 0,
    };
    existing.invoiceOpenAmount = amt;
    studyMap.set(sid, existing);
  }

  const studies = Array.from(studyMap.values());
  const invoiceOpenAmount = studies.reduce((s, st) => s + st.invoiceOpenAmount, 0);
  const totals: FinancialSummary & { invoiceOpenAmount: number } = {
    totalBudget: studies.reduce((s, st) => s + st.totalBudget, 0),
    totalPaid: studies.reduce((s, st) => s + st.totalPaid, 0),
    totalPending: studies.reduce((s, st) => s + st.totalPending, 0),
    totalApproved: 0,
    currency: studies[0]?.currency ?? 'USD',
    invoiceOpenAmount,
  };

  const monthlyMap = new Map<string, number>();
  const monthlyByStudy = new Map<string, Map<string, number>>();
  if (!finPayErr && finPay) {
    for (const row of finPay) {
      const d = row.paid_at as string | null;
      if (!d) continue;
      const ky = d.slice(0, 7);
      const amt = Number(row.amount);
      monthlyMap.set(ky, (monthlyMap.get(ky) ?? 0) + amt);
      const sid = row.study_id as string | null;
      if (sid) {
        if (!monthlyByStudy.has(sid)) monthlyByStudy.set(sid, new Map());
        const sm = monthlyByStudy.get(sid)!;
        sm.set(ky, (sm.get(ky) ?? 0) + amt);
      }
    }
  }
  const monthlySpend: PortfolioMonthlySpendPoint[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  const monthlySpendByStudyId: Record<string, PortfolioMonthlySpendPoint[]> = {};
  for (const [sid, sm] of monthlyByStudy) {
    monthlySpendByStudyId[sid] = Array.from(sm.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }

  return { studies, totals, monthlySpend, monthlySpendByStudyId };
}
