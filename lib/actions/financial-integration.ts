'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  FinancialExportConfig,
  FinancialExportLog,
  CreateExportConfigInput,
  UpdateExportConfigInput,
  ExportConfigFilters,
} from '@/lib/types/financial-integration';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function getExportConfigs(
  companyId: string,
  filters?: ExportConfigFilters
): Promise<ActionResponse<{ items: FinancialExportConfig[]; total: number }>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('financial_export_configs')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.active !== undefined) {
      query = query.eq('active', filters.active);
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

    return { success: true, data: { items: (data || []) as FinancialExportConfig[], total: count || 0 } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createExportConfig(
  input: CreateExportConfigInput
): Promise<ActionResponse<FinancialExportConfig>> {
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
      .from('financial_export_configs')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        export_format: input.export_format,
        target_system: input.target_system || null,
        column_mapping: input.column_mapping || [],
        filters: input.filters || {},
        schedule: input.schedule || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/integrations/finance');
    return { success: true, data: data as FinancialExportConfig };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function updateExportConfig(
  id: string,
  input: UpdateExportConfigInput
): Promise<ActionResponse<FinancialExportConfig>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('financial_export_configs')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/integrations/finance');
    return { success: true, data: data as FinancialExportConfig };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getExportLogs(
  companyId: string,
  configId?: string
): Promise<ActionResponse<FinancialExportLog[]>> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('financial_export_logs')
      .select('*, config:financial_export_configs(id, name, export_format), generated_by:profiles!financial_export_logs_generated_by_id_fkey(id, first_name, last_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (configId) {
      query = query.eq('config_id', configId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as FinancialExportLog[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function triggerExport(
  configId: string
): Promise<ActionResponse<FinancialExportLog>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile?.company_id) return { success: false, error: 'Profile not found' };

    const { data: config } = await supabase
      .from('financial_export_configs')
      .select('name, export_format')
      .eq('id', configId)
      .single();

    const fileName = `export_${config?.name?.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.${config?.export_format || 'csv'}`;

    const { data, error } = await supabase
      .from('financial_export_logs')
      .insert({
        company_id: profile.company_id,
        config_id: configId,
        status: 'completed' as const,
        file_name: fileName,
        record_count: 0,
        generated_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await supabase
      .from('financial_export_configs')
      .update({ last_export_at: new Date().toISOString() })
      .eq('id', configId);

    revalidatePath('/protected/integrations/finance');
    return { success: true, data: data as FinancialExportLog };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
