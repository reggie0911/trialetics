'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SiteScorecard {
  id: string;
  company_id: string;
  protocol_id: string;
  site_id: string;
  scorecard_date: string;
  enrollment_score: number | null;
  data_quality_score: number | null;
  compliance_score: number | null;
  overall_score: number | null;
  notes: string | null;
  scored_by_id: string | null;
  created_at: string;
  updated_at: string;
  site?: { id: string; site_number: string | null; organization?: { name: string } | null } | null;
}

export async function getSiteScorecards(
  companyId: string,
  protocolId?: string,
  siteId?: string
): Promise<ActionResponse<SiteScorecard[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('site_scorecards')
      .select('*, site:clinical_sites(id, site_number, organization:organizations(name))')
      .eq('company_id', companyId)
      .order('scorecard_date', { ascending: false });

    if (protocolId) query = query.eq('protocol_id', protocolId);
    if (siteId) query = query.eq('site_id', siteId);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SiteScorecard[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createSiteScorecard(input: {
  protocol_id: string;
  site_id: string;
  enrollment_score?: number;
  data_quality_score?: number;
  compliance_score?: number;
  overall_score?: number;
  notes?: string;
}): Promise<ActionResponse<SiteScorecard>> {
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
      .from('site_scorecards')
      .insert({ ...input, company_id: profile.company_id, scored_by_id: profile.id })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: data as SiteScorecard };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSiteRanking(
  companyId: string,
  protocolId: string
): Promise<ActionResponse<{ site_id: string; site_name: string; avg_score: number; count: number }[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('site_scorecards')
      .select('site_id, overall_score, site:clinical_sites(site_number, organization:organizations(name))')
      .eq('company_id', companyId)
      .eq('protocol_id', protocolId)
      .not('overall_score', 'is', null);

    if (error) return { success: false, error: error.message };

    const bysite: Record<string, { scores: number[]; name: string }> = {};
    for (const row of data || []) {
      const s = row as unknown as { site_id: string; overall_score: number; site: { site_number: string; organization: { name: string } } };
      if (!bysite[s.site_id]) {
        bysite[s.site_id] = { scores: [], name: s.site?.organization?.name || s.site?.site_number || s.site_id };
      }
      bysite[s.site_id].scores.push(s.overall_score);
    }

    const ranking = Object.entries(bysite)
      .map(([site_id, { scores, name }]) => ({
        site_id,
        site_name: name,
        avg_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
        count: scores.length,
      }))
      .sort((a, b) => b.avg_score - a.avg_score);

    return { success: true, data: ranking };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
