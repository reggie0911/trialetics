'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  IntegrationConfig,
  IntegrationFieldMapping,
  IntegrationSyncLog,
  CreateIntegrationConfigInput,
  UpdateIntegrationConfigInput,
  IntegrationFilters,
} from '@/lib/types/integrations';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getIntegrationConfigs(
  companyId: string,
  filters?: IntegrationFilters
): Promise<ActionResponse<{ items: IntegrationConfig[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('integration_configs')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.integration_type && filters.integration_type !== 'all') {
      query = query.eq('integration_type', filters.integration_type);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const pageSize = filters?.pageSize || 25;
    const page = filters?.page || 1;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: { items: (data || []) as IntegrationConfig[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createIntegrationConfig(
  input: CreateIntegrationConfigInput
): Promise<ActionResponse<IntegrationConfig>> {
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
      .from('integration_configs')
      .insert({
        company_id: profile.company_id,
        integration_type: input.integration_type,
        name: input.name,
        description: input.description || null,
        config_json: input.config_json || {},
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/integrations');
    return { success: true, data: data as IntegrationConfig };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateIntegrationConfig(
  id: string,
  input: UpdateIntegrationConfigInput
): Promise<ActionResponse<IntegrationConfig>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('integration_configs')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/integrations');
    return { success: true, data: data as IntegrationConfig };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteIntegrationConfig(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('integration_configs')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/integrations');
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getFieldMappings(
  companyId: string,
  configId?: string
): Promise<ActionResponse<IntegrationFieldMapping[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('integration_field_mappings')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    if (configId) {
      query = query.eq('integration_config_id', configId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as IntegrationFieldMapping[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSyncLogs(
  companyId: string,
  configId?: string
): Promise<ActionResponse<IntegrationSyncLog[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('integration_sync_logs')
      .select('*, config:integration_configs(id, name, integration_type)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (configId) {
      query = query.eq('integration_config_id', configId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as IntegrationSyncLog[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function triggerSync(
  configId: string,
  syncType: 'manual' | 'scheduled' = 'manual'
): Promise<ActionResponse<IntegrationSyncLog>> {
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
      .from('integration_sync_logs')
      .insert({
        company_id: profile.company_id,
        integration_config_id: configId,
        sync_type: syncType,
        status: 'pending' as const,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await supabase
      .from('integration_configs')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', configId);

    revalidatePath('/protected/integrations');
    return { success: true, data: data as IntegrationSyncLog };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
