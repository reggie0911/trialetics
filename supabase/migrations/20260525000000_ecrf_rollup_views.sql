-- ─────────────────────────────────────────────────────────────────────────────
-- eCRF Rollup Views — site-level and (site, visit)-level pre-aggregations
--
-- Layered on top of v_subject_ecrf_tracking_summary (see
-- 20260523000000_subject_ecrf_tracking_summary.sql) and the raw subject_crfs
-- table. Used to drive the read-only "eCRF Tracking" tabs at site and study
-- scope without N+1 queries.
--
-- Same conventions as the per-subject summary view:
--   - Counters only; percentages stay in the JS layer
--     (lib/parsers/subject-ecrf-metrics.ts) so the open-query cap rule lives
--     in exactly one place.
--   - security_invoker = true so the underlying subject_crfs / subjects RLS
--     policies (company-scoped) decide what the caller sees.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── v_site_ecrf_tracking_summary ────────────────────────────────────────────
-- One row per (study_id, site_id). Aggregates the per-subject summary rows
-- along with a subject_count so the UI can show "N subjects" alongside the
-- DE/SDV/Lock totals at the site level.
CREATE OR REPLACE VIEW public.v_site_ecrf_tracking_summary
WITH (security_invoker = true) AS
SELECT
  sub.study_id,
  sub.site_id,
  COUNT(DISTINCT sub.id)                                  AS subject_count,
  COALESCE(SUM(s.data_expected_total), 0)                 AS data_expected_total,
  COALESCE(SUM(s.data_entry_total), 0)                    AS data_entry_total,
  COALESCE(SUM(s.sdv_total), 0)                           AS sdv_total,
  COALESCE(SUM(s.lock_total), 0)                          AS lock_total,
  COALESCE(SUM(s.open_query_count), 0)                    AS open_query_count,
  COALESCE(SUM(s.answered_query_count), 0)                AS answered_query_count
FROM public.subjects sub
LEFT JOIN public.v_subject_ecrf_tracking_summary s
  ON s.subject_id = sub.id
WHERE sub.site_id IS NOT NULL
GROUP BY sub.study_id, sub.site_id;

GRANT SELECT ON public.v_site_ecrf_tracking_summary TO authenticated;

-- ─── v_visit_ecrf_tracking_summary ───────────────────────────────────────────
-- One row per (study_id, site_id, visit_name). Aggregates over subject_crfs
-- joined to subject_visits + subjects so we can render a "By Visit" rollup at
-- both site scope (filter by site_id) and study scope (sum across site_id in
-- application code, avoiding a 4th SQL view).
--
-- Returning subject_count makes the on-screen "# subjects with this visit"
-- column trivial without an extra round-trip.
CREATE OR REPLACE VIEW public.v_visit_ecrf_tracking_summary
WITH (security_invoker = true) AS
SELECT
  sub.study_id,
  sub.site_id,
  sv.visit_name,
  COUNT(DISTINCT sub.id)                                  AS subject_count,
  COALESCE(SUM(sc.data_expected), 0)                      AS data_expected_total,
  COALESCE(SUM((sc.data_entry)::int), 0)                  AS data_entry_total,
  COALESCE(SUM((sc.source_data_verified)::int), 0)        AS sdv_total,
  COALESCE(SUM((sc.data_management_lock)::int), 0)        AS lock_total,
  COUNT(*) FILTER (WHERE sc.query_status = 'open')        AS open_query_count,
  COUNT(*) FILTER (WHERE sc.query_status = 'answered')    AS answered_query_count
FROM public.subject_crfs sc
JOIN public.subject_visits sv ON sv.id = sc.subject_visit_id
JOIN public.subjects sub      ON sub.id = sc.subject_id
WHERE sub.site_id IS NOT NULL
GROUP BY sub.study_id, sub.site_id, sv.visit_name;

GRANT SELECT ON public.v_visit_ecrf_tracking_summary TO authenticated;
