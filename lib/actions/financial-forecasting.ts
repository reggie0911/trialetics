'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  BudgetLineItem,
  SpendActual,
  SpendForecast,
  VarianceReport,
  BudgetVsActualSummary,
} from '@/lib/types/financial-forecasting';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolsForSelect(companyId: string): Promise<ActionResponse<{ id: string; protocol_number: string; title: string }[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clinical_protocols')
      .select('id, protocol_number, title')
      .eq('company_id', companyId)
      .order('protocol_number');
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as { id: string; protocol_number: string; title: string }[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getBudgetLineItems(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<BudgetLineItem[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('budget_line_items')
      .select(`
        *,
        clinical_protocols(id, protocol_number, title)
      `)
      .eq('company_id', companyId)
      .order('period_start', { ascending: true, nullsFirst: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as BudgetLineItem[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createBudgetLineItem(input: {
  protocol_id: string;
  category: 'site_costs' | 'personnel' | 'travel' | 'vendor' | 'other';
  subcategory?: string;
  description?: string;
  budgeted_amount: number;
  currency?: string;
  period_start?: string;
  period_end?: string;
  notes?: string;
}): Promise<ActionResponse<BudgetLineItem>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('budget_line_items')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        category: input.category,
        subcategory: input.subcategory || null,
        description: input.description || null,
        budgeted_amount: input.budgeted_amount,
        currency: input.currency || 'USD',
        period_start: input.period_start || null,
        period_end: input.period_end || null,
        notes: input.notes || null,
      })
      .select('*, clinical_protocols(id, protocol_number, title)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as BudgetLineItem };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSpendActuals(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<SpendActual[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('spend_actuals')
      .select(`
        *,
        clinical_protocols(id, protocol_number, title),
        budget_line_items(id, description, category)
      `)
      .eq('company_id', companyId)
      .order('spend_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SpendActual[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createSpendActual(input: {
  protocol_id: string;
  amount: number;
  spend_date: string;
  description?: string;
  budget_line_item_id?: string;
  payment_record_id?: string;
}): Promise<ActionResponse<SpendActual>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('spend_actuals')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        amount: input.amount,
        spend_date: input.spend_date,
        description: input.description || null,
        budget_line_item_id: input.budget_line_item_id || null,
        payment_record_id: input.payment_record_id || null,
      })
      .select('*, clinical_protocols(id, protocol_number, title)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as SpendActual };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSpendForecasts(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<SpendForecast[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('spend_forecasts')
      .select(`
        *,
        clinical_protocols(id, protocol_number, title)
      `)
      .eq('company_id', companyId)
      .order('forecast_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SpendForecast[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createSpendForecast(input: {
  protocol_id: string;
  forecast_date: string;
  forecast_name?: string;
  forecast_period_start: string;
  forecast_period_end: string;
  total_forecasted_spend?: number;
  assumptions?: Record<string, unknown>;
  line_item_forecasts?: Record<string, unknown>;
}): Promise<ActionResponse<SpendForecast>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('spend_forecasts')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        forecast_date: input.forecast_date,
        forecasted_by_id: profile.id,
        forecast_name: input.forecast_name || null,
        forecast_period_start: input.forecast_period_start,
        forecast_period_end: input.forecast_period_end,
        total_forecasted_spend: input.total_forecasted_spend ?? null,
        assumptions: input.assumptions || {},
        line_item_forecasts: input.line_item_forecasts || {},
      })
      .select('*, clinical_protocols(id, protocol_number, title)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as SpendForecast };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getVarianceReports(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<VarianceReport[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('variance_reports')
      .select(`
        *,
        clinical_protocols(id, protocol_number, title)
      `)
      .eq('company_id', companyId)
      .order('report_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as VarianceReport[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function generateVarianceReport(input: {
  protocol_id: string;
  report_date: string;
  period_start: string;
  period_end: string;
  notes?: string;
}): Promise<ActionResponse<VarianceReport>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data: budgetItems } = await supabase
      .from('budget_line_items')
      .select('id, category, budgeted_amount')
      .eq('company_id', profile.company_id)
      .eq('protocol_id', input.protocol_id);

    const { data: actuals } = await supabase
      .from('spend_actuals')
      .select('amount, budget_line_item_id')
      .eq('company_id', profile.company_id)
      .eq('protocol_id', input.protocol_id)
      .gte('spend_date', input.period_start)
      .lte('spend_date', input.period_end);

    const totalBudgeted = (budgetItems || []).reduce((sum, b) => sum + Number(b.budgeted_amount || 0), 0);
    const totalActual = (actuals || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalVariance = totalBudgeted - totalActual;
    const variancePercentage = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : null;

    const categoryBreakdown: Record<string, { budgeted: number; actual: number }> = {};
    for (const b of budgetItems || []) {
      const cat = b.category || 'other';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { budgeted: 0, actual: 0 };
      categoryBreakdown[cat].budgeted += Number(b.budgeted_amount || 0);
    }
    for (const a of actuals || []) {
      const item = budgetItems?.find((b) => b.id === a.budget_line_item_id);
      const cat = item?.category || 'other';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { budgeted: 0, actual: 0 };
      categoryBreakdown[cat].actual += Number(a.amount || 0);
    }

    const { data, error } = await supabase
      .from('variance_reports')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        report_date: input.report_date,
        period_start: input.period_start,
        period_end: input.period_end,
        total_budgeted: totalBudgeted,
        total_actual: totalActual,
        total_variance: totalVariance,
        variance_percentage: variancePercentage,
        category_breakdown: categoryBreakdown,
        generated_by_id: profile.id,
        notes: input.notes || null,
      })
      .select('*, clinical_protocols(id, protocol_number, title)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as VarianceReport };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getBudgetVsActualSummary(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<BudgetVsActualSummary>> {
  try {
    const supabase = await createClient();
    let budgetQuery = supabase
      .from('budget_line_items')
      .select('budgeted_amount')
      .eq('company_id', companyId);
    let actualQuery = supabase
      .from('spend_actuals')
      .select('amount')
      .eq('company_id', companyId);

    if (protocolId) {
      budgetQuery = budgetQuery.eq('protocol_id', protocolId);
      actualQuery = actualQuery.eq('protocol_id', protocolId);
    }

    const [budgetRes, actualRes] = await Promise.all([budgetQuery, actualQuery]);
    const totalBudgeted = (budgetRes.data || []).reduce((sum, b) => sum + Number(b.budgeted_amount || 0), 0);
    const totalActual = (actualRes.data || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const totalRemaining = totalBudgeted - totalActual;
    const varianceAmount = totalBudgeted - totalActual;
    const variancePercentage = totalBudgeted > 0 ? (varianceAmount / totalBudgeted) * 100 : null;

    return {
      success: true,
      data: {
        total_budgeted: totalBudgeted,
        total_actual: totalActual,
        total_remaining: totalRemaining,
        variance_amount: varianceAmount,
        variance_percentage: variancePercentage,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
