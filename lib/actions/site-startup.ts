'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  SiteStartupChecklist,
  SiteStartupStep,
  StartupStepStatus,
} from '@/lib/types/site-startup';
import { DEFAULT_STARTUP_STEPS } from '@/lib/types/site-startup';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getStartupChecklists(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<SiteStartupChecklist[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('site_startup_checklists')
      .select('*, site:clinical_sites(id, site_number, organization:organizations(name)), steps:site_startup_steps(*)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SiteStartupChecklist[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createStartupChecklist(input: {
  protocol_id: string;
  site_id: string;
  template_name?: string;
}): Promise<ActionResponse<SiteStartupChecklist>> {
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

    const { data: checklist, error: checklistError } = await supabase
      .from('site_startup_checklists')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        site_id: input.site_id,
        template_name: input.template_name || 'Standard Startup',
      })
      .select()
      .single();

    if (checklistError) return { success: false, error: checklistError.message };

    const steps = DEFAULT_STARTUP_STEPS.map(step => ({
      ...step,
      checklist_id: checklist.id,
      company_id: profile.company_id,
    }));

    await supabase.from('site_startup_steps').insert(steps);

    revalidatePath('/protected/site-startup');
    return { success: true, data: checklist as SiteStartupChecklist };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateStartupStep(
  id: string,
  input: { status?: StartupStepStatus; target_date?: string; completed_date?: string; blocker_description?: string; notes?: string }
): Promise<ActionResponse<SiteStartupStep>> {
  try {
    const supabase = await createClient();
    const updateData: Record<string, unknown> = { ...input };
    if (input.status === 'completed' && !input.completed_date) {
      updateData.completed_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('site_startup_steps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/site-startup');
    return { success: true, data: data as SiteStartupStep };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getStartupProgress(companyId: string, protocolId?: string): Promise<ActionResponse<{
  total_sites: number;
  not_started: number;
  in_progress: number;
  completed: number;
  avg_completion_pct: number;
}>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('site_startup_checklists')
      .select('status, steps:site_startup_steps(status, is_required)')
      .eq('company_id', companyId);

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const checklists = data || [];
    let totalPct = 0;
    for (const cl of checklists) {
      const steps = (cl as unknown as { steps: { status: string; is_required: boolean }[] }).steps || [];
      const required = steps.filter(s => s.is_required);
      const done = required.filter(s => s.status === 'completed' || s.status === 'not_applicable');
      totalPct += required.length > 0 ? (done.length / required.length) * 100 : 0;
    }

    return {
      success: true,
      data: {
        total_sites: checklists.length,
        not_started: checklists.filter(c => c.status === 'not_started').length,
        in_progress: checklists.filter(c => c.status === 'in_progress').length,
        completed: checklists.filter(c => c.status === 'completed').length,
        avg_completion_pct: checklists.length > 0 ? Math.round(totalPct / checklists.length) : 0,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteStartupChecklist(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('site_startup_checklists').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/site-startup');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
