'use server';

import { createClient } from '@/lib/server';
import type { ClinicalTrialsStats } from '@/lib/types/clinical-trials';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================
// Get Clinical Trials Stats
// =============================================

export async function getClinicalTrialsStats(
  companyId: string
): Promise<ActionResponse<ClinicalTrialsStats>> {
  try {
    const supabase = await createClient();

    // Get programs count
    const { count: total_programs } = await supabase
      .from('clinical_programs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Get protocols count and breakdown
    const { data: protocols } = await supabase
      .from('clinical_protocols')
      .select('status, phase')
      .eq('company_id', companyId);

    const total_protocols = protocols?.length || 0;
    const active_protocols = protocols?.filter(p => p.status === 'in_progress').length || 0;

    // Protocols by phase
    const protocols_by_phase: Record<string, number> = {};
    protocols?.forEach(protocol => {
      if (protocol.phase) {
        protocols_by_phase[protocol.phase] = (protocols_by_phase[protocol.phase] || 0) + 1;
      }
    });

    // Protocols by status
    const protocols_by_status: Record<string, number> = {};
    protocols?.forEach(protocol => {
      protocols_by_status[protocol.status] = (protocols_by_status[protocol.status] || 0) + 1;
    });

    // Get regions count
    const { count: total_regions } = await supabase
      .from('clinical_regions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    // Get sites count and breakdown
    const { data: sites } = await supabase
      .from('clinical_sites')
      .select('status')
      .eq('company_id', companyId);

    const total_sites = sites?.length || 0;
    const enrolling_sites = sites?.filter(s => s.status === 'enrolling').length || 0;

    // Sites by status
    const sites_by_status: Record<string, number> = {};
    sites?.forEach(site => {
      sites_by_status[site.status] = (sites_by_status[site.status] || 0) + 1;
    });

    const stats: ClinicalTrialsStats = {
      total_programs: total_programs || 0,
      total_protocols,
      total_regions: total_regions || 0,
      total_sites,
      active_protocols,
      enrolling_sites,
      protocols_by_phase,
      protocols_by_status,
      sites_by_status,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error in getClinicalTrialsStats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical trials stats',
    };
  }
}
