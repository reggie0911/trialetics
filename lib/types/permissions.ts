/**
 * Module Permissions System Types
 * Role-based defaults and user-level overrides for module access control
 */

export interface ModulePermission {
  module_name: string;
  module_label: string;
  is_hidden: boolean;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface EffectivePermission extends ModulePermission {
  is_overridden: boolean;
  role_default: {
    is_hidden: boolean;
    can_read: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

export interface PermissionOverride {
  module_name: string;
  is_hidden: boolean | null;
  can_read: boolean | null;
  can_create: boolean | null;
  can_edit: boolean | null;
  can_delete: boolean | null;
}

export interface UserBasicInfo {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: string;
}

/** Human-readable labels for module names */
export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  contacts_organizations: "Contacts & Organizations",
  org_chart: "Organization Chart",
  trip_reports: "Clinical Trip Reports",
  document_management: "Document Management",
  clinical_trials: "Clinical Trials Management",
  activity_calendar: "Activity Calendar",
  rate_lists: "Rate Lists",
  clinical_payments: "Clinical Payments",
  clinical_training: "Clinical Training",
  visit_templates: "Visit Templates",
  source_data_verification: "Source Data Verification",
  mrace_tracker: "MRace Tracker",
  ae_metrics: "AE Metrics",
  ecrf_query_tracker: "eCRF Query Tracker",
  sdv_tracker: "SDV Tracker",
  visit_window: "Visit Window",
  med_compliance: "Medication Compliance",
};

/** Ordered list of module names for consistent display */
export const MODULE_ORDER: string[] = [
  "dashboard",
  "contacts_organizations",
  "org_chart",
  "trip_reports",
  "document_management",
  "clinical_trials",
  "activity_calendar",
  "rate_lists",
  "clinical_payments",
  "clinical_training",
  "visit_templates",
  "source_data_verification",
  "mrace_tracker",
  "ae_metrics",
  "ecrf_query_tracker",
  "sdv_tracker",
  "visit_window",
  "med_compliance",
];

export function getModuleLabel(moduleName: string): string {
  return MODULE_LABELS[moduleName] ?? moduleName;
}
