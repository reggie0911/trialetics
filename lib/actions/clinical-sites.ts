'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
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

    let query = supabase
      .from('clinical_sites')
      .select(`
        *,
        clinical_protocols (id, protocol_number, title),
        clinical_regions (id, region_name),
        organizations (id, name, organization_type),
        contacts (id, first_name, last_name, email)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Apply filters
    if (search) {
      query = query.or(`site_number.ilike.%${search}%`);
    }

    if (protocol_id) {
      query = query.eq('protocol_id', protocol_id);
    }

    if (region_id) {
      query = query.eq('region_id', region_id);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Order by created date
    query = query.order('created_at', { ascending: false });

    const { data, error, count: total } = await query;

    if (error) {
      console.error('Error fetching clinical sites:', error);
      return { success: false, error: error.message };
    }

    // Transform data
    const sites = (data || []).map((site: any) => ({
      ...site,
      protocol: site.clinical_protocols,
      region: site.clinical_regions,
      organization: site.organizations,
      principal_investigator: site.contacts,
      clinical_protocols: undefined,
      clinical_regions: undefined,
      organizations: undefined,
      contacts: undefined,
    }));

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
