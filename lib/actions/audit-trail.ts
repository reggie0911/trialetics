'use server';

import { createClient } from '@/lib/server';
import type {
  AuditLogEntry,
  AuditExport,
  AuditFilters,
} from '@/lib/types/audit-trail';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getAuditLog(
  companyId: string,
  filters?: AuditFilters
): Promise<ActionResponse<{ entries: AuditLogEntry[]; total: number }>> {
  try {
    const supabase = await createClient();
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('audit_log')
      .select(
        `*, performed_by:profiles!audit_log_performed_by_id_fkey(id, first_name, last_name, email)`,
        { count: 'exact' }
      )
      .eq('company_id', companyId);

    if (filters?.table_name && filters.table_name !== 'all') {
      query = query.eq('table_name', filters.table_name);
    }
    if (filters?.action && filters.action !== 'all') {
      query = query.eq('action', filters.action);
    }
    if (filters?.performed_by_id) {
      query = query.eq('performed_by_id', filters.performed_by_id);
    }
    if (filters?.record_id) {
      query = query.eq('record_id', filters.record_id);
    }
    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to + 'T23:59:59');
    }
    if (filters?.search) {
      query = query.or(
        `performed_by_email.ilike.%${filters.search}%,table_name.ilike.%${filters.search}%`
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: { entries: (data || []) as AuditLogEntry[], total: count || 0 },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getAuditLogForEntity(
  tableName: string,
  recordId: string
): Promise<ActionResponse<AuditLogEntry[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('audit_log')
      .select(
        `*, performed_by:profiles!audit_log_performed_by_id_fkey(id, first_name, last_name, email)`
      )
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as AuditLogEntry[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function requestAuditExport(
  filters: AuditFilters,
  exportType: 'inspection_package' | 'ad_hoc' = 'ad_hoc'
): Promise<ActionResponse<AuditExport>> {
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
      .from('audit_exports')
      .insert({
        company_id: profile.company_id,
        export_type: exportType,
        filters: filters as Record<string, unknown>,
        status: 'completed',
        requested_by_id: profile.id,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AuditExport };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

export async function getAuditExports(
  companyId: string
): Promise<ActionResponse<AuditExport[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('audit_exports')
      .select(
        `*, requested_by:profiles!audit_exports_requested_by_id_fkey(id, first_name, last_name)`
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data || []) as AuditExport[] };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
