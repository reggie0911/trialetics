// =============================================
// Clinical Payments Module Types
// Based on Oracle CTMS: Setting Up and Making Clinical Payments
// =============================================

// =============================================
// ENUM Types
// =============================================

export type PaymentStatus = 'to_be_processed' | 'pending_approval' | 'approved' | 'rejected' | 'in_progress' | 'processed';

export type PaymentType = 'interim' | 'final' | 'unplanned';

// =============================================
// Label Constants
// =============================================

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  to_be_processed: 'To Be Processed',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  in_progress: 'In Progress',
  processed: 'Processed',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  interim: 'Interim Payment',
  final: 'Final Payment',
  unplanned: 'Unplanned Payment',
};

// =============================================
// Core Entity Interfaces
// =============================================

export interface PaymentException {
  id: string;
  company_id: string;
  site_id: string;
  template_activity_id: string;
  template_visit_id: string;
  protocol_id: string;
  exception_amount: number;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentActivity {
  id: string;
  company_id: string;
  site_id: string;
  subject_activity_id: string | null;
  subject_visit_id: string | null;
  contract_id: string | null;
  payee_contact_id: string | null;
  standard_amount: number;
  deviation_amount: number;
  actual_amount: number;
  currency_code: string;
  is_completed: boolean;
  is_unplanned: boolean;
  payment_record_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  company_id: string;
  site_id: string;
  protocol_id: string | null;
  region_id: string | null;
  contract_id: string | null;
  payee_contact_id: string | null;
  payment_number: string | null;
  payment_type: PaymentType;
  status: PaymentStatus;
  earned_amount: number;
  requested_amount: number;
  check_amount: number | null;
  check_date: string | null;
  check_number: string | null;
  vat_amount: number;
  currency_code: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentSplit {
  id: string;
  payment_activity_id: string;
  contract_id: string;
  payee_contact_id: string | null;
  split_percentage: number;
  split_amount: number;
  created_at: string;
}

export interface PaymentSplitWithRelations extends PaymentSplit {
  contract?: { contract_number: string | null };
  payee?: { first_name: string | null; last_name: string | null };
}

// =============================================
// Extended Interfaces with Relations
// =============================================

export interface PaymentExceptionWithRelations extends PaymentException {
  template_activity?: { activity_name: string };
  template_visit?: { visit_name: string };
}

export interface PaymentActivityWithRelations extends PaymentActivity {
  subject_activity?: { activity_name: string; status: string };
  subject_visit?: { visit_name: string; subject_id: string };
  contract?: { contract_number: string | null };
  payee?: { first_name: string | null; last_name: string | null };
}

export interface PaymentRecordWithRelations extends PaymentRecord {
  site?: { site_number: string | null } | { site_number: string | null }[];
  protocol?: { protocol_number: string } | { protocol_number: string }[];
  contract?: { contract_number: string | null } | { contract_number: string | null }[];
  payee?: { first_name: string | null; last_name: string | null } | { first_name: string | null; last_name: string | null }[];
}

// =============================================
// Form Data Types
// =============================================

export interface CreatePaymentExceptionData {
  template_activity_id: string;
  template_visit_id: string;
  protocol_id: string;
  exception_amount: number;
  currency_code?: string;
}

export interface UpdatePaymentExceptionData {
  exception_amount?: number;
  currency_code?: string;
}

export interface CreatePaymentActivityData {
  subject_activity_id?: string | null;
  subject_visit_id?: string | null;
  contract_id?: string | null;
  payee_contact_id?: string | null;
  standard_amount: number;
  deviation_amount?: number;
  currency_code?: string;
  is_unplanned?: boolean;
}

export interface UpdatePaymentActivityData {
  deviation_amount?: number;
  actual_amount?: number;
  is_completed?: boolean;
  contract_id?: string | null;
  payee_contact_id?: string | null;
}

export interface CreatePaymentRecordData {
  site_id: string;
  protocol_id?: string | null;
  region_id?: string | null;
  contract_id?: string | null;
  payee_contact_id?: string | null;
  payment_type?: PaymentType;
  earned_amount: number;
  requested_amount: number;
  check_amount?: number | null;
  check_date?: string | null;
  check_number?: string | null;
  vat_amount?: number;
  currency_code?: string;
}

export interface UpdatePaymentRecordData {
  status?: PaymentStatus;
  check_amount?: number | null;
  check_date?: string | null;
  check_number?: string | null;
  vat_amount?: number;
}

export interface CreatePaymentSplitData {
  payment_activity_id: string;
  contract_id: string;
  payee_contact_id?: string | null;
  split_percentage: number;
  split_amount: number;
}

export interface UpdatePaymentSplitData {
  contract_id?: string;
  payee_contact_id?: string | null;
  split_percentage?: number;
  split_amount?: number;
}

// =============================================
// Filter Types
// =============================================

export interface PaymentActivityFilters {
  site_id?: string;
  is_completed?: boolean;
  payment_record_id?: string | null;
  page?: number;
  pageSize?: number;
}

export interface PaymentRecordFilters {
  site_id?: string;
  protocol_id?: string;
  region_id?: string;
  status?: PaymentStatus | 'all';
  payment_type?: PaymentType | 'all';
  page?: number;
  pageSize?: number;
}

// =============================================
// Stats Types
// =============================================

export interface ClinicalPaymentsStats {
  total_sites_with_payments: number;
  pending_activities_count: number;
  pending_records_count: number;
  processed_this_month_count: number;
}

// =============================================
// Site Financial Summary (GAP S2, P7)
// =============================================

export interface SiteFinancialSummary {
  site_id: string;
  company_id: string;
  site_number: string | null;
  protocol_id: string | null;
  protocol_number: string | null;
  earned_to_date: number;
  paid_to_date: number;
  remaining_balance: number;
  requested_to_date: number;
  vat_to_date: number;
  withholding_to_date: number;
  pending_records: number;
  processed_records: number;
  total_records: number;
}

// =============================================
// Payment Report Types (GAP P5)
// =============================================

export interface PaymentAgingBucket {
  bucket: string;
  count: number;
  total_amount: number;
}

export interface PaymentAgingReport {
  buckets: PaymentAgingBucket[];
  total_outstanding: number;
  total_count: number;
}

export interface PaymentTrendDataPoint {
  period: string;
  earned: number;
  paid: number;
  record_count: number;
}

export interface ProtocolPaymentSummary {
  protocol_id: string;
  protocol_number: string;
  title: string;
  total_earned: number;
  total_paid: number;
  total_vat: number;
  pending_count: number;
  record_count: number;
  site_count: number;
}
