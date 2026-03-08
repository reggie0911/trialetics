'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ClinicalProtocol,
  ClinicalProtocolWithRelations,
  CreateClinicalProtocolData,
  UpdateClinicalProtocolData,
  ClinicalProtocolFilters,
} from '@/lib/types/clinical-trials';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================
// Get Clinical Protocols for PSDV (lightweight, no nested counts)
// =============================================

export async function getClinicalProtocolsForPsdv(
  companyId: string,
  filters: { search?: string; page?: number; pageSize?: number } = {}
): Promise<ActionResponse<{ protocols: ClinicalProtocolWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();
    const { search, page = 1, pageSize = 25 } = filters;

    let query = supabase
      .from('clinical_protocols')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);

    if (search) {
      query = query.or(`protocol_number.ilike.%${search}%,title.ilike.%${search}%,objective.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching protocols for PSDV:', error);
      return { success: false, error: error.message };
    }

    const protocols = (data || []).map((p: any) => ({
      ...p,
      clinical_programs: undefined,
      clinical_regions: undefined,
      clinical_sites: undefined,
    }));

    return {
      success: true,
      data: { protocols, total: count ?? 0 },
    };
  } catch (error) {
    console.error('Error in getClinicalProtocolsForPsdv:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch protocols',
    };
  }
}

// =============================================
// Get Clinical Protocols with Filtering and Pagination
// =============================================

export async function getClinicalProtocols(
  companyId: string,
  filters: ClinicalProtocolFilters = {}
): Promise<ActionResponse<{ protocols: ClinicalProtocolWithRelations[]; total: number }>> {
  try {
    const supabase = await createClient();
    const {
      search,
      program_id,
      protocol_id,
      phase = 'all',
      status = 'all',
      regions_required = 'all',
      page = 1,
      pageSize = 25,
    } = filters;

    let query = supabase
      .from('clinical_protocols')
      .select(`
        *,
        clinical_programs (id, name),
        clinical_regions (count),
        clinical_sites (count),
        sponsor_organization:organizations!clinical_protocols_sponsor_organization_id_fkey(id, name)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    if (protocol_id) {
      query = query.eq('id', protocol_id);
    }

    // Apply filters
    if (search) {
      query = query.or(`protocol_number.ilike.%${search}%,title.ilike.%${search}%,objective.ilike.%${search}%`);
    }

    if (program_id) {
      query = query.eq('program_id', program_id);
    }

    if (phase && phase !== 'all') {
      query = query.eq('phase', phase);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (regions_required !== 'all') {
      query = query.eq('regions_required', regions_required);
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Order by created date
    query = query.order('created_at', { ascending: false });

    const { data, error, count: total } = await query;

    if (error) {
      console.error('Error fetching clinical protocols:', error);
      return { success: false, error: error.message };
    }

    // Transform data
    const protocols = (data || []).map((protocol: any) => ({
      ...protocol,
      program: protocol.clinical_programs,
      regions_count: protocol.clinical_regions?.[0]?.count || 0,
      sites_count: protocol.clinical_sites?.[0]?.count || 0,
      sponsor_organization: protocol.sponsor_organization || null,
      clinical_programs: undefined,
      clinical_regions: undefined,
      clinical_sites: undefined,
    }));

    return {
      success: true,
      data: { protocols, total: total || 0 },
    };
  } catch (error) {
    console.error('Error in getClinicalProtocols:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical protocols',
    };
  }
}

// =============================================
// Get All Clinical Protocols (for dropdowns)
// =============================================

export async function getAllClinicalProtocols(
  companyId: string,
  programId?: string,
  options?: { regionsRequiredOnly?: boolean }
): Promise<ActionResponse<ClinicalProtocol[]>> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('clinical_protocols')
      .select('*')
      .eq('company_id', companyId);

    if (programId) {
      query = query.eq('program_id', programId);
    }

    if (options?.regionsRequiredOnly) {
      query = query.eq('regions_required', true);
    }

    const { data, error } = await query.order('protocol_number', { ascending: true });

    if (error) {
      console.error('Error fetching all clinical protocols:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getAllClinicalProtocols:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical protocols',
    };
  }
}

// =============================================
// Get Single Clinical Protocol by ID
// =============================================

export async function getClinicalProtocol(
  protocolId: string
): Promise<ActionResponse<ClinicalProtocolWithRelations>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('clinical_protocols')
      .select(`
        *,
        clinical_programs (id, name, status),
        clinical_regions (*),
        clinical_sites (
          *,
          organizations!clinical_sites_organization_id_fkey (id, name, organization_type),
          contacts (id, first_name, last_name, email)
        )
      `)
      .eq('id', protocolId)
      .single();

    if (error) {
      console.error('Error fetching clinical protocol:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Clinical protocol not found' };
    }

    // Transform data
    const protocol: ClinicalProtocolWithRelations = {
      ...data,
      program: data.clinical_programs,
      regions: data.clinical_regions || [],
      sites: (data.clinical_sites || []).map((site: any) => ({
        ...site,
        organization: site.organizations,
        principal_investigator: site.contacts,
        organizations: undefined,
        contacts: undefined,
      })),
      regions_count: data.clinical_regions?.length || 0,
      sites_count: data.clinical_sites?.length || 0,
      clinical_programs: undefined,
      clinical_regions: undefined,
      clinical_sites: undefined,
    };

    return { success: true, data: protocol };
  } catch (error) {
    console.error('Error in getClinicalProtocol:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch clinical protocol',
    };
  }
}

// =============================================
// Create Clinical Protocol
// =============================================

export async function createClinicalProtocol(
  companyId: string,
  profileId: string,
  email: string,
  data: CreateClinicalProtocolData
): Promise<ActionResponse<ClinicalProtocol>> {
  try {
    const supabase = await createClient();

    // Check if protocol number already exists for this company
    const { data: existing } = await supabase
      .from('clinical_protocols')
      .select('id')
      .eq('company_id', companyId)
      .eq('protocol_number', data.protocol_number)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A protocol with this number already exists in your company',
      };
    }

    const protocolData = {
      company_id: companyId,
      created_by_id: profileId,
      creator_email: email,
      ...data,
    };

    const { data: newProtocol, error } = await supabase
      .from('clinical_protocols')
      .insert(protocolData)
      .select()
      .single();

    if (error) {
      console.error('Error creating clinical protocol:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');

    return { success: true, data: newProtocol };
  } catch (error) {
    console.error('Error in createClinicalProtocol:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create clinical protocol',
    };
  }
}

// =============================================
// Update Clinical Protocol
// =============================================

// Whitelist of updateable clinical_protocols columns (excludes id, company_id, created_*, etc.)
const PROTOCOL_UPDATE_COLUMNS = [
  'protocol_number', 'title', 'program_id', 'phase', 'status', 'design', 'type',
  'sponsor', 'sponsor_organization_id', 'regions_required', 'objective',
  'planned_start_date', 'planned_end_date', 'planned_sites_count', 'planned_subjects_count',
  'test_article', 'therapeutic_group',
] as const;

export async function updateClinicalProtocol(
  data: UpdateClinicalProtocolData
): Promise<ActionResponse<ClinicalProtocol>> {
  try {
    const supabase = await createClient();
    const { id, ...rest } = data;

    // Build sanitized payload: only known columns, empty strings -> null for optional fields
    const updateData: Record<string, unknown> = {};
    for (const key of PROTOCOL_UPDATE_COLUMNS) {
      const val = rest[key as keyof typeof rest];
      if (val === undefined) continue;
      if (typeof val === 'string' && val.trim() === '' && key !== 'protocol_number' && key !== 'title') {
        updateData[key] = null;
      } else if (key === 'program_id' || key === 'sponsor_organization_id') {
        updateData[key] = typeof val === 'string' && val.trim() ? val : null;
      } else if (key === 'planned_start_date' || key === 'planned_end_date') {
        updateData[key] = typeof val === 'string' && val.trim() ? val : null;
      } else {
        updateData[key] = val;
      }
    }

    const { data: updatedProtocol, error } = await supabase
      .from('clinical_protocols')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating clinical protocol:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');
    revalidatePath(`/protected/clinical-trials/protocol/${id}`);

    return { success: true, data: updatedProtocol };
  } catch (error) {
    console.error('Error in updateClinicalProtocol:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update clinical protocol',
    };
  }
}

// =============================================
// Delete Clinical Protocol
// =============================================

export async function deleteClinicalProtocol(
  protocolId: string
): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('clinical_protocols')
      .delete()
      .eq('id', protocolId);

    if (error) {
      console.error('Error deleting clinical protocol:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/protected/clinical-trials');

    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteClinicalProtocol:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete clinical protocol',
    };
  }
}
