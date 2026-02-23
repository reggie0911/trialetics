export type DeviationSeverity = 'minor' | 'major' | 'critical';
export type DeviationStatus = 'open' | 'investigating' | 'capa_required' | 'capa_in_progress' | 'closed';
export type CAPAStatus = 'planned' | 'in_progress' | 'completed' | 'verified_effective' | 'verified_ineffective' | 'closed';
export type CAPAType = 'corrective' | 'preventive';

export const DEVIATION_SEVERITY_LABELS: Record<DeviationSeverity, string> = {
  minor: 'Minor',
  major: 'Major',
  critical: 'Critical',
};

export const DEVIATION_STATUS_LABELS: Record<DeviationStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  capa_required: 'CAPA Required',
  capa_in_progress: 'CAPA In Progress',
  closed: 'Closed',
};

export const CAPA_STATUS_LABELS: Record<CAPAStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  verified_effective: 'Verified Effective',
  verified_ineffective: 'Verified Ineffective',
  closed: 'Closed',
};

export const CAPA_TYPE_LABELS: Record<CAPAType, string> = {
  corrective: 'Corrective',
  preventive: 'Preventive',
};

export interface DeviationCategory {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deviation {
  id: string;
  company_id: string;
  protocol_id: string | null;
  deviation_number: string;
  title: string;
  description: string | null;
  severity: DeviationSeverity;
  status: DeviationStatus;
  category_id: string | null;
  site_id: string | null;
  subject_id: string | null;
  detected_date: string | null;
  detected_by_id: string | null;
  root_cause: string | null;
  impact_assessment: string | null;
  reported_to_sponsor: boolean;
  reported_to_irb: boolean;
  closed_date: string | null;
  closed_by_id: string | null;
  created_at: string;
  updated_at: string;
  detected_by?: { id: string; first_name: string | null; last_name: string | null } | null;
  closed_by?: { id: string; first_name: string | null; last_name: string | null } | null;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
  category?: DeviationCategory | null;
  site?: { id: string; name: string | null } | null;
  subject?: { id: string; screening_number: string | null } | null;
}

export interface CAPA {
  id: string;
  company_id: string;
  deviation_id: string;
  capa_number: string;
  type: CAPAType;
  title: string;
  description: string | null;
  status: CAPAStatus;
  assigned_to_id: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_completion_date: string | null;
  root_cause_analysis: string | null;
  action_plan: string | null;
  created_at: string;
  updated_at: string;
  assigned_to?: { id: string; first_name: string | null; last_name: string | null } | null;
  deviation?: { id: string; deviation_number: string; title: string } | null;
}

export interface CAPAEffectivenessReview {
  id: string;
  company_id: string;
  capa_id: string;
  review_date: string;
  reviewer_id: string | null;
  is_effective: boolean | null;
  findings: string | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  created_at: string;
  reviewer?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface CreateDeviationInput {
  title: string;
  description?: string;
  severity?: DeviationSeverity;
  category_id?: string;
  protocol_id?: string;
  site_id?: string;
  subject_id?: string;
  detected_date?: string;
  root_cause?: string;
  impact_assessment?: string;
}

export interface UpdateDeviationInput {
  title?: string;
  description?: string;
  severity?: DeviationSeverity;
  status?: DeviationStatus;
  category_id?: string | null;
  root_cause?: string;
  impact_assessment?: string;
  reported_to_sponsor?: boolean;
  reported_to_irb?: boolean;
}

export interface CreateCAPAInput {
  deviation_id: string;
  type?: CAPAType;
  title: string;
  description?: string;
  assigned_to_id?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  root_cause_analysis?: string;
  action_plan?: string;
}

export interface UpdateCAPAInput {
  title?: string;
  description?: string;
  type?: CAPAType;
  status?: CAPAStatus;
  assigned_to_id?: string | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_completion_date?: string | null;
  root_cause_analysis?: string;
  action_plan?: string;
}

export interface DeviationFilters {
  search?: string;
  status?: DeviationStatus | 'all';
  severity?: DeviationSeverity | 'all';
  protocol_id?: string;
  site_id?: string;
  category_id?: string;
  page?: number;
  pageSize?: number;
}

export interface DeviationStats {
  total: number;
  open: number;
  investigating: number;
  capa_required: number;
  capa_in_progress: number;
  closed: number;
  critical: number;
  total_capas: number;
  open_capas: number;
}
