'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  SiteBudget,
  SiteBudgetWithRelations,
  SiteBudgetItem,
  CreateSiteBudgetData,
  UpdateSiteBudgetData,
  CreateSiteBudgetItemData,
  UpdateSiteBudgetItemData,
  SiteBudgetVsActualSummary,
} from '@/lib/types/site-budgets';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET SITE BUDGETS
// =============================================

export async function getSiteBudgets(
  companyId: string,
  filters?: { site_id?: string; protocol_id?: string; status?: string }
): Promise<ActionResponse<SiteBudgetWithRelations[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('site_budgets')
      .select(`
        *,
        site:clinical_sites(site_number),
        protocol:clinical_protocols(protocol_number, title),
        budget_template:budget_templates(name),
        approved_by:profiles(first_name, last_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.site_id) query = query.eq('site_id', filters.site_id);
    if (filters?.protocol_id) query = query.eq('protocol_id', filters.protocol_id);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data || []) as SiteBudgetWithRelations[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch site budgets' };
  }
}

// =============================================
// GET SINGLE SITE BUDGET WITH ITEMS
// =============================================

export async function getSiteBudget(
  budgetId: string
): Promise<ActionResponse<SiteBudgetWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_budgets')
      .select(`
        *,
        site:clinical_sites(site_number),
        protocol:clinical_protocols(protocol_number, title),
        budget_template:budget_templates(name),
        approved_by:profiles(first_name, last_name)
      `)
      .eq('id', budgetId)
      .single();

    if (error) return { success: false, error: error.message };

    const { data: items } = await supabase
      .from('site_budget_items')
      .select('*')
      .eq('site_budget_id', budgetId)
      .order('sort_order');

    const budget = data as SiteBudgetWithRelations;
    budget.items = (items || []) as SiteBudgetItem[];

    return { success: true, data: budget };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch site budget' };
  }
}

// =============================================
// CREATE SITE BUDGET
// =============================================

export async function createSiteBudget(
  companyId: string,
  input: CreateSiteBudgetData
): Promise<ActionResponse<SiteBudget>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_budgets')
      .insert({
        company_id: companyId,
        site_id: input.site_id,
        protocol_id: input.protocol_id,
        budget_template_id: input.budget_template_id || null,
        name: input.name || null,
        currency_code: input.currency_code || 'USD',
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as SiteBudget };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create site budget' };
  }
}

// =============================================
// UPDATE SITE BUDGET
// =============================================

export async function updateSiteBudget(
  budgetId: string,
  input: UpdateSiteBudgetData
): Promise<ActionResponse<SiteBudget>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_budgets')
      .update(input)
      .eq('id', budgetId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as SiteBudget };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update site budget' };
  }
}

// =============================================
// APPROVE SITE BUDGET
// =============================================

export async function approveSiteBudget(
  budgetId: string,
  approverProfileId: string
): Promise<ActionResponse<SiteBudget>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_budgets')
      .update({
        status: 'approved',
        approved_by_id: approverProfileId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', budgetId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as SiteBudget };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to approve budget' };
  }
}

// =============================================
// DELETE SITE BUDGET
// =============================================

export async function deleteSiteBudget(budgetId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('site_budgets').delete().eq('id', budgetId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete site budget' };
  }
}

// =============================================
// SITE BUDGET ITEMS
// =============================================

export async function addSiteBudgetItem(
  input: CreateSiteBudgetItemData
): Promise<ActionResponse<SiteBudgetItem>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_budget_items')
      .insert({
        site_budget_id: input.site_budget_id,
        template_item_id: input.template_item_id || null,
        category: input.category,
        subcategory: input.subcategory || null,
        description: input.description || null,
        budgeted_amount: input.budgeted_amount,
        currency: input.currency || 'USD',
        sort_order: input.sort_order || 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Recalculate total
    const { data: items } = await supabase
      .from('site_budget_items')
      .select('budgeted_amount')
      .eq('site_budget_id', input.site_budget_id);

    const total = (items || []).reduce((sum, i) => sum + Number(i.budgeted_amount), 0);
    await supabase.from('site_budgets').update({ total_budgeted: total }).eq('id', input.site_budget_id);

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as SiteBudgetItem };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add budget item' };
  }
}

export async function updateSiteBudgetItem(
  itemId: string,
  input: UpdateSiteBudgetItemData
): Promise<ActionResponse<SiteBudgetItem>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('site_budget_items')
      .update(input)
      .eq('id', itemId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: data as SiteBudgetItem };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update item' };
  }
}

export async function deleteSiteBudgetItem(
  itemId: string,
  budgetId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('site_budget_items').delete().eq('id', itemId);
    if (error) return { success: false, error: error.message };

    const { data: items } = await supabase
      .from('site_budget_items')
      .select('budgeted_amount')
      .eq('site_budget_id', budgetId);

    const total = (items || []).reduce((sum, i) => sum + Number(i.budgeted_amount), 0);
    await supabase.from('site_budgets').update({ total_budgeted: total }).eq('id', budgetId);

    revalidatePath('/protected/clinical-payments');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete item' };
  }
}

// =============================================
// BUDGET VS ACTUAL SUMMARY
// =============================================

export async function getSiteBudgetVsActual(
  budgetId: string
): Promise<ActionResponse<SiteBudgetVsActualSummary>> {
  try {
    const supabase = await createClient();

    const { data: items, error } = await supabase
      .from('site_budget_items')
      .select('category, budgeted_amount, actual_amount')
      .eq('site_budget_id', budgetId);

    if (error) return { success: false, error: error.message };

    const budgetItems = items || [];
    const totalBudgeted = budgetItems.reduce((sum, i) => sum + Number(i.budgeted_amount), 0);
    const totalActual = budgetItems.reduce((sum, i) => sum + Number(i.actual_amount), 0);

    const categoryMap = new Map<string, { budgeted: number; actual: number }>();
    for (const item of budgetItems) {
      const existing = categoryMap.get(item.category) || { budgeted: 0, actual: 0 };
      existing.budgeted += Number(item.budgeted_amount);
      existing.actual += Number(item.actual_amount);
      categoryMap.set(item.category, existing);
    }

    const byCategory = Array.from(categoryMap.entries()).map(([category, vals]) => ({
      category,
      budgeted: vals.budgeted,
      actual: vals.actual,
      remaining: vals.budgeted - vals.actual,
    }));

    return {
      success: true,
      data: {
        total_budgeted: totalBudgeted,
        total_actual: totalActual,
        total_remaining: totalBudgeted - totalActual,
        variance_percentage: totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : null,
        items: byCategory,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get budget vs actual' };
  }
}
