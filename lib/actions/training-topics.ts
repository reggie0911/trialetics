'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  TrainingTopic,
  CreateTrainingTopicInput,
  UpdateTrainingTopicInput,
} from '@/lib/types/clinical-training';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getTrainingTopics(companyId: string): Promise<ActionResponse<TrainingTopic[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_topics')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as TrainingTopic[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getActiveTrainingTopics(companyId: string): Promise<ActionResponse<TrainingTopic[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_topics')
      .select('*')
      .eq('company_id', companyId)
      .is('obsolete_date', null)
      .order('name', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as TrainingTopic[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createTrainingTopic(
  input: CreateTrainingTopicInput
): Promise<ActionResponse<TrainingTopic>> {
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
      .from('training_topics')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        category: input.category ?? null,
        role: input.role ?? [],
        description: input.description ?? null,
        mandatory: input.mandatory ?? false,
        duration: input.duration ?? null,
        duration_unit: input.duration_unit ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as TrainingTopic };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateTrainingTopic(
  id: string,
  input: UpdateTrainingTopicInput
): Promise<ActionResponse<TrainingTopic>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.mandatory !== undefined) updateData.mandatory = input.mandatory;
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.duration_unit !== undefined) updateData.duration_unit = input.duration_unit;
    if (input.obsolete_date !== undefined) updateData.obsolete_date = input.obsolete_date;

    const { data, error } = await supabase
      .from('training_topics')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as TrainingTopic };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteTrainingTopic(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('training_topics').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
