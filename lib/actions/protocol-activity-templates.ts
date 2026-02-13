'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export interface ProtocolActivityTemplate {
  id: string;
  company_id: string;
  name: string;
  activity_type: string | null;
  default_budgeted_cost: number | null;
  default_duration_days: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProtocolActivityTemplateInput {
  name: string;
  activity_type?: string | null;
  default_budgeted_cost?: number | null;
  default_duration_days?: number | null;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateProtocolActivityTemplateInput {
  name?: string;
  activity_type?: string | null;
  default_budgeted_cost?: number | null;
  default_duration_days?: number | null;
  description?: string | null;
  is_active?: boolean;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolActivityTemplates(
  companyId: string
): Promise<ActionResponse<ProtocolActivityTemplate[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_activity_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolActivityTemplate[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createProtocolActivityTemplate(
  companyId: string,
  input: CreateProtocolActivityTemplateInput
): Promise<ActionResponse<ProtocolActivityTemplate>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_activity_templates')
      .insert({
        company_id: companyId,
        name: input.name,
        activity_type: input.activity_type ?? null,
        default_budgeted_cost: input.default_budgeted_cost ?? 0,
        default_duration_days: input.default_duration_days ?? null,
        description: input.description ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolActivityTemplate };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateProtocolActivityTemplate(
  templateId: string,
  input: UpdateProtocolActivityTemplateInput
): Promise<ActionResponse<ProtocolActivityTemplate>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.activity_type !== undefined) updateData.activity_type = input.activity_type;
    if (input.default_budgeted_cost !== undefined) updateData.default_budgeted_cost = input.default_budgeted_cost;
    if (input.default_duration_days !== undefined) updateData.default_duration_days = input.default_duration_days;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('protocol_activity_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolActivityTemplate };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteProtocolActivityTemplate(
  templateId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('protocol_activity_templates')
      .delete()
      .eq('id', templateId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
