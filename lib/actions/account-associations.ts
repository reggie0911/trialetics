'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  CreateAccountAssociationData,
  UpdateAccountAssociationData,
  ProtocolAccountWithRelations,
  RegionAccountWithRelations,
  SiteAccountWithRelations,
  AccountAssociationFilters,
} from '@/lib/types/clinical-trials';

// =============================================
// Get Account Associations
// =============================================

export async function getAccountAssociations(
  companyId: string,
  filters: AccountAssociationFilters = {}
) {
  const supabase = await createClient();
  const { entity_type, entity_id, organization_id, account_type, is_central, is_regional, page = 1, pageSize = 50 } = filters;

  try {
    const tableName = entity_type === 'protocol' 
      ? 'protocol_accounts'
      : entity_type === 'region'
      ? 'region_accounts'
      : 'site_accounts';

    const foreignKey = entity_type === 'protocol'
      ? 'protocol_id'
      : entity_type === 'region'
      ? 'region_id'
      : 'site_id';

    let query = supabase
      .from(tableName)
      .select(
        `
        *,
        organization:organization_id (
          id,
          name,
          organization_type
        )
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (entity_id) {
      query = query.eq(foreignKey, entity_id);
    }

    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }

    if (account_type && account_type !== 'all') {
      query = query.eq('account_type', account_type);
    }

    if (is_central !== undefined && entity_type === 'protocol') {
      query = query.eq('is_central', is_central);
    }

    if (is_regional !== undefined && entity_type === 'region') {
      query = query.eq('is_regional', is_regional);
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching account associations:', error);
      return {
        success: false,
        error: 'Failed to fetch account associations',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        accounts: data || [],
        total: count || 0,
        page,
        pageSize,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getAccountAssociations:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Create Account Association
// =============================================

export async function createAccountAssociation(
  companyId: string,
  data: CreateAccountAssociationData
) {
  const supabase = await createClient();

  try {
    const { entity_type, entity_id, organization_id, account_type, is_central, is_regional, start_date, end_date, metadata } = data;

    const tableName = entity_type === 'protocol' 
      ? 'protocol_accounts'
      : entity_type === 'region'
      ? 'region_accounts'
      : 'site_accounts';

    const foreignKey = entity_type === 'protocol'
      ? 'protocol_id'
      : entity_type === 'region'
      ? 'region_id'
      : 'site_id';

    const insertData: Record<string, any> = {
      company_id: companyId,
      [foreignKey]: entity_id,
      organization_id,
      account_type,
      start_date: start_date || null,
      end_date: end_date || null,
      metadata: metadata || {},
    };

    if (entity_type === 'protocol' && is_central !== undefined) {
      insertData.is_central = is_central;
    }

    if (entity_type === 'region' && is_regional !== undefined) {
      insertData.is_regional = is_regional;
    }

    const { data: account, error } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating account association:', error);
      return {
        success: false,
        error: 'Failed to create account association',
        data: null,
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      data: account,
      error: null,
    };
  } catch (error) {
    console.error('Error in createAccountAssociation:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Update Account Association
// =============================================

export async function updateAccountAssociation(
  companyId: string,
  updateData: UpdateAccountAssociationData
) {
  const supabase = await createClient();

  try {
    const { id, entity_type, is_central, is_regional, start_date, end_date, metadata } = updateData;

    const tableName = entity_type === 'protocol' 
      ? 'protocol_accounts'
      : entity_type === 'region'
      ? 'region_accounts'
      : 'site_accounts';

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (is_central !== undefined && entity_type === 'protocol') updates.is_central = is_central;
    if (is_regional !== undefined && entity_type === 'region') updates.is_regional = is_regional;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating account association:', error);
      return {
        success: false,
        error: 'Failed to update account association',
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
    console.error('Error in updateAccountAssociation:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
      data: null,
    };
  }
}

// =============================================
// Delete Account Association
// =============================================

export async function deleteAccountAssociation(
  companyId: string,
  id: string,
  entityType: 'protocol' | 'region' | 'site'
) {
  const supabase = await createClient();

  try {
    const tableName = entityType === 'protocol' 
      ? 'protocol_accounts'
      : entityType === 'region'
      ? 'region_accounts'
      : 'site_accounts';

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Error deleting account association:', error);
      return {
        success: false,
        error: 'Failed to delete account association',
      };
    }

    revalidatePath('/protected/clinical-trials');
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error('Error in deleteAccountAssociation:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
