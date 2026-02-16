'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  TrainingPlan,
  TrainingPlanCriteria,
  TrainingPlanVersion,
  TrainingPlanVersionTopic,
  TrainingTopic,
  CreateTrainingPlanInput,
  UpdateTrainingPlanInput,
  CreateTrainingPlanCriteriaInput,
  CreateTrainingPlanVersionInput,
  UpdateTrainingPlanVersionInput,
} from '@/lib/types/clinical-training';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getTrainingPlans(companyId: string): Promise<ActionResponse<TrainingPlan[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as TrainingPlan[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getTrainingPlanCriteria(
  trainingPlanId: string
): Promise<ActionResponse<TrainingPlanCriteria[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_plan_criteria')
      .select('*')
      .eq('training_plan_id', trainingPlanId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as TrainingPlanCriteria[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getTrainingPlanVersions(
  trainingPlanId: string
): Promise<ActionResponse<TrainingPlanVersion[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_plan_versions')
      .select('*')
      .eq('training_plan_id', trainingPlanId)
      .order('version_number', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as TrainingPlanVersion[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getTrainingPlanVersionTopics(
  versionId: string
): Promise<ActionResponse<{ topic: TrainingTopic }[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_plan_version_topics')
      .select(`
        training_topic_id,
        training_topics (*)
      `)
      .eq('version_id', versionId);

    if (error) return { success: false, error: error.message };
    const items = (data || []).map((r: { training_topics?: TrainingTopic | TrainingTopic[] }) => {
      const t = Array.isArray(r.training_topics) ? r.training_topics[0] : r.training_topics;
      return { topic: t as TrainingTopic };
    });
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getApprovedVersionForPlan(
  trainingPlanId: string
): Promise<ActionResponse<TrainingPlanVersion | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_plan_versions')
      .select('*')
      .eq('training_plan_id', trainingPlanId)
      .eq('status', 'approved')
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as TrainingPlanVersion | null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createTrainingPlan(
  input: CreateTrainingPlanInput
): Promise<ActionResponse<TrainingPlan>> {
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
      .from('training_plans')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        description: input.description ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: data as TrainingPlan };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateTrainingPlan(
  id: string,
  input: UpdateTrainingPlanInput
): Promise<ActionResponse<TrainingPlan>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.obsolete_date !== undefined) updateData.obsolete_date = input.obsolete_date;

    const { data, error } = await supabase
      .from('training_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: data as TrainingPlan };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteTrainingPlan(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('training_plans').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createTrainingPlanCriteria(
  input: CreateTrainingPlanCriteriaInput
): Promise<ActionResponse<TrainingPlanCriteria>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_plan_criteria')
      .insert({
        training_plan_id: input.training_plan_id,
        scope: input.scope,
        indication: input.indication ?? null,
        trial_phase: input.trial_phase ?? null,
        site_status: input.site_status ?? null,
        protocol_id: input.protocol_id ?? null,
        region_id: input.region_id ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: data as TrainingPlanCriteria };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteTrainingPlanCriteria(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('training_plan_criteria').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createTrainingPlanVersion(
  input: CreateTrainingPlanVersionInput
): Promise<ActionResponse<TrainingPlanVersion>> {
  try {
    const supabase = await createClient();
    const { data: versions } = await supabase
      .from('training_plan_versions')
      .select('version_number')
      .eq('training_plan_id', input.training_plan_id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = versions?.length
      ? (versions[0]?.version_number ?? 0) + 1
      : 1;

    const { data, error } = await supabase
      .from('training_plan_versions')
      .insert({
        training_plan_id: input.training_plan_id,
        version_number: nextVersion,
        name: input.name,
        status: input.status ?? 'draft',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: data as TrainingPlanVersion };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateTrainingPlanVersion(
  id: string,
  input: UpdateTrainingPlanVersionInput
): Promise<ActionResponse<TrainingPlanVersion>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === 'approved') {
        updateData.published_date = new Date().toISOString();
      }
      if (input.status === 'archived') {
        updateData.archived_date = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('training_plan_versions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: data as TrainingPlanVersion };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function addTopicToVersion(
  versionId: string,
  trainingTopicId: string
): Promise<ActionResponse<TrainingPlanVersionTopic>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('training_plan_version_topics')
      .insert({ version_id: versionId, training_topic_id: trainingTopicId })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: data as TrainingPlanVersionTopic };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function removeTopicFromVersion(
  versionId: string,
  trainingTopicId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('training_plan_version_topics')
      .delete()
      .eq('version_id', versionId)
      .eq('training_topic_id', trainingTopicId);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-training');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
