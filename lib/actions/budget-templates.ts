'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  BudgetTemplate,
  BudgetTemplateWithRelations,
  BudgetTemplateItem,
  CreateBudgetTemplateData,
  UpdateBudgetTemplateData,
  CreateBudgetTemplateItemData,
  UpdateBudgetTemplateItemData,
} from '@/lib/types/budget-templates';
import type { ActionResponse } from '@/lib/types';

// =============================================
// GET BUDGET TEMPLATES
// =============================================

export async function getBudgetTemplates(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<BudgetTemplateWithRelations[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('budget_templates')
      .select(`
        *,
        protocol:clinical_protocols(protocol_number, title)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data || []) as BudgetTemplateWithRelations[] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch templates' };
  }
}

// =============================================
// GET SINGLE TEMPLATE WITH ITEMS
// =============================================

export async function getBudgetTemplate(
  templateId: string
): Promise<ActionResponse<BudgetTemplateWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('budget_templates')
      .select(`
        *,
        protocol:clinical_protocols(protocol_number, title)
      `)
      .eq('id', templateId)
      .single();

    if (error) return { success: false, error: error.message };

    const { data: items } = await supabase
      .from('budget_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order');

    const template = data as BudgetTemplateWithRelations;
    template.items = (items || []) as BudgetTemplateItem[];

    return { success: true, data: template };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch template' };
  }
}

// =============================================
// CREATE BUDGET TEMPLATE
// =============================================

export async function createBudgetTemplate(
  companyId: string,
  input: CreateBudgetTemplateData
): Promise<ActionResponse<BudgetTemplate>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('budget_templates')
      .insert({
        company_id: companyId,
        protocol_id: input.protocol_id || null,
        name: input.name,
        description: input.description || null,
        is_default: input.is_default || false,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    revalidatePath('/protected/budget-templates');
    return { success: true, data: data as BudgetTemplate };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create template' };
  }
}

// =============================================
// UPDATE BUDGET TEMPLATE
// =============================================

export async function updateBudgetTemplate(
  templateId: string,
  input: UpdateBudgetTemplateData
): Promise<ActionResponse<BudgetTemplate>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('budget_templates')
      .update(input)
      .eq('id', templateId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as BudgetTemplate };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update template' };
  }
}

// =============================================
// DELETE BUDGET TEMPLATE
// =============================================

export async function deleteBudgetTemplate(templateId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('budget_templates').delete().eq('id', templateId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete template' };
  }
}

// =============================================
// TEMPLATE ITEMS
// =============================================

export async function addBudgetTemplateItem(
  input: CreateBudgetTemplateItemData
): Promise<ActionResponse<BudgetTemplateItem>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('budget_template_items')
      .insert({
        template_id: input.template_id,
        category: input.category,
        subcategory: input.subcategory || null,
        description: input.description || null,
        amount: input.amount,
        currency: input.currency || 'USD',
        sort_order: input.sort_order || 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as BudgetTemplateItem };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add template item' };
  }
}

export async function updateBudgetTemplateItem(
  itemId: string,
  input: UpdateBudgetTemplateItemData
): Promise<ActionResponse<BudgetTemplateItem>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('budget_template_items')
      .update(input)
      .eq('id', itemId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: data as BudgetTemplateItem };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update item' };
  }
}

export async function deleteBudgetTemplateItem(itemId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('budget_template_items').delete().eq('id', itemId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete item' };
  }
}

// =============================================
// CLONE TEMPLATE TO SITE BUDGET
// =============================================

export async function cloneTemplateToSiteBudget(
  companyId: string,
  templateId: string,
  siteId: string,
  protocolId: string
): Promise<ActionResponse<{ site_budget_id: string }>> {
  try {
    const supabase = await createClient();

    // Get template and items
    const templateResult = await getBudgetTemplate(templateId);
    if (!templateResult.success || !templateResult.data) {
      return { success: false, error: 'Template not found' };
    }

    const template = templateResult.data;
    const items = template.items || [];
    const totalBudgeted = items.reduce((sum, item) => sum + Number(item.amount), 0);

    // Create site budget
    const { data: siteBudget, error: budgetError } = await supabase
      .from('site_budgets')
      .insert({
        company_id: companyId,
        site_id: siteId,
        protocol_id: protocolId,
        budget_template_id: templateId,
        name: `${template.name} - Site Budget`,
        status: 'draft',
        total_budgeted: totalBudgeted,
        currency_code: items[0]?.currency || 'USD',
      })
      .select('id')
      .single();

    if (budgetError) return { success: false, error: budgetError.message };

    // Clone items
    if (items.length > 0) {
      const budgetItems = items.map((item) => ({
        site_budget_id: siteBudget.id,
        template_item_id: item.id,
        category: item.category,
        subcategory: item.subcategory,
        description: item.description,
        budgeted_amount: item.amount,
        actual_amount: 0,
        currency: item.currency,
        sort_order: item.sort_order,
      }));

      await supabase.from('site_budget_items').insert(budgetItems);
    }

    revalidatePath('/protected/clinical-payments');
    revalidatePath('/protected/financial-forecasting');
    return { success: true, data: { site_budget_id: siteBudget.id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to clone template' };
  }
}
