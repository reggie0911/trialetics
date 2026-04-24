-- =====================================================
-- Refresh visit window fingerprint on resync
--
-- Background:
--   `resync_ecrf_to_subject` was add-only: it copied the per-template
--   timepoint + window snapshot when inserting NEW subject_visits, but
--   never refreshed those fields on rows that already existed. Because
--   `recompute_subject_visit_dates` reads the snapshot on `subject_visits`
--   (not the live template), edits to a visit definition's
--   `window_before_days` / `window_after_days` never propagated to
--   subjects who had already been syched, even after a recompute.
--
-- Fix:
--   Re-emit `resync_ecrf_to_subject` so it also refreshes the snapshot
--   fingerprint (timepoint_label, timepoint_days, window_before_days,
--   window_after_days, sort_order, visit_name) on EXISTING `subject_visits`
--   rows whose status is still 'scheduled'. Finalized rows
--   (completed / missed / skipped) are never touched, mirroring the
--   guarantee in `recompute_subject_visit_dates`. The trailing
--   `recompute_subject_visit_dates` call then derives correct
--   planned_date / window_start / window_end from the refreshed snapshot.
-- =====================================================

CREATE OR REPLACE FUNCTION public.resync_ecrf_to_subject(p_subject_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $resync$
#variable_conflict use_variable
DECLARE
  v_study_id           UUID;
  v_live_version       UUID;
  v_visit              RECORD;
  v_crf                RECORD;
  v_existing_visit_id  UUID;
  v_existing_status    TEXT;
  v_visits_inserted    INT := 0;
  v_visits_refreshed   INT := 0;
  v_crfs_inserted      INT := 0;
  v_next_visit_number  INT;
BEGIN
  SELECT study_id INTO v_study_id
  FROM public.subjects
  WHERE id = p_subject_id;

  IF v_study_id IS NULL THEN
    RAISE EXCEPTION 'Subject not found.';
  END IF;

  SELECT id INTO v_live_version
  FROM public.study_ecrf_template_versions
  WHERE study_id = v_study_id AND status = 'live'
  LIMIT 1;

  IF v_live_version IS NULL THEN
    RETURN jsonb_build_object(
      'visits_inserted',  0,
      'visits_refreshed', 0,
      'crfs_inserted',    0,
      'version_id',       NULL
    );
  END IF;

  SELECT COALESCE(MAX(visit_number), 0) INTO v_next_visit_number
  FROM public.subject_visits
  WHERE subject_id = p_subject_id;

  FOR v_visit IN
    SELECT id, visit_name, timepoint_label, timepoint_days,
           window_before_days, window_after_days, sort_order
    FROM public.study_visit_definitions
    WHERE template_version_id = v_live_version
    ORDER BY sort_order, created_at
  LOOP
    SELECT id, status INTO v_existing_visit_id, v_existing_status
    FROM public.subject_visits
    WHERE subject_id = p_subject_id
      AND visit_definition_id = v_visit.id
    LIMIT 1;

    IF v_existing_visit_id IS NULL THEN
      v_next_visit_number := v_next_visit_number + 1;

      INSERT INTO public.subject_visits (
        subject_id,
        visit_name,
        visit_number,
        template_version_id,
        visit_definition_id,
        sort_order,
        timepoint_label,
        timepoint_days,
        window_before_days,
        window_after_days
      ) VALUES (
        p_subject_id,
        v_visit.visit_name,
        v_next_visit_number,
        v_live_version,
        v_visit.id,
        v_visit.sort_order,
        v_visit.timepoint_label,
        v_visit.timepoint_days,
        v_visit.window_before_days,
        v_visit.window_after_days
      )
      RETURNING id INTO v_existing_visit_id;

      v_visits_inserted := v_visits_inserted + 1;
    ELSIF v_existing_status = 'scheduled' THEN
      -- Refresh the window/timepoint fingerprint on still-scheduled rows
      -- so a subsequent recompute picks up template edits. Never touch
      -- completed/missed/skipped rows: those represent finalized history.
      UPDATE public.subject_visits
         SET visit_name         = v_visit.visit_name,
             sort_order         = v_visit.sort_order,
             timepoint_label    = v_visit.timepoint_label,
             timepoint_days     = v_visit.timepoint_days,
             window_before_days = v_visit.window_before_days,
             window_after_days  = v_visit.window_after_days,
             template_version_id = v_live_version
       WHERE id = v_existing_visit_id
         AND (
              visit_name         IS DISTINCT FROM v_visit.visit_name
           OR sort_order         IS DISTINCT FROM v_visit.sort_order
           OR timepoint_label    IS DISTINCT FROM v_visit.timepoint_label
           OR timepoint_days     IS DISTINCT FROM v_visit.timepoint_days
           OR window_before_days IS DISTINCT FROM v_visit.window_before_days
           OR window_after_days  IS DISTINCT FROM v_visit.window_after_days
           OR template_version_id IS DISTINCT FROM v_live_version
         );
      IF FOUND THEN
        v_visits_refreshed := v_visits_refreshed + 1;
      END IF;
    END IF;

    FOR v_crf IN
      SELECT id, name, sort_order
      FROM public.study_crfs
      WHERE template_version_id = v_live_version
        AND visit_definition_id = v_visit.id
      ORDER BY sort_order, created_at
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.subject_crfs
        WHERE subject_visit_id = v_existing_visit_id
          AND crf_definition_id = v_crf.id
      ) THEN
        INSERT INTO public.subject_crfs (
          subject_id,
          subject_visit_id,
          crf_definition_id,
          template_version_id,
          crf_name,
          sort_order,
          data_expected
        ) VALUES (
          p_subject_id,
          v_existing_visit_id,
          v_crf.id,
          v_live_version,
          v_crf.name,
          v_crf.sort_order,
          1
        );

        v_crfs_inserted := v_crfs_inserted + 1;
      END IF;
    END LOOP;
  END LOOP;

  UPDATE public.subjects
     SET template_version_id = v_live_version,
         template_synced_at  = NOW()
   WHERE id = p_subject_id;

  -- Recompute planned_date / window_start / window_end from the refreshed
  -- snapshot. Scheduled-only, so finalized history is never touched.
  PERFORM public.recompute_subject_visit_dates(p_subject_id);

  RETURN jsonb_build_object(
    'visits_inserted',  v_visits_inserted,
    'visits_refreshed', v_visits_refreshed,
    'crfs_inserted',    v_crfs_inserted,
    'version_id',       v_live_version
  );
END;
$resync$;
