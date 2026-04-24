-- =====================================================
-- Bulk resync: fan a single subject resync out to every
-- non-terminal subject in a study.
--
-- Background:
--   `resync_ecrf_to_subject(p_subject_id)` (regulatory-safe, add-only)
--   materializes any new live-template visits / CRFs onto a single
--   subject and refreshes the visit window fingerprint on still-
--   scheduled rows. Until now it had to be invoked per subject
--   (manual "Resync to latest live template" button), which meant a
--   freshly-published live template did not actually appear on any
--   existing subject until somebody clicked through.
--
-- This helper is intended to run from `publishVersion` immediately
-- after `publish_ecrf_template_version` succeeds so the new live
-- template is propagated to every active subject in one shot.
--
-- Definitions:
--   non-terminal subject = status NOT IN
--     ('screen_failed','completed','withdrawn','discontinued')
--   Terminal subjects keep whatever snapshot they were finalized on
--   (regulatory: never re-touch closed records).
--
-- SECURITY INVOKER preserves audit attribution and RLS — callers must
-- already have write access to every subject they touch. `publishVersion`
-- gates this with `assertEcrfAdminForStudy`.
--
-- Returns JSONB:
--   { "subjects": int, "visits_added": int, "crfs_added": int }
-- =====================================================

CREATE OR REPLACE FUNCTION public.resync_ecrf_for_study(p_study_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $resync_study$
#variable_conflict use_variable
DECLARE
  v_subject       RECORD;
  v_result        JSONB;
  v_subjects      INT := 0;
  v_visits_added  INT := 0;
  v_crfs_added    INT := 0;
BEGIN
  IF p_study_id IS NULL THEN
    RAISE EXCEPTION 'p_study_id is required.';
  END IF;

  FOR v_subject IN
    SELECT id
      FROM public.subjects
     WHERE study_id = p_study_id
       AND status NOT IN ('screen_failed','completed','withdrawn','discontinued')
     ORDER BY created_at
  LOOP
    v_result := public.resync_ecrf_to_subject(v_subject.id);
    v_subjects     := v_subjects     + 1;
    v_visits_added := v_visits_added + COALESCE((v_result->>'visits_added')::INT, 0);
    v_crfs_added   := v_crfs_added   + COALESCE((v_result->>'crfs_added')::INT, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'subjects',     v_subjects,
    'visits_added', v_visits_added,
    'crfs_added',   v_crfs_added
  );
END;
$resync_study$;
