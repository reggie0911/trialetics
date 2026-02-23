'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  Deviation,
  CAPA,
  CAPAEffectivenessReview,
  DeviationCategory,
  CreateDeviationInput,
  UpdateDeviationInput,
  CreateCAPAInput,
  UpdateCAPAInput,
  DeviationFilters,
  DeviationStats,
} from '@/lib/types/deviations';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const DEVIATION_SELECT = `*, detected_by:profiles!deviations_detected_by_id_fkey(id, first_name, last_name), closed_by:profiles!deviations_closed_by_id_fkey(id, first_name, last_name), protocol:clinical_protocols(id, title, protocol_number), category:deviation_categories(id, name, description), site:clinical_sites(id, name), subject:subjects(id, screening_number)`;

export async function getDeviations(
  companyId: string,
  filters?: DeviationFilters
): Promise<ActionResponse<{ items: Deviation[]; total: number }>> {
  try {
    const supabase = await createClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('deviations')
      .select(DEVIATION_SELECT, { count: 'exact' })
      .eq('company_id', companyId);

    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.severity && filters.severity !== 'all') query = query.eq('severity', filters.severity);
    if (filters?.protocol_id) query = query.eq('protocol_id', filters.protocol_id);
    if (filters?.site_id) query = query.eq('site_id', filters.site_id);
    if (filters?.category_id) query = query.eq('category_id', filters.category_id);
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,deviation_number.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return { success: true, data: { items: (data || []) as Deviation[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getDeviation(id: string): Promise<ActionResponse<Deviation>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('deviations')
      .select(DEVIATION_SELECT)
      .eq('id', id)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Deviation };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createDeviation(
  input: CreateDeviationInput
): Promise<ActionResponse<Deviation>> {
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

    const deviationNumber = `DEV-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('deviations')
      .insert({
        ...input,
        company_id: profile.company_id,
        deviation_number: deviationNumber,
        detected_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/deviations');
    return { success: true, data: data as Deviation };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateDeviation(
  id: string,
  input: UpdateDeviationInput
): Promise<ActionResponse<Deviation>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const updateData: Record<string, unknown> = { ...input };
    if (input.status === 'closed') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      updateData.closed_date = new Date().toISOString().split('T')[0];
      updateData.closed_by_id = profile?.id;
    }

    const { data, error } = await supabase
      .from('deviations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/deviations');
    return { success: true, data: data as Deviation };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteDeviation(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('deviations').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/deviations');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getDeviationStats(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<DeviationStats>> {
  try {
    const supabase = await createClient();
    let devQuery = supabase.from('deviations').select('status, severity').eq('company_id', companyId);
    if (protocolId) devQuery = devQuery.eq('protocol_id', protocolId);
    const { data: devData, error: devError } = await devQuery;
    if (devError) return { success: false, error: devError.message };

    let capaQuery = supabase.from('capas').select('status').eq('company_id', companyId);
    const { data: capaData, error: capaError } = await capaQuery;
    if (capaError) return { success: false, error: capaError.message };

    const devs = devData || [];
    const capas = capaData || [];
    const stats: DeviationStats = {
      total: devs.length,
      open: devs.filter(d => d.status === 'open').length,
      investigating: devs.filter(d => d.status === 'investigating').length,
      capa_required: devs.filter(d => d.status === 'capa_required').length,
      capa_in_progress: devs.filter(d => d.status === 'capa_in_progress').length,
      closed: devs.filter(d => d.status === 'closed').length,
      critical: devs.filter(d => d.severity === 'critical' && d.status !== 'closed').length,
      total_capas: capas.length,
      open_capas: capas.filter(c => !['closed', 'verified_effective'].includes(c.status)).length,
    };

    return { success: true, data: stats };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// CAPA actions

export async function getCAPAs(
  companyId: string,
  deviationId?: string
): Promise<ActionResponse<CAPA[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('capas')
      .select(`*, assigned_to:profiles!capas_assigned_to_id_fkey(id, first_name, last_name), deviation:deviations(id, deviation_number, title)`)
      .eq('company_id', companyId);

    if (deviationId) query = query.eq('deviation_id', deviationId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as CAPA[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createCAPA(input: CreateCAPAInput): Promise<ActionResponse<CAPA>> {
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

    const capaNumber = `CAPA-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from('capas')
      .insert({
        ...input,
        company_id: profile.company_id,
        capa_number: capaNumber,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/deviations');
    return { success: true, data: data as CAPA };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateCAPA(id: string, input: UpdateCAPAInput): Promise<ActionResponse<CAPA>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('capas')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/deviations');
    return { success: true, data: data as CAPA };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteCAPA(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('capas').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/deviations');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Effectiveness Reviews

export async function getCAPAReviews(capaId: string): Promise<ActionResponse<CAPAEffectivenessReview[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('capa_effectiveness_reviews')
      .select(`*, reviewer:profiles!capa_effectiveness_reviews_reviewer_id_fkey(id, first_name, last_name)`)
      .eq('capa_id', capaId)
      .order('review_date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as CAPAEffectivenessReview[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createCAPAReview(
  capaId: string,
  input: { review_date: string; is_effective: boolean; findings?: string; follow_up_required?: boolean; follow_up_notes?: string }
): Promise<ActionResponse<CAPAEffectivenessReview>> {
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
      .from('capa_effectiveness_reviews')
      .insert({
        ...input,
        company_id: profile.company_id,
        capa_id: capaId,
        reviewer_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/deviations');
    return { success: true, data: data as CAPAEffectivenessReview };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Categories

export async function getDeviationCategories(companyId: string): Promise<ActionResponse<DeviationCategory[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('deviation_categories')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as DeviationCategory[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createDeviationCategory(
  input: { name: string; description?: string; parent_id?: string }
): Promise<ActionResponse<DeviationCategory>> {
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
      .from('deviation_categories')
      .insert({ ...input, company_id: profile.company_id })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/deviations');
    return { success: true, data: data as DeviationCategory };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
