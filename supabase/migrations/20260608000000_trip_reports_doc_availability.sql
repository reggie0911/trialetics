-- Document availability checklist columns for the Attachments section of trip reports.
-- Each column stores a 3-state answer: NULL = unanswered, 'yes', or 'no'.

ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS monitoring_visit_log_available TEXT NULL
    CHECK (monitoring_visit_log_available IS NULL OR monitoring_visit_log_available IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS visit_confirmation_letter_available TEXT NULL
    CHECK (visit_confirmation_letter_available IS NULL OR visit_confirmation_letter_available IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS visit_followup_letter_available TEXT NULL
    CHECK (visit_followup_letter_available IS NULL OR visit_followup_letter_available IN ('yes', 'no'));
