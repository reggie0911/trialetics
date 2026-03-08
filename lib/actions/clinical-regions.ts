'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ClinicalRegion,
  ClinicalRegionWithRelations,
  CreateClinicalRegionData,
  UpdateClinicalRegionData,
  ClinicalRegionFilters,
} from '@/lib/types/clinical-trials';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================
// Get Clinical Regions with Filtering and Pagination
// =============================================

export async function getClinicalRegions(
  companyId: string,
  filters: ClinicalRegionFilters = {}
): Promise<ActionResponse<{ regions: ClinicalRegionWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();
    const {
      search,
      protocol_id,
      page = 1,
      pageSize = 25,
    } = filters;

    let query = supabase
      .from('clinical_regions')
      .select(`
        *,
        clinical_protocols (id, protocol_number, title),
        clinical_sites (count)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    // Apply filters
    if (search) {
      query = query.ilike('region_name', `%${search}%`);
    }

    if (protocol_id) {
      query = query.eq('protocol_id', protocol_id);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Order by created date
    query = query.order('created_at', { ascending: false });

    const { data, error, count: total } = await query;

    if (error) {
      console.error('Error fetching clinical regions:', error);
      return { success: false, error: error.message };
    }

    // Transform data
    const regions = (data || []).map((region: any) => ({
      ...region,
      protocol: region.clinical_protocols,
      sites_count: region.clinical_sites?.[0]?.count ?? 0,
      clinical_protocols: undefined,
      clinical_sites: undefined,
    }));

    return {
      success: true,
      data: { regions, total: total || 0 },
    };
  } catch (error) {
    console.error('Error in getClinicalRegions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical regions',
    };
  }
}

// =============================================
// Get All Clinical Regions (for dropdowns)
// =============================================

export async function getAllClinicalRegions(
  companyId: string,
  protocolId?: string
): Promise<ActionResponse<ClinicalRegion[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('clinical_regions')
      .select('*')
      .eq('company_id', companyId);

    if (protocolId) {
      query = query.eq('protocol_id', protocolId);
    }

    const { data, error } = await query.order('region_name', { ascending: true });

    if (error) {
      console.error('Error fetching all clinical regions:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAllClinicalRegions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical regions',
    };
  }
}

// =============================================
// Get Single Clinical Region by ID
// =============================================

export async function getClinicalRegion(
  regionId: string
): Promise<ActionResponse<ClinicalRegionWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clinical_regions')
      .select(`
        *,
        clinical_protocols (id, protocol_number, title, status),
        clinical_sites (
          *,
          organizations (id, name, organization_type),
          contacts (id, first_name, last_name, email)
        )
      `)
      .eq('id', regionId)
      .single();

    if (error) {
      console.error('Error fetching clinical region:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Clinical region not found' };
    }

    // Transform data
    const region: ClinicalRegionWithRelations = {
      ...data,
      protocol: data.clinical_protocols,
      sites: (data.clinical_sites || []).map((site: any) => ({
        ...site,
        organization: site.organizations,
        principal_investigator: site.contacts,
        organizations: undefined,
        contacts: undefined,
      })),
      sites_count: data.clinical_sites?.length || 0,
      clinical_protocols: undefined,
      clinical_sites: undefined,
    };

    return { success: true, data: region };
  } catch (error) {
    console.error('Error in getClinicalRegion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical region',
    };
  }
}

// =============================================
// Create Clinical Region
// =============================================

export async function createClinicalRegion(
  companyId: string,
  data: CreateClinicalRegionData
): Promise<ActionResponse<ClinicalRegion>> {
  try {
    const supabase = await createClient();

    // Verify the protocol exists
    const { data: protocol, error: protocolError } = await supabase
      .from('clinical_protocols')
      .select('id')
      .eq('id', data.protocol_id)
      .eq('company_id', companyId)
      .single();

    if (protocolError || !protocol) {
      return { success: false, error: 'Protocol not found' };
    }

    // Check if region name already exists for this protocol
    const { data: existing } = await supabase
      .from('clinical_regions')
      .select('id')
      .eq('protocol_id', data.protocol_id)
      .eq('region_name', data.region_name)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A region with this name already exists for this protocol',
      };
    }

    const regionData = {
      company_id: companyId,
      ...data,
    };

    const { data: newRegion, error } = await supabase
      .from('clinical_regions')
      .insert(regionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating clinical region:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');
    revalidatePath(`/protected/clinical-trials/protocol/${data.protocol_id}`);

    return { success: true, data: newRegion };
  } catch (error) {
    console.error('Error in createClinicalRegion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create clinical region',
    };
  }
}

// =============================================
// Update Clinical Region
// =============================================

export async function updateClinicalRegion(
  data: UpdateClinicalRegionData
): Promise<ActionResponse<ClinicalRegion>> {
  try {
    const supabase = await createClient();
    const { id, ...updateData } = data;

    const { data: updatedRegion, error } = await supabase
      .from('clinical_regions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating clinical region:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');
    revalidatePath(`/protected/clinical-trials/region/${id}`);
    revalidatePath(`/protected/clinical-trials/protocol/${updatedRegion.protocol_id}`);

    return { success: true, data: updatedRegion };
  } catch (error) {
    console.error('Error in updateClinicalRegion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update clinical region',
    };
  }
}

// =============================================
// Delete Clinical Region
// =============================================

export async function deleteClinicalRegion(
  regionId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    // Get protocol_id before deleting
    const { data: region } = await supabase
      .from('clinical_regions')
      .select('protocol_id')
      .eq('id', regionId)
      .single();

    const { error } = await supabase
      .from('clinical_regions')
      .delete()
      .eq('id', regionId);

    if (error) {
      console.error('Error deleting clinical region:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');
    if (region?.protocol_id) {
      revalidatePath(`/protected/clinical-trials/protocol/${region.protocol_id}`);
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteClinicalRegion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete clinical region',
    };
  }
}
