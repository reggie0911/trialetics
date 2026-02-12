'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  CreateProtocolVersionData,
  UpdateProtocolVersionData,
  ProtocolVersionWithRelations,
  ProtocolVersionFilters,
} from '@/lib/types/clinical-trials';

// =============================================
// Get Protocol Versions
// =============================================

export async function getProtocolVersions(
  companyId: string,
  filters: ProtocolVersionFilters = {}
) {
  const supabase = await createClient();
  const { protocol_id, is_original, page = 1, pageSize = 50 } = filters;

  try {
    let query = supabase
      .from('protocol_versions')
      .select(
        `
        *,
        protocol:protocol_id (
          id,
          protocol_number,
          title
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (protocol_id) {
      query = query.eq('protocol_id', protocol_id);
    }

    if (is_original !== undefined) {
      query = query.eq('is_original', is_original);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching protocol versions:', error);
      return {
        success: false,
        error: 'Failed to fetch protocol versions',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        versions: data || [],
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getProtocolVersions:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Get Single Protocol Version
// =============================================

export async function getProtocolVersion(companyId: string, id: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('protocol_versions')
      .select(
        `
        *,
        protocol:protocol_id (
          id,
          protocol_number,
          title,
          phase,
          status
        )
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      console.error('Error fetching protocol version:', error);
      return {
        success: false,
        error: 'Failed to fetch protocol version',
        data: null,
      };
    }

    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error in getProtocolVersion:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Create Protocol Version
// =============================================

export async function createProtocolVersion(
  companyId: string,
  profileId: string,
  email: string,
  data: CreateProtocolVersionData
) {
  const supabase = await createClient();

  try {
    const { protocol_id, version_number, is_original, amendment_version, approval_date, description, metadata } = data;

    // Check for duplicate version_number for this protocol
    const { data: existing } = await supabase
      .from('protocol_versions')
      .select('id')
      .eq('protocol_id', protocol_id)
      .eq('version_number', version_number)
      .eq('company_id', companyId)
      .single();

    if (existing) {
      return {
        success: false,
        error: 'A version with this number already exists for this protocol',
        data: null,
      };
    }

    const insertData = {
      company_id: companyId,
      protocol_id,
      version_number,
      is_original: is_original || false,
      amendment_version: amendment_version || null,
      approval_date: approval_date || null,
      description: description || null,
      metadata: metadata || {},
      created_by_id: profileId,
      creator_email: email,
    };

    const { data: version, error } = await supabase
      .from('protocol_versions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating protocol version:', error);
      return {
        success: false,
        error: 'Failed to create protocol version',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data: version,
      error: null,
    };
  } catch (error) {
    console.error('Error in createProtocolVersion:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Update Protocol Version
// =============================================

export async function updateProtocolVersion(
  companyId: string,
  updateData: UpdateProtocolVersionData
) {
  const supabase = await createClient();

  try {
    const { id, version_number, is_original, amendment_version, approval_date, description, metadata } = updateData;

    // If updating version_number, check for duplicates
    if (version_number) {
      const { data: current } = await supabase
        .from('protocol_versions')
        .select('protocol_id')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (current) {
        const { data: existing } = await supabase
          .from('protocol_versions')
          .select('id')
          .eq('protocol_id', current.protocol_id)
          .eq('version_number', version_number)
          .eq('company_id', companyId)
          .neq('id', id)
          .single();

        if (existing) {
          return {
            success: false,
            error: 'A version with this number already exists for this protocol',
            data: null,
          };
        }
      }
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (version_number !== undefined) updates.version_number = version_number;
    if (is_original !== undefined) updates.is_original = is_original;
    if (amendment_version !== undefined) updates.amendment_version = amendment_version;
    if (approval_date !== undefined) updates.approval_date = approval_date;
    if (description !== undefined) updates.description = description;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data, error } = await supabase
      .from('protocol_versions')
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating protocol version:', error);
      return {
        success: false,
        error: 'Failed to update protocol version',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error in updateProtocolVersion:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Delete Protocol Version
// =============================================

export async function deleteProtocolVersion(companyId: string, id: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('protocol_versions')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting protocol version:', error);
      return {
        success: false,
        error: 'Failed to delete protocol version',
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error in deleteProtocolVersion:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
