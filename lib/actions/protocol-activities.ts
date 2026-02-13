'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export type ProtocolActivityStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

export interface ProtocolActivity {
  id: string;
  company_id: string;
  protocol_id: string;
  task_id: string | null;
  name: string;
  description: string | null;
  activity_type: string | null;
  status: ProtocolActivityStatus;
  budgeted_cost: number | null;
  actual_cost: number | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  assigned_to_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProtocolActivityInput {
  protocol_id: string;
  task_id?: string | null;
  name: string;
  description?: string | null;
  activity_type?: string | null;
  budgeted_cost?: number | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  assigned_to_id?: string | null;
  sort_order?: number;
}

export interface UpdateProtocolActivityInput {
  task_id?: string | null;
  name?: string;
  description?: string | null;
  activity_type?: string | null;
  status?: ProtocolActivityStatus;
  budgeted_cost?: number | null;
  actual_cost?: number | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
  assigned_to_id?: string | null;
  sort_order?: number;
}

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProtocolActivityWithProtocol extends ProtocolActivity {
  protocol?: { protocol_number: string; title: string };
}

/** Fetch activities for calendar view: company-wide, within date range */
export async function getProtocolActivitiesForCalendar(
  companyId: string,
  startDate: string,
  endDate: string,
  protocolId?: string | null
): Promise<ActionResponse<ProtocolActivityWithProtocol[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('protocol_activities')
      .select('*, protocol:clinical_protocols(protocol_number, title)')
      .eq('company_id', companyId)
      .neq('status', 'cancelled')
      .lte('planned_start_date', endDate);

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query.order('planned_start_date', { ascending: true });

    if (error) return { success: false, error: error.message };

    // Filter: activity overlaps [startDate, endDate] if
    // planned_start_date <= endDate AND (planned_end_date >= startDate OR planned_end_date is null)
    const filtered = (data || []).filter((a) => {
      const start = a.planned_start_date || a.planned_end_date || '';
      const end = a.planned_end_date || null;
      if (!start) return false;
      return start <= endDate && (!end || end >= startDate);
    });

    return { success: true, data: filtered as ProtocolActivityWithProtocol[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getProtocolActivities(
  protocolId: string,
  taskId?: string | null
): Promise<ActionResponse<ProtocolActivity[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('protocol_activities')
      .select('*')
      .eq('protocol_id', protocolId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (taskId) query = query.eq('task_id', taskId);

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolActivity[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createProtocolActivity(
  input: CreateProtocolActivityInput
): Promise<ActionResponse<ProtocolActivity>> {
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
      .from('protocol_activities')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        task_id: input.task_id ?? null,
        name: input.name,
        description: input.description ?? null,
        activity_type: input.activity_type ?? null,
        budgeted_cost: input.budgeted_cost ?? 0,
        planned_start_date: input.planned_start_date ?? null,
        planned_end_date: input.planned_end_date ?? null,
        assigned_to_id: input.assigned_to_id ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolActivity };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateProtocolActivity(
  activityId: string,
  input: UpdateProtocolActivityInput
): Promise<ActionResponse<ProtocolActivity>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (input.task_id !== undefined) updateData.task_id = input.task_id;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.activity_type !== undefined) updateData.activity_type = input.activity_type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.budgeted_cost !== undefined) updateData.budgeted_cost = input.budgeted_cost;
    if (input.actual_cost !== undefined) updateData.actual_cost = input.actual_cost;
    if (input.planned_start_date !== undefined) updateData.planned_start_date = input.planned_start_date;
    if (input.planned_end_date !== undefined) updateData.planned_end_date = input.planned_end_date;
    if (input.actual_start_date !== undefined) updateData.actual_start_date = input.actual_start_date;
    if (input.actual_end_date !== undefined) updateData.actual_end_date = input.actual_end_date;
    if (input.assigned_to_id !== undefined) updateData.assigned_to_id = input.assigned_to_id;
    if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;

    const { data, error } = await supabase
      .from('protocol_activities')
      .update(updateData)
      .eq('id', activityId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolActivity };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteProtocolActivity(activityId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('protocol_activities').delete().eq('id', activityId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
