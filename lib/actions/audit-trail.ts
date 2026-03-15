'use server';

import { createClient } from '@/lib/server';
import type { AuditLogEntry, AuditFilters, AuditExportType } from '@/lib/types/audit-trail';

export async function getAuditLog(
  companyId: string,
  filters?: AuditFilters
): Promise<{ success: boolean; data?: { entries: AuditLogEntry[]; total: number }; error?: string }> {
  const supabase = await createClient();
  try {
    let query = supabase
      .from('audit_log')
      .select('id, company_id, table_name, record_id, action, old_data, new_data, changed_fields, performed_by_id, performed_by_email, ip_address, created_at, performed_by:profiles!audit_log_performed_by_id_fkey(id, first_name, last_name, email)', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

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
      query = query.lte('created_at', filters.date_to + 'T23:59:59.999Z');
    }
    if (filters?.search) {
      query = query.or(`record_id.ilike.%${filters.search}%,performed_by_email.ilike.%${filters.search}%`);
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 50;
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: { entries: (data as unknown as AuditLogEntry[]) ?? [], total: count ?? 0 } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function requestAuditExport(
  filters: AuditFilters,
  exportType: AuditExportType
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('user_id', user.id)
      .single();
    if (!profile) return { success: false, error: 'Profile not found' };

    const { error } = await supabase.from('audit_exports').insert({
      company_id: profile.company_id,
      export_type: exportType,
      filters: filters ?? null,
      status: 'pending',
      requested_by_id: profile.id,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
