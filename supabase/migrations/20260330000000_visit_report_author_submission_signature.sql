-- CRA submit / resubmit electronic attestation (distinct from approver approval_signature_*)
ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS author_submission_signature_data TEXT,
  ADD COLUMN IF NOT EXISTS author_submission_signed_at TIMESTAMPTZ;
