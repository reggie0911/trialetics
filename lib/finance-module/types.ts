/**
 * Finance Module — Phase 1 type contracts.
 *
 * These types describe the new study-scoped Finance Module domain. They are
 * intentionally separate from any prior finance modules in the repo and are
 * the source of truth for server actions and UI components in
 * `app/protected/studies/[id]/finance-module/...`.
 */

export type FmStatus = 'active' | 'archived';

export type FmBudgetStatus = 'draft' | 'active' | 'archived';

export type FmBudgetVersionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'active'
  | 'superseded'
  | 'rejected';

export type FmBudgetUtilizationBand = 'on_track' | 'at_risk' | 'over_budget';

export type FmUnitBasis =
  | 'fixed'
  | 'per_subject'
  | 'per_visit'
  | 'per_site'
  | 'per_month'
  | 'per_milestone'
  | 'percent_of_total';

export type FmVendorServiceCategory =
  | 'cro'
  | 'data_management'
  | 'central_lab'
  | 'imaging'
  | 'monitoring'
  | 'etmf_ctms'
  | 'clinical_supplies'
  | 'clinical_site'
  | 'logistics'
  | 'irb_ethics'
  | 'regulatory'
  | 'patient_recruitment'
  | 'translation'
  | 'other';

export type FmVendorHealthStatus = 'healthy' | 'at_risk' | 'critical';
export type FmVendorRiskLevel = 'low' | 'medium' | 'high';
export type FmVendorStatus = 'active' | 'inactive' | 'archived';

export type FmContractStatus =
  | 'draft'
  | 'pending_signature'
  | 'active'
  | 'amended'
  | 'expired'
  | 'terminated'
  | 'archived';

export type FmPurchaseOrderStatus = 'open' | 'closed';

export type FmInvoiceApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'disputed';

export type FmInvoicePaymentStatus = 'pending' | 'paid' | 'overdue' | 'disputed' | 'partial';

export type FmPaymentStatus = 'recorded' | 'cleared' | 'failed' | 'voided' | 'on_hold';

export type FmSitePaymentMilestoneType =
  | 'startup'
  | 'visit'
  | 'milestone'
  | 'enrollment'
  | 'closeout'
  | 'holdback'
  | 'other';

export type FmSitePaymentStatus =
  | 'scheduled'
  | 'earned'
  | 'approved'
  | 'paid'
  | 'partial'
  | 'on_hold'
  | 'cancelled';

export type FmChangeOrderTargetType =
  | 'budget_version'
  | 'contract'
  | 'purchase_order'
  | 'site_payment_schedule';

export type FmChangeOrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'cancelled';

export type FmApprovalObjectType =
  | 'budget_version'
  | 'invoice'
  | 'purchase_order'
  | 'change_order'
  | 'site_payment_schedule'
  | 'payment';

export type FmApprovalStatus =
  | 'pending'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'overdue'
  | 'escalated'
  | 'completed';

export type FmApprovalPriority = 'low' | 'medium' | 'high';

// ────────────────────────────────────────────────────────────────────────────
// Row shapes mirror the Supabase tables (snake_case).
// ────────────────────────────────────────────────────────────────────────────

export interface FmWorkspace {
  id: string;
  study_id: string;
  company_id: string;
  base_currency: string;
  fiscal_period_start: string | null;
  fiscal_period_end: string | null;
  finance_owner_user_id: string | null;
  status: FmStatus;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FmBudget {
  id: string;
  study_id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: FmBudgetStatus;
  active_version_id: string | null;
  base_currency: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmBudgetCategory {
  id: string;
  study_id: string;
  company_id: string;
  workspace_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface FmBudgetVersion {
  id: string;
  study_id: string;
  company_id: string;
  budget_id: string;
  version_number: number;
  label: string | null;
  status: FmBudgetVersionStatus;
  notes: string | null;
  base_currency: string;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  activated_at: string | null;
  activated_by: string | null;
  superseded_at: string | null;
  superseded_by_version_id: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmBudgetLineItem {
  id: string;
  study_id: string;
  company_id: string;
  budget_version_id: string;
  category_id: string;
  name: string;
  description: string | null;
  unit_basis: FmUnitBasis;
  quantity: number;
  unit_cost: number;
  currency: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  site_id: string | null;
  vendor_id: string | null;
  contract_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface FmVendor {
  id: string;
  study_id: string;
  company_id: string;
  name: string;
  service_category: FmVendorServiceCategory;
  health_status: FmVendorHealthStatus;
  risk_level: FmVendorRiskLevel;
  status: FmVendorStatus;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmContract {
  id: string;
  study_id: string;
  company_id: string;
  vendor_id: string;
  contract_number: string | null;
  title: string;
  status: FmContractStatus;
  total_value: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  payment_terms: string | null;
  notes: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmPurchaseOrder {
  id: string;
  study_id: string;
  company_id: string;
  vendor_id: string;
  contract_id: string | null;
  category_id: string | null;
  po_number: string;
  description: string | null;
  status: FmPurchaseOrderStatus;
  po_value: number;
  currency: string;
  po_date: string;
  expiration_date: string | null;
  study_area: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmInvoice {
  id: string;
  study_id: string;
  company_id: string;
  vendor_id: string | null;
  site_id: string | null;
  purchase_order_id: string | null;
  contract_id: string | null;
  category_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total_amount: number;
  currency: string;
  approval_status: FmInvoiceApprovalStatus;
  payment_status: FmInvoicePaymentStatus;
  storage_path: string | null;
  ai_extracted_metadata: Record<string, unknown> | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmInvoiceLineItem {
  id: string;
  study_id: string;
  company_id: string;
  invoice_id: string;
  category_id: string | null;
  budget_line_item_id: string | null;
  purchase_order_id: string | null;
  description: string;
  quantity: number;
  unit_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface FmPayment {
  id: string;
  study_id: string;
  company_id: string;
  invoice_id: string | null;
  vendor_id: string | null;
  site_id: string | null;
  payment_number: string | null;
  amount: number;
  currency: string;
  payment_date: string;
  status: FmPaymentStatus;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmSitePaymentSchedule {
  id: string;
  study_id: string;
  company_id: string;
  site_id: string;
  milestone_type: FmSitePaymentMilestoneType;
  milestone_label: string;
  trigger_event: string | null;
  amount: number;
  currency: string;
  per_subject_amount: number | null;
  holdback_pct: number;
  due_date: string | null;
  status: FmSitePaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmChangeOrder {
  id: string;
  study_id: string;
  company_id: string;
  change_number: string | null;
  title: string;
  reason: string | null;
  target_object_type: FmChangeOrderTargetType;
  target_object_id: string;
  delta_amount: number;
  currency: string;
  status: FmChangeOrderStatus;
  submitted_at: string | null;
  approved_at: string | null;
  applied_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmApprovalRequest {
  id: string;
  study_id: string;
  company_id: string;
  object_type: FmApprovalObjectType;
  object_id: string;
  title: string | null;
  amount: number | null;
  currency: string;
  priority: FmApprovalPriority;
  status: FmApprovalStatus;
  current_step: number;
  total_steps: number;
  due_date: string | null;
  submitted_by: string | null;
  submitted_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  workflow_snapshot: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmAuditLog {
  id: string;
  study_id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_user_id: string | null;
  from_state: Record<string, unknown> | null;
  to_state: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

/** Phase 1 cross-cutting: scheduled report definition (Phase 3 runner). */
export interface FmScheduledReport {
  id: string;
  study_id: string;
  company_id: string;
  report_key: string;
  cadence: 'daily' | 'weekly' | 'monthly' | 'once';
  next_run_at: string | null;
  status: 'active' | 'paused' | 'archived';
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmExportJob {
  id: string;
  study_id: string;
  company_id: string;
  export_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  requested_by: string | null;
  payload: Record<string, unknown>;
  result_storage_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface FmForecastScenario {
  id: string;
  study_id: string;
  company_id: string;
  name: string;
  assumptions: Record<string, unknown>;
  status: 'draft' | 'active' | 'archived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FmApprovalDelegation {
  id: string;
  study_id: string;
  company_id: string;
  delegator_user_id: string;
  delegate_user_id: string;
  starts_at: string;
  ends_at: string | null;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface FmApprovalPolicy {
  id: string;
  study_id: string;
  company_id: string;
  name: string;
  rules: Record<string, unknown>;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface FmEntityComment {
  id: string;
  study_id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  /** UUID array from Postgres */
  mention_user_ids: string[];
  resolved_at: string | null;
  resolved_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FmTableView {
  id: string;
  study_id: string;
  company_id: string;
  user_id: string;
  table_key: string;
  name: string;
  state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Display labels (human-readable strings) — used everywhere in UI to keep
// raw enum keys out of customer-visible text per the build instructions.
// ────────────────────────────────────────────────────────────────────────────

export const FM_BUDGET_VERSION_STATUS_LABELS: Record<FmBudgetVersionStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  active: 'Active',
  superseded: 'Superseded',
  rejected: 'Rejected',
};

export const FM_BUDGET_UTILIZATION_LABELS: Record<FmBudgetUtilizationBand, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  over_budget: 'Over Budget',
};

export const FM_VENDOR_SERVICE_CATEGORY_LABELS: Record<FmVendorServiceCategory, string> = {
  cro: 'CRO',
  data_management: 'Data Management',
  central_lab: 'Central Lab',
  imaging: 'Imaging',
  monitoring: 'Monitoring',
  etmf_ctms: 'eTMF / CTMS',
  clinical_supplies: 'Clinical Supplies',
  clinical_site: 'Clinical Site',
  logistics: 'Logistics',
  irb_ethics: 'IRB / Ethics',
  regulatory: 'Regulatory',
  patient_recruitment: 'Patient Recruitment',
  translation: 'Translation',
  other: 'Other',
};

export const FM_VENDOR_HEALTH_LABELS: Record<FmVendorHealthStatus, string> = {
  healthy: 'Healthy',
  at_risk: 'At Risk',
  critical: 'Critical',
};

export const FM_VENDOR_RISK_LABELS: Record<FmVendorRiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const FM_INVOICE_APPROVAL_STATUS_LABELS: Record<FmInvoiceApprovalStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  disputed: 'Disputed',
};

export const FM_INVOICE_PAYMENT_STATUS_LABELS: Record<FmInvoicePaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  disputed: 'Disputed',
  partial: 'Partial',
};

export const FM_PURCHASE_ORDER_STATUS_LABELS: Record<FmPurchaseOrderStatus, string> = {
  open: 'Open',
  closed: 'Closed',
};

export const FM_SITE_PAYMENT_MILESTONE_LABELS: Record<FmSitePaymentMilestoneType, string> = {
  startup: 'Startup',
  visit: 'Visit',
  milestone: 'Milestone',
  enrollment: 'Enrollment',
  closeout: 'Closeout',
  holdback: 'Holdback',
  other: 'Other',
};

export const FM_SITE_PAYMENT_STATUS_LABELS: Record<FmSitePaymentStatus, string> = {
  scheduled: 'Scheduled',
  earned: 'Earned',
  approved: 'Approved',
  paid: 'Paid',
  partial: 'Partial',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

export const FM_APPROVAL_OBJECT_LABELS: Record<FmApprovalObjectType, string> = {
  budget_version: 'Budget Version',
  invoice: 'Invoice',
  purchase_order: 'Purchase Order',
  change_order: 'Change Order',
  site_payment_schedule: 'Site Payment',
  payment: 'Payment',
};

export const FM_APPROVAL_STATUS_LABELS: Record<FmApprovalStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  approved: 'Approved',
  rejected: 'Rejected',
  overdue: 'Overdue',
  escalated: 'Escalated',
  completed: 'Completed',
};

export const FM_APPROVAL_PRIORITY_LABELS: Record<FmApprovalPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const FM_UNIT_BASIS_LABELS: Record<FmUnitBasis, string> = {
  fixed: 'Fixed',
  per_subject: 'Per Subject',
  per_visit: 'Per Visit',
  per_site: 'Per Site',
  per_month: 'Per Month',
  per_milestone: 'Per Milestone',
  percent_of_total: 'Percent of Total',
};

// ────────────────────────────────────────────────────────────────────────────
// In-page tab definitions — drives the horizontal Finance Module subnav.
// ────────────────────────────────────────────────────────────────────────────

export interface FinanceModuleTab {
  segment: string | null;
  label: string;
  description: string;
}

export const FINANCE_MODULE_TABS: FinanceModuleTab[] = [
  { segment: null, label: 'Dashboard', description: 'Real-time overview of finance KPIs, budgets, spend, and obligations.' },
  {
    segment: 'activity',
    label: 'Activity',
    description: 'Audit trail of recent finance changes and approvals.',
  },
  { segment: 'budget', label: 'Budget', description: 'Versioned budgets, categories, and variance.' },
  { segment: 'change-orders', label: 'Change Orders', description: 'Budget and spend amendments with approval flow.' },
  { segment: 'site-payments', label: 'Site Payments', description: 'Site startup, milestone, and visit payments.' },
  { segment: 'vendors', label: 'Vendors', description: 'Vendor contracts, spend, and health.' },
  { segment: 'invoices', label: 'Invoices', description: 'Invoice intake, approval, and payment status.' },
  { segment: 'purchase-orders', label: 'Purchase Orders', description: 'PO commitments, balances, and expirations.' },
  { segment: 'forecasting', label: 'Forecasting', description: 'Enrollment-driven spend forecasting.' },
  { segment: 'approvals', label: 'Approvals', description: 'Pending approvals across budgets, invoices, and POs.' },
  { segment: 'reports', label: 'Reports', description: 'Operational reports and executive rollups.' },
  { segment: 'settings', label: 'Settings', description: 'Workspace settings, categories, and policies.' },
];

export function buildFinanceModulePath(studyId: string, segment: string | null): string {
  const root = `/protected/studies/${studyId}/finance-module`;
  return segment ? `${root}/${segment}` : root;
}
