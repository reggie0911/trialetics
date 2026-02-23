'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  TMFZone,
  TMFSection,
  TMFArtifact,
  TMFArtifactFile,
  TMFCompletenessCheck,
} from '@/lib/types/etmf';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================
// getProtocolsForETMF - lightweight protocol list for selector
// =============================================
export async function getProtocolsForETMF(
  companyId: string
): Promise<ActionResponse<{ id: string; protocol_number: string | null; title: string }[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clinical_protocols')
      .select('id, protocol_number, title')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as { id: string; protocol_number: string | null; title: string }[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// =============================================
// getTMFStructure - zones with nested sections
// =============================================
export async function getTMFStructure(
  companyId: string
): Promise<ActionResponse<TMFZone[]>> {
  try {
    const supabase = await createClient();

    const { data: zones, error: zonesError } = await supabase
      .from('tmf_zones')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (zonesError) return { success: false, error: zonesError.message };

    const { data: sections, error: sectionsError } = await supabase
      .from('tmf_sections')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (sectionsError) return { success: false, error: sectionsError.message };

    const sectionsByZone = (sections || []).reduce<Record<string, TMFSection[]>>(
      (acc, s) => {
        const list = acc[s.zone_id] || [];
        list.push(s as TMFSection);
        acc[s.zone_id] = list;
        return acc;
      },
      {}
    );

    const result: TMFZone[] = (zones || []).map((z) => ({
      ...z,
      sections: sectionsByZone[z.id] || [],
    })) as TMFZone[];

    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// =============================================
// getArtifactsByZone - artifacts with files, filter by zone
// =============================================
export async function getArtifactsByZone(
  companyId: string,
  protocolId: string,
  zoneId?: string
): Promise<ActionResponse<TMFArtifact[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('tmf_artifacts')
      .select(
        `
        *,
        files:tmf_artifact_files(*)
      `
      )
      .eq('company_id', companyId)
      .eq('protocol_id', protocolId)
      .order('sort_order', { ascending: true });

    if (zoneId) {
      const { data: sectionIds } = await supabase
        .from('tmf_sections')
        .select('id')
        .eq('zone_id', zoneId);
      const ids = (sectionIds || []).map((s) => s.id);
      if (ids.length > 0) {
        query = query.in('section_id', ids);
      } else {
        return { success: true, data: [] };
      }
    }

    const { data, error } = await query;

    if (error) return { success: false, error: error.message };

    const artifacts = (data || []).map((a: Record<string, unknown>) => ({
      ...a,
      files: a.files || [],
    })) as TMFArtifact[];

    return { success: true, data: artifacts };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// =============================================
// createArtifact - insert with company_id from profile
// =============================================
export async function createArtifact(input: {
  section_id: string;
  protocol_id: string;
  name: string;
  is_required?: boolean;
  responsible_role?: string;
  target_date?: string;
}): Promise<ActionResponse<TMFArtifact>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'No company profile' };

    const { data, error } = await supabase
      .from('tmf_artifacts')
      .insert({
        section_id: input.section_id,
        protocol_id: input.protocol_id,
        company_id: profile.company_id,
        name: input.name,
        is_required: input.is_required ?? true,
        responsible_role: input.responsible_role ?? null,
        target_date: input.target_date ?? null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/etmf');
    return { success: true, data: data as TMFArtifact };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// =============================================
// updateArtifact - update status, completion_date, etc.
// =============================================
export async function updateArtifact(
  id: string,
  input: {
    status?: 'not_started' | 'in_progress' | 'complete' | 'not_applicable';
    completion_date?: string | null;
    responsible_role?: string | null;
    target_date?: string | null;
  }
): Promise<ActionResponse<TMFArtifact>> {
  try {
    const supabase = await createClient();

    const updates: Record<string, unknown> = {};
    if (input.status !== undefined) updates.status = input.status;
    if (input.completion_date !== undefined) updates.completion_date = input.completion_date;
    if (input.responsible_role !== undefined) updates.responsible_role = input.responsible_role;
    if (input.target_date !== undefined) updates.target_date = input.target_date;

    const { data, error } = await supabase
      .from('tmf_artifacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/etmf');
    return { success: true, data: data as TMFArtifact };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// =============================================
// getTMFCompleteness - calculate completeness % from artifacts
// =============================================
export async function getTMFCompleteness(
  companyId: string,
  protocolId: string
): Promise<
  ActionResponse<{
    total: number;
    completed: number;
    not_applicable: number;
    percentage: number;
    zone_breakdown: Record<string, { total: number; complete: number; pct: number }>;
  }>
> {
  try {
    const supabase = await createClient();

    const { data: artifacts, error } = await supabase
      .from('tmf_artifacts')
      .select('id, section_id, status')
      .eq('company_id', companyId)
      .eq('protocol_id', protocolId);

    if (error) return { success: false, error: error.message };

    const list = artifacts || [];
    const total = list.length;
    const completed = list.filter((a) => a.status === 'complete').length;
    const not_applicable = list.filter((a) => a.status === 'not_applicable').length;
    const applicable = total - not_applicable;
    const percentage =
      total === 0 ? 0 : applicable === 0 ? 100 : (completed / applicable) * 100;

    const sectionIds = [...new Set(list.map((a) => a.section_id))];
    const { data: sections } = await supabase
      .from('tmf_sections')
      .select('id, zone_id')
      .in('id', sectionIds);

    const sectionToZone = (sections || []).reduce<Record<string, string>>(
      (acc, s) => {
        acc[s.id] = s.zone_id;
        return acc;
      },
      {}
    );

    const zoneStats: Record<string, { total: number; complete: number }> = {};
    for (const a of list) {
      const zid = sectionToZone[a.section_id] || 'unknown';
      if (!zoneStats[zid]) zoneStats[zid] = { total: 0, complete: 0 };
      zoneStats[zid].total += 1;
      if (a.status === 'complete') zoneStats[zid].complete += 1;
    }

    const zone_breakdown: Record<string, { total: number; complete: number; pct: number }> =
      {};
    for (const [zid, stats] of Object.entries(zoneStats)) {
      zone_breakdown[zid] = {
        total: stats.total,
        complete: stats.complete,
        pct: stats.total === 0 ? 0 : (stats.complete / stats.total) * 100,
      };
    }

    return {
      success: true,
      data: {
        total,
        completed,
        not_applicable,
        percentage: Math.round(percentage * 100) / 100,
        zone_breakdown,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// =============================================
// runCompletenessCheck - create a completeness check record
// =============================================
export async function runCompletenessCheck(
  protocolId: string
): Promise<ActionResponse<TMFCompletenessCheck>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'No company profile' };

    const completeness = await getTMFCompleteness(profile.company_id, protocolId);
    if (!completeness.success || !completeness.data)
      return { success: false, error: completeness.error || 'Failed to calculate completeness' };

    const { total, completed, not_applicable, percentage, zone_breakdown } =
      completeness.data;

    const { data, error } = await supabase
      .from('tmf_completeness_checks')
      .insert({
        company_id: profile.company_id,
        protocol_id: protocolId,
        checked_by_id: profile.id,
        total_artifacts: total,
        completed_artifacts: completed,
        not_applicable_artifacts: not_applicable,
        completeness_percentage: percentage,
        zone_breakdown,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath('/protected/etmf');
    return { success: true, data: data as TMFCompletenessCheck };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
