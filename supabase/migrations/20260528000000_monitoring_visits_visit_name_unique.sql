-- =====================================================
-- monitoring_visits: auto-numbered visit_name + uniqueness
-- =====================================================
--
-- Goal: ensure every monitoring visit has a deterministic, immutable
-- `visit_name` of the form `${VISIT_TYPE_LABEL} -${n}`, where `n` is a 1-based
-- counter scoped to (study_id, site_id, visit_type). Cancelled visits keep
-- their slot. The application-side counter lives in
-- `lib/actions/visit-reports.ts::createSiteVisitWithReport` and retries once
-- on the unique-violation (Postgres `23505`) added below in case of
-- concurrent inserts.
--
-- This migration runs in two phases:
--   1) Backfill: assign a visit_name to every legacy row that is currently
--      NULL, ranked by (created_at, id) within (study_id, site_id, visit_type)
--      so the lowest-created visit becomes "-1", next "-2", etc.
--   2) Constraint: add a UNIQUE index on
--      (study_id, site_id, visit_type, visit_name) so future writes that
--      would collide raise `23505`. The application layer recovers by
--      recomputing the next available number and retrying once.

-- ---------- Phase 1: backfill legacy NULL visit_name ----------
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY study_id, site_id, visit_type
      ORDER BY created_at, id
    ) AS rn,
    CASE visit_type
      WHEN 'routine'    THEN 'Routine'
      WHEN 'for_cause'  THEN 'For Cause'
      WHEN 'close_out'  THEN 'Close-Out Visit'
      WHEN 'pre_study'  THEN 'Pre-Study'
      WHEN 'interim'    THEN 'Interim'
      WHEN 'sqv'        THEN 'Site Qualification Visit'
      WHEN 'siv'        THEN 'Site Initiation Visit'
      WHEN 'monitoring' THEN 'Interim Monitoring Visit'
      WHEN 'training'   THEN 'Training Visit'
      ELSE visit_type
    END AS label
  FROM public.monitoring_visits
)
UPDATE public.monitoring_visits mv
SET visit_name = ranked.label || ' -' || ranked.rn
FROM ranked
WHERE mv.id = ranked.id
  AND mv.visit_name IS NULL;

-- ---------- Phase 2: enforce uniqueness going forward ----------
-- A partial unique index keeps the constraint defense-in-depth even if a
-- future code path re-introduces NULL visit_name rows (which would simply
-- fall outside the index instead of breaking the migration).
CREATE UNIQUE INDEX IF NOT EXISTS monitoring_visits_uniq_visit_name_per_site_type
  ON public.monitoring_visits (study_id, site_id, visit_type, visit_name)
  WHERE visit_name IS NOT NULL;
