export type VendorCategory = 'cro' | 'lab' | 'logistics' | 'technology' | 'consulting' | 'other';
export type VendorContractStatus = 'draft' | 'active' | 'expired' | 'terminated';
export type VendorDeliverableStatus = 'pending' | 'in_progress' | 'delivered' | 'accepted' | 'rejected';
export type VendorKPIStatus = 'on_track' | 'at_risk' | 'behind';

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  cro: 'CRO',
  lab: 'Laboratory',
  logistics: 'Logistics',
  technology: 'Technology',
  consulting: 'Consulting',
  other: 'Other',
};

export const VENDOR_CONTRACT_STATUS_LABELS: Record<VendorContractStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
};

export const VENDOR_DELIVERABLE_STATUS_LABELS: Record<VendorDeliverableStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export const VENDOR_KPI_STATUS_LABELS: Record<VendorKPIStatus, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  behind: 'Behind',
};

export interface VendorProfile {
  id: string;
  organization_id: string;
  company_id: string;
  vendor_category: VendorCategory;
  services_description: string | null;
  contract_status: VendorContractStatus;
  qualification_status: string | null;
  qualified_date: string | null;
  qualification_expiry_date: string | null;
  primary_contact_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  organization?: { id: string; name: string } | null;
  primary_contact?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export interface VendorContract {
  id: string;
  vendor_profile_id: string;
  company_id: string;
  protocol_id: string | null;
  contract_number: string | null;
  title: string;
  contract_type: string | null;
  start_date: string | null;
  end_date: string | null;
  total_value: number | null;
  currency: string;
  status: VendorContractStatus;
  scope_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorDeliverable {
  id: string;
  vendor_contract_id: string;
  company_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_date: string | null;
  status: VendorDeliverableStatus;
  acceptance_criteria: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorKPI {
  id: string;
  vendor_profile_id: string;
  company_id: string;
  kpi_name: string;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
  measurement_period_start: string | null;
  measurement_period_end: string | null;
  status: VendorKPIStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
