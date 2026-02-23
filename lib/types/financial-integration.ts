export type FinancialExportFormat = 'csv' | 'xlsx' | 'json';
export type FinancialExportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export const EXPORT_FORMAT_LABELS: Record<FinancialExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel (XLSX)',
  json: 'JSON',
};

export const EXPORT_STATUS_LABELS: Record<FinancialExportStatus, string> = {
  pending: 'Pending',
  generating: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
};

export interface FinancialExportConfig {
  id: string;
  company_id: string;
  name: string;
  export_format: FinancialExportFormat;
  target_system: string | null;
  column_mapping: Record<string, string>[];
  filters: Record<string, unknown>;
  schedule: string | null;
  active: boolean;
  last_export_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialExportLog {
  id: string;
  company_id: string;
  config_id: string;
  status: FinancialExportStatus;
  file_name: string | null;
  record_count: number;
  error_message: string | null;
  generated_by_id: string | null;
  created_at: string;
  config?: FinancialExportConfig | null;
  generated_by?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface CreateExportConfigInput {
  name: string;
  export_format: FinancialExportFormat;
  target_system?: string;
  column_mapping?: Record<string, string>[];
  filters?: Record<string, unknown>;
  schedule?: string;
}

export interface UpdateExportConfigInput {
  name?: string;
  export_format?: FinancialExportFormat;
  target_system?: string;
  column_mapping?: Record<string, string>[];
  filters?: Record<string, unknown>;
  schedule?: string;
  active?: boolean;
}

export interface ExportConfigFilters {
  active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}
