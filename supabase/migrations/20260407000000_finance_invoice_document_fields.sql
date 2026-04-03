-- Add document attachment and AI extraction columns to finance_invoices
ALTER TABLE public.finance_invoices
  ADD COLUMN IF NOT EXISTS document_path TEXT,
  ADD COLUMN IF NOT EXISTS extracted_data JSONB,
  ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ;
