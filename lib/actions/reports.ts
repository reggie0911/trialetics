'use server';

import { createClient } from '@/lib/server';
import { revalidatePath } from 'next/cache';
import type {
  ReportTemplate,
  SavedReport,
  ColumnDefinition,
  DataSourceConfig,
  SortConfig,
  ReportFilterConfig,
} from '@/lib/types/reports';
import { DATA_SOURCES } from '@/lib/types/reports';
import { executeReportQuery, type ReportQueryResult } from '@/lib/utils/report-query-builder';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getReportTemplates(
  companyId: string
): Promise<ActionResponse<ReportTemplate[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('report_templates')
      .select(`*, created_by:profiles!report_templates_created_by_id_fkey(id, first_name, last_name)`)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as ReportTemplate[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function createReportTemplate(
  input: { name: string; description?: string; data_source: string; columns: ColumnDefinition[]; filters?: Record<string, unknown>; sort_config?: SortConfig }
): Promise<ActionResponse<ReportTemplate>> {
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

    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        company_id: profile.company_id,
        name: input.name,
        description: input.description ?? null,
        data_source: input.data_source,
        columns: input.columns,
        filters: input.filters ?? {},
        sort_config: input.sort_config ?? null,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/reports');
    return { success: true, data: data as ReportTemplate };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function deleteReportTemplate(id: string): Promise<ActionResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('report_templates').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath('/protected/reports');
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getSavedReports(
  companyId: string
): Promise<ActionResponse<SavedReport[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('saved_reports')
      .select(`*, created_by:profiles!saved_reports_created_by_id_fkey(id, first_name, last_name), template:report_templates(id, name, data_source)`)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as SavedReport[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function executeReport(
  companyId: string,
  dataSource: string,
  columns: ColumnDefinition[],
  filters?: ReportFilterConfig[],
  sort?: SortConfig,
  page?: number,
  pageSize?: number
): Promise<ActionResponse<ReportQueryResult>> {
  try {
    const dsConfig = DATA_SOURCES.find((ds) => ds.id === dataSource);
    if (!dsConfig) return { success: false, error: `Unknown data source: ${dataSource}` };

    const result = await executeReportQuery({
      dataSource,
      tableName: dsConfig.table,
      companyId,
      columns,
      filters,
      sort,
      page,
      pageSize,
    });

    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getAvailableDataSources(): Promise<ActionResponse<DataSourceConfig[]>> {
  return { success: true, data: DATA_SOURCES };
}

export async function getColumnsForDataSource(
  dataSourceId: string
): Promise<ActionResponse<ColumnDefinition[]>> {
  const ds = DATA_SOURCES.find((d) => d.id === dataSourceId);
  if (!ds) return { success: false, error: 'Unknown data source' };
  return { success: true, data: ds.columns };
}
