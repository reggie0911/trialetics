-- Optional "Not available" reason text per document availability question.
-- Each column captures free-text justification when *_available = 'no'.

ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS monitoring_visit_log_unavailable_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS visit_confirmation_letter_unavailable_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS visit_followup_letter_unavailable_reason TEXT NULL;
