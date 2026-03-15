'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  BudgetLineItem,
  SpendActual,
  SpendForecast,
  VarianceReport,
  BudgetVsActualSummary,
  BudgetCategory,
} from '@/lib/types/financial-forecasting';

async function getProfile(): Promise<{ id: string; company_id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
  return data ?? null;
}

export async function getProtocolsForSelect(
  companyId: string
): Promise<{ success: boolean; data?: { id: string; protocol_number: string; title: string }[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('studies')
      .select('id, protocol_number, title')
      .eq('company_id', companyId)
      .order('title', { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as { id: string; protocol_number: string; title: string }[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getBudgetLineItems(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: BudgetLineItem[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('budget_line_items')
      .select('id, company_id, protocol_id, category, subcategory, description, budgeted_amount, currency, period_start, period_end, notes, created_at, updated_at, clinical_protocols:studies(id, protocol_number, title)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as BudgetLineItem[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createBudgetLineItem(
  input: {
    protocol_id: string;
    category: BudgetCategory;
    subcategory?: string;
    description?: string;
    budgeted_amount: number;
    currency?: string;
    period_start?: string;
    period_end?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('budget_line_items').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id,
      category: input.category,
      subcategory: input.subcategory ?? null,
      description: input.description ?? null,
      budgeted_amount: input.budgeted_amount,
      currency: input.currency ?? 'USD',
      period_start: input.period_start ?? null,
      period_end: input.period_end ?? null,
      notes: input.notes ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/financial-forecasting');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getSpendActuals(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: SpendActual[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('spend_actuals')
      .select('id, company_id, budget_line_item_id, protocol_id, amount, spend_date, description, payment_record_id, created_at, updated_at, clinical_protocols:studies(id, protocol_number, title), budget_line_items(id, description, category)')
      .eq('company_id', companyId)
      .order('spend_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as SpendActual[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createSpendActual(
  input: {
    protocol_id: string;
    amount: number;
    spend_date: string;
    description?: string;
    budget_line_item_id?: string;
    payment_record_id?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('spend_actuals').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id,
      amount: input.amount,
      spend_date: input.spend_date,
      description: input.description ?? null,
      budget_line_item_id: input.budget_line_item_id ?? null,
      payment_record_id: input.payment_record_id ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/financial-forecasting');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getSpendForecasts(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: SpendForecast[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('spend_forecasts')
      .select('id, company_id, protocol_id, forecast_date, forecasted_by_id, forecast_name, forecast_period_start, forecast_period_end, total_forecasted_spend, assumptions, line_item_forecasts, created_at, updated_at, clinical_protocols:studies(id, protocol_number, title)')
      .eq('company_id', companyId)
      .order('forecast_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as SpendForecast[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createSpendForecast(
  input: {
    protocol_id: string;
    forecast_date?: string;
    forecast_period_start: string;
    forecast_period_end: string;
    total_forecasted_spend?: number;
    forecast_name?: string;
    assumptions?: Record<string, unknown>;
    line_item_forecasts?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('spend_forecasts').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id,
      forecast_date: input.forecast_date ?? new Date().toISOString().slice(0, 10),
      forecasted_by_id: profile.id,
      forecast_name: input.forecast_name ?? null,
      forecast_period_start: input.forecast_period_start,
      forecast_period_end: input.forecast_period_end,
      total_forecasted_spend: input.total_forecasted_spend ?? null,
      assumptions: input.assumptions ?? {},
      line_item_forecasts: input.line_item_forecasts ?? {},
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/financial-forecasting');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getVarianceReports(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: VarianceReport[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('variance_reports')
      .select('id, company_id, protocol_id, report_date, period_start, period_end, total_budgeted, total_actual, total_variance, variance_percentage, category_breakdown, generated_by_id, notes, created_at, updated_at, clinical_protocols:studies(id, protocol_number, title)')
      .eq('company_id', companyId)
      .order('report_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as VarianceReport[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function generateVarianceReport(
  input: {
    protocol_id: string;
    report_date?: string;
    period_start: string;
    period_end: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const [{ data: budgets }, { data: actuals }] = await Promise.all([
      supabase.from('budget_line_items').select('budgeted_amount').eq('company_id', profile.company_id).eq('protocol_id', input.protocol_id),
      supabase.from('spend_actuals').select('amount').eq('company_id', profile.company_id).eq('protocol_id', input.protocol_id).gte('spend_date', input.period_start).lte('spend_date', input.period_end),
    ]);

    const totalBudgeted = (budgets ?? []).reduce((a, r) => a + (r.budgeted_amount ?? 0), 0);
    const totalActual = (actuals ?? []).reduce((a, r) => a + (r.amount ?? 0), 0);
    const totalVariance = totalBudgeted - totalActual;

    const { error } = await supabase.from('variance_reports').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id,
      report_date: input.report_date ?? new Date().toISOString().slice(0, 10),
      period_start: input.period_start,
      period_end: input.period_end,
      total_budgeted: totalBudgeted,
      total_actual: totalActual,
      total_variance: totalVariance,
      variance_percentage: totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : null,
      category_breakdown: {},
      generated_by_id: profile.id,
      notes: input.notes ?? null,
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/financial-forecasting');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getBudgetVsActualSummary(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: BudgetVsActualSummary; error?: string }> {
  const supabase = await createClient();
  try {
    let budgetQuery = supabase.from('budget_line_items').select('budgeted_amount').eq('company_id', companyId);
    let actualQuery = supabase.from('spend_actuals').select('amount').eq('company_id', companyId);

    if (protocolId) {
      budgetQuery = budgetQuery.eq('protocol_id', protocolId);
      actualQuery = actualQuery.eq('protocol_id', protocolId);
    }

    const [{ data: budgets }, { data: actuals }] = await Promise.all([budgetQuery, actualQuery]);
    const totalBudgeted = (budgets ?? []).reduce((a, r) => a + (r.budgeted_amount ?? 0), 0);
    const totalActual = (actuals ?? []).reduce((a, r) => a + (r.amount ?? 0), 0);
    const totalVariance = totalBudgeted - totalActual;

    return {
      success: true,
      data: {
        total_budgeted: totalBudgeted,
        total_actual: totalActual,
        total_remaining: totalVariance,
        variance_amount: totalVariance,
        variance_percentage: totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : null,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
