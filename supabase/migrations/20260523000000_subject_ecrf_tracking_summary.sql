-- ─────────────────────────────────────────────────────────────────────────────
-- v_subject_ecrf_tracking_summary
--
-- Per-subject pre-aggregation of subject_crfs metrics so list / funnel views
-- don't need to load every row to render compact summary chips. Percentages
-- are intentionally NOT computed here — they're derived client-side via
-- computeSubjectCrfPercentages so the cap rule (open/answered queries cap
-- SDV%/Lock% at 99%) stays in one place.
--
-- Authorization: relies entirely on the underlying subject_crfs RLS policies;
-- the view is created with security_invoker = true so a query against it runs
-- with the caller's privileges (i.e. only rows their RLS already permits).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_subject_ecrf_tracking_summary
WITH (security_invoker = true) AS
SELECT
  sc.subject_id,
  COALESCE(SUM(sc.data_expected), 0)                       AS data_expected_total,
  COALESCE(SUM((sc.data_entry)::int), 0)                   AS data_entry_total,
  COALESCE(SUM((sc.source_data_verified)::int), 0)         AS sdv_total,
  COALESCE(SUM((sc.data_management_lock)::int), 0)         AS lock_total,
  COUNT(*) FILTER (WHERE sc.query_status = 'open')         AS open_query_count,
  COUNT(*) FILTER (WHERE sc.query_status = 'answered')     AS answered_query_count
FROM public.subject_crfs sc
GROUP BY sc.subject_id;

GRANT SELECT ON public.v_subject_ecrf_tracking_summary TO authenticated;
