export type IntegrationType = 'edc' | 'safety' | 'finance' | 'irt';
export type IntegrationStatus = 'active' | 'inactive' | 'error';
export type SyncType = 'manual' | 'scheduled';
export type SyncStatus = 'pending' | 'running' | 'completed' | 'failed';

export const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  edc: 'EDC',
  safety: 'Safety Database',
  finance: 'Financial System',
  irt: 'IRT',
};

export const INTEGRATION_STATUS_LABELS: Record<IntegrationStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  error: 'Error',
};

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

export interface IntegrationConfig {
  id: string;
  company_id: string;
  integration_type: IntegrationType;
  name: string;
  description: string | null;
  status: IntegrationStatus;
  config_json: Record<string, unknown>;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationFieldMapping {
  id: string;
  company_id: string;
  integration_config_id: string;
  source_field: string;
  target_table: string;
  target_field: string;
  transform_rule: string | null;
  active: boolean;
  created_at: string;
}

export interface IntegrationSyncLog {
  id: string;
  company_id: string;
  integration_config_id: string;
  sync_type: SyncType;
  status: SyncStatus;
  records_processed: number;
  records_failed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  config?: IntegrationConfig | null;
}

export interface CreateIntegrationConfigInput {
  integration_type: IntegrationType;
  name: string;
  description?: string;
  config_json?: Record<string, unknown>;
}

export interface UpdateIntegrationConfigInput {
  name?: string;
  description?: string;
  status?: IntegrationStatus;
  config_json?: Record<string, unknown>;
}

export interface IntegrationFilters {
  integration_type?: IntegrationType | 'all';
  status?: IntegrationStatus | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
}
