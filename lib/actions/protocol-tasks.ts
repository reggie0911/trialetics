'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export type ProtocolTaskStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

export interface ProtocolTask {
  id: string;
  company_id: string;
  protocol_id: string;
  name: string;
  description: string | null;
  budgeted_cost: number | null;
  actual_cost: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProtocolTaskInput {
  protocol_id: string;
  name: string;
  description?: string | null;
  budgeted_cost?: number | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  sort_order?: number;
}

export interface UpdateProtocolTaskInput extends Partial<CreateProtocolTaskInput> {
  actual_cost?: number | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolTasks(protocolId: string): Promise<ActionResponse<ProtocolTask[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_tasks')
      .select('*')
      .eq('protocol_id', protocolId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolTask[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createProtocolTask(
  input: CreateProtocolTaskInput
): Promise<ActionResponse<ProtocolTask>> {
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
      .from('protocol_tasks')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        name: input.name,
        description: input.description ?? null,
        budgeted_cost: input.budgeted_cost ?? 0,
        planned_start_date: input.planned_start_date ?? null,
        planned_end_date: input.planned_end_date ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolTask };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateProtocolTask(
  taskId: string,
  input: UpdateProtocolTaskInput
): Promise<ActionResponse<ProtocolTask>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_tasks')
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.budgeted_cost !== undefined && { budgeted_cost: input.budgeted_cost }),
        ...(input.actual_cost !== undefined && { actual_cost: input.actual_cost }),
        ...(input.planned_start_date !== undefined && { planned_start_date: input.planned_start_date }),
        ...(input.planned_end_date !== undefined && { planned_end_date: input.planned_end_date }),
        ...(input.actual_start_date !== undefined && { actual_start_date: input.actual_start_date }),
        ...(input.actual_end_date !== undefined && { actual_end_date: input.actual_end_date }),
        ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolTask };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteProtocolTask(taskId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('protocol_tasks').delete().eq('id', taskId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
