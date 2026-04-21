-- =====================================================
-- trip_reports: post-visit dates (no document upload required)
-- =====================================================
--
-- Adds four optional date columns that capture compliance milestones which,
-- per the Trip Reports gap remediation plan, do not require an associated
-- document upload. They are written by the Visit Report Authoring page's
-- "Post-visit dates" section (CRA + CPM, any status) and surfaced in the
-- Trip Reports tracker.
--
-- Naming note: the application layer refers to this table as
-- `visit_reports` in plan documents, but the canonical table name in this
-- schema is `trip_reports` (see 20260315500000_visit_monitoring.sql).

ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS expected_send_date_confirmation_letter DATE NULL,
  ADD COLUMN IF NOT EXISTS expected_send_date_followup_letter     DATE NULL,
  ADD COLUMN IF NOT EXISTS date_followup_letter_uploaded          DATE NULL,
  ADD COLUMN IF NOT EXISTS date_mvl_log_uploaded                  DATE NULL;
