'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { VendorProfile, VendorContract, VendorKPI, VendorCategory, VendorContractStatus, VendorKPIStatus } from '@/lib/types/vendor-management';

async function getProfile(): Promise<{ id: string; company_id: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('id, company_id').eq('user_id', user.id).single();
  return data ?? null;
}

export async function getVendorProfiles(
  companyId: string
): Promise<{ success: boolean; data?: VendorProfile[]; error?: string }> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from('vendor_profiles')
      .select('id, organization_id, company_id, vendor_category, services_description, contract_status, qualification_status, qualified_date, qualification_expiry_date, primary_contact_id, notes, created_at, updated_at, organization:organizations(id, name), primary_contact:profiles!vendor_profiles_primary_contact_id_fkey(id, first_name, last_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as VendorProfile[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createVendorProfile(
  input: {
    organization_id: string;
    vendor_category: VendorCategory;
    services_description?: string;
    contract_status?: VendorContractStatus;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('vendor_profiles').insert({
      company_id: profile.company_id,
      organization_id: input.organization_id,
      vendor_category: input.vendor_category,
      services_description: input.services_description ?? null,
      contract_status: input.contract_status ?? 'draft',
      notes: input.notes ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/vendor-management');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteVendorProfile(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const { error } = await supabase.from('vendor_profiles').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/vendor-management');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getVendorContracts(
  companyId: string,
  vendorProfileId?: string
): Promise<{ success: boolean; data?: VendorContract[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('vendor_contracts')
      .select('id, vendor_profile_id, company_id, protocol_id, contract_number, title, contract_type, start_date, end_date, total_value, currency, status, scope_description, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (vendorProfileId) query = query.eq('vendor_profile_id', vendorProfileId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as VendorContract[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createVendorContract(
  input: {
    vendor_profile_id: string;
    title: string;
    contract_number?: string;
    contract_type?: string;
    start_date?: string;
    end_date?: string;
    total_value?: number;
    currency?: string;
    status?: VendorContractStatus;
    scope_description?: string;
    protocol_id?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('vendor_contracts').insert({
      company_id: profile.company_id,
      vendor_profile_id: input.vendor_profile_id,
      title: input.title,
      contract_number: input.contract_number ?? null,
      contract_type: input.contract_type ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      total_value: input.total_value ?? null,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'draft',
      scope_description: input.scope_description ?? null,
      protocol_id: input.protocol_id ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/vendor-management');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getVendorKPIs(
  companyId: string,
  vendorProfileId?: string
): Promise<{ success: boolean; data?: VendorKPI[]; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('vendor_kpis')
      .select('id, vendor_profile_id, company_id, kpi_name, target_value, actual_value, unit, measurement_period_start, measurement_period_end, status, notes, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (vendorProfileId) query = query.eq('vendor_profile_id', vendorProfileId);
    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as VendorKPI[]) ?? [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createVendorKPI(
  input: {
    vendor_profile_id: string;
    kpi_name: string;
    target_value?: number;
    actual_value?: number;
    unit?: string;
    measurement_period_start?: string;
    measurement_period_end?: string;
    status?: VendorKPIStatus;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const profile = await getProfile();
    if (!profile) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase.from('vendor_kpis').insert({
      company_id: profile.company_id,
      vendor_profile_id: input.vendor_profile_id,
      kpi_name: input.kpi_name,
      target_value: input.target_value ?? null,
      actual_value: input.actual_value ?? null,
      unit: input.unit ?? null,
      measurement_period_start: input.measurement_period_start ?? null,
      measurement_period_end: input.measurement_period_end ?? null,
      status: input.status ?? 'on_track',
      notes: input.notes ?? null,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/vendor-management');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getVendorPerformanceSummary(
  companyId: string
): Promise<{ success: boolean; data?: { total_vendors: number; active_contracts: number; pending_deliverables: number; at_risk_kpis: number }; error?: string }> {
  const supabase = await createClient();
  try {
    const [{ data: vendors }, { data: contracts }, { data: kpis }] = await Promise.all([
      supabase.from('vendor_profiles').select('id').eq('company_id', companyId),
      supabase.from('vendor_contracts').select('status').eq('company_id', companyId),
      supabase.from('vendor_kpis').select('status').eq('company_id', companyId),
    ]);

    return {
      success: true,
      data: {
        total_vendors: (vendors ?? []).length,
        active_contracts: (contracts ?? []).filter((r) => r.status === 'active').length,
        pending_deliverables: 0,
        at_risk_kpis: (kpis ?? []).filter((r) => r.status === 'at_risk' || r.status === 'behind').length,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
