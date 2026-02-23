export type SafetyEventType = 'sae' | 'susar' | 'aesi';
export type SafetyReportingStatus = 'draft' | 'submitted' | 'acknowledged' | 'closed';

export const SAFETY_EVENT_TYPE_LABELS: Record<SafetyEventType, string> = {
  sae: 'SAE',
  susar: 'SUSAR',
  aesi: 'AESI',
};

export const SAFETY_REPORTING_STATUS_LABELS: Record<SafetyReportingStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  closed: 'Closed',
};

export interface SafetyReconciliationRecord {
  id: string;
  company_id: string;
  protocol_id: string | null;
  subject_id: string | null;
  event_type: SafetyEventType;
  event_number: string;
  event_description: string | null;
  onset_date: string | null;
  awareness_date: string | null;
  reported_date: string | null;
  reporter_id: string | null;
  reporting_status: SafetyReportingStatus;
  seriousness_criteria: string[];
  outcome: string | null;
  narrative: string | null;
  integration_config_id: string | null;
  external_reference: string | null;
  created_at: string;
  updated_at: string;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
  subject?: { id: string; subject_id: string | null } | null;
  reporter?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface CreateSafetyRecordInput {
  protocol_id?: string;
  subject_id?: string;
  event_type: SafetyEventType;
  event_description?: string;
  onset_date?: string;
  awareness_date?: string;
  reported_date?: string;
  seriousness_criteria?: string[];
  outcome?: string;
  narrative?: string;
  external_reference?: string;
}

export interface UpdateSafetyRecordInput {
  event_type?: SafetyEventType;
  event_description?: string;
  onset_date?: string;
  awareness_date?: string;
  reported_date?: string;
  reporting_status?: SafetyReportingStatus;
  seriousness_criteria?: string[];
  outcome?: string;
  narrative?: string;
  external_reference?: string;
}

export interface SafetyFilters {
  event_type?: SafetyEventType | 'all';
  reporting_status?: SafetyReportingStatus | 'all';
  protocol_id?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface SafetyStats {
  total: number;
  draft: number;
  submitted: number;
  acknowledged: number;
  closed: number;
  sae_count: number;
  susar_count: number;
  aesi_count: number;
}
