export type KRICategory =
  | 'enrollment'
  | 'safety'
  | 'data_quality'
  | 'site_performance'
  | 'regulatory'
  | 'financial';

export type KRIDirection = 'higher_is_better' | 'lower_is_better';

export type KRIAlertLevel = 'yellow' | 'red';

export const KRI_CATEGORY_LABELS: Record<KRICategory, string> = {
  enrollment: 'Enrollment',
  safety: 'Safety',
  data_quality: 'Data Quality',
  site_performance: 'Site Performance',
  regulatory: 'Regulatory',
  financial: 'Financial',
};

export const KRI_DIRECTION_LABELS: Record<KRIDirection, string> = {
  higher_is_better: 'Higher is Better',
  lower_is_better: 'Lower is Better',
};

export const KRI_ALERT_LEVEL_LABELS: Record<KRIAlertLevel, string> = {
  yellow: 'Yellow',
  red: 'Red',
};

export interface KRIDefinition {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: KRICategory;
  calculation_method: string | null;
  unit: string | null;
  data_source: string | null;
  is_active: boolean;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface KRIThreshold {
  id: string;
  kri_definition_id: string;
  company_id: string;
  protocol_id: string | null;
  green_upper: number | null;
  yellow_upper: number | null;
  red_upper: number | null;
  direction: KRIDirection;
  effective_date: string | null;
  created_at: string;
  updated_at: string;
  kri_definition?: KRIDefinition | null;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
}

export interface KRIValue {
  id: string;
  kri_definition_id: string;
  company_id: string;
  protocol_id: string | null;
  site_id: string | null;
  value: number;
  measurement_date: string;
  calculated_at: string;
  notes: string | null;
  created_at: string;
  kri_definition?: KRIDefinition | null;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
  site?: { id: string; site_number: string | null; organization?: { name: string } | null } | null;
}

export interface KRIAlert {
  id: string;
  kri_value_id: string;
  company_id: string;
  protocol_id: string | null;
  site_id: string | null;
  alert_level: KRIAlertLevel;
  message: string;
  acknowledged: boolean;
  acknowledged_by_id: string | null;
  acknowledged_at: string | null;
  action_item_id: string | null;
  created_at: string;
  kri_value?: KRIValue | null;
  protocol?: { id: string; title: string | null; protocol_number: string | null } | null;
  site?: { id: string; site_number: string | null; organization?: { name: string } | null } | null;
  acknowledged_by?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface CreateKRIDefinitionInput {
  name: string;
  description?: string;
  category: KRICategory;
  calculation_method?: string;
  unit?: string;
  data_source?: string;
  is_active?: boolean;
}

export interface SetKRIThresholdInput {
  kri_definition_id: string;
  protocol_id?: string | null;
  green_upper?: number | null;
  yellow_upper?: number | null;
  red_upper?: number | null;
  direction?: KRIDirection;
  effective_date?: string | null;
}

export interface RecordKRIValueInput {
  kri_definition_id: string;
  protocol_id?: string | null;
  site_id?: string | null;
  value: number;
  measurement_date?: string;
  notes?: string;
}

export interface KRIDashboardData {
  total_definitions: number;
  active_definitions: number;
  total_values: number;
  total_alerts: number;
  active_alerts: number;
  acknowledged_alerts: number;
  yellow_alerts: number;
  red_alerts: number;
  recent_values: KRIValue[];
  recent_alerts: KRIAlert[];
}
