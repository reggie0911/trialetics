'use server';

import { revalidateStudyCtmsLayout, revalidateTaskHubLegacyPaths } from '@/lib/cache/revalidate-ctms';
import { createClient } from '@/lib/server';
import { assertStudyWritableForCurrentUser } from '@/lib/server/study-write-guard';
import type { Task, TaskWithRelations, TaskComment, TaskCommentWithAuthor, TaskStatus } from '@/lib/types/tasks';

async function getProfileId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) throw new Error('No profile found');
  return profile.id;
}

export interface TaskFilters {
  search?: string;
  status?: string;
  priority?: string;
  assignedToMe?: boolean;
  studyId?: string;
  study_id?: string;
  milestoneId?: string;
  siteId?: string;
}

const TASK_SELECT = 'id, study_id, milestone_id, title, description, assigned_to, site_id, created_by, priority, status, on_track_status, planned_start_date, due_date, completed_date, sort_order, created_at, updated_at, study_sites(id, name, site_number), profiles!tasks_assigned_to_fkey(id, first_name, last_name, email), study_milestones(id, name)';

export async function getAllTasks(filters?: TaskFilters): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .order('due_date', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });

  if (filters?.studyId ?? filters?.study_id) {
    query = query.eq('study_id', filters.studyId ?? filters.study_id);
  }
  if (filters?.milestoneId) {
    query = query.eq('milestone_id', filters.milestoneId);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.assignedToMe) {
    const profileId = await getProfileId();
    query = query.eq('assigned_to', profileId);
  }
  if (filters?.siteId) {
    query = query.eq('site_id', filters.siteId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as TaskWithRelations[]) ?? [];
}

export async function getStudyTasks(studyId: string): Promise<TaskWithRelations[]> {
  return getAllTasks({ studyId });
}

export async function getTasksByMilestone(milestoneId: string): Promise<TaskWithRelations[]> {
  return getAllTasks({ milestoneId });
}

export async function getTasksBySite(siteId: string): Promise<TaskWithRelations[]> {
  return getAllTasks({ siteId });
}

export async function getTaskById(id: string): Promise<TaskWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', id)
    .single();
  if (error) return null;
  return data as unknown as TaskWithRelations;
}

export interface TaskDashboardCounts {
  total: number;
  not_started: number;
  in_progress: number;
  completed: number;
  blocked: number;
}

export async function getTaskDashboardCounts(studyId?: string, assignedToMe?: boolean): Promise<TaskDashboardCounts> {
  const supabase = await createClient();
  let query = supabase.from('tasks').select('status');
  if (studyId) query = query.eq('study_id', studyId);
  if (assignedToMe) {
    const profileId = await getProfileId();
    query = query.eq('assigned_to', profileId);
  }
  const { data, error } = await query;
  if (error) return { total: 0, not_started: 0, in_progress: 0, completed: 0, blocked: 0 };
  const rows = data ?? [];
  const total = rows.length;
  const not_started = rows.filter((r: { status: string }) => r.status === 'not_started').length;
  const in_progress = rows.filter((r: { status: string }) => r.status === 'in_progress').length;
  const completed = rows.filter((r: { status: string }) => r.status === 'completed').length;
  const blocked = rows.filter((r: { status: string }) => r.status === 'blocked').length;
  return { total, not_started, in_progress, completed, blocked };
}

export async function getMyTasks(studyId?: string): Promise<TaskWithRelations[]> {
  return getAllTasks({ assignedToMe: true, ...(studyId ? { studyId } : {}) });
}

export interface CreateTaskInput {
  study_id: string;
  milestone_id?: string;
  title: string;
  description?: string;
  priority?: string;
  status?: TaskStatus;
  due_date?: string;
  planned_start_date?: string;
  assigned_to?: string;
  site_id?: string;
  on_track_status?: string;
}

export async function createTask(
  input: CreateTaskInput
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { data: null, error: writeGuard };

    const profileId = await getProfileId();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        study_id: input.study_id,
        milestone_id: input.milestone_id ?? null,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? 'low',
        status: input.status ?? 'not_started',
        due_date: input.due_date ?? null,
        planned_start_date: input.planned_start_date ?? null,
        assigned_to: input.assigned_to ?? null,
        site_id: input.site_id ?? null,
        created_by: profileId,
        on_track_status: input.on_track_status ?? null,
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidateStudyCtmsLayout(input.study_id);
    revalidateTaskHubLegacyPaths();
    return { data: data as unknown as Task, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export interface CreateGroupTaskInput {
  study_id: string;
  milestone_name: string;
  task_name: string;
  description?: string;
  department?: string;
  number_of_individual_tasks: number;
  planned_start_date?: string;
  planned_due_date?: string;
}

export async function createGroupTask(
  input: CreateGroupTaskInput
): Promise<{ data: { milestoneId: string }; error: string | null }> {
  const supabase = await createClient();
  try {
    const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, input.study_id);
    if (writeGuard) return { data: { milestoneId: '' }, error: writeGuard };

    const { data: milestone, error: milestoneError } = await supabase
      .from('study_milestones')
      .insert({
        study_id: input.study_id,
        name: input.milestone_name,
        description: input.description ?? null,
        department: input.department ?? null,
        planned_start_date: input.planned_start_date ?? null,
        planned_due_date: input.planned_due_date ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (milestoneError || !milestone) {
      return { data: { milestoneId: '' }, error: milestoneError?.message ?? 'Failed to create milestone.' };
    }

    const profileId = await getProfileId();
    const n = Math.max(1, Math.min(Number(input.number_of_individual_tasks) || 1, 500));
    const taskRows = Array.from({ length: n }, (_, i) => ({
      study_id: input.study_id,
      milestone_id: milestone.id,
      title: input.task_name,
      description: input.description ?? null,
      priority: 'low',
      status: 'not_started',
      planned_start_date: input.planned_start_date ?? null,
      due_date: input.planned_due_date ?? null,
      sort_order: i,
      created_by: profileId,
    }));

    const { error: tasksError } = await supabase.from('tasks').insert(taskRows);
    if (tasksError) {
      await supabase.from('study_milestones').delete().eq('id', milestone.id);
      return { data: { milestoneId: '' }, error: tasksError.message };
    }

    revalidateStudyCtmsLayout(input.study_id);
    revalidateTaskHubLegacyPaths();
    return { data: { milestoneId: milestone.id }, error: null };
  } catch (err) {
    return {
      data: { milestoneId: '' },
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  priority?: string;
  on_track_status?: string | null;
  site_id?: string | null;
  assigned_to?: string | null;
  description?: string | null;
  planned_start_date?: string | null;
  due_date?: string | null;
  title?: string;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: existingTask } = await supabase.from('tasks').select('study_id').eq('id', id).maybeSingle();
    const sid = (existingTask as { study_id: string } | null)?.study_id;
    if (sid) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, sid);
      if (writeGuard) return { data: null, error: writeGuard };
    }

    const payload: Record<string, unknown> = {};
    if (input.status != null) payload.status = input.status;
    if (input.priority != null) payload.priority = input.priority;
    if (input.on_track_status !== undefined) payload.on_track_status = input.on_track_status;
    if (input.site_id !== undefined) payload.site_id = input.site_id;
    if (input.assigned_to !== undefined) payload.assigned_to = input.assigned_to;
    if (input.description !== undefined) payload.description = input.description;
    if (input.planned_start_date !== undefined) payload.planned_start_date = input.planned_start_date;
    if (input.due_date !== undefined) payload.due_date = input.due_date;
    if (input.title != null) payload.title = input.title;
    if (input.status === 'completed') {
      payload.completed_date = new Date().toISOString().slice(0, 10);
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    const studyId = (data as unknown as { study_id: string }).study_id;
    revalidateStudyCtmsLayout(studyId);
    revalidateTaskHubLegacyPaths();
    return { data: data as unknown as Task, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteTask(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('created_by, study_id')
      .eq('id', id)
      .single();
    if (fetchError || !task) return { error: 'Task not found.' };

    const profileId = await getProfileId();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', profileId)
      .single();
    const isAdmin = profile?.role === 'admin';
    const isCreator = task.created_by != null && task.created_by === profileId;
    if (!isAdmin && !isCreator) {
      return { error: 'You can only delete tasks you created, or ask an admin.' };
    }

    const { error: writeGuard } = await assertStudyWritableForCurrentUser(
      supabase,
      (task as { study_id: string }).study_id
    );
    if (writeGuard) return { error: writeGuard };

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateStudyCtmsLayout((task as { study_id: string }).study_id);
    revalidateTaskHubLegacyPaths();
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

// Comments

export async function getTaskComments(taskId: string): Promise<TaskCommentWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_comments')
    .select('id, task_id, author_id, content, created_at, profiles(first_name, last_name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return (data as unknown as TaskCommentWithAuthor[]) ?? [];
}

export async function addTaskComment(
  taskId: string,
  content: string
): Promise<{ data: TaskComment | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data: parentPre } = await supabase.from('tasks').select('study_id').eq('id', taskId).maybeSingle();
    const preSid = (parentPre as { study_id: string } | null)?.study_id;
    if (preSid) {
      const { error: writeGuard } = await assertStudyWritableForCurrentUser(supabase, preSid);
      if (writeGuard) return { data: null, error: writeGuard };
    }

    const authorId = await getProfileId();
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, author_id: authorId, content: content.trim() })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    const { data: parent } = await supabase
      .from('tasks')
      .select('study_id')
      .eq('id', taskId)
      .single();
    if (parent?.study_id) {
      revalidateStudyCtmsLayout((parent as { study_id: string }).study_id);
    }
    revalidateTaskHubLegacyPaths();
    return { data: data as unknown as TaskComment, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
