-- ─────────────────────────────────────────────────────────────────────────────
-- eCRF Tracking dashboard views
--
-- Backs the redesigned eCRF Tracking page (sparklines, last-activity columns,
-- next-action chips). Layered on top of:
--   - subject_crfs                       (live metric matrix)
--   - subject_crf_metric_events          (per-metric audit log)
--   - v_subject_ecrf_tracking_summary    (per-subject totals)
--   - v_visit_ecrf_tracking_summary      (per-(site,visit) totals)
--   - v_visit_schedule_summary           (per-(site,visit) window buckets)
--
-- Conventions follow the rest of the eCRF rollup views:
--   - Counters only; percentages stay in the JS layer
--     (lib/parsers/subject-ecrf-metrics.ts) so the open-query cap rule lives
--     in exactly one place.
--   - security_invoker = true so the underlying subject_crfs / subjects RLS
--     policies (company-scoped) decide what the caller sees.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── v_ecrf_metric_daily ─────────────────────────────────────────────────────
-- One row per (study_id, metric, day) for the last 14 days of activity. The UI
-- renders the last 7 points as a sparkline and uses the previous 7 for the
-- trend-delta arrow on each KPI card.
--
-- Counts only false→true transitions for the boolean metrics (data_entry,
-- source_data_verified, data_management_lock) and the "queries resolved"
-- transition (any value -> 'none' on query_status). This matches what the user
-- understands from a delta line: how many CRFs were freshly entered / verified
-- / locked / resolved on each day, not how many ended that day in that state.
CREATE OR REPLACE VIEW public.v_ecrf_metric_daily
WITH (security_invoker = true) AS
WITH evt AS (
  SELECT
    sub.study_id,
    (e.created_at AT TIME ZONE 'UTC')::date AS day,
    CASE
      WHEN e.field = 'data_entry'
           AND e.new_value = 'true'
           AND COALESCE(e.previous_value, 'false') <> 'true'
        THEN 'data_entry'
      WHEN e.field = 'source_data_verified'
           AND e.new_value = 'true'
           AND COALESCE(e.previous_value, 'false') <> 'true'
        THEN 'sdv'
      WHEN e.field = 'data_management_lock'
           AND e.new_value = 'true'
           AND COALESCE(e.previous_value, 'false') <> 'true'
        THEN 'lock'
      WHEN e.field = 'query_status'
           AND e.new_value = 'none'
           AND COALESCE(e.previous_value, 'none') <> 'none'
        THEN 'queries_resolved'
      ELSE NULL
    END AS metric
  FROM public.subject_crf_metric_events e
  JOIN public.subject_crfs sc ON sc.id = e.subject_crf_id
  JOIN public.subjects     sub ON sub.id = sc.subject_id
  WHERE e.created_at >= (current_date - INTERVAL '14 days')
)
SELECT
  e.study_id,
  e.metric,
  e.day,
  COUNT(*)::int AS count
FROM evt e
WHERE e.metric IS NOT NULL
GROUP BY e.study_id, e.metric, e.day;

GRANT SELECT ON public.v_ecrf_metric_daily TO authenticated;

-- ─── v_subject_ecrf_activity ─────────────────────────────────────────────────
-- One row per subject. Surfaces the most recent timestamp for each tracked
-- metric so the UI can show "Last entry / Last SDV" without N+1 queries.
--
-- Built off subject_crf_metric_events (rather than subject_crfs.updated_at)
-- so we can distinguish DE from SDV from Lock activity instead of collapsing
-- into a single "row touched" timestamp.
CREATE OR REPLACE VIEW public.v_subject_ecrf_activity
WITH (security_invoker = true) AS
SELECT
  sc.subject_id,
  MAX(e.created_at) FILTER (
    WHERE e.field = 'data_entry' AND e.new_value = 'true'
  )                                                        AS last_entry_at,
  MAX(e.created_at) FILTER (
    WHERE e.field = 'source_data_verified' AND e.new_value = 'true'
  )                                                        AS last_sdv_at,
  MAX(e.created_at) FILTER (
    WHERE e.field = 'data_management_lock' AND e.new_value = 'true'
  )                                                        AS last_lock_at,
  -- "Overdue" query = went to 'open' more than 7 days ago and hasn't been
  -- resolved yet (latest non-'open' transition, if any, must predate the open).
  COUNT(DISTINCT sc.id) FILTER (
    WHERE sc.query_status = 'open'
      AND EXISTS (
        SELECT 1 FROM public.subject_crf_metric_events e2
        WHERE e2.subject_crf_id = sc.id
          AND e2.field = 'query_status'
          AND e2.new_value = 'open'
          AND e2.created_at < (NOW() - INTERVAL '7 days')
      )
  )                                                        AS overdue_query_count
FROM public.subject_crfs sc
LEFT JOIN public.subject_crf_metric_events e ON e.subject_crf_id = sc.id
GROUP BY sc.subject_id;

GRANT SELECT ON public.v_subject_ecrf_activity TO authenticated;

-- ─── v_site_ecrf_activity ────────────────────────────────────────────────────
-- One row per (study_id, site_id). Aggregates the per-subject activity into
-- site-level "Last entry / Last SDV / overdue queries" columns.
CREATE OR REPLACE VIEW public.v_site_ecrf_activity
WITH (security_invoker = true) AS
SELECT
  sub.study_id,
  sub.site_id,
  MAX(a.last_entry_at)                          AS last_entry_at,
  MAX(a.last_sdv_at)                            AS last_sdv_at,
  MAX(a.last_lock_at)                           AS last_lock_at,
  COALESCE(SUM(a.overdue_query_count), 0)::int  AS overdue_query_count
FROM public.subjects sub
LEFT JOIN public.v_subject_ecrf_activity a ON a.subject_id = sub.id
WHERE sub.site_id IS NOT NULL
GROUP BY sub.study_id, sub.site_id;

GRANT SELECT ON public.v_site_ecrf_activity TO authenticated;

-- ─── v_visit_ecrf_extras ─────────────────────────────────────────────────────
-- One row per (study_id, visit_name). Joins the eCRF visit rollup with the
-- visit-window rollup so the redesigned "By Visit" table can show timepoint /
-- window / due-status alongside the DE / SDV / Lock counters without a second
-- round-trip.
--
-- subject_count + bucket counts are summed across sites in app code at study
-- scope (mirrors the collapseVisitsAcrossSites pattern in
-- lib/actions/ecrf-rollup.ts) — this view exposes the per-(site,visit) join
-- so the JS layer can collapse it the same way.
CREATE OR REPLACE VIEW public.v_visit_ecrf_extras
WITH (security_invoker = true) AS
SELECT
  vs.study_id,
  vs.site_id,
  vs.visit_name,
  vs.visit_number,
  vs.sort_order,
  vs.timepoint_label,
  vs.timepoint_days,
  vs.subject_count,
  vs.total_count,
  vs.done_count,
  vs.in_window_count,
  vs.out_of_window_count,
  vs.overdue_count,
  vs.due_now_count,
  vs.upcoming_count,
  vs.pending_count,
  -- Window radius from the latest snapshot row for this visit_name. NULL when
  -- no subject_visits row exists yet for this visit (e.g. template change).
  (
    SELECT (sv.window_before_days + sv.window_after_days)
    FROM public.subject_visits sv
    JOIN public.subjects sub ON sub.id = sv.subject_id
    WHERE sub.study_id = vs.study_id
      AND sub.site_id  = vs.site_id
      AND sv.visit_name = vs.visit_name
    ORDER BY sv.created_at DESC
    LIMIT 1
  )                                                         AS window_days
FROM public.v_visit_schedule_summary vs;

GRANT SELECT ON public.v_visit_ecrf_extras TO authenticated;
