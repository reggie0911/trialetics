'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export type ProtocolRiskResolutionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ProtocolRiskResolutionActivity {
  id: string;
  company_id: string;
  protocol_risk_id: string;
  name: string;
  description: string | null;
  status: ProtocolRiskResolutionStatus;
  due_date: string | null;
  completed_date: string | null;
  assigned_to_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProtocolRiskResolutionActivityInput {
  protocol_risk_id: string;
  name: string;
  description?: string | null;
  due_date?: string | null;
  assigned_to_id?: string | null;
  sort_order?: number;
}

export interface UpdateProtocolRiskResolutionActivityInput {
  name?: string;
  description?: string | null;
  status?: ProtocolRiskResolutionStatus;
  due_date?: string | null;
  completed_date?: string | null;
  assigned_to_id?: string | null;
  sort_order?: number;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolRiskResolutionActivities(
  protocolRiskId: string
): Promise<ActionResponse<ProtocolRiskResolutionActivity[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_risk_resolution_activities')
      .select('*')
      .eq('protocol_risk_id', protocolRiskId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolRiskResolutionActivity[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createProtocolRiskResolutionActivity(
  input: CreateProtocolRiskResolutionActivityInput
): Promise<ActionResponse<ProtocolRiskResolutionActivity>> {
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
      .from('protocol_risk_resolution_activities')
      .insert({
        company_id: profile.company_id,
        protocol_risk_id: input.protocol_risk_id,
        name: input.name,
        description: input.description ?? null,
        due_date: input.due_date ?? null,
        assigned_to_id: input.assigned_to_id ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolRiskResolutionActivity };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateProtocolRiskResolutionActivity(
  activityId: string,
  input: UpdateProtocolRiskResolutionActivityInput
): Promise<ActionResponse<ProtocolRiskResolutionActivity>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.due_date !== undefined) updateData.due_date = input.due_date;
    if (input.completed_date !== undefined) updateData.completed_date = input.completed_date;
    if (input.assigned_to_id !== undefined) updateData.assigned_to_id = input.assigned_to_id;
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;

    const { data, error } = await supabase
      .from('protocol_risk_resolution_activities')
      .update(updateData)
      .eq('id', activityId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolRiskResolutionActivity };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteProtocolRiskResolutionActivity(
  activityId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('protocol_risk_resolution_activities')
      .delete()
      .eq('id', activityId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
