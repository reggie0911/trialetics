'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { ActionResponse } from '@/lib/types';

// =============================================
// VISIT TYPES
// =============================================

export interface TemplateVisit {
  id: string;
  company_id: string;
  template_id: string;
  visit_name: string;
  visit_type: string;
  sequence: number;
  day_from_baseline: number;
  visit_window_before: number | null;
  visit_window_after: number | null;
  description: string | null;
  metadata: any;
  created_at: string;
}

export interface CreateVisitData {
  visit_name: string;
  visit_type: string;
  day_from_baseline: number;
  visit_window_before?: number | null;
  visit_window_after?: number | null;
  description?: string | null;
}

export interface UpdateVisitData {
  visit_name?: string;
  visit_type?: string;
  day_from_baseline?: number;
  visit_window_before?: number | null;
  visit_window_after?: number | null;
  description?: string | null;
}

// =============================================
// CREATE VISIT
// =============================================

export async function createTemplateVisit(
  companyId: string,
  templateId: string,
  visitData: CreateVisitData
): Promise<ActionResponse<TemplateVisit>> {
  try {
    const supabase = await createClient();

    // Get the next sequence number
    const { data: existingVisits } = await supabase
      .from('template_visits')
      .select('sequence')
      .eq('template_id', templateId)
      .order('sequence', { ascending: false })
      .limit(1);

    const nextSequence = existingVisits && existingVisits.length > 0 
      ? existingVisits[0].sequence + 1 
      : 1;

    const { data, error } = await supabase
      .from('template_visits')
      .insert({
        company_id: companyId,
        template_id: templateId,
        sequence: nextSequence,
        ...visitData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating visit:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');

    return { success: true, data };
  } catch (error) {
    console.error('Error in createTemplateVisit:', error);
    return { success: false, error: 'Failed to create visit' };
  }
}

// =============================================
// UPDATE VISIT
// =============================================

export async function updateTemplateVisit(
  companyId: string,
  visitId: string,
  visitData: UpdateVisitData
): Promise<ActionResponse<TemplateVisit>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('template_visits')
      .update(visitData)
      .eq('id', visitId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating visit:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateTemplateVisit:', error);
    return { success: false, error: 'Failed to update visit' };
  }
}

// =============================================
// DELETE VISIT
// =============================================

export async function deleteTemplateVisit(
  companyId: string,
  visitId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Delete activities first (cascade should handle this, but being explicit)
    await supabase
      .from('template_activities')
      .delete()
      .eq('template_visit_id', visitId)
      .eq('company_id', companyId);

    // Delete the visit
    const { error } = await supabase
      .from('template_visits')
      .delete()
      .eq('id', visitId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting visit:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deleteTemplateVisit:', error);
    return { success: false, error: 'Failed to delete visit' };
  }
}

// =============================================
// REORDER VISITS
// =============================================

export async function reorderTemplateVisits(
  companyId: string,
  templateId: string,
  visitIds: string[]
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // Update sequence for each visit
    for (let i = 0; i < visitIds.length; i++) {
      await supabase
        .from('template_visits')
        .update({ sequence: i + 1 })
        .eq('id', visitIds[i])
        .eq('template_id', templateId)
        .eq('company_id', companyId);
    }

    revalidatePath('/protected/visit-templates');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in reorderTemplateVisits:', error);
    return { success: false, error: 'Failed to reorder visits' };
  }
}

// =============================================
// GET VISITS FOR TEMPLATE
// =============================================

export async function getTemplateVisits(
  companyId: string,
  templateId: string
): Promise<ActionResponse<TemplateVisit[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('template_visits')
      .select('*')
      .eq('template_id', templateId)
      .eq('company_id', companyId)
      .order('sequence', { ascending: true });

    if (error) {
      console.error('Error fetching visits:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getTemplateVisits:', error);
    return { success: false, error: 'Failed to fetch visits' };
  }
}
