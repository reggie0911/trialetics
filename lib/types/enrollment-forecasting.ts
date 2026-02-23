export type EnrollmentTargetType = 'screen' | 'enroll' | 'complete';
export type EnrollmentProjectionMethod = 'linear' | 'historical' | 'custom';
export type EnrollmentScenarioType = 'optimistic' | 'baseline' | 'pessimistic' | 'custom';

export const ENROLLMENT_TARGET_TYPE_LABELS: Record<EnrollmentTargetType, string> = {
  screen: 'Screen',
  enroll: 'Enroll',
  complete: 'Complete',
};

export const ENROLLMENT_PROJECTION_METHOD_LABELS: Record<EnrollmentProjectionMethod, string> = {
  linear: 'Linear',
  historical: 'Historical',
  custom: 'Custom',
};

export const ENROLLMENT_SCENARIO_TYPE_LABELS: Record<EnrollmentScenarioType, string> = {
  optimistic: 'Optimistic',
  baseline: 'Baseline',
  pessimistic: 'Pessimistic',
  custom: 'Custom',
};

export interface EnrollmentTarget {
  id: string;
  company_id: string;
  protocol_id: string;
  site_id: string | null;
  region_id: string | null;
  target_count: number;
  target_date: string;
  target_type: EnrollmentTargetType;
  milestone_label: string | null;
  created_at: string;
  updated_at: string;
  clinical_protocols?: { id: string; protocol_number: string; title: string } | null;
  clinical_sites?: { id: string; site_number: string } | null;
  clinical_regions?: { id: string; region_name: string } | null;
}

export interface EnrollmentProjection {
  id: string;
  company_id: string;
  protocol_id: string;
  projection_date: string;
  projected_by_id: string | null;
  projection_name: string | null;
  method: EnrollmentProjectionMethod;
  assumptions: Record<string, unknown>;
  site_projections: Record<string, unknown>;
  total_projected_count: number | null;
  total_projected_date: string | null;
  created_at: string;
  updated_at: string;
  clinical_protocols?: { id: string; protocol_number: string; title: string } | null;
  profiles?: { id: string } | null;
}

export interface EnrollmentScenario {
  id: string;
  company_id: string;
  protocol_id: string;
  scenario_name: string;
  scenario_type: EnrollmentScenarioType;
  parameters: Record<string, unknown>;
  projected_first_enrolled: string | null;
  projected_last_enrolled: string | null;
  projected_total: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clinical_protocols?: { id: string; protocol_number: string; title: string } | null;
}

export interface EnrollmentActual {
  protocol_id: string;
  total_enrolled: number;
  clinical_protocols?: { id: string; protocol_number: string; title: string } | null;
}
