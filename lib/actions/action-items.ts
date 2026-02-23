'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ActionItem,
  CreateActionItemInput,
  UpdateActionItemInput,
  ActionItemFilters,
  ActionItemStats,
} from '@/lib/types/action-items';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getActionItems(
  companyId: string,
  filters?: ActionItemFilters
): Promise<ActionResponse<{ items: ActionItem[]; total: number }>> {
  try {
    const supabase = await createClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('action_items')
      .select(
        `*, assigned_to:profiles!action_items_assigned_to_id_fkey(id, first_name, last_name), assigned_by:profiles!action_items_assigned_by_id_fkey(id, first_name, last_name), protocol:clinical_protocols(id, title, protocol_number)`,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.source_type && filters.source_type !== 'all') {
      query = query.eq('source_type', filters.source_type);
    }
    if (filters?.assigned_to_id) {
      query = query.eq('assigned_to_id', filters.assigned_to_id);
    }
    if (filters?.protocol_id) {
      query = query.eq('protocol_id', filters.protocol_id);
    }
    if (filters?.overdue_only) {
      query = query.lt('due_date', new Date().toISOString().split('T')[0]).in('status', ['open', 'in_progress']);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: { items: (data || []) as ActionItem[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getActionItem(id: string): Promise<ActionResponse<ActionItem>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('action_items')
      .select(
        `*, assigned_to:profiles!action_items_assigned_to_id_fkey(id, first_name, last_name), assigned_by:profiles!action_items_assigned_by_id_fkey(id, first_name, last_name), protocol:clinical_protocols(id, title, protocol_number)`
      )
      .eq('id', id)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as ActionItem };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createActionItem(
  input: CreateActionItemInput
): Promise<ActionResponse<ActionItem>> {
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
      .from('action_items')
      .insert({
        ...input,
        company_id: profile.company_id,
        assigned_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/action-items');
    return { success: true, data: data as ActionItem };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateActionItem(
  id: string,
  input: UpdateActionItemInput
): Promise<ActionResponse<ActionItem>> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = { ...input };
    if (input.status === 'resolved' && !input.resolution_notes) {
      updateData.resolved_date = new Date().toISOString();
    }
    if (input.status === 'resolved') {
      updateData.resolved_date = new Date().toISOString();
    }
    if (input.escalated) {
      updateData.escalated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('action_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/action-items');
    return { success: true, data: data as ActionItem };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteActionItem(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('action_items').delete().eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/action-items');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getActionItemStats(companyId: string, protocolId?: string): Promise<ActionResponse<ActionItemStats>> {
  try {
    const supabase = await createClient();
    let query = supabase.from('action_items').select('status, priority, due_date').eq('company_id', companyId);
    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const items = data || [];
    const today = new Date().toISOString().split('T')[0];
    const stats: ActionItemStats = {
      total: items.length,
      open: items.filter(i => i.status === 'open').length,
      in_progress: items.filter(i => i.status === 'in_progress').length,
      resolved: items.filter(i => i.status === 'resolved').length,
      closed: items.filter(i => i.status === 'closed').length,
      overdue: items.filter(i => i.due_date && i.due_date < today && ['open', 'in_progress'].includes(i.status)).length,
      critical: items.filter(i => i.priority === 'critical' && ['open', 'in_progress'].includes(i.status)).length,
    };

    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
