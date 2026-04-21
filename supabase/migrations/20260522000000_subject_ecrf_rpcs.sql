-- =====================================================
-- Subject eCRF RPCs:
--   - snapshot_ecrf_to_subject(p_subject_id)        — initial snapshot at create
--   - resync_ecrf_to_subject(p_subject_id)          — add-only resync to latest live
--   - apply_subject_crf_patch(p_subject_crf_id, p_patch jsonb)
--                                                   — atomic UPDATE + audit log
--                                                     with SDV/Lock-implies-DE cascade
-- All run as SECURITY INVOKER so RLS (subject_crfs + audit log) applies.
-- =====================================================

-- ---------------------------------------------------------------
-- snapshot_ecrf_to_subject(p_subject_id uuid)
-- Idempotent: no-op if subject is already pinned to the current live version.
-- Returns counts {visits_inserted, crfs_inserted, version_id|null}.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_ecrf_to_subject(p_subject_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $snapshot$
#variable_conflict use_variable
DECLARE
  v_study_id           UUID;
  v_existing_version   UUID;
  v_live_version       UUID;
  v_visit              RECORD;
  v_crf                RECORD;
  v_new_subject_visit  UUID;
  v_visits_inserted    INT := 0;
  v_crfs_inserted      INT := 0;
  v_next_visit_number  INT;
BEGIN
  SELECT study_id, template_version_id
    INTO v_study_id, v_existing_version
  FROM public.subjects
  WHERE id = p_subject_id;

  IF v_study_id IS NULL THEN
    RAISE EXCEPTION 'Subject not found.';
  END IF;

  SELECT id INTO v_live_version
  FROM public.study_ecrf_template_versions
  WHERE study_id = v_study_id AND status = 'live'
  LIMIT 1;

  -- No live version published yet: leave the subject un-snapshotted.
  IF v_live_version IS NULL THEN
    RETURN jsonb_build_object(
      'visits_inserted', 0,
      'crfs_inserted',   0,
      'version_id',      NULL
    );
  END IF;

  -- Already snapshotted to the current live version: nothing to do.
  IF v_existing_version IS NOT NULL AND v_existing_version = v_live_version THEN
    RETURN jsonb_build_object(
      'visits_inserted', 0,
      'crfs_inserted',   0,
      'version_id',      v_live_version
    );
  END IF;

  -- Highest visit_number already used by hand-added visits on this subject.
  SELECT COALESCE(MAX(visit_number), 0) INTO v_next_visit_number
  FROM public.subject_visits
  WHERE subject_id = p_subject_id;

  FOR v_visit IN
    SELECT id, visit_name, timepoint_label, timepoint_days, sort_order
    FROM public.study_visit_definitions
    WHERE template_version_id = v_live_version
    ORDER BY sort_order, created_at
  LOOP
    v_next_visit_number := v_next_visit_number + 1;

    INSERT INTO public.subject_visits (
      subject_id,
      visit_name,
      visit_number,
      template_version_id,
      visit_definition_id,
      sort_order
    ) VALUES (
      p_subject_id,
      v_visit.visit_name,
      v_next_visit_number,
      v_live_version,
      v_visit.id,
      v_visit.sort_order
    )
    RETURNING id INTO v_new_subject_visit;

    v_visits_inserted := v_visits_inserted + 1;

    FOR v_crf IN
      SELECT id, name, sort_order
      FROM public.study_crfs
      WHERE template_version_id = v_live_version
        AND visit_definition_id = v_visit.id
      ORDER BY sort_order, created_at
    LOOP
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
        v_new_subject_visit,
        v_crf.id,
        v_live_version,
        v_crf.name,
        v_crf.sort_order,
        1
      );

      v_crfs_inserted := v_crfs_inserted + 1;
    END LOOP;
  END LOOP;

  UPDATE public.subjects
     SET template_version_id = v_live_version,
         template_synced_at  = NOW()
   WHERE id = p_subject_id;

  RETURN jsonb_build_object(
    'visits_inserted', v_visits_inserted,
    'crfs_inserted',   v_crfs_inserted,
    'version_id',      v_live_version
  );
END;
$snapshot$;

-- ---------------------------------------------------------------
-- resync_ecrf_to_subject(p_subject_id uuid)
-- Add-only: for every (visit_definition_id, crf_definition_id) in the current
-- live version not already linked to the subject, insert new rows.
-- Existing rows + their metric values are preserved.
-- Removed/renamed template entries do NOT delete subject rows (regulatory-safe).
-- Returns counts {visits_inserted, crfs_inserted, version_id|null}.
-- ---------------------------------------------------------------
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
  v_visits_inserted    INT := 0;
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
      'visits_inserted', 0,
      'crfs_inserted',   0,
      'version_id',      NULL
    );
  END IF;

  SELECT COALESCE(MAX(visit_number), 0) INTO v_next_visit_number
  FROM public.subject_visits
  WHERE subject_id = p_subject_id;

  FOR v_visit IN
    SELECT id, visit_name, timepoint_label, timepoint_days, sort_order
    FROM public.study_visit_definitions
    WHERE template_version_id = v_live_version
    ORDER BY sort_order, created_at
  LOOP
    SELECT id INTO v_existing_visit_id
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
        sort_order
      ) VALUES (
        p_subject_id,
        v_visit.visit_name,
        v_next_visit_number,
        v_live_version,
        v_visit.id,
        v_visit.sort_order
      )
      RETURNING id INTO v_existing_visit_id;

      v_visits_inserted := v_visits_inserted + 1;
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

  RETURN jsonb_build_object(
    'visits_inserted', v_visits_inserted,
    'crfs_inserted',   v_crfs_inserted,
    'version_id',      v_live_version
  );
END;
$resync$;

-- ---------------------------------------------------------------
-- apply_subject_crf_patch(p_subject_crf_id uuid, p_patch jsonb)
-- Atomic UPDATE + audit-log INSERT of every changed field.
-- Applies the SDV/Lock-implies-DE cascade (one-way: setting SDV or DM Lock to
-- true also flips data_entry true).
--
-- p_patch keys (all optional):
--   data_entry, source_data_review, source_data_verified,
--   pi_signed, data_management_lock        -> boolean (true/false)
--   query_status                           -> 'none' | 'open' | 'answered'
--
-- Returns the number of audit rows written (0 means "no change").
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_subject_crf_patch(
  p_subject_crf_id UUID,
  p_patch          JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
AS $patch$
#variable_conflict use_variable
DECLARE
  v_actor              UUID := auth.uid();
  v_current            RECORD;
  v_events_written     INT  := 0;

  -- Final values (start as the current row, then overlay the patch + cascade).
  v_data_entry         BOOLEAN;
  v_source_data_review BOOLEAN;
  v_source_data_verified BOOLEAN;
  v_pi_signed          BOOLEAN;
  v_data_management_lock BOOLEAN;
  v_query_status       TEXT;

  v_patch_query_status TEXT;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'p_patch must be a JSON object.';
  END IF;

  SELECT * INTO v_current FROM public.subject_crfs WHERE id = p_subject_crf_id;
  IF v_current.id IS NULL THEN
    RAISE EXCEPTION 'subject_crf row not found.';
  END IF;

  -- Start with current values.
  v_data_entry           := v_current.data_entry;
  v_source_data_review   := v_current.source_data_review;
  v_source_data_verified := v_current.source_data_verified;
  v_pi_signed            := v_current.pi_signed;
  v_data_management_lock := v_current.data_management_lock;
  v_query_status         := v_current.query_status;

  -- Overlay patch values when present.
  IF p_patch ? 'data_entry' THEN
    v_data_entry := (p_patch->>'data_entry')::boolean;
  END IF;
  IF p_patch ? 'source_data_review' THEN
    v_source_data_review := (p_patch->>'source_data_review')::boolean;
  END IF;
  IF p_patch ? 'source_data_verified' THEN
    v_source_data_verified := (p_patch->>'source_data_verified')::boolean;
  END IF;
  IF p_patch ? 'pi_signed' THEN
    v_pi_signed := (p_patch->>'pi_signed')::boolean;
  END IF;
  IF p_patch ? 'data_management_lock' THEN
    v_data_management_lock := (p_patch->>'data_management_lock')::boolean;
  END IF;
  IF p_patch ? 'query_status' THEN
    v_patch_query_status := p_patch->>'query_status';
    IF v_patch_query_status NOT IN ('none','open','answered') THEN
      RAISE EXCEPTION 'Invalid query_status: %', v_patch_query_status;
    END IF;
    v_query_status := v_patch_query_status;
  END IF;

  -- Cascade: SDV or Lock => Data Entry (one-way).
  IF v_source_data_verified IS TRUE OR v_data_management_lock IS TRUE THEN
    v_data_entry := TRUE;
  END IF;

  -- Apply the UPDATE.
  UPDATE public.subject_crfs
     SET data_entry           = v_data_entry,
         source_data_review   = v_source_data_review,
         source_data_verified = v_source_data_verified,
         pi_signed            = v_pi_signed,
         data_management_lock = v_data_management_lock,
         query_status         = v_query_status
   WHERE id = p_subject_crf_id;

  -- Write one audit row per CHANGED field.
  IF v_data_entry IS DISTINCT FROM v_current.data_entry THEN
    INSERT INTO public.subject_crf_metric_events
      (subject_crf_id, field, previous_value, new_value, actor_user_id)
    VALUES
      (p_subject_crf_id, 'data_entry',
       v_current.data_entry::text, v_data_entry::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_source_data_review IS DISTINCT FROM v_current.source_data_review THEN
    INSERT INTO public.subject_crf_metric_events
      (subject_crf_id, field, previous_value, new_value, actor_user_id)
    VALUES
      (p_subject_crf_id, 'source_data_review',
       v_current.source_data_review::text, v_source_data_review::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_source_data_verified IS DISTINCT FROM v_current.source_data_verified THEN
    INSERT INTO public.subject_crf_metric_events
      (subject_crf_id, field, previous_value, new_value, actor_user_id)
    VALUES
      (p_subject_crf_id, 'source_data_verified',
       v_current.source_data_verified::text, v_source_data_verified::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_pi_signed IS DISTINCT FROM v_current.pi_signed THEN
    INSERT INTO public.subject_crf_metric_events
      (subject_crf_id, field, previous_value, new_value, actor_user_id)
    VALUES
      (p_subject_crf_id, 'pi_signed',
       v_current.pi_signed::text, v_pi_signed::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_data_management_lock IS DISTINCT FROM v_current.data_management_lock THEN
    INSERT INTO public.subject_crf_metric_events
      (subject_crf_id, field, previous_value, new_value, actor_user_id)
    VALUES
      (p_subject_crf_id, 'data_management_lock',
       v_current.data_management_lock::text, v_data_management_lock::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_query_status IS DISTINCT FROM v_current.query_status THEN
    INSERT INTO public.subject_crf_metric_events
      (subject_crf_id, field, previous_value, new_value, actor_user_id)
    VALUES
      (p_subject_crf_id, 'query_status',
       v_current.query_status, v_query_status, v_actor);
    v_events_written := v_events_written + 1;
  END IF;

  RETURN v_events_written;
END;
$patch$;
