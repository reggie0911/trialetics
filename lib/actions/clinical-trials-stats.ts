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
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<ClinicalTrialsStats>> {
  try {
    const supabase = await createClient();

    let total_programs: number;
    let total_protocols: number;
    let active_protocols: number;
    let total_regions: number;
    let sites: { status: string }[] = [];
    let total_subjects: number;
    let enrolled_subjects: number;

    if (protocolId) {
      // Scoped to a single protocol
      const { data: protocol } = await supabase
        .from('clinical_protocols')
        .select('program_id, status')
        .eq('id', protocolId)
        .eq('company_id', companyId)
        .single();

      total_programs = protocol?.program_id ? 1 : 0;
      total_protocols = protocol ? 1 : 0;
      active_protocols = protocol?.status === 'in_progress' ? 1 : 0;

      const { count: regionsCount } = await supabase
        .from('clinical_regions')
        .select('*', { count: 'exact', head: true })
        .eq('protocol_id', protocolId);

      total_regions = regionsCount || 0;

      const { data: sitesData } = await supabase
        .from('clinical_sites')
        .select('id, status')
        .eq('protocol_id', protocolId);

      sites = sitesData || [];

      const siteIds = (sites as Array<{ id: string; status: string }>).map((s) => s.id);
      if (siteIds.length === 0) {
        total_subjects = 0;
        enrolled_subjects = 0;
      } else {
        const { count: subjectsCount } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .in('site_id', siteIds);

        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('status')
          .in('site_id', siteIds);

        total_subjects = subjectsCount || 0;
        enrolled_subjects =
          subjectsData?.filter((s: { status: string }) => s.status === 'enrolled').length || 0;
      }
    } else {
      // Company-wide aggregation
      const { count: programsCount } = await supabase
        .from('clinical_programs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      total_programs = programsCount || 0;

      const { count: regionsCount } = await supabase
        .from('clinical_regions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      total_regions = regionsCount || 0;

      const { data: protocolsData } = await supabase
        .from('clinical_protocols')
        .select('status')
        .eq('company_id', companyId);

      total_protocols = protocolsData?.length || 0;
      active_protocols =
        protocolsData?.filter((p: { status: string }) => p.status === 'in_progress').length || 0;

      const { data: sitesData } = await supabase
        .from('clinical_sites')
        .select('status')
        .eq('company_id', companyId);

      sites = sitesData || [];

      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('status')
        .eq('company_id', companyId);

      total_subjects = subjectsCount || 0;
      enrolled_subjects =
        subjectsData?.filter((s: { status: string }) => s.status === 'enrolled').length || 0;
    }

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
      active_protocols,
      total_regions: total_regions || 0,
      total_sites,
      enrolling_sites,
      total_subjects: total_subjects || 0,
      enrolled_subjects: enrolled_subjects || 0,
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
