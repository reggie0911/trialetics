export type ReportDatasetKey =
  | 'report_tasks'
  | 'report_trip_reports'
  | 'report_subjects'
  | 'report_sites'
  | 'report_invoices'
  | 'report_inventory_transactions';

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';
export type ReportExportStatus = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
export type ReportRunStatus = 'started' | 'succeeded' | 'failed' | 'cancelled';
export type ReportRunContext = 'quick' | 'custom' | 'saved' | 'scheduled' | 'export_preview' | 'interactive';
export type ReportExportContext = 'manual' | 'scheduled' | 'api';

export type ReportFieldType = 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'json';
export type ReportFieldSensitivity = 'none' | 'internal' | 'pii' | 'phi';
export type ReportFilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'ilike'
  | 'in'
  | 'contains'
  | 'is_null'
  | 'not_null'
  | 'between';

export type ReportSummaryAggregation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_distinct';
export type ReportChartType = 'table' | 'bar' | 'line' | 'pie' | 'area';

export interface ReportFieldDefinition {
  key: string;
  label: string;
  type: ReportFieldType;
  sortable?: boolean;
  groupable?: boolean;
  filterable?: boolean;
  summaryAllowed?: ReportSummaryAggregation[];
  sensitivity?: ReportFieldSensitivity;
  exportable?: boolean;
  defaultVisible?: boolean;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  visible: boolean;
  sortable?: boolean;
}

export interface ReportFilterConfig {
  field: string;
  operator: ReportFilterOperator;
  value: unknown;
}

export interface ReportGroupingConfig {
  field: string;
}

export interface ReportSummaryMetricConfig {
  id: string;
  field: string;
  aggregation: ReportSummaryAggregation;
  label?: string;
}

export interface SortConfig {
  column: string;
  ascending: boolean;
}

export interface ReportChartConfig {
  type: ReportChartType;
  xField?: string | null;
  yField?: string | null;
  seriesField?: string | null;
}

export interface DataSourceConfig {
  id: ReportDatasetKey;
  label: string;
  table: ReportDatasetKey;
  description: string;
  columns: ColumnDefinition[];
  fields: ReportFieldDefinition[];
  defaultFieldKeys: string[];
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

export interface ReportDefinitionRecord {
  id: string;
  company_id: string;
  study_id: string | null;
  name: string;
  description: string | null;
  dataset_key: ReportDatasetKey;
  schema_version: number;
  selected_fields: string[];
  filters: ReportFilterConfig[];
  grouping: ReportGroupingConfig[];
  summary_metrics: ReportSummaryMetricConfig[];
  chart_config: ReportChartConfig;
  schedule_config: Record<string, unknown> | null;
  is_shared: boolean;
  is_active: boolean;
  created_by_profile_id: string;
  updated_by_profile_id: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportRunAuditRecord {
  id: string;
  company_id: string;
  study_id: string | null;
  report_definition_id: string | null;
  dataset_key: ReportDatasetKey;
  run_context: ReportRunContext;
  status: ReportRunStatus;
  parameters: Record<string, unknown>;
  selected_fields: string[];
  filters: ReportFilterConfig[];
  grouping: ReportGroupingConfig[];
  summary_metrics: ReportSummaryMetricConfig[];
  row_count: number | null;
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
  executed_by_profile_id: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ReportExportAuditRecord {
  id: string;
  company_id: string;
  study_id: string | null;
  report_run_id: string | null;
  report_definition_id: string | null;
  dataset_key: ReportDatasetKey;
  export_format: ReportExportFormat;
  status: ReportExportStatus;
  file_name: string;
  storage_path: string | null;
  bytes_written: number | null;
  row_count: number | null;
  export_context: ReportExportContext;
  requested_by_profile_id: string;
  started_at: string;
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportExecutionResult {
  rows: Record<string, unknown>[];
  total: number;
  columns: string[];
  grouped?: Array<{ key: string; count: number; aggregates: Record<string, number> }>;
  summary?: Record<string, number>;
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

const REPORT_DATASET_FIELDS: Record<ReportDatasetKey, ReportFieldDefinition[]> = {
  report_tasks: [
    { key: 'task_id', label: 'Task ID', type: 'string', defaultVisible: false, filterable: true },
    { key: 'study_title', label: 'Study', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'protocol_number', label: 'Protocol', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_number', label: 'Site Number', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_name', label: 'Site', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'milestone_name', label: 'Milestone', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'title', label: 'Title', type: 'string', defaultVisible: true, filterable: true },
    { key: 'status', label: 'Status', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'priority', label: 'Priority', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'assigned_to_name', label: 'Assignee', type: 'string', defaultVisible: true, filterable: true, groupable: true, sensitivity: 'internal' },
    { key: 'due_date', label: 'Due Date', type: 'date', defaultVisible: true, filterable: true, sortable: true },
    { key: 'completed_date', label: 'Completed Date', type: 'date', defaultVisible: false, filterable: true, sortable: true },
    { key: 'created_at', label: 'Created At', type: 'datetime', defaultVisible: false, filterable: true, sortable: true },
  ],
  report_trip_reports: [
    { key: 'trip_report_id', label: 'Trip Report ID', type: 'string', defaultVisible: false, filterable: true },
    { key: 'study_title', label: 'Study', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'protocol_number', label: 'Protocol', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_number', label: 'Site Number', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_name', label: 'Site', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'visit_name', label: 'Visit', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'visit_type', label: 'Visit Type', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'report_status', label: 'Report Status', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'status', label: 'Legacy Status', type: 'string', defaultVisible: false, filterable: true, groupable: true },
    { key: 'created_by_name', label: 'Author', type: 'string', defaultVisible: true, filterable: true, groupable: true, sensitivity: 'internal' },
    { key: 'reviewer_name', label: 'Reviewer', type: 'string', defaultVisible: true, filterable: true, groupable: true, sensitivity: 'internal' },
    { key: 'submitted_date', label: 'Submitted Date', type: 'date', defaultVisible: true, filterable: true, sortable: true },
    { key: 'approved_date', label: 'Approved Date', type: 'date', defaultVisible: true, filterable: true, sortable: true },
    { key: 'created_at', label: 'Created At', type: 'datetime', defaultVisible: false, filterable: true, sortable: true },
  ],
  report_subjects: [
    { key: 'subject_id', label: 'Subject ID', type: 'string', defaultVisible: false, filterable: true, sensitivity: 'phi' },
    { key: 'study_title', label: 'Study', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'protocol_number', label: 'Protocol', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_number', label: 'Site Number', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_name', label: 'Site', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'subject_number', label: 'Subject Number', type: 'string', defaultVisible: true, filterable: true, sensitivity: 'phi' },
    { key: 'status', label: 'Status', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'screening_number', label: 'Screening Number', type: 'string', defaultVisible: true, filterable: true, sensitivity: 'phi' },
    { key: 'randomization_number', label: 'Randomization Number', type: 'string', defaultVisible: true, filterable: true, sensitivity: 'phi' },
    { key: 'screening_date', label: 'Screening Date', type: 'date', defaultVisible: true, filterable: true, sortable: true },
    { key: 'randomization_date', label: 'Randomization Date', type: 'date', defaultVisible: true, filterable: true, sortable: true },
    { key: 'completion_date', label: 'Completion Date', type: 'date', defaultVisible: false, filterable: true, sortable: true },
    { key: 'withdrawal_reason', label: 'Withdrawal Reason', type: 'string', defaultVisible: false, filterable: true, sensitivity: 'phi' },
    { key: 'created_at', label: 'Created At', type: 'datetime', defaultVisible: false, filterable: true, sortable: true },
  ],
  report_sites: [
    { key: 'site_id', label: 'Site ID', type: 'string', defaultVisible: false, filterable: true },
    { key: 'study_title', label: 'Study', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'protocol_number', label: 'Protocol', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_number', label: 'Site Number', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_name', label: 'Site Name', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'status', label: 'Status', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'city', label: 'City', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'state', label: 'State', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'activation_date', label: 'Activation Date', type: 'date', defaultVisible: true, filterable: true, sortable: true },
    { key: 'target_enrollment', label: 'Target Enrollment', type: 'number', defaultVisible: true, filterable: true, sortable: true, summaryAllowed: ['sum', 'avg', 'min', 'max'] },
    { key: 'pi_name', label: 'PI Name', type: 'string', defaultVisible: false, filterable: true, sensitivity: 'internal' },
    { key: 'created_at', label: 'Created At', type: 'datetime', defaultVisible: false, filterable: true, sortable: true },
  ],
  report_invoices: [
    { key: 'invoice_id', label: 'Invoice ID', type: 'string', defaultVisible: false, filterable: true },
    { key: 'study_title', label: 'Study', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'protocol_number', label: 'Protocol', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_number', label: 'Site Number', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'site_name', label: 'Site', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'institution_name', label: 'Institution', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'external_invoice_id', label: 'External Invoice ID', type: 'string', defaultVisible: true, filterable: true },
    { key: 'status', label: 'Status', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'entity_type', label: 'Entity Type', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'amount', label: 'Amount', type: 'number', defaultVisible: true, filterable: true, sortable: true, summaryAllowed: ['sum', 'avg', 'min', 'max'] },
    { key: 'currency', label: 'Currency', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'received_at', label: 'Received At', type: 'date', defaultVisible: true, filterable: true, sortable: true },
    { key: 'due_at', label: 'Due At', type: 'date', defaultVisible: true, filterable: true, sortable: true },
  ],
  report_inventory_transactions: [
    { key: 'entry_id', label: 'Entry ID', type: 'string', defaultVisible: false, filterable: true },
    { key: 'study_title', label: 'Study', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'protocol_number', label: 'Protocol', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'entry_type', label: 'Entry Type', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'quantity_delta', label: 'Quantity Delta', type: 'number', defaultVisible: true, filterable: true, sortable: true, summaryAllowed: ['sum', 'avg', 'min', 'max'] },
    { key: 'item_name', label: 'Item Name', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'item_category', label: 'Item Category', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'lot_number', label: 'Lot Number', type: 'string', defaultVisible: true, filterable: true },
    { key: 'from_site_number', label: 'From Site', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'to_site_number', label: 'To Site', type: 'string', defaultVisible: true, filterable: true, groupable: true },
    { key: 'subject_number', label: 'Subject Number', type: 'string', defaultVisible: false, filterable: true, sensitivity: 'phi' },
    { key: 'performed_by_name', label: 'Performed By', type: 'string', defaultVisible: true, filterable: true, groupable: true, sensitivity: 'internal' },
    { key: 'performed_at', label: 'Performed At', type: 'datetime', defaultVisible: true, filterable: true, sortable: true },
  ],
};

export const DATA_SOURCES: DataSourceConfig[] = (
  Object.keys(REPORT_DATASET_FIELDS) as ReportDatasetKey[]
).map((datasetKey) => {
  const fields = REPORT_DATASET_FIELDS[datasetKey];
  const label = {
    report_tasks: 'Operational Tasks',
    report_trip_reports: 'Monitoring Trip Reports',
    report_subjects: 'Enrollment Subjects',
    report_sites: 'Site Operations',
    report_invoices: 'Finance Invoices',
    report_inventory_transactions: 'Inventory Transactions',
  }[datasetKey];
  const description = {
    report_tasks: 'Task progress and milestones across studies and sites.',
    report_trip_reports: 'Trip report and monitoring visit activity.',
    report_subjects: 'Subject screening/randomization/enrollment lifecycle.',
    report_sites: 'Site lifecycle, activation, and geography metrics.',
    report_invoices: 'Invoice workflow, amount, and approvals.',
    report_inventory_transactions: 'Investigational product transaction ledger.',
  }[datasetKey];

  return {
    id: datasetKey,
    label,
    table: datasetKey,
    description,
    fields,
    defaultFieldKeys: fields.filter((f) => f.defaultVisible).map((f) => f.key),
    columns: fields.map((f) => ({
      key: f.key,
      label: f.label,
      visible: Boolean(f.defaultVisible),
      sortable: Boolean(f.sortable),
    })),
  };
});

export const REPORT_DATASET_KEYS: ReportDatasetKey[] = DATA_SOURCES.map((d) => d.id);
