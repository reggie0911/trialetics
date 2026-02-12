'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ProtocolPsdvData,
  RegionPsdvData,
  SitePsdvData,
  CrfTracking,
  CrfTrackingWithRelations,
  UpdateCrfTrackingData,
} from '@/lib/types/clinical-trials';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PsdvStats {
  protocolsWithPsdv: number;
  sitesWithPartialSdv: number;
  subjectsRequiringSdv: number;
  crfsPendingVerification: number;
}

// =============================================
// PSDV Stats
// =============================================

export interface PsdvChartData {
  overviewPie: Array<{ name: string; value: number; fill: string }>;
  sdvPolicyBySite: Array<{ policy: string; count: number }>;
  crfVerificationStatus: Array<{ status: string; count: number; fill: string }>;
}

export async function getPsdvChartData(
  companyId: string
): Promise<ActionResponse<PsdvChartData>> {
  const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  try {
    const supabase = await createClient();

    const [protocolsRes, sitesRes, subjectsRes, sdvPolicyRes] = await Promise.all([
      supabase
        .from('clinical_protocols')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .not('psdv_initial_subjects_count', 'is', null),
      supabase
        .from('clinical_sites')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('sdv_policy', 'partial'),
      supabase
        .from('subjects')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('sdv_required', true),
      supabase
        .from('clinical_sites')
        .select('sdv_policy')
        .eq('company_id', companyId),
    ]);

    let crfsPendingVerification = 0;
    try {
      const crfRes = await supabase
        .from('crf_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('source_verified', false);
      crfsPendingVerification = crfRes.error ? 0 : (crfRes.count ?? 0);
    } catch {
      // crf_tracking may not exist if migrations not applied
    }

    const protocolsWithPsdv = protocolsRes.count ?? 0;
    const sitesWithPartialSdv = sitesRes.count ?? 0;
    const subjectsRequiringSdv = subjectsRes.count ?? 0;

    const overviewPie: PsdvChartData['overviewPie'] = [];
    if (protocolsWithPsdv > 0) overviewPie.push({ name: 'Protocols with PSDV', value: protocolsWithPsdv, fill: CHART_COLORS[0] });
    if (sitesWithPartialSdv > 0) overviewPie.push({ name: 'Sites with Partial SDV', value: sitesWithPartialSdv, fill: CHART_COLORS[1] });
    if (subjectsRequiringSdv > 0) overviewPie.push({ name: 'Subjects Requiring SDV', value: subjectsRequiringSdv, fill: CHART_COLORS[2] });
    if (crfsPendingVerification > 0) overviewPie.push({ name: 'CRFs Pending Verification', value: crfsPendingVerification, fill: CHART_COLORS[3] });

    const policyCounts: Record<string, number> = { complete: 0, partial: 0, external: 0 };
    (sdvPolicyRes.data || []).forEach((s: { sdv_policy: string | null }) => {
      const p = s.sdv_policy ?? 'complete';
      policyCounts[p] = (policyCounts[p] ?? 0) + 1;
    });
    const sdvPolicyBySite: PsdvChartData['sdvPolicyBySite'] = [
      { policy: 'Complete', count: policyCounts.complete ?? 0 },
      { policy: 'Partial', count: policyCounts.partial ?? 0 },
      { policy: 'External', count: policyCounts.external ?? 0 },
    ];

    let crfVerified = 0;
    try {
      const verifiedRes = await supabase
        .from('crf_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('source_verified', true);
      crfVerified = verifiedRes.error ? 0 : (verifiedRes.count ?? 0);
    } catch {
      // crf_tracking may not exist
    }
    const crfVerificationStatus: PsdvChartData['crfVerificationStatus'] = [
      { status: 'Verified', count: crfVerified ?? 0, fill: CHART_COLORS[4] },
      { status: 'Pending', count: crfsPendingVerification, fill: CHART_COLORS[5] },
    ];

    return {
      success: true,
      data: {
        overviewPie,
        sdvPolicyBySite,
        crfVerificationStatus,
      },
    };
  } catch (error) {
    console.error('Error in getPsdvChartData:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch PSDV chart data',
    };
  }
}

export async function getPsdvStats(
  companyId: string
): Promise<ActionResponse<PsdvStats>> {
  try {
    const supabase = await createClient();

    const [protocolsRes, sitesRes, subjectsRes] = await Promise.all([
      supabase
        .from('clinical_protocols')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .not('psdv_initial_subjects_count', 'is', null),
      supabase
        .from('clinical_sites')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('sdv_policy', 'partial'),
      supabase
        .from('subjects')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('sdv_required', true),
    ]);

    let crfsPendingVerification = 0;
    try {
      const crfRes = await supabase
        .from('crf_tracking')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('source_verified', false);
      crfsPendingVerification = crfRes.error ? 0 : (crfRes.count ?? 0);
    } catch {
      // crf_tracking may not exist if migrations not applied
    }

    return {
      success: true,
      data: {
        protocolsWithPsdv: protocolsRes.count ?? 0,
        sitesWithPartialSdv: sitesRes.count ?? 0,
        subjectsRequiringSdv: subjectsRes.count ?? 0,
        crfsPendingVerification,
      },
    };
  } catch (error) {
    console.error('Error in getPsdvStats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch PSDV stats',
    };
  }
}

// =============================================
// Protocol PSDV
// =============================================

export async function getProtocolPsdvSettings(
  protocolId: string
): Promise<ActionResponse<ProtocolPsdvData>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clinical_protocols')
      .select('psdv_initial_subjects_count, psdv_subject_auto_select_rate')
      .eq('id', protocolId)
      .single();

    if (error) {
      console.error('Error fetching protocol PSDV:', error);
      return { success: false, error: error.message };
    }
    if (!data) return { success: false, error: 'Protocol not found' };

    return {
      success: true,
      data: {
        psdv_initial_subjects_count: data.psdv_initial_subjects_count,
        psdv_subject_auto_select_rate: data.psdv_subject_auto_select_rate,
      },
    };
  } catch (error) {
    console.error('Error in getProtocolPsdvSettings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch protocol PSDV',
    };
  }
}

export async function updateProtocolPsdvSettings(
  protocolId: string,
  data: ProtocolPsdvData
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('clinical_protocols')
      .update({
        psdv_initial_subjects_count: data.psdv_initial_subjects_count ?? null,
        psdv_subject_auto_select_rate: data.psdv_subject_auto_select_rate ?? null,
      })
      .eq('id', protocolId);

    if (error) {
      console.error('Error updating protocol PSDV:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/source-data-verification');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in updateProtocolPsdvSettings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update protocol PSDV',
    };
  }
}

// =============================================
// Region PSDV
// =============================================

export async function getRegionPsdvSettings(
  regionId: string
): Promise<ActionResponse<RegionPsdvData>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clinical_regions')
      .select('psdv_initial_subjects_count, psdv_subject_auto_select_rate')
      .eq('id', regionId)
      .single();

    if (error) {
      console.error('Error fetching region PSDV:', error);
      return { success: false, error: error.message };
    }
    if (!data) return { success: false, error: 'Region not found' };

    return {
      success: true,
      data: {
        psdv_initial_subjects_count: data.psdv_initial_subjects_count,
        psdv_subject_auto_select_rate: data.psdv_subject_auto_select_rate,
      },
    };
  } catch (error) {
    console.error('Error in getRegionPsdvSettings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch region PSDV',
    };
  }
}

export async function updateRegionPsdvSettings(
  regionId: string,
  data: RegionPsdvData
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('clinical_regions')
      .update({
        psdv_initial_subjects_count: data.psdv_initial_subjects_count ?? null,
        psdv_subject_auto_select_rate: data.psdv_subject_auto_select_rate ?? null,
      })
      .eq('id', regionId);

    if (error) {
      console.error('Error updating region PSDV:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/source-data-verification');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in updateRegionPsdvSettings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update region PSDV',
    };
  }
}

// =============================================
// Site PSDV
// =============================================

export async function getSitePsdvSettings(
  siteId: string
): Promise<ActionResponse<SitePsdvData & { total_subjects_requiring_sdv: number | null }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clinical_sites')
      .select(
        'sdv_policy, psdv_initial_subjects_count, psdv_subject_auto_select_rate, total_subjects_requiring_sdv, use_cdms_auto_select_rule'
      )
      .eq('id', siteId)
      .single();

    if (error) {
      console.error('Error fetching site PSDV:', error);
      return { success: false, error: error.message };
    }
    if (!data) return { success: false, error: 'Site not found' };

    return {
      success: true,
      data: {
        sdv_policy: data.sdv_policy,
        psdv_initial_subjects_count: data.psdv_initial_subjects_count,
        psdv_subject_auto_select_rate: data.psdv_subject_auto_select_rate,
        total_subjects_requiring_sdv: data.total_subjects_requiring_sdv,
        use_cdms_auto_select_rule: data.use_cdms_auto_select_rule ?? false,
      },
    };
  } catch (error) {
    console.error('Error in getSitePsdvSettings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch site PSDV',
    };
  }
}

export async function updateSitePsdvSettings(
  siteId: string,
  data: SitePsdvData
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {};
    if (data.sdv_policy !== undefined) updatePayload.sdv_policy = data.sdv_policy;
    if (data.psdv_initial_subjects_count !== undefined)
      updatePayload.psdv_initial_subjects_count = data.psdv_initial_subjects_count;
    if (data.psdv_subject_auto_select_rate !== undefined)
      updatePayload.psdv_subject_auto_select_rate = data.psdv_subject_auto_select_rate;
    if (data.use_cdms_auto_select_rule !== undefined)
      updatePayload.use_cdms_auto_select_rule = data.use_cdms_auto_select_rule;

    const { error } = await supabase
      .from('clinical_sites')
      .update(updatePayload)
      .eq('id', siteId);

    if (error) {
      console.error('Error updating site PSDV:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/source-data-verification');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in updateSitePsdvSettings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update site PSDV',
    };
  }
}

export async function reapplySiteAutoSelectRate(
  siteId: string
): Promise<ActionResponse<{ total_subjects_requiring_sdv: number }>> {
  try {
    const supabase = await createClient();

    const { data: site, error: siteError } = await supabase
      .from('clinical_sites')
      .select('sdv_policy, psdv_initial_subjects_count, psdv_subject_auto_select_rate')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return { success: false, error: 'Site not found' };
    }

    if (site.sdv_policy !== 'partial') {
      return { success: false, error: 'Reapply only applies to sites with Partial SDV policy' };
    }

    const initialCount = site.psdv_initial_subjects_count ?? 0;
    const autoSelectRate = site.psdv_subject_auto_select_rate ?? 0;

    const { count: poolCount } = await supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', siteId);

    const poolSize = poolCount ?? 0;
    const remaining = Math.max(0, poolSize - initialCount);
    const additional = Math.floor((remaining * autoSelectRate) / 100);
    const totalRequiringSdv = initialCount + additional;

    const { error: updateError } = await supabase
      .from('clinical_sites')
      .update({ total_subjects_requiring_sdv: totalRequiringSdv })
      .eq('id', siteId);

    if (updateError) {
      console.error('Error updating total_subjects_requiring_sdv:', updateError);
      return { success: false, error: updateError.message };
    }

    revalidatePath('/protected/source-data-verification');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: { total_subjects_requiring_sdv: totalRequiringSdv } };
  } catch (error) {
    console.error('Error in reapplySiteAutoSelectRate:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reapply auto-select rate',
    };
  }
}

// =============================================
// Template Visit PSDV
// =============================================

export async function getTemplateVisitsForPsdv(
  companyId: string
): Promise<ActionResponse<Array<{
  id: string;
  visit_name: string;
  visit_type: string;
  sequence: number;
  sdv_required: boolean;
  page_numbers_to_verify: string | null;
  template_id: string;
  template?: { name: string; version_number: string };
  protocol?: { protocol_number: string; title: string };
}>>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('template_visits')
      .select(
        `
        id,
        visit_name,
        visit_type,
        sequence,
        sdv_required,
        page_numbers_to_verify,
        template_id,
        subject_visit_templates (
          name,
          version_number,
          protocol:protocol_id (protocol_number, title)
        )
      `
      )
      .eq('company_id', companyId)
      .order('template_id')
      .order('sequence', { ascending: true });

    if (error) {
      console.error('Error fetching template visits for PSDV:', error);
      return { success: false, error: error.message };
    }

    const items = (data || []).map((row: any) => {
      const template = Array.isArray(row.subject_visit_templates)
        ? row.subject_visit_templates[0]
        : row.subject_visit_templates;
      const protocol = template?.protocol
        ? (Array.isArray(template.protocol) ? template.protocol[0] : template.protocol)
        : undefined;
      return {
        id: row.id,
        visit_name: row.visit_name,
        visit_type: row.visit_type,
        sequence: row.sequence,
        sdv_required: row.sdv_required ?? false,
        page_numbers_to_verify: row.page_numbers_to_verify,
        template_id: row.template_id,
        template: template ? { name: template.name, version_number: template.version_number } : undefined,
        protocol: protocol ? { protocol_number: protocol.protocol_number, title: protocol.title } : undefined,
      };
    });

    return { success: true, data: items };
  } catch (error) {
    console.error('Error in getTemplateVisitsForPsdv:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch template visits',
    };
  }
}

export async function updateTemplateVisitPsdv(
  companyId: string,
  visitId: string,
  data: { sdv_required?: boolean; page_numbers_to_verify?: string | null }
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('template_visits')
      .update(data)
      .eq('id', visitId)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error updating template visit PSDV:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/source-data-verification');
    revalidatePath('/protected/visit-templates');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in updateTemplateVisitPsdv:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update template visit PSDV',
    };
  }
}

// =============================================
// Subject SDV
// =============================================

export async function getSubjectSdvStatus(
  subjectId: string
): Promise<ActionResponse<{ sdv_required: boolean | null; sdv_last_updated_source: string | null }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('subjects')
      .select('sdv_required, sdv_last_updated_source')
      .eq('id', subjectId)
      .single();

    if (error) {
      console.error('Error fetching subject SDV:', error);
      return { success: false, error: error.message };
    }
    if (!data) return { success: false, error: 'Subject not found' };

    return {
      success: true,
      data: {
        sdv_required: data.sdv_required,
        sdv_last_updated_source: data.sdv_last_updated_source,
      },
    };
  } catch (error) {
    console.error('Error in getSubjectSdvStatus:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch subject SDV',
    };
  }
}

export async function updateSubjectSdvRequired(
  subjectId: string,
  sdvRequired: boolean,
  source: 'manual' | 'site' | 'subject_status' | 'external' = 'manual'
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('subjects')
      .update({
        sdv_required: sdvRequired,
        sdv_last_updated_source: source,
      })
      .eq('id', subjectId);

    if (error) {
      console.error('Error updating subject SDV:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/source-data-verification');
    revalidatePath('/protected/clinical-trials');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in updateSubjectSdvRequired:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update subject SDV',
    };
  }
}

// =============================================
// CRF Tracking
// =============================================

export async function getCrfTrackingForCompany(
  companyId: string,
  filters: { site_visit_id?: string; source_verified?: boolean; page?: number; pageSize?: number } = {}
): Promise<ActionResponse<{ items: CrfTrackingWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;

    let query = supabase
      .from('crf_tracking')
      .select(
        `
        *,
        site_visits (id, visit_name, visit_start, visit_type, organization_id),
        subject_visits (id, visit_name, subject_id, visit_type)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters.site_visit_id) {
      query = query.eq('site_visit_id', filters.site_visit_id);
    }
    if (filters.source_verified !== undefined) {
      query = query.eq('source_verified', filters.source_verified);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error('Error fetching CRF tracking:', error);
      return { success: false, error: error.message };
    }

    const items = (data || []).map((row: any) => ({
      ...row,
      site_visit: row.site_visits,
      subject_visit: row.subject_visits,
      site_visits: undefined,
      subject_visits: undefined,
    }));

    return { success: true, data: { items, total: count ?? 0 } };
  } catch (error) {
    console.error('Error in getCrfTrackingForCompany:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch CRF tracking',
    };
  }
}

export async function getSiteVisitsForCrf(
  companyId: string
): Promise<ActionResponse<Array<{ id: string; visit_name: string; visit_start: string; visit_type: string; organization_id: string }>>> {
  try {
    const supabase = await createClient();

    const { data: orgIds, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('company_id', companyId);

    if (orgError || !orgIds?.length) {
      return { success: true, data: [] };
    }

    const ids = orgIds.map((o) => o.id);
    const { data, error } = await supabase
      .from('site_visits')
      .select('id, visit_name, visit_start, visit_type, organization_id')
      .in('organization_id', ids)
      .order('visit_start', { ascending: false });

    if (error) {
      console.error('Error fetching site visits for CRF:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getSiteVisitsForCrf:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch site visits',
    };
  }
}

export async function getSubjectVisitsAvailableForSiteVisit(
  companyId: string,
  siteVisitId: string
): Promise<ActionResponse<Array<{ id: string; visit_name: string; subject_id: string; visit_type: string; subject?: { subject_number: string; screening_number: string }; template_visit?: { visit_name: string } }>>> {
  try {
    const supabase = await createClient();

    const { data: siteVisit, error: svError } = await supabase
      .from('site_visits')
      .select('organization_id')
      .eq('id', siteVisitId)
      .single();

    if (svError || !siteVisit) {
      return { success: false, error: 'Site visit not found' };
    }

    const { data: siteIds, error: sitesError } = await supabase
      .from('clinical_sites')
      .select('id')
      .eq('organization_id', siteVisit.organization_id)
      .eq('company_id', companyId);

    if (sitesError || !siteIds?.length) {
      return { success: true, data: [] };
    }

    const clinicalSiteIds = siteIds.map((s) => s.id);

    const { data: existing } = await supabase
      .from('crf_tracking')
      .select('subject_visit_id')
      .eq('site_visit_id', siteVisitId);
    const existingIds = new Set((existing || []).map((r) => r.subject_visit_id));

    const { data: visits, error } = await supabase
      .from('subject_visits')
      .select(
        `
        id,
        visit_name,
        subject_id,
        visit_type,
        subject:subjects(id, subject_number, screening_number),
        template_visit:template_visits(id, visit_name)
      `
      )
      .eq('company_id', companyId)
      .in('site_id', clinicalSiteIds)
      .order('visit_name');

    if (error) {
      console.error('Error fetching subject visits:', error);
      return { success: false, error: error.message };
    }

    const filtered = (visits || []).filter((v) => !existingIds.has(v.id));
    const items = filtered.map((row: any) => ({
      id: row.id,
      visit_name: row.visit_name,
      subject_id: row.subject_id,
      visit_type: row.visit_type,
      subject: row.subject ? (Array.isArray(row.subject) ? row.subject[0] : row.subject) : undefined,
      template_visit: row.template_visit ? (Array.isArray(row.template_visit) ? row.template_visit[0] : row.template_visit) : undefined,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error('Error in getSubjectVisitsAvailableForSiteVisit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch subject visits',
    };
  }
}

export async function deleteCrfTracking(id: string, companyId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('crf_tracking')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting CRF tracking:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/source-data-verification');
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteCrfTracking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete CRF tracking',
    };
  }
}

export async function getCrfTrackingForSiteVisit(
  siteVisitId: string
): Promise<ActionResponse<CrfTrackingWithRelations[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('crf_tracking')
      .select(
        `
        *,
        site_visits (id, visit_name, visit_start, visit_type),
        subject_visits (id, visit_name, subject_id, visit_type)
      `
      )
      .eq('site_visit_id', siteVisitId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching CRF tracking:', error);
      return { success: false, error: error.message };
    }

    const items = (data || []).map((row: any) => ({
      ...row,
      site_visit: row.site_visits,
      subject_visit: row.subject_visits,
      site_visits: undefined,
      subject_visits: undefined,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error('Error in getCrfTrackingForSiteVisit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch CRF tracking',
    };
  }
}

async function addCrfTrackingRecords(
  siteVisitId: string,
  subjectVisitIds: string[],
  companyId: string
): Promise<ActionResponse<{ count: number }>> {
  try {
    const supabase = await createClient();
    let inserted = 0;

    for (const subjectVisitId of subjectVisitIds) {
      const { data: sv } = await supabase
        .from('subject_visits')
        .select('company_id, template_visit_id')
        .eq('id', subjectVisitId)
        .single();

      if (!sv) continue;

      const companyIdFromVisit = sv.company_id;
      if (companyIdFromVisit !== companyId) continue;

      let sdvRequired = false;
      let pageNumbersToVerify: string | null = null;

      if (sv.template_visit_id) {
        const { data: tv } = await supabase
          .from('template_visits')
          .select('sdv_required, page_numbers_to_verify')
          .eq('id', sv.template_visit_id)
          .single();
        if (tv) {
          sdvRequired = tv.sdv_required ?? false;
          pageNumbersToVerify = tv.page_numbers_to_verify;
        }
      }

      const { error } = await supabase.from('crf_tracking').insert({
        company_id: companyIdFromVisit,
        site_visit_id: siteVisitId,
        subject_visit_id: subjectVisitId,
        sdv_required: sdvRequired,
        page_numbers_to_verify: pageNumbersToVerify,
      });

      if (!error) inserted++;
    }

    revalidatePath('/protected/source-data-verification');
    return { success: true, data: { count: inserted } };
  } catch (error) {
    console.error('Error in addCrfTrackingRecords:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add CRF tracking',
    };
  }
}

export async function addCrfTrackingScheduled(
  siteVisitId: string,
  subjectVisitIds: string[],
  companyId: string
): Promise<ActionResponse<{ count: number }>> {
  return addCrfTrackingRecords(siteVisitId, subjectVisitIds, companyId);
}

export async function addCrfTrackingUnscheduled(
  siteVisitId: string,
  subjectVisitIds: string[],
  companyId: string
): Promise<ActionResponse<{ count: number }>> {
  return addCrfTrackingRecords(siteVisitId, subjectVisitIds, companyId);
}

export async function updateCrfTracking(
  data: UpdateCrfTrackingData
): Promise<ActionResponse<CrfTracking>> {
  try {
    const supabase = await createClient();
    const { id, ...updates } = data;

    const { data: updated, error } = await supabase
      .from('crf_tracking')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating CRF tracking:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/source-data-verification');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error in updateCrfTracking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update CRF tracking',
    };
  }
}
