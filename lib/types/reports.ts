export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ReportExportStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface ColumnDefinition {
  key: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
}

export interface ReportFilterConfig {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'ilike' | 'in';
  value: string;
}

export interface SortConfig {
  column: string;
  ascending: boolean;
}

export interface DataSourceConfig {
  id: string;
  label: string;
  table: string;
  columns: ColumnDefinition[];
}

export interface ReportTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  data_source: string;
  columns: ColumnDefinition[];
  filters: Record<string, unknown>;
  sort_config: SortConfig | null;
  grouping: Record<string, unknown> | null;
  is_system: boolean;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface SavedReport {
  id: string;
  company_id: string;
  template_id: string | null;
  name: string;
  description: string | null;
  parameters: Record<string, unknown>;
  schedule: string | null;
  last_run_at: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; first_name: string | null; last_name: string | null } | null;
  template?: { id: string; name: string; data_source: string } | null;
}

export interface ReportExport {
  id: string;
  company_id: string;
  report_id: string | null;
  format: ReportExportFormat;
  file_url: string | null;
  status: ReportExportStatus;
  created_by_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export const DATA_SOURCES: DataSourceConfig[] = [
  {
    id: 'subjects',
    label: 'Subject Tracking',
    table: 'subjects',
    columns: [
      { key: 'screening_number', label: 'Screening Number', visible: true, sortable: true },
      { key: 'status', label: 'Status', visible: true, sortable: true },
      { key: 'site_name', label: 'Site', visible: true },
      { key: 'created_at', label: 'Created', visible: true, sortable: true },
    ],
  },
  {
    id: 'action_items',
    label: 'Action Items',
    table: 'action_items',
    columns: [
      { key: 'title', label: 'Title', visible: true, sortable: true },
      { key: 'status', label: 'Status', visible: true, sortable: true },
      { key: 'priority', label: 'Priority', visible: true, sortable: true },
      { key: 'due_date', label: 'Due Date', visible: true, sortable: true },
      { key: 'source_type', label: 'Source', visible: true },
      { key: 'created_at', label: 'Created', visible: true, sortable: true },
    ],
  },
  {
    id: 'deviations',
    label: 'Deviations',
    table: 'deviations',
    columns: [
      { key: 'deviation_number', label: 'Number', visible: true, sortable: true },
      { key: 'title', label: 'Title', visible: true, sortable: true },
      { key: 'severity', label: 'Severity', visible: true, sortable: true },
      { key: 'status', label: 'Status', visible: true, sortable: true },
      { key: 'detected_date', label: 'Detected', visible: true, sortable: true },
      { key: 'created_at', label: 'Created', visible: true, sortable: true },
    ],
  },
  {
    id: 'payment_records',
    label: 'Payments',
    table: 'payment_records',
    columns: [
      { key: 'payment_number', label: 'Number', visible: true },
      { key: 'amount', label: 'Amount', visible: true, sortable: true },
      { key: 'status', label: 'Status', visible: true, sortable: true },
      { key: 'created_at', label: 'Created', visible: true, sortable: true },
    ],
  },
  {
    id: 'document_records',
    label: 'Documents',
    table: 'document_records',
    columns: [
      { key: 'name', label: 'Name', visible: true, sortable: true },
      { key: 'document_type', label: 'Type', visible: true },
      { key: 'status', label: 'Status', visible: true },
      { key: 'created_at', label: 'Created', visible: true, sortable: true },
    ],
  },
  {
    id: 'audit_log',
    label: 'Audit Trail',
    table: 'audit_log',
    columns: [
      { key: 'table_name', label: 'Table', visible: true, sortable: true },
      { key: 'action', label: 'Action', visible: true, sortable: true },
      { key: 'performed_by_email', label: 'Performed By', visible: true },
      { key: 'created_at', label: 'Timestamp', visible: true, sortable: true },
    ],
  },
];
