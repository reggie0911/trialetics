// =============================================
// Invoice Module Types
// GAP P1: Invoice Generation System
// =============================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid_in_part' | 'paid_in_full' | 'cancelled' | 'overdue';

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid_in_part: 'Paid in Part',
  paid_in_full: 'Paid in Full',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
};

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string | null;
  site_id: string;
  protocol_id: string | null;
  contract_id: string | null;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  total_amount: number;
  paid_amount: number;
  currency_code: string;
  payment_terms: string | null;
  notes: string | null;
  sent_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceWithRelations extends Invoice {
  site?: { site_number: string | null } | { site_number: string | null }[];
  protocol?: { protocol_number: string; title: string } | { protocol_number: string; title: string }[];
  contract?: { contract_number: string | null } | { contract_number: string | null }[];
  line_items?: InvoiceLineItem[];
  payments?: InvoicePayment[];
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  payment_record_id: string | null;
  payment_activity_id: string | null;
  description: string;
  quantity: number;
  unit_amount: number;
  total_amount: number;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateInvoiceData {
  site_id: string;
  protocol_id?: string | null;
  contract_id?: string | null;
  invoice_date?: string;
  due_date?: string | null;
  currency_code?: string;
  payment_terms?: string | null;
  notes?: string | null;
}

export interface UpdateInvoiceData {
  status?: InvoiceStatus;
  due_date?: string | null;
  payment_terms?: string | null;
  notes?: string | null;
  sent_date?: string | null;
}

export interface CreateInvoiceLineItemData {
  invoice_id: string;
  payment_record_id?: string | null;
  payment_activity_id?: string | null;
  description: string;
  quantity?: number;
  unit_amount: number;
  total_amount: number;
}

export interface CreateInvoicePaymentData {
  invoice_id: string;
  payment_date?: string;
  payment_amount: number;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
}

export interface InvoiceFilters {
  site_id?: string;
  protocol_id?: string;
  status?: InvoiceStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface InvoiceSummaryStats {
  total_invoices: number;
  draft_count: number;
  sent_count: number;
  overdue_count: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
}
