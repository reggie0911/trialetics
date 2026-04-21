-- ─────────────────────────────────────────────────────────────────────────────
-- Visit Schedule Rollup Views — subject-, site-, and (site, visit)-level
-- aggregations of `subject_visits`, used by the read-only "Visit Schedule"
-- tabs at site and study scope.
--
-- Each view buckets every subject_visits row into a `window_bucket` using the
-- exact same first-match-wins rules as `computeVisitWindowStatus` in
-- lib/utils/visit-window.ts:
--   1. status in ('completed','missed','skipped')                   -> 'done'
--   2. planned_date / window pair missing                           -> 'pending'
--   3. actual_date set + inside [window_start, window_end]          -> 'in_window'
--   4. actual_date set + outside window                             -> 'out_of_window'
--   5. no actual + current_date < window_start                      -> 'upcoming'
--   6. no actual + current_date > window_end                        -> 'overdue'
--   7. no actual + today in window                                  -> 'due_now'
--
-- Buckets are then summed at three grain levels. All views are
-- security_invoker so the underlying subjects RLS (company-scoped) decides
-- what the caller sees.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── v_subject_visit_schedule_summary ────────────────────────────────────────
-- One row per subject. Bucket counts plus the most recent actual_date so the
-- UI can show "last activity" without an extra round-trip. Drives the
-- "By Subject" rollup table and is summed in JS for the overall totals.
CREATE OR REPLACE VIEW public.v_subject_visit_schedule_summary
WITH (security_invoker = true) AS
WITH bucketed AS (
  SELECT
    sv.subject_id,
    sub.study_id,
    sub.site_id,
    CASE
      WHEN sv.status IN ('completed','missed','skipped') THEN 'done'
      WHEN sv.planned_date IS NULL OR sv.window_start IS NULL OR sv.window_end IS NULL THEN 'pending'
      WHEN sv.actual_date IS NOT NULL
           AND sv.actual_date BETWEEN sv.window_start AND sv.window_end THEN 'in_window'
      WHEN sv.actual_date IS NOT NULL THEN 'out_of_window'
      WHEN current_date < sv.window_start THEN 'upcoming'
      WHEN current_date > sv.window_end  THEN 'overdue'
      ELSE 'due_now'
    END AS window_bucket,
    sv.actual_date
  FROM public.subject_visits sv
  JOIN public.subjects sub ON sub.id = sv.subject_id
)
SELECT
  b.subject_id,
  b.study_id,
  b.site_id,
  COUNT(*)                                                   AS total_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'done')           AS done_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'in_window')      AS in_window_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'out_of_window')  AS out_of_window_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'overdue')        AS overdue_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'due_now')        AS due_now_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'upcoming')       AS upcoming_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'pending')        AS pending_count,
  MAX(b.actual_date)                                         AS last_actual_date
FROM bucketed b
GROUP BY b.subject_id, b.study_id, b.site_id;

GRANT SELECT ON public.v_subject_visit_schedule_summary TO authenticated;

-- ─── v_site_visit_schedule_summary ───────────────────────────────────────────
-- One row per (study_id, site_id). Subject count + bucket sums. Drives the
-- study-level "By Site" rollup table.
CREATE OR REPLACE VIEW public.v_site_visit_schedule_summary
WITH (security_invoker = true) AS
WITH bucketed AS (
  SELECT
    sub.study_id,
    sub.site_id,
    sv.subject_id,
    sv.actual_date,
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
  WHERE sub.site_id IS NOT NULL
)
SELECT
  b.study_id,
  b.site_id,
  COUNT(DISTINCT b.subject_id)                               AS subject_count,
  COUNT(*)                                                   AS total_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'done')           AS done_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'in_window')      AS in_window_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'out_of_window')  AS out_of_window_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'overdue')        AS overdue_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'due_now')        AS due_now_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'upcoming')       AS upcoming_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'pending')        AS pending_count,
  MAX(b.actual_date)                                         AS last_actual_date
FROM bucketed b
GROUP BY b.study_id, b.site_id;

GRANT SELECT ON public.v_site_visit_schedule_summary TO authenticated;

-- ─── v_visit_schedule_summary ────────────────────────────────────────────────
-- One row per (study_id, site_id, visit_name, visit_number, sort_order,
-- timepoint_label, timepoint_days). Used at site scope filtered by site_id,
-- and at study scope summed across site_id in app code (mirrors the
-- collapseVisitsAcrossSites pattern in lib/actions/ecrf-rollup.ts). Sort
-- columns are kept in the GROUP BY so the UI can order rows by protocol
-- sequence without an extra lookup against study_visit_definitions.
CREATE OR REPLACE VIEW public.v_visit_schedule_summary
WITH (security_invoker = true) AS
WITH bucketed AS (
  SELECT
    sub.study_id,
    sub.site_id,
    sv.subject_id,
    sv.visit_name,
    sv.visit_number,
    sv.sort_order,
    sv.timepoint_label,
    sv.timepoint_days,
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
  WHERE sub.site_id IS NOT NULL
)
SELECT
  b.study_id,
  b.site_id,
  b.visit_name,
  b.visit_number,
  b.sort_order,
  b.timepoint_label,
  b.timepoint_days,
  COUNT(DISTINCT b.subject_id)                               AS subject_count,
  COUNT(*)                                                   AS total_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'done')           AS done_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'in_window')      AS in_window_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'out_of_window')  AS out_of_window_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'overdue')        AS overdue_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'due_now')        AS due_now_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'upcoming')       AS upcoming_count,
  COUNT(*) FILTER (WHERE b.window_bucket = 'pending')        AS pending_count
FROM bucketed b
GROUP BY b.study_id, b.site_id, b.visit_name, b.visit_number, b.sort_order, b.timepoint_label, b.timepoint_days;

GRANT SELECT ON public.v_visit_schedule_summary TO authenticated;
