'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type {
  EnrollmentTarget,
  EnrollmentProjection,
  EnrollmentScenario,
  EnrollmentActual,
  EnrollmentTargetType,
  EnrollmentProjectionMethod,
  EnrollmentScenarioType,
} from '@/lib/types/enrollment-forecasting';

async function getProfile(): Promise<{ id: string; company_id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
  return data ?? null;
}

export async function getProtocolsForSelect(
  companyId: string
): Promise<{ success: boolean; data?: { id: string; protocol_number: string; title: string }[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('studies')
      .select('id, protocol_number, title')
      .eq('company_id', companyId)
      .order('title', { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as { id: string; protocol_number: string; title: string }[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getEnrollmentTargets(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: EnrollmentTarget[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('enrollment_targets')
      .select('id, company_id, protocol_id, site_id, region_id, target_count, target_date, target_type, milestone_label, created_at, updated_at, clinical_protocols:studies(id, protocol_number, title)')
      .eq('company_id', companyId)
      .order('target_date', { ascending: true });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as EnrollmentTarget[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createEnrollmentTarget(
  input: {
    protocol_id: string;
    target_count: number;
    target_date: string;
    target_type: EnrollmentTargetType;
    site_id?: string;
    region_id?: string;
    milestone_label?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('enrollment_targets').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id,
      target_count: input.target_count,
      target_date: input.target_date,
      target_type: input.target_type,
      site_id: input.site_id ?? null,
      region_id: input.region_id ?? null,
      milestone_label: input.milestone_label ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/enrollment-forecasting');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getEnrollmentProjections(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: EnrollmentProjection[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('enrollment_projections')
      .select('id, company_id, protocol_id, projection_date, projected_by_id, projection_name, method, assumptions, site_projections, total_projected_count, total_projected_date, created_at, updated_at, clinical_protocols:studies(id, protocol_number, title)')
      .eq('company_id', companyId)
      .order('projection_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as EnrollmentProjection[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createEnrollmentProjection(
  input: {
    protocol_id: string;
    method: EnrollmentProjectionMethod;
    projection_date?: string;
    projection_name?: string;
    total_projected_count?: number;
    total_projected_date?: string;
    assumptions?: Record<string, unknown>;
    site_projections?: Record<string, unknown>;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('enrollment_projections').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id,
      projection_date: input.projection_date ?? new Date().toISOString().slice(0, 10),
      projected_by_id: profile.id,
      method: input.method,
      projection_name: input.projection_name ?? null,
      total_projected_count: input.total_projected_count ?? null,
      total_projected_date: input.total_projected_date ?? null,
      assumptions: input.assumptions ?? {},
      site_projections: input.site_projections ?? {},
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/enrollment-forecasting');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getEnrollmentScenarios(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: EnrollmentScenario[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('enrollment_scenarios')
      .select('id, company_id, protocol_id, scenario_name, scenario_type, parameters, projected_first_enrolled, projected_last_enrolled, projected_total, notes, created_at, updated_at, clinical_protocols:studies(id, protocol_number, title)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as EnrollmentScenario[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createEnrollmentScenario(
  input: {
    protocol_id: string;
    scenario_name: string;
    scenario_type: EnrollmentScenarioType;
    parameters?: Record<string, unknown>;
    projected_first_enrolled?: string;
    projected_last_enrolled?: string;
    projected_total?: number;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('enrollment_scenarios').insert({
      company_id: profile.company_id,
      protocol_id: input.protocol_id,
      scenario_name: input.scenario_name,
      scenario_type: input.scenario_type,
      parameters: input.parameters ?? {},
      projected_first_enrolled: input.projected_first_enrolled ?? null,
      projected_last_enrolled: input.projected_last_enrolled ?? null,
      projected_total: input.projected_total ?? null,
      notes: input.notes ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/enrollment-forecasting');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getEnrollmentActuals(
  companyId: string,
  protocolId?: string
): Promise<{ success: boolean; data?: EnrollmentActual[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('subjects')
      .select('protocol_id, studies:studies(id, protocol_number, title)')
      .eq('company_id', companyId)
      .not('enrolled_date', 'is', null);

    if (protocolId) query = query.eq('protocol_id', protocolId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };

    const grouped = (data ?? []).reduce<Record<string, { protocol_id: string; total_enrolled: number; clinical_protocols?: { id: string; protocol_number: string; title: string } | null }>>((acc, r) => {
      const pid = r.protocol_id as string;
      if (!acc[pid]) {
        acc[pid] = { protocol_id: pid, total_enrolled: 0, clinical_protocols: (r.studies as unknown as { id: string; protocol_number: string; title: string }) ?? null };
      }
      acc[pid].total_enrolled++;
      return acc;
    }, {});

    return { success: true, data: Object.values(grouped) as unknown as EnrollmentActual[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
