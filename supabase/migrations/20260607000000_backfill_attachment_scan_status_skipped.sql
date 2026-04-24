-- Backfill: antivirus scanning has been disabled. Any rows still in
-- scan_status='pending' will never be resolved by the Edge Function, so
-- mark them as 'skipped' so they become downloadable. Rows in states
-- 'clean', 'infected', 'error', and 'skipped' are left untouched.

UPDATE public.visit_report_attachments
SET
  scan_status = 'skipped',
  scan_status_at = COALESCE(scan_status_at, now())
WHERE scan_status = 'pending';
