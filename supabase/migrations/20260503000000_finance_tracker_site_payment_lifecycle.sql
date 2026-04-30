-- Expand Finance Tracker site payment lifecycle for CTMS-triggered payments.

ALTER TABLE public.site_payments
  DROP CONSTRAINT IF EXISTS site_payments_status_check;

ALTER TABLE public.site_payments
  ADD CONSTRAINT site_payments_status_check
  CHECK (
    status IN (
      'not_triggered',
      'triggered',
      'invoice_received',
      'under_review',
      'pending',
      'approved',
      'paid',
      'disputed',
      'on_hold'
    )
  );

ALTER TABLE public.site_payments
  ADD COLUMN IF NOT EXISTS subject_visit_id UUID REFERENCES public.subject_visits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS principal_investigator TEXT,
  ADD COLUMN IF NOT EXISTS country_name TEXT,
  ADD COLUMN IF NOT EXISTS holdback_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pass_through_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_site_payments_subject_visit ON public.site_payments(subject_visit_id);
CREATE INDEX IF NOT EXISTS idx_site_payments_triggered_at ON public.site_payments(triggered_at);
