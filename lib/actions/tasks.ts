'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ProtocolTask,
  TaskComment,
  TaskNotification,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskStats,
} from '@/lib/types/tasks';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const TASK_SELECT = `*, assigned_to:profiles!protocol_tasks_assigned_to_id_fkey(id, first_name, last_name, email), assigned_by:profiles!protocol_tasks_assigned_by_id_fkey(id, first_name, last_name), protocol:clinical_protocols(id, title, protocol_number), depends_on:protocol_tasks!protocol_tasks_depends_on_id_fkey(id, name)`;

export async function getTasks(
  companyId: string,
  filters?: TaskFilters
): Promise<ActionResponse<{ items: ProtocolTask[]; total: number }>> {
  try {
    const supabase = await createClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('protocol_tasks')
      .select(TASK_SELECT, { count: 'exact' })
      .eq('company_id', companyId);

    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority);
    if (filters?.assigned_to_id) query = query.eq('assigned_to_id', filters.assigned_to_id);
    if (filters?.protocol_id) query = query.eq('protocol_id', filters.protocol_id);
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: { items: (data || []) as ProtocolTask[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getMyTasks(
  profileId: string
): Promise<ActionResponse<ProtocolTask[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('protocol_tasks')
      .select(TASK_SELECT)
      .eq('assigned_to_id', profileId)
      .in('status', ['planned', 'in_progress', 'on_hold'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: true })
      .limit(100);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ProtocolTask[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createTask(input: CreateTaskInput): Promise<ActionResponse<ProtocolTask>> {
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
        priority: input.priority ?? 'medium',
        assigned_to_id: input.assigned_to_id ?? null,
        assigned_by_id: input.assigned_to_id ? profile.id : null,
        due_date: input.due_date ?? null,
        planned_start_date: input.planned_start_date ?? null,
        planned_end_date: input.planned_end_date ?? null,
        depends_on_id: input.depends_on_id ?? null,
        tags: input.tags ?? [],
        sort_order: 0,
        budgeted_cost: 0,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (input.assigned_to_id && input.assigned_to_id !== profile.id) {
      await supabase.from('task_notifications').insert({
        company_id: profile.company_id,
        task_id: data.id,
        recipient_id: input.assigned_to_id,
        type: 'assigned',
      });
    }

    revalidatePath('/protected/tasks');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolTask };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<ActionResponse<ProtocolTask>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();

    const { data: oldTask } = await supabase
      .from('protocol_tasks')
      .select('assigned_to_id, status')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('protocol_tasks')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (profile?.company_id && input.assigned_to_id && input.assigned_to_id !== oldTask?.assigned_to_id && input.assigned_to_id !== profile.id) {
      await supabase.from('task_notifications').insert({
        company_id: profile.company_id,
        task_id: id,
        recipient_id: input.assigned_to_id,
        type: 'assigned',
      });
    }

    if (profile?.company_id && input.status === 'completed' && oldTask?.assigned_to_id && oldTask.assigned_to_id !== profile.id) {
      await supabase.from('task_notifications').insert({
        company_id: profile.company_id,
        task_id: id,
        recipient_id: oldTask.assigned_to_id,
        type: 'completed',
      });
    }

    revalidatePath('/protected/tasks');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as ProtocolTask };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getTaskStats(companyId: string, profileId?: string): Promise<ActionResponse<TaskStats>> {
  try {
    const supabase = await createClient();
    const { data: tasks, error } = await supabase
      .from('protocol_tasks')
      .select('status, priority, due_date')
      .eq('company_id', companyId);

    if (error) return { success: false, error: error.message };

    let unreadCount = 0;
    if (profileId) {
      const { count } = await supabase
        .from('task_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profileId)
        .eq('read', false);
      unreadCount = count || 0;
    }

    const items = tasks || [];
    const today = new Date().toISOString().split('T')[0];

    return {
      success: true,
      data: {
        total: items.length,
        planned: items.filter(t => t.status === 'planned').length,
        in_progress: items.filter(t => t.status === 'in_progress').length,
        completed: items.filter(t => t.status === 'completed').length,
        on_hold: items.filter(t => t.status === 'on_hold').length,
        overdue: items.filter(t => t.due_date && t.due_date < today && ['planned', 'in_progress'].includes(t.status!)).length,
        critical: items.filter(t => t.priority === 'critical' && ['planned', 'in_progress'].includes(t.status!)).length,
        unread_notifications: unreadCount,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function addTaskComment(
  taskId: string,
  content: string
): Promise<ActionResponse<TaskComment>> {
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
      .from('task_comments')
      .insert({
        company_id: profile.company_id,
        task_id: taskId,
        author_id: profile.id,
        content,
      })
      .select(`*, author:profiles!task_comments_author_id_fkey(id, first_name, last_name, email)`)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as TaskComment };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getTaskComments(taskId: string): Promise<ActionResponse<TaskComment[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('task_comments')
      .select(`*, author:profiles!task_comments_author_id_fkey(id, first_name, last_name, email)`)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as TaskComment[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getTaskNotifications(profileId: string): Promise<ActionResponse<TaskNotification[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('task_notifications')
      .select(`*, task:protocol_tasks(id, name)`)
      .eq('recipient_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as TaskNotification[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function markNotificationRead(notificationId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('task_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function markAllNotificationsRead(profileId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('task_notifications')
      .update({ read: true })
      .eq('recipient_id', profileId)
      .eq('read', false);

    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
