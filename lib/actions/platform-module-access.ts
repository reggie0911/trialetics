'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/server';
import type { CreateTrackerDefinitionInput } from '@/lib/types/custom-trackers';

export type PlatformCompanyRow = {
  id: string;
  name: string;
  has_ctms_access: boolean;
  has_eisf_access: boolean;
  has_etmf_access: boolean;
  has_tracker_access: boolean;
  has_brandforge_access: boolean;
  enabled_study_tracker_keys: string[];
};

export type PlatformTrackerRow = {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  platform_access_enabled: boolean;
};

export type PlatformGlobalTrackerRow = {
  id: string;
  company_id: string;
  company_name: string;
  name: string;
  slug: string;
  platform_access_enabled: boolean;
  active: boolean;
  updated_at: string;
};

export async function getPlatformAdminContext(): Promise<{
  ok: boolean;
  profileId?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: 'Not authenticated' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_platform_admin')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) return { ok: false, error: 'Profile not found' };
  if (!profile.is_platform_admin) return { ok: false, error: 'Not authorized' };

  return { ok: true, profileId: profile.id };
}

export async function listCompaniesForPlatformAdmin(): Promise<{
  success: boolean;
  data?: PlatformCompanyRow[];
  error?: string;
}> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('companies')
    .select(
      'id, name, has_ctms_access, has_eisf_access, has_etmf_access, has_tracker_access, has_brandforge_access, enabled_study_tracker_keys'
    )
    .order('name');

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data as PlatformCompanyRow[] | null)?.map((c) => ({
      ...c,
      has_eisf_access: c.has_eisf_access === true,
      has_brandforge_access: c.has_brandforge_access === true,
      enabled_study_tracker_keys: c.enabled_study_tracker_keys ?? [],
    })) ?? [],
  };
}

export async function updateCompanyModuleAccess(input: {
  companyId: string;
  hasCtmsAccess: boolean;
  hasEisfAccess: boolean;
  hasEtmfAccess: boolean;
  hasTrackerAccess: boolean;
  hasBrandforgeAccess: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_company_module_access', {
    p_company_id: input.companyId,
    p_has_ctms_access: input.hasCtmsAccess,
    p_has_etmf_access: input.hasEtmfAccess,
    p_has_tracker_access: input.hasTrackerAccess,
    p_has_eisf_access: input.hasEisfAccess,
    p_has_brandforge_access: input.hasBrandforgeAccess,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/platform/companies');
  return { success: true };
}

export async function updateCompanyStudyTrackerKeys(input: {
  companyId: string;
  keys: string[];
}): Promise<{ success: boolean; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_company_study_tracker_keys', {
    p_company_id: input.companyId,
    p_keys: input.keys,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/platform/companies');
  revalidatePath('/protected', 'layout');
  return { success: true };
}

export async function listTrackerDefinitionsForCompany(
  companyId: string
): Promise<{ success: boolean; data?: PlatformTrackerRow[]; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('custom_tracker_definitions')
    .select('id, company_id, name, slug, platform_access_enabled')
    .eq('company_id', companyId)
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as PlatformTrackerRow[]) ?? [] };
}

export async function createCustomTrackerForCompany(
  companyId: string,
  input: CreateTrackerDefinitionInput
): Promise<{ success: boolean; data?: PlatformTrackerRow; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: newId, error } = await supabase.rpc('platform_create_custom_tracker_definition', {
    p_company_id: companyId,
    p_name: input.name.trim(),
    p_slug: input.slug.trim(),
    p_description: input.description?.trim() ? input.description.trim() : null,
    p_icon: input.icon?.trim() ? input.icon.trim() : null,
    p_entity_type: input.entity_type?.trim() ? input.entity_type.trim() : null,
  });

  if (error) {
    const msg = error.message ?? 'Failed to create tracker';
    const friendly =
      msg.includes('slug already exists') || msg.includes('unique')
        ? 'A tracker with this slug already exists for this company.'
        : msg;
    return { success: false, error: friendly };
  }

  if (!newId) return { success: false, error: 'No definition id returned' };

  const { data: row, error: selErr } = await supabase
    .from('custom_tracker_definitions')
    .select('id, company_id, name, slug, platform_access_enabled')
    .eq('id', newId)
    .single();

  if (selErr || !row) return { success: false, error: selErr?.message ?? 'Failed to load new tracker' };

  revalidatePath('/protected/platform/companies');
  revalidatePath('/protected/custom-trackers');
  return { success: true, data: row as PlatformTrackerRow };
}

export async function listAllCustomTrackersForPlatform(): Promise<{
  success: boolean;
  data?: PlatformGlobalTrackerRow[];
  error?: string;
}> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc('platform_list_custom_tracker_definitions');

  if (error) return { success: false, error: error.message };

  const list: PlatformGlobalTrackerRow[] = ((rows ?? []) as PlatformGlobalTrackerRow[]).map((r) => ({
    id: r.id,
    company_id: r.company_id,
    company_name: r.company_name,
    name: r.name,
    slug: r.slug,
    platform_access_enabled: r.platform_access_enabled,
    active: r.active,
    updated_at: r.updated_at,
  }));

  return { success: true, data: list };
}

export async function updateTrackerPlatformAccess(input: {
  trackerDefinitionId: string;
  enabled: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await getPlatformAdminContext();
  if (!gate.ok) return { success: false, error: gate.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc('set_tracker_platform_access', {
    p_tracker_definition_id: input.trackerDefinitionId,
    p_enabled: input.enabled,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath('/protected/platform/companies');
  revalidatePath('/protected/custom-trackers');
  return { success: true };
}
