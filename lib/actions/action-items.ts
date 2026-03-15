'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  ActionItem,
  ActionItemFilters,
  ActionItemStats,
  CreateActionItemInput,
  UpdateActionItemInput,
} from '@/lib/types/action-items';

const ACTION_ITEM_SELECT =
  'id, company_id, protocol_id, title, description, status, priority, category, source_type, source_id, assigned_to_id, assigned_by_id, due_date, resolved_date, resolution_notes, escalated, escalated_at, created_at, updated_at, assigned_to:profiles!action_items_assigned_to_id_fkey(id, first_name, last_name), assigned_by:profiles!action_items_assigned_by_id_fkey(id, first_name, last_name), protocol:studies(id, title, protocol_number)';

async function getProfileId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) throw new Error('No profile found');
  return profile.id;
}

export async function getActionItems(
  companyId: string,
  filters?: ActionItemFilters
): Promise<{ success: boolean; data?: { items: ActionItem[]; total: number }; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('action_items')
      .select(ACTION_ITEM_SELECT, { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

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
      query = query
        .lt('due_date', new Date().toISOString().slice(0, 10))
        .not('status', 'in', '("resolved","closed")');
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: { items: (data as unknown as ActionItem[]) ?? [], total: count ?? 0 },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getActionItemStats(
  companyId: string
): Promise<{ success: boolean; data?: ActionItemStats; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('action_items')
      .select('status, priority, due_date')
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };

    const rows = data ?? [];
    const today = new Date().toISOString().slice(0, 10);
    const stats: ActionItemStats = {
      total: rows.length,
      open: rows.filter((r) => r.status === 'open').length,
      in_progress: rows.filter((r) => r.status === 'in_progress').length,
      resolved: rows.filter((r) => r.status === 'resolved').length,
      closed: rows.filter((r) => r.status === 'closed').length,
      overdue: rows.filter(
        (r) =>
          r.due_date &&
          r.due_date < today &&
          r.status !== 'resolved' &&
          r.status !== 'closed'
      ).length,
      critical: rows.filter((r) => r.priority === 'critical').length,
    };
    return { success: true, data: stats };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createActionItem(
  input: CreateActionItemInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profileId = await getProfileId();
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', profileId)
      .single();
    if (!profile) return { success: false, error: 'Profile not found' };

    const { error } = await supabase.from('action_items').insert({
      company_id: profile.company_id,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'medium',
      source_type: input.source_type ?? 'general',
      source_id: input.source_id ?? null,
      protocol_id: input.protocol_id ?? null,
      assigned_to_id: input.assigned_to_id ?? null,
      due_date: input.due_date ?? null,
      category: input.category ?? null,
      status: 'open',
      assigned_by_id: profileId,
    });

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/action-items');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateActionItem(
  id: string,
  input: UpdateActionItemInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const payload: Record<string, unknown> = {};
    if (input.title != null) payload.title = input.title;
    if (input.description !== undefined) payload.description = input.description;
    if (input.status != null) {
      payload.status = input.status;
      if (input.status === 'resolved' || input.status === 'closed') {
        payload.resolved_date = new Date().toISOString().slice(0, 10);
      }
    }
    if (input.priority != null) payload.priority = input.priority;
    if (input.category !== undefined) payload.category = input.category;
    if (input.assigned_to_id !== undefined) payload.assigned_to_id = input.assigned_to_id;
    if (input.due_date !== undefined) payload.due_date = input.due_date;
    if (input.resolution_notes !== undefined) payload.resolution_notes = input.resolution_notes;
    if (input.escalated != null) {
      payload.escalated = input.escalated;
      if (input.escalated) payload.escalated_at = new Date().toISOString();
    }

    const { error } = await supabase.from('action_items').update(payload).eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/action-items');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
