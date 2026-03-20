-- Visit Report approval signature capture for electronic signing
ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS approval_signature_data TEXT,
  ADD COLUMN IF NOT EXISTS approval_signed_at TIMESTAMPTZ;
