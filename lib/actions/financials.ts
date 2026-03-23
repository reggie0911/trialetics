'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  StudyBudget,
  StudyBudgetWithItems,
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

export async function getStudyBudgets(studyId: string): Promise<StudyBudgetWithItems[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_budgets')
    .select('*, budget_line_items(*)')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as StudyBudgetWithItems[]) ?? [];
}

export async function createBudget(
  studyId: string,
  name: string,
  totalAmount: number,
  currency?: string
): Promise<{ data: StudyBudget | null; error: string | null }> {
  const supabase = await createClient();
  try {
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
    revalidatePath(`/protected/studies/${studyId}`);
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
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }
    const { error } = await supabase.from('study_budgets').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteBudget(id: string, studyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('study_budgets').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
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
  input: { category: string; description: string; unit_cost: number; quantity: number; notes?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('budget_line_items').insert({
      budget_id: budgetId,
      category: input.category,
      description: input.description,
      unit_cost: input.unit_cost,
      quantity: input.quantity,
      notes: input.notes || null,
    });
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
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
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value === '' ? null : value;
    }
    const { error } = await supabase.from('budget_line_items').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteLineItem(id: string, studyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('budget_line_items').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
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
    revalidatePath(`/protected/studies/${input.study_id}`);
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
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value === '' ? null : value;
    }
    if (updates.status === 'paid' && !updates.payment_date) {
      cleanUpdates.payment_date = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase.from('site_payments').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
    revalidatePath('/protected/financials');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deletePayment(id: string, studyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('site_payments').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
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
    const { error } = await supabase.from('payment_schedules').insert({
      study_id: studyId,
      site_id: siteId,
      milestone_name: milestoneName,
      amount,
      due_date: dueDate || null,
      currency: currency || 'USD',
    });
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateSchedule(
  id: string,
  studyId: string,
  updates: { milestone_name?: string; amount?: number; due_date?: string; status?: ScheduleStatus }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value === '' ? null : value;
    }
    const { error } = await supabase.from('payment_schedules').update(cleanUpdates).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteSchedule(id: string, studyId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('payment_schedules').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/protected/studies/${studyId}`);
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
    .select('paid_at, amount, status')
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
  if (!finPayErr && finPay) {
    for (const row of finPay) {
      const d = row.paid_at as string | null;
      if (!d) continue;
      const key = d.slice(0, 7);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(row.amount));
    }
  }
  const monthlySpend: PortfolioMonthlySpendPoint[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  return { studies, totals, monthlySpend };
}
