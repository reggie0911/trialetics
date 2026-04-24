-- ─────────────────────────────────────────────────────────────────────────────
-- Visit Window Compliance — Daily Trend View
--
-- Materializes a 14-day window of per-bucket counts for the Visit Window
-- Compliance page so the redesigned KPI strip can render 7-day sparklines and
-- compute "vs prior 7 days" deltas without an N+1 query per card.
--
-- One row per (study_id, day, window_bucket). The 14-day window is anchored on
-- `current_date` so the view always returns the latest two weeks; the rollup
-- action splits the result into the most-recent 7 days (for the sparkline) and
-- the prior 7 days (for the delta). At study scope the count is the sum
-- across sites; site scope filters by site_id directly.
--
-- Bucketing rules mirror `computeVisitWindowStatus` and the existing Visit
-- Schedule rollup views (20260526000000_visit_schedule_rollup_views.sql) — the
-- only behavioural difference is that the date axis is
-- `coalesce(actual_date, planned_date)::date` so each visit lands on the day
-- the activity actually happened (or was scheduled to happen) rather than its
-- creation date.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_visit_window_daily_trend
WITH (security_invoker = true) AS
WITH bucketed AS (
  SELECT
    sub.study_id,
    sub.site_id,
    COALESCE(sv.actual_date, sv.planned_date)::date AS day,
    CASE
      WHEN sv.status IN ('completed','missed','skipped') THEN 'done'
      WHEN sv.planned_date IS NULL OR sv.window_start IS NULL OR sv.window_end IS NULL THEN 'pending'
      WHEN sv.actual_date IS NOT NULL
           AND sv.actual_date BETWEEN sv.window_start AND sv.window_end THEN 'in_window'
      WHEN sv.actual_date IS NOT NULL THEN 'out_of_window'
      WHEN current_date < sv.window_start THEN 'upcoming'
      WHEN current_date > sv.window_end  THEN 'overdue'
      ELSE 'due_now'
    END AS window_bucket
  FROM public.subject_visits sv
  JOIN public.subjects sub ON sub.id = sv.subject_id
  WHERE COALESCE(sv.actual_date, sv.planned_date) IS NOT NULL
    AND COALESCE(sv.actual_date, sv.planned_date)::date BETWEEN current_date - INTERVAL '13 days' AND current_date
)
SELECT
  b.study_id,
  b.site_id,
  b.day,
  b.window_bucket,
  COUNT(*) AS bucket_count
FROM bucketed b
GROUP BY b.study_id, b.site_id, b.day, b.window_bucket;

GRANT SELECT ON public.v_visit_window_daily_trend TO authenticated;
