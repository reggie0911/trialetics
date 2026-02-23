'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  EnrollmentTarget,
  EnrollmentProjection,
  EnrollmentScenario,
  EnrollmentActual,
} from '@/lib/types/enrollment-forecasting';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getProtocolsForSelect(companyId: string): Promise<ActionResponse<{ id: string; protocol_number: string; title: string }[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clinical_protocols')
      .select('id, protocol_number, title')
      .eq('company_id', companyId)
      .order('protocol_number');
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as { id: string; protocol_number: string; title: string }[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getEnrollmentTargets(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<EnrollmentTarget[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('enrollment_targets')
      .select(`
        *,
        clinical_protocols(id, protocol_number, title),
        clinical_sites(id, site_number),
        clinical_regions(id, region_name)
      `)
      .eq('company_id', companyId)
      .order('target_date', { ascending: true });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as EnrollmentTarget[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createEnrollmentTarget(input: {
  protocol_id: string;
  target_count: number;
  target_date: string;
  target_type: 'screen' | 'enroll' | 'complete';
  site_id?: string;
  region_id?: string;
  milestone_label?: string;
}): Promise<ActionResponse<EnrollmentTarget>> {
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
      .from('enrollment_targets')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        target_count: input.target_count,
        target_date: input.target_date,
        target_type: input.target_type,
        site_id: input.site_id || null,
        region_id: input.region_id || null,
        milestone_label: input.milestone_label || null,
      })
      .select('*, clinical_protocols(id, protocol_number, title)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/enrollment-forecasting');
    return { success: true, data: data as EnrollmentTarget };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getEnrollmentProjections(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<EnrollmentProjection[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('enrollment_projections')
      .select(`
        *,
        clinical_protocols(id, protocol_number, title),
        profiles(id)
      `)
      .eq('company_id', companyId)
      .order('projection_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as EnrollmentProjection[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createEnrollmentProjection(input: {
  protocol_id: string;
  projection_date: string;
  projection_name?: string;
  method: 'linear' | 'historical' | 'custom';
  assumptions?: Record<string, unknown>;
  site_projections?: Record<string, unknown>;
  total_projected_count?: number;
  total_projected_date?: string;
}): Promise<ActionResponse<EnrollmentProjection>> {
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
      .from('enrollment_projections')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        projection_date: input.projection_date,
        projected_by_id: profile.id,
        projection_name: input.projection_name || null,
        method: input.method,
        assumptions: input.assumptions || {},
        site_projections: input.site_projections || {},
        total_projected_count: input.total_projected_count ?? null,
        total_projected_date: input.total_projected_date || null,
      })
      .select('*, clinical_protocols(id, protocol_number, title)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/enrollment-forecasting');
    return { success: true, data: data as EnrollmentProjection };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getEnrollmentScenarios(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<EnrollmentScenario[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('enrollment_scenarios')
      .select(`
        *,
        clinical_protocols(id, protocol_number, title)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as EnrollmentScenario[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createEnrollmentScenario(input: {
  protocol_id: string;
  scenario_name: string;
  scenario_type: 'optimistic' | 'baseline' | 'pessimistic' | 'custom';
  parameters?: Record<string, unknown>;
  projected_first_enrolled?: string;
  projected_last_enrolled?: string;
  projected_total?: number;
  notes?: string;
}): Promise<ActionResponse<EnrollmentScenario>> {
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
      .from('enrollment_scenarios')
      .insert({
        company_id: profile.company_id,
        protocol_id: input.protocol_id,
        scenario_name: input.scenario_name,
        scenario_type: input.scenario_type,
        parameters: input.parameters || {},
        projected_first_enrolled: input.projected_first_enrolled || null,
        projected_last_enrolled: input.projected_last_enrolled || null,
        projected_total: input.projected_total ?? null,
        notes: input.notes || null,
      })
      .select('*, clinical_protocols(id, protocol_number, title)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/enrollment-forecasting');
    return { success: true, data: data as EnrollmentScenario };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getEnrollmentActuals(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<EnrollmentActual[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('clinical_sites')
      .select('protocol_id, enrolled_subject_count, clinical_protocols(id, protocol_number, title)')
      .eq('company_id', companyId);

    if (protocolId) query = query.eq('protocol_id', protocolId);
    const { data, error } = await query;

    if (error) return { success: false, error: error.message };

    const sites = data || [];
    const byProtocol = new Map<string, { total: number; protocol: { id: string; protocol_number: string; title: string } }>();
    for (const s of sites) {
      const proto = s.clinical_protocols as unknown as { id: string; protocol_number: string; title: string } | null;
      const count = s.enrolled_subject_count ?? 0;
      const existing = byProtocol.get(s.protocol_id);
      if (existing) {
        existing.total += count;
      } else {
        byProtocol.set(s.protocol_id, { total: count, protocol: proto || { id: s.protocol_id, protocol_number: '', title: '' } });
      }
    }

    const result: EnrollmentActual[] = Array.from(byProtocol.entries()).map(([protocol_id, { total, protocol }]) => ({
      protocol_id,
      total_enrolled: total,
      clinical_protocols: protocol,
    }));

    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
