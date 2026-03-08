'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import { getRegionForCountry } from '@/lib/data/countries';
import type {
  ClinicalSite,
  ClinicalSiteWithRelations,
  CreateClinicalSiteData,
  UpdateClinicalSiteData,
  ClinicalSiteFilters,
} from '@/lib/types/clinical-trials';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================
// Get Clinical Sites with Filtering and Pagination
// =============================================
// Org-first: queries organizations(type='site') as the base so every site org
// appears in the list, then left-joins clinical_sites for CTMS enrollment data.

export async function getClinicalSites(
  companyId: string,
  filters: ClinicalSiteFilters = {}
): Promise<ActionResponse<{ sites: ClinicalSiteWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();
    const {
      search,
      protocol_id,
      region_id,
      status = 'all',
      organization_id,
      page = 1,
      pageSize = 25,
    } = filters;

    const hasCTMSFilter = !!(protocol_id || region_id || (status && status !== 'all'));

    // ---- Step A: base query — site-type organizations (paginated) ----
    let orgQuery = supabase
      .from('organizations')
      .select(
        'id, name, organization_type, status, site_id, email, phone, website, notes, ' +
        'company_id, metadata, created_by_id, creator_email, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .eq('organization_type', 'site')
      .order('name', { ascending: true });

    // Search against org name and site_id
    if (search) orgQuery = orgQuery.or(`name.ilike.%${search}%,site_id.ilike.%${search}%`);
    if (organization_id) orgQuery = orgQuery.eq('id', organization_id);

    const from = (page - 1) * pageSize;
    orgQuery = orgQuery.range(from, from + pageSize - 1);

    const { data: orgs, error: orgError, count: total } = await orgQuery;
    if (orgError) {
      console.error('Error fetching site organizations:', orgError);
      return { success: false, error: orgError.message };
    }
    if (!orgs?.length) {
      return { success: true, data: { sites: [], total: total || 0 } };
    }

    const orgIds = orgs.map((o: any) => o.id);

    // ---- Step B: fetch clinical_sites for those orgs ----
    let csQuery = supabase
      .from('clinical_sites')
      .select(`
        id, site_number, status, protocol_id, region_id, principal_investigator_id,
        enrolled_subject_count, planned_subject_count, organization_id, company_id,
        no_subject_info, last_completed_visit_date, currency_code, exchange_date,
        withholding_amount, withholding_percent, site_initiated_date, site_terminated_date,
        site_qualification_date, irb_approval_date, irb_expiration_date, irb_approval_number,
        irb_institution_name, close_out_date, first_subject_enrolled_date, last_subject_enrolled_date,
        screen_failure_count, completed_subject_count, early_terminated_count,
        sdv_policy, psdv_initial_subjects_count, psdv_subject_auto_select_rate,
        total_subjects_requiring_sdv, use_cdms_auto_select_rule, metadata, created_at, updated_at,
        clinical_protocols (id, protocol_number, title),
        clinical_regions (id, region_name),
        contacts (id, first_name, last_name, email)
      `)
      .eq('company_id', companyId)
      .in('organization_id', orgIds);

    if (protocol_id) csQuery = csQuery.eq('protocol_id', protocol_id);
    if (region_id) csQuery = csQuery.eq('region_id', region_id);
    if (status && status !== 'all') csQuery = csQuery.eq('status', status);

    const { data: clinicalSites, error: csError } = await csQuery;
    if (csError) {
      console.error('Error fetching clinical sites:', csError);
      return { success: false, error: csError.message };
    }

    // Group clinical_sites by organization_id
    const cssByOrgId: Record<string, any[]> = {};
    for (const cs of clinicalSites || []) {
      if (!cssByOrgId[cs.organization_id]) cssByOrgId[cs.organization_id] = [];
      cssByOrgId[cs.organization_id].push(cs);
    }

    // ---- Step C: fetch addresses for country_region derivation ----
    const orgIdToCountry: Record<string, string> = {};
    const { data: addrData } = await supabase
      .from('addresses')
      .select('entity_id, country, is_primary, address_type')
      .eq('entity_type', 'organization')
      .in('entity_id', orgIds);
    const primaryAddrs = (addrData || []).filter(
      (a: { is_primary?: boolean; address_type?: string }) => a.is_primary || a.address_type === 'primary'
    );
    const otherAddrs = (addrData || []).filter(
      (a: { is_primary?: boolean; address_type?: string }) => !a.is_primary && a.address_type !== 'primary'
    );
    [...primaryAddrs, ...otherAddrs].forEach((addr: { entity_id: string; country: string | null }) => {
      if (addr.country && !orgIdToCountry[addr.entity_id]) {
        orgIdToCountry[addr.entity_id] = addr.country;
      }
    });

    // ---- Step D: flatten — one row per (org × clinical_site) or org-only row ----
    const sites: ClinicalSiteWithRelations[] = [];
    for (const org of orgs as any[]) {
      const orgCSs = cssByOrgId[org.id] || [];
      const orgCountry = orgIdToCountry[org.id] || null;
      const countryRegion = orgCountry ? (getRegionForCountry(orgCountry) ?? null) : null;

      if (orgCSs.length === 0) {
        // Org-only row: visible in the tab but not yet assigned to a protocol.
        // Skip when any CTMS filter is active (those filters target clinical_sites fields).
        if (hasCTMSFilter) continue;

        sites.push({
          id: org.id,
          company_id: org.company_id,
          protocol_id: null as any,
          region_id: null,
          organization_id: org.id,
          principal_investigator_id: null,
          site_number: null,
          status: null as any,
          no_subject_info: false,
          last_completed_visit_date: null,
          currency_code: 'USD',
          exchange_date: null,
          withholding_amount: null,
          withholding_percent: null,
          site_initiated_date: null,
          site_terminated_date: null,
          site_qualification_date: null,
          irb_approval_date: null,
          irb_expiration_date: null,
          irb_approval_number: null,
          irb_institution_name: null,
          close_out_date: null,
          first_subject_enrolled_date: null,
          last_subject_enrolled_date: null,
          planned_subject_count: null,
          enrolled_subject_count: 0,
          screen_failure_count: 0,
          completed_subject_count: 0,
          early_terminated_count: 0,
          sdv_policy: 'complete' as any,
          psdv_initial_subjects_count: null,
          psdv_subject_auto_select_rate: null,
          total_subjects_requiring_sdv: null,
          use_cdms_auto_select_rule: false,
          metadata: {},
          created_at: org.created_at,
          updated_at: org.updated_at,
          // Relations
          protocol: undefined,
          region: null,
          organization: org,
          principal_investigator: null,
          country_region: countryRegion,
        } as ClinicalSiteWithRelations);
      } else {
        for (const cs of orgCSs) {
          sites.push({
            ...cs,
            protocol: cs.clinical_protocols || null,
            region: cs.clinical_regions || null,
            organization: org,
            principal_investigator: cs.contacts || null,
            country_region: countryRegion,
            clinical_protocols: undefined,
            clinical_regions: undefined,
            contacts: undefined,
          } as ClinicalSiteWithRelations);
        }
      }
    }

    return {
      success: true,
      data: { sites, total: total || 0 },
    };
  } catch (error) {
    console.error('Error in getClinicalSites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical sites',
    };
  }
}

// =============================================
// Get All Clinical Sites (for dropdowns)
// =============================================

export async function getAllClinicalSites(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<ClinicalSiteWithRelations[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('clinical_sites')
      .select(`
        *,
        organizations (id, name, organization_type)
      `)
      .eq('company_id', companyId);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query.order('site_number', { ascending: true });

    if (error) {
      console.error('Error fetching all clinical sites:', error);
      return { success: false, error: error.message };
    }

    // Transform data to match ClinicalSiteWithRelations
    const sites = (data || []).map((site: any) => ({
      ...site,
      organization: site.organizations || null,
      organizations: undefined,
    }));

    return { success: true, data: sites };
  } catch (error) {
    console.error('Error in getAllClinicalSites:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical sites',
    };
  }
}

// =============================================
// Get Single Clinical Site by ID
// =============================================

export async function getClinicalSite(
  siteId: string
): Promise<ActionResponse<ClinicalSiteWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clinical_sites')
      .select(`
        *,
        clinical_protocols (id, protocol_number, title, status),
        clinical_regions (id, region_name),
        organizations (id, name, organization_type, email, phone, website),
        contacts (id, first_name, last_name, email, phone, title, credentials)
      `)
      .eq('id', siteId)
      .single();

    if (error) {
      console.error('Error fetching clinical site:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Clinical site not found' };
    }

    // Transform data
    const site: ClinicalSiteWithRelations = {
      ...data,
      protocol: data.clinical_protocols,
      region: data.clinical_regions,
      organization: data.organizations,
      principal_investigator: data.contacts,
      clinical_protocols: undefined,
      clinical_regions: undefined,
      organizations: undefined,
      contacts: undefined,
    };

    return { success: true, data: site };
  } catch (error) {
    console.error('Error in getClinicalSite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical site',
    };
  }
}

// =============================================
// Create Clinical Site
// =============================================

export async function createClinicalSite(
  companyId: string,
  data: CreateClinicalSiteData
): Promise<ActionResponse<ClinicalSite>> {
  try {
    const supabase = await createClient();

    if (!data.organization_id) {
      return {
        success: false,
        error: 'Organization is required. Sites must be linked to an organization from Contacts & Organizations.',
      };
    }

    // Verify the protocol exists
    const { data: protocol, error: protocolError } = await supabase
      .from('clinical_protocols')
      .select('id, regions_required')
      .eq('id', data.protocol_id)
      .eq('company_id', companyId)
      .single();

    if (protocolError || !protocol) {
      return { success: false, error: 'Protocol not found' };
    }

    // If protocol requires regions, verify region_id is provided and valid
    if (protocol.regions_required) {
      if (!data.region_id) {
        return {
          success: false,
          error: 'This protocol requires sites to be assigned to a region',
        };
      }

      const { data: region, error: regionError } = await supabase
        .from('clinical_regions')
        .select('id')
        .eq('id', data.region_id)
        .eq('protocol_id', data.protocol_id)
        .single();

      if (regionError || !region) {
        return { success: false, error: 'Region not found or does not belong to this protocol' };
      }
    } else {
      // If protocol doesn't require regions, ensure region_id is null
      if (data.region_id) {
        return {
          success: false,
          error: 'This protocol does not use regions. Sites should be created directly under the protocol.',
        };
      }
    }

    // Check if site number already exists for this protocol (if provided)
    if (data.site_number) {
      const { data: existing } = await supabase
        .from('clinical_sites')
        .select('id')
        .eq('protocol_id', data.protocol_id)
        .eq('site_number', data.site_number)
        .single();

      if (existing) {
        return {
          success: false,
          error: 'A site with this number already exists for this protocol',
        };
      }
    }

    const siteData = {
      company_id: companyId,
      ...data,
    };

    const { data: newSite, error } = await supabase
      .from('clinical_sites')
      .insert(siteData)
      .select()
      .single();

    if (error) {
      console.error('Error creating clinical site:', error);
      return { success: false, error: error.message };
    }

    // Ensure organization_protocols has a lightweight site assignment record
    const { data: org } = await supabase
      .from('organizations')
      .select('organization_type')
      .eq('id', data.organization_id)
      .single();
    if (org?.organization_type === 'site') {
      await supabase
        .from('organization_protocols')
        .upsert(
          {
            organization_id: data.organization_id,
            protocol_id: data.protocol_id,
            role: 'site',
            region_id: data.region_id || null,
            status: 'active',
          },
          { onConflict: 'organization_id,protocol_id,role' }
        );
    }

    revalidatePath('/protected/contacts-organizations');
    revalidatePath('/protected/clinical-trials');
    revalidatePath(`/protected/clinical-trials/protocol/${data.protocol_id}`);
    if (data.region_id) {
      revalidatePath(`/protected/clinical-trials/region/${data.region_id}`);
    }

    return { success: true, data: newSite };
  } catch (error) {
    console.error('Error in createClinicalSite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create clinical site',
    };
  }
}

// =============================================
// Update Clinical Site
// =============================================

export async function updateClinicalSite(
  data: UpdateClinicalSiteData
): Promise<ActionResponse<ClinicalSite>> {
  try {
    const supabase = await createClient();
    const { id, ...updateData } = data;

    const { data: updatedSite, error } = await supabase
      .from('clinical_sites')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating clinical site:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');
    revalidatePath('/protected/source-data-verification');
    revalidatePath(`/protected/clinical-trials/site/${id}`);
    revalidatePath(`/protected/clinical-trials/protocol/${updatedSite.protocol_id}`);
    if (updatedSite.region_id) {
      revalidatePath(`/protected/clinical-trials/region/${updatedSite.region_id}`);
    }

    return { success: true, data: updatedSite };
  } catch (error) {
    console.error('Error in updateClinicalSite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update clinical site',
    };
  }
}

// =============================================
// Delete Clinical Site
// =============================================

export async function deleteClinicalSite(
  siteId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    // Get protocol_id and region_id before deleting
    const { data: site } = await supabase
      .from('clinical_sites')
      .select('protocol_id, region_id')
      .eq('id', siteId)
      .single();

    const { error } = await supabase
      .from('clinical_sites')
      .delete()
      .eq('id', siteId);

    if (error) {
      console.error('Error deleting clinical site:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');
    if (site?.protocol_id) {
      revalidatePath(`/protected/clinical-trials/protocol/${site.protocol_id}`);
    }
    if (site?.region_id) {
      revalidatePath(`/protected/clinical-trials/region/${site.region_id}`);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteClinicalSite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete clinical site',
    };
  }
}
