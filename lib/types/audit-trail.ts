export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';
export type AuditExportType = 'inspection_package' | 'ad_hoc';
export type AuditExportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
};

export const AUDIT_EXPORT_STATUS_LABELS: Record<AuditExportStatus, string> = {
  pending: 'Pending',
  generating: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
};

export const AUDITED_TABLE_LABELS: Record<string, string> = {
  clinical_protocols: 'Clinical Protocols',
  subjects: 'Subjects',
  subject_visits: 'Subject Visits',
  site_contracts: 'Site Contracts',
  payment_records: 'Payment Records',
  document_records: 'Documents',
  action_items: 'Action Items',
  vendors: 'Vendors',
  tmf_artifacts: 'TMF Artifacts',
  deviations: 'Deviations',
  capas: 'CAPAs',
};

export interface AuditLogEntry {
  id: string;
  company_id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  performed_by_id: string | null;
  performed_by_email: string | null;
  ip_address: string | null;
  created_at: string;
  performed_by?: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface AuditExport {
  id: string;
  company_id: string;
  export_type: AuditExportType;
  filters: Record<string, unknown> | null;
  file_url: string | null;
  status: AuditExportStatus;
  requested_by_id: string | null;
  created_at: string;
  completed_at: string | null;
  requested_by?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface AuditFilters {
  search?: string;
  table_name?: string | 'all';
  action?: AuditAction | 'all';
  performed_by_id?: string;
  record_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  pageSize?: number;
}
