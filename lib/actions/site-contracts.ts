'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type { SiteContract, SiteContractType, SiteContractStatus } from '@/lib/types/contacts-organizations';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getSiteContracts(
  organizationId: string
): Promise<ActionResponse<SiteContract[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('site_contracts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('effective_date', { ascending: false });

    if (error) {
      console.error('Error fetching site contracts:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error in getSiteContracts:', error);
    return { success: false, error: 'Failed to fetch site contracts' };
  }
}

export async function createSiteContract(
  organizationId: string,
  data: {
    contract_type: SiteContractType;
    contract_amount?: number | null;
    currency_code?: string | null;
    payee_contact_id?: string | null;
    protocol_id?: string | null;
    status?: SiteContractStatus;
    effective_date?: string | null;
    expiry_date?: string | null;
    notes?: string | null;
  }
): Promise<ActionResponse<SiteContract>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: contract, error } = await supabase
      .from('site_contracts')
      .insert({
        organization_id: organizationId,
        contract_type: data.contract_type,
        contract_amount: data.contract_amount ?? null,
        currency_code: data.currency_code ?? 'USD',
        payee_contact_id: data.payee_contact_id ?? null,
        protocol_id: data.protocol_id ?? null,
        status: data.status ?? 'draft',
        effective_date: data.effective_date ?? null,
        expiry_date: data.expiry_date ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating site contract:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/protected/contacts-organizations/${organizationId}`);
    return { success: true, data: contract };
  } catch (error) {
    console.error('Error in createSiteContract:', error);
    return { success: false, error: 'Failed to create site contract' };
  }
}

export async function updateSiteContract(
  contractId: string,
  data: {
    contract_type?: SiteContractType;
    contract_amount?: number | null;
    currency_code?: string | null;
    payee_contact_id?: string | null;
    protocol_id?: string | null;
    status?: SiteContractStatus;
    effective_date?: string | null;
    expiry_date?: string | null;
    notes?: string | null;
  }
): Promise<ActionResponse<SiteContract>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: contract, error } = await supabase
      .from('site_contracts')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .select()
      .single();

    if (error) {
      console.error('Error updating site contract:', error);
      return { success: false, error: error.message };
    }

    if (contract) {
      revalidatePath(`/protected/contacts-organizations/${contract.organization_id}`);
    }
    return { success: true, data: contract };
  } catch (error) {
    console.error('Error in updateSiteContract:', error);
    return { success: false, error: 'Failed to update site contract' };
  }
}

export async function deleteSiteContract(contractId: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: contract } = await supabase
      .from('site_contracts')
      .select('organization_id')
      .eq('id', contractId)
      .single();

    const { error } = await supabase
      .from('site_contracts')
      .delete()
      .eq('id', contractId);

    if (error) {
      console.error('Error deleting site contract:', error);
      return { success: false, error: error.message };
    }

    if (contract?.organization_id) {
      revalidatePath(`/protected/contacts-organizations/${contract.organization_id}`);
    }
    return { success: true, data: null };
  } catch (error) {
    console.error('Error in deleteSiteContract:', error);
    return { success: false, error: 'Failed to delete site contract' };
  }
}
