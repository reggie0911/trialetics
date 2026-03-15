'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { StudyMilestone, StudyMilestoneWithProgress } from '@/lib/types/tasks';

async function getCompanyId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.company_id) throw new Error('No company found');
  return profile.company_id;
}

export interface CreateMilestoneInput {
  study_id: string;
  name: string;
  description?: string;
  department?: string;
  planned_start_date?: string;
  planned_due_date?: string;
  status?: string;
}

export interface UpdateMilestoneInput {
  name?: string;
  description?: string;
  department?: string;
  planned_start_date?: string;
  planned_due_date?: string;
  actual_date?: string;
  status?: string;
}

/** Get milestones for a study with task counts and progress (for hierarchy view). */
export async function getStudyMilestones(studyId: string): Promise<StudyMilestoneWithProgress[]> {
  const supabase = await createClient();
  const { data: milestones, error: milestonesError } = await supabase
    .from('study_milestones')
    .select('*')
    .eq('study_id', studyId)
    .order('planned_due_date', { ascending: true, nullsFirst: true });

  if (milestonesError) throw new Error(milestonesError.message);
  if (!milestones?.length) return [];

  const ids = milestones.map((m) => m.id);
  const { data: counts, error: countsError } = await supabase
    .from('tasks')
    .select('milestone_id, status')
    .in('milestone_id', ids);

  if (countsError) return milestones.map((m) => ({ ...m, completed_count: 0, total_count: 0, progress_pct: 0 }));

  const byMilestone: Record<string, { total: number; completed: number }> = {};
  ids.forEach((id) => { byMilestone[id] = { total: 0, completed: 0 }; });
  (counts || []).forEach((r: { milestone_id: string; status: string }) => {
    if (r.milestone_id && byMilestone[r.milestone_id]) {
      byMilestone[r.milestone_id].total += 1;
      if (r.status === 'completed') byMilestone[r.milestone_id].completed += 1;
    }
  });

  return milestones.map((m) => {
    const { total, completed } = byMilestone[m.id] ?? { total: 0, completed: 0 };
    const progress_pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      ...m,
      completed_count: completed,
      total_count: total,
      progress_pct,
    } as StudyMilestoneWithProgress;
  });
}

/** Get all milestones (optionally filtered by study) with progress. */
export async function getAllMilestones(studyId?: string): Promise<StudyMilestoneWithProgress[]> {
  const supabase = await createClient();
  let query = supabase
    .from('study_milestones')
    .select('*')
    .order('planned_due_date', { ascending: true, nullsFirst: true });

  if (studyId) {
    query = query.eq('study_id', studyId);
  } else {
    const companyId = await getCompanyId();
    const { data: studyIds } = await supabase.from('studies').select('id').eq('company_id', companyId);
    const ids = (studyIds ?? []).map((s: { id: string }) => s.id);
    if (ids.length) query = query.in('study_id', ids);
  }

  const { data: milestones, error } = await query;
  if (error) throw new Error(error.message);
  if (!milestones?.length) return [];

  const milestoneIds = milestones.map((m) => m.id);
  const { data: taskRows } = await supabase
    .from('tasks')
    .select('milestone_id, status')
    .in('milestone_id', milestoneIds);

  const byMilestone: Record<string, { total: number; completed: number }> = {};
  milestoneIds.forEach((id) => { byMilestone[id] = { total: 0, completed: 0 }; });
  (taskRows || []).forEach((r: { milestone_id: string; status: string }) => {
    if (r.milestone_id && byMilestone[r.milestone_id]) {
      byMilestone[r.milestone_id].total += 1;
      if (r.status === 'completed') byMilestone[r.milestone_id].completed += 1;
    }
  });

  return milestones.map((m) => {
    const { total, completed } = byMilestone[m.id] ?? { total: 0, completed: 0 };
    const progress_pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      ...m,
      completed_count: completed,
      total_count: total,
      progress_pct,
    } as StudyMilestoneWithProgress;
  });
}

export async function getMilestoneById(id: string): Promise<StudyMilestoneWithProgress | null> {
  const supabase = await createClient();
  const { data: milestone, error } = await supabase
    .from('study_milestones')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !milestone) return null;

  const { data: taskRows } = await supabase
    .from('tasks')
    .select('status')
    .eq('milestone_id', id);
  const total = taskRows?.length ?? 0;
  const completed = (taskRows ?? []).filter((r: { status: string }) => r.status === 'completed').length;
  const progress_pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    ...milestone,
    completed_count: completed,
    total_count: total,
    progress_pct,
  } as StudyMilestoneWithProgress;
}

export async function createMilestone(
  input: CreateMilestoneInput
): Promise<{ data: StudyMilestone | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('study_milestones')
      .insert({
        study_id: input.study_id,
        name: input.name,
        description: input.description ?? null,
        department: input.department ?? null,
        planned_start_date: input.planned_start_date ?? null,
        planned_due_date: input.planned_due_date ?? null,
        status: input.status ?? 'pending',
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/protected/tasks');
    revalidatePath(`/protected/studies/${input.study_id}`);
    return { data: data as unknown as StudyMilestone, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function updateMilestone(
  id: string,
  input: UpdateMilestoneInput
): Promise<{ data: StudyMilestone | null; error: string | null }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('study_milestones')
      .update({
        ...(input.name != null && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.department !== undefined && { department: input.department }),
        ...(input.planned_start_date !== undefined && { planned_start_date: input.planned_start_date }),
        ...(input.planned_due_date !== undefined && { planned_due_date: input.planned_due_date }),
        ...(input.actual_date !== undefined && { actual_date: input.actual_date }),
        ...(input.status != null && { status: input.status }),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    revalidatePath('/protected/tasks');
    return { data: data as unknown as StudyMilestone, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

export async function deleteMilestone(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('study_milestones').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/protected/tasks');
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
