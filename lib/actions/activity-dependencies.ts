'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';

const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  finish_to_start: 'Finish to Start',
  start_to_start: 'Start to Start',
  finish_to_finish: 'Finish to Finish',
  start_to_finish: 'Start to Finish',
};

export interface ActivityDependency {
  id: string;
  company_id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;
  predecessor?: { id: string; name: string; planned_start_date: string | null; planned_end_date: string | null } | null;
  successor?: { id: string; name: string; planned_start_date: string | null; planned_end_date: string | null } | null;
}

export async function getDependencies(protocolId: string): Promise<ActionResponse<ActivityDependency[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('activity_dependencies')
      .select(`
        *,
        predecessor:protocol_activities!activity_dependencies_predecessor_id_fkey(id, name, planned_start_date, planned_end_date),
        successor:protocol_activities!activity_dependencies_successor_id_fkey(id, name, planned_start_date, planned_end_date)
      `)
      .eq('predecessor.protocol_id', protocolId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ActivityDependency[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createDependency(input: {
  predecessor_id: string;
  successor_id: string;
  dependency_type?: DependencyType;
  lag_days?: number;
}): Promise<ActionResponse<ActivityDependency>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('activity_dependencies')
      .insert({
        ...input,
        company_id: profile.company_id,
        dependency_type: input.dependency_type || 'finish_to_start',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials/calendar');
    return { success: true, data: data as ActivityDependency };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteDependency(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('activity_dependencies').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials/calendar');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
