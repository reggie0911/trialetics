export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'url';

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Single Select',
  multiselect: 'Multi Select',
  boolean: 'Yes/No',
  url: 'URL',
};

export interface CustomTrackerDefinition {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  entity_type: string | null;
  columns: Record<string, unknown>[];
  active: boolean;
  /** Platform licensing; must be true along with company.has_tracker_access */
  platform_access_enabled?: boolean;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  created_by?: { id: string; first_name: string | null; last_name: string | null } | null;
  fields?: CustomField[];
}

export interface CustomField {
  id: string;
  company_id: string;
  tracker_definition_id: string;
  field_name: string;
  field_type: CustomFieldType;
  field_label: string;
  options: Record<string, unknown> | null;
  required: boolean;
  sort_order: number;
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  company_id: string;
  tracker_definition_id: string;
  entity_id: string;
  field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
  value_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTrackerDefinitionInput {
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  entity_type?: string;
}

export interface UpdateTrackerDefinitionInput {
  name?: string;
  description?: string;
  icon?: string;
  entity_type?: string;
  active?: boolean;
}

export interface CreateCustomFieldInput {
  tracker_definition_id: string;
  field_name: string;
  field_type: CustomFieldType;
  field_label: string;
  options?: Record<string, unknown>;
  required?: boolean;
  sort_order?: number;
}

export interface SetCustomFieldValueInput {
  tracker_definition_id: string;
  entity_id: string;
  field_id: string;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_boolean?: boolean;
  value_json?: Record<string, unknown>;
}

export interface TrackerFilters {
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}
