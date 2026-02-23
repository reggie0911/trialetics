'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type { VendorProfile, VendorContract, VendorDeliverable, VendorKPI } from '@/lib/types/vendor-management';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Vendor Profiles
export async function getVendorProfiles(companyId: string): Promise<ActionResponse<VendorProfile[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('*, organization:organizations(id, name), primary_contact:contacts(id, first_name, last_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as VendorProfile[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createVendorProfile(input: {
  organization_id: string;
  vendor_category: string;
  services_description?: string;
  notes?: string;
}): Promise<ActionResponse<VendorProfile>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('vendor_profiles')
      .insert({ ...input, company_id: profile.company_id })
      .select('*, organization:organizations(id, name)')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/vendor-management');
    return { success: true, data: data as VendorProfile };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteVendorProfile(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('vendor_profiles').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/vendor-management');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Vendor Contracts
export async function getVendorContracts(companyId: string, vendorProfileId?: string): Promise<ActionResponse<VendorContract[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('vendor_contracts')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (vendorProfileId) query = query.eq('vendor_profile_id', vendorProfileId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as VendorContract[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createVendorContract(input: {
  vendor_profile_id: string;
  title: string;
  contract_number?: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  total_value?: number;
  currency?: string;
  scope_description?: string;
  protocol_id?: string;
}): Promise<ActionResponse<VendorContract>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('vendor_contracts')
      .insert({ ...input, company_id: profile.company_id })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/vendor-management');
    return { success: true, data: data as VendorContract };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Vendor KPIs
export async function getVendorKPIs(companyId: string, vendorProfileId?: string): Promise<ActionResponse<VendorKPI[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('vendor_kpis')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (vendorProfileId) query = query.eq('vendor_profile_id', vendorProfileId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as VendorKPI[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createVendorKPI(input: {
  vendor_profile_id: string;
  kpi_name: string;
  target_value?: number;
  actual_value?: number;
  unit?: string;
  measurement_period_start?: string;
  measurement_period_end?: string;
  notes?: string;
}): Promise<ActionResponse<VendorKPI>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data, error } = await supabase
      .from('vendor_kpis')
      .insert({ ...input, company_id: profile.company_id })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/vendor-management');
    return { success: true, data: data as VendorKPI };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getVendorPerformanceSummary(companyId: string): Promise<ActionResponse<{
  total_vendors: number;
  active_contracts: number;
  pending_deliverables: number;
  at_risk_kpis: number;
}>> {
  try {
    const supabase = await createClient();
    const [vendors, contracts, deliverables, kpis] = await Promise.all([
      supabase.from('vendor_profiles').select('id').eq('company_id', companyId),
      supabase.from('vendor_contracts').select('status').eq('company_id', companyId),
      supabase.from('vendor_deliverables').select('status').eq('company_id', companyId),
      supabase.from('vendor_kpis').select('status').eq('company_id', companyId),
    ]);

    return {
      success: true,
      data: {
        total_vendors: (vendors.data || []).length,
        active_contracts: (contracts.data || []).filter((c: { status: string }) => c.status === 'active').length,
        pending_deliverables: (deliverables.data || []).filter((d: { status: string }) => ['pending', 'in_progress'].includes(d.status)).length,
        at_risk_kpis: (kpis.data || []).filter((k: { status: string }) => k.status === 'at_risk' || k.status === 'behind').length,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
