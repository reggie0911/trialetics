'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { SiteStartupChecklist, SiteStartupStep, StartupStepStatus } from '@/lib/types/site-startup';
import { DEFAULT_STARTUP_STEPS } from '@/lib/types/site-startup';

export async function getStartupChecklists(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: SiteStartupChecklist[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('site_startup_checklists')
      .select('id, company_id, protocol_id, site_id, template_name, status, started_date, completed_date, created_at, updated_at, site:study_sites(id, site_number, organization:organizations(name)), steps:site_startup_steps(id, checklist_id, company_id, step_name, step_category, sort_order, is_required, status, assigned_to_id, target_date, completed_date, blocker_description, notes, created_at, updated_at)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as SiteStartupChecklist[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createStartupChecklist(
  companyId: string,
  input: {
    protocol_id: string;
    site_id: string;
    template_name?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const { data: checklist, error: checklistError } = await supabase
      .from('site_startup_checklists')
      .insert({
        company_id: companyId,
        protocol_id: input.protocol_id,
        site_id: input.site_id,
        template_name: input.template_name ?? 'Standard Site Startup',
        status: 'not_started',
      })
      .select('id')
      .single();

    if (checklistError || !checklist) {
      return { success: false, error: checklistError?.message ?? 'Failed to create checklist' };
    }

    const steps = DEFAULT_STARTUP_STEPS.map((s) => ({
      checklist_id: checklist.id,
      company_id: companyId,
      step_name: s.step_name,
      step_category: s.step_category,
      sort_order: s.sort_order,
      is_required: true,
      status: 'pending' as StartupStepStatus,
    }));

    const { error: stepsError } = await supabase.from('site_startup_steps').insert(steps);
    if (stepsError) return { success: false, error: stepsError.message };

    revalidatePath('/protected/site-startup');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateStartupStep(
  stepId: string,
  input: {
    status?: StartupStepStatus;
    assigned_to_id?: string | null;
    target_date?: string | null;
    completed_date?: string | null;
    blocker_description?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const payload: Record<string, unknown> = {};
    if (input.status != null) {
      payload.status = input.status;
      if (input.status === 'completed') {
        payload.completed_date = input.completed_date ?? new Date().toISOString().slice(0, 10);
      }
    }
    if (input.assigned_to_id !== undefined) payload.assigned_to_id = input.assigned_to_id;
    if (input.target_date !== undefined) payload.target_date = input.target_date;
    if (input.completed_date !== undefined) payload.completed_date = input.completed_date;
    if (input.blocker_description !== undefined) payload.blocker_description = input.blocker_description;
    if (input.notes !== undefined) payload.notes = input.notes;

    const { data: step } = await supabase
      .from('site_startup_steps')
      .select('checklist_id')
      .eq('id', stepId)
      .single();

    const { error } = await supabase.from('site_startup_steps').update(payload).eq('id', stepId);
    if (error) return { success: false, error: error.message };

    if (step?.checklist_id) {
      await updateChecklistStatus(supabase, step.checklist_id);
    }

    revalidatePath('/protected/site-startup');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function updateChecklistStatus(supabase: Awaited<ReturnType<typeof import('@/lib/server').createClient>>, checklistId: string) {
  const { data: steps } = await supabase
    .from('site_startup_steps')
    .select('status, is_required')
    .eq('checklist_id', checklistId);

  if (!steps) return;

  const required = steps.filter((s) => s.is_required);
  const allCompleted = required.every((s) => s.status === 'completed' || s.status === 'not_applicable');
  const anyInProgress = steps.some((s) => s.status === 'in_progress' || s.status === 'completed');

  let status = 'not_started';
  if (allCompleted) status = 'completed';
  else if (anyInProgress) status = 'in_progress';

  await supabase
    .from('site_startup_checklists')
    .update({
      status,
      ...(status === 'in_progress' ? { started_date: new Date().toISOString().slice(0, 10) } : {}),
      ...(status === 'completed' ? { completed_date: new Date().toISOString().slice(0, 10) } : {}),
    })
    .eq('id', checklistId);
}

export async function getStartupProgress(
  companyId: string,
  protocolId?: string
): Promise<{
  success: boolean;
  data?: { total_sites: number; not_started: number; in_progress: number; completed: number; avg_completion_pct: number };
  error?: string;
}> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('site_startup_checklists')
      .select('id, status, completion_percentage')
      .eq('company_id', companyId);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const rows = data ?? [];
    const total = rows.length;
    const avgPct = total > 0
      ? Math.round(rows.reduce((sum, r) => sum + ((r as any).completion_percentage ?? 0), 0) / total)
      : 0;

    return {
      success: true,
      data: {
        total_sites: total,
        not_started: rows.filter((r) => r.status === 'not_started').length,
        in_progress: rows.filter((r) => r.status === 'in_progress').length,
        completed: rows.filter((r) => r.status === 'completed').length,
        avg_completion_pct: avgPct,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
