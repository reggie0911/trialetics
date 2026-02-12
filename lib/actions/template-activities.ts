'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { ActionResponse } from '@/lib/types';

// =============================================
// ACTIVITY TYPES
// =============================================

export interface TemplateActivity {
  id: string;
  company_id: string;
  template_visit_id: string;
  activity_name: string;
  activity_type: string;
  is_required: boolean;
  description: string | null;
  payment_flag?: boolean;
  payment_amount?: number | null;
  metadata: any;
  created_at: string;
}

export interface CreateActivityData {
  activity_name: string;
  activity_type: string;
  is_required: boolean;
  description?: string | null;
  payment_flag?: boolean;
  payment_amount?: number | null;
}

export interface UpdateActivityData {
  activity_name?: string;
  activity_type?: string;
  is_required?: boolean;
  description?: string | null;
  payment_flag?: boolean;
  payment_amount?: number | null;
}

// =============================================
// CREATE ACTIVITY
// =============================================

export async function createTemplateActivity(
  companyId: string,
  visitId: string,
  activityData: CreateActivityData
): Promise<ActionResponse<TemplateActivity>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('template_activities')
      .insert({
        company_id: companyId,
        template_visit_id: visitId,
        ...activityData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');

    return { success: true, data };
  } catch (error) {
    console.error('Error in createTemplateActivity:', error);
    return { success: false, error: 'Failed to create activity' };
  }
}

// =============================================
// UPDATE ACTIVITY
// =============================================

export async function updateTemplateActivity(
  companyId: string,
  activityId: string,
  activityData: UpdateActivityData
): Promise<ActionResponse<TemplateActivity>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('template_activities')
      .update(activityData)
      .eq('id', activityId)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating activity:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateTemplateActivity:', error);
    return { success: false, error: 'Failed to update activity' };
  }
}

// =============================================
// DELETE ACTIVITY
// =============================================

export async function deleteTemplateActivity(
  companyId: string,
  activityId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('template_activities')
      .delete()
      .eq('id', activityId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting activity:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/visit-templates');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deleteTemplateActivity:', error);
    return { success: false, error: 'Failed to delete activity' };
  }
}

// =============================================
// GET ACTIVITIES FOR VISIT
// =============================================

export async function getVisitActivities(
  companyId: string,
  visitId: string
): Promise<ActionResponse<TemplateActivity[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('template_activities')
      .select('*')
      .eq('template_visit_id', visitId)
      .eq('company_id', companyId)
      .order('activity_name', { ascending: true });

    if (error) {
      console.error('Error fetching activities:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getVisitActivities:', error);
    return { success: false, error: 'Failed to fetch activities' };
  }
}
