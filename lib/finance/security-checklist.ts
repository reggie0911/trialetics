/**
 * Manual QA checklist for finance RLS / cross-tenant isolation (no automated runner in repo yet).
 * Run after schema or RPC changes.
 */
export const FINANCE_SECURITY_CHECKLIST: string[] = [
  'User A (company 1) cannot SELECT finance_invoices for company 2 (use second browser / incognito).',
  'User A cannot approve an invoice in company 2 even with direct UUID in RPC finance_invoice_record_decision.',
  'finance_transaction_log has no UPDATE/DELETE policies for authenticated role in Supabase dashboard.',
  'Storage object path must start with caller company_id for bucket finance-documents.',
  'Submitting an invoice requires study in user company; template defaults to company default row.',
];
