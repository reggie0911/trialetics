// =============================================
// Payment Accruals Types
// GAP P6: Accruals and Obligations Tracking
// =============================================

export type AccrualStatus = 'draft' | 'calculated' | 'approved' | 'posted';

export const ACCRUAL_STATUS_LABELS: Record<AccrualStatus, string> = {
  draft: 'Draft',
  calculated: 'Calculated',
  approved: 'Approved',
  posted: 'Posted',
};

export interface PaymentAccrual {
  id: string;
  company_id: string;
  protocol_id: string;
  site_id: string | null;
  period_start: string;
  period_end: string;
  accrued_amount: number;
  actual_amount: number;
  variance: number;
  category: string | null;
  status: AccrualStatus;
  calculation_basis: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAccrualWithRelations extends PaymentAccrual {
  protocol?: { protocol_number: string; title: string } | null;
  site?: { site_number: string | null } | null;
}

export interface CreatePaymentAccrualData {
  protocol_id: string;
  site_id?: string | null;
  period_start: string;
  period_end: string;
  accrued_amount: number;
  actual_amount?: number;
  category?: string | null;
  calculation_basis?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentAccrualData {
  accrued_amount?: number;
  actual_amount?: number;
  status?: AccrualStatus;
  notes?: string | null;
}

export interface AccrualFilters {
  protocol_id?: string;
  site_id?: string;
  status?: AccrualStatus | 'all';
  period_start?: string;
  period_end?: string;
  page?: number;
  pageSize?: number;
}

export interface AccrualSummary {
  total_accrued: number;
  total_actual: number;
  total_variance: number;
  by_category: Array<{
    category: string;
    accrued: number;
    actual: number;
    variance: number;
  }>;
}

export interface FutureObligation {
  site_id: string;
  site_number: string | null;
  protocol_id: string;
  remaining_visits: number;
  expected_payment_per_visit: number;
  total_obligation: number;
}
