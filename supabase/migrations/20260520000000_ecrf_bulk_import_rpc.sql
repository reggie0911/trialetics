-- =====================================================
-- eCRF RPCs: bulk import, version publish, version clone.
-- All run as SECURITY INVOKER so RLS (admin + company scope) applies.
-- =====================================================

-- ---------------------------------------------------------------
-- publish_ecrf_template_version(version_id uuid)
-- Atomically archive any current 'live' version for the study and promote
-- the target version to 'live'. Relies on the partial unique index
-- one_live_ecrf_version_per_study to prevent races.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_ecrf_template_version(p_version_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $publish$
#variable_conflict use_variable
DECLARE
  v_study_id UUID;
  v_status   TEXT;
BEGIN
  SELECT study_id, status INTO v_study_id, v_status
  FROM public.study_ecrf_template_versions
  WHERE id = p_version_id;

  IF v_study_id IS NULL THEN
    RAISE EXCEPTION 'Version not found.';
  END IF;

  IF v_status = 'live' THEN
    RETURN;
  END IF;

  IF v_status NOT IN ('draft','archived') THEN
    RAISE EXCEPTION 'Cannot publish version with status %.', v_status;
  END IF;

  UPDATE public.study_ecrf_template_versions
     SET status = 'archived', archived_at = NOW()
   WHERE study_id = v_study_id AND status = 'live';

  UPDATE public.study_ecrf_template_versions
     SET status = 'live', published_at = NOW(), archived_at = NULL
   WHERE id = p_version_id;
END;
$publish$;

-- ---------------------------------------------------------------
-- clone_ecrf_template_version(source_version_id, name)
-- Create a new draft version copying every visit/CRF/question from the source.
-- Returns the new version's UUID.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clone_ecrf_template_version(
  p_source_version_id UUID,
  p_name              TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $clone$
#variable_conflict use_variable
DECLARE
  v_study_id    UUID;
  v_new_id      UUID;
  v_next_number INT;
  v_visit_map   JSONB := '{}'::jsonb;
  v_crf_map     JSONB := '{}'::jsonb;
  v_visit       RECORD;
  v_crf         RECORD;
  v_new_vid     UUID;
  v_new_cid     UUID;
BEGIN
  SELECT study_id INTO v_study_id
  FROM public.study_ecrf_template_versions
  WHERE id = p_source_version_id;

  IF v_study_id IS NULL THEN
    RAISE EXCEPTION 'Source version not found.';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_number
  FROM public.study_ecrf_template_versions
  WHERE study_id = v_study_id;

  INSERT INTO public.study_ecrf_template_versions
    (study_id, version_number, name, status, created_by)
  VALUES
    (v_study_id, v_next_number, COALESCE(p_name, 'Version ' || v_next_number),
     'draft', auth.uid())
  RETURNING id INTO v_new_id;

  -- Clone visits row-by-row so we can record the old_id -> new_id mapping.
  FOR v_visit IN
    SELECT id, study_id, visit_name, timepoint_label, timepoint_days, sort_order
    FROM public.study_visit_definitions
    WHERE template_version_id = p_source_version_id
    ORDER BY sort_order, created_at
  LOOP
    INSERT INTO public.study_visit_definitions
      (study_id, template_version_id, visit_name, timepoint_label, timepoint_days, sort_order)
    VALUES
      (v_visit.study_id, v_new_id, v_visit.visit_name, v_visit.timepoint_label,
       v_visit.timepoint_days, v_visit.sort_order)
    RETURNING id INTO v_new_vid;

    v_visit_map := v_visit_map || jsonb_build_object(v_visit.id::text, v_new_vid::text);
  END LOOP;

  -- Clone CRFs row-by-row, mapping their visit_definition_id to the new id.
  FOR v_crf IN
    SELECT id, study_id, visit_definition_id, name, description, sort_order
    FROM public.study_crfs
    WHERE template_version_id = p_source_version_id
    ORDER BY sort_order, created_at
  LOOP
    INSERT INTO public.study_crfs
      (study_id, template_version_id, visit_definition_id, name, description, sort_order)
    VALUES
      (v_crf.study_id, v_new_id,
       (v_visit_map->>v_crf.visit_definition_id::text)::uuid,
       v_crf.name, v_crf.description, v_crf.sort_order)
    RETURNING id INTO v_new_cid;

    v_crf_map := v_crf_map || jsonb_build_object(v_crf.id::text, v_new_cid::text);
  END LOOP;

  -- Clone questions, mapping crf_id to the new CRF.
  INSERT INTO public.study_crf_questions
    (crf_id, template_version_id, label, help_text, question_type, options, required, sort_order)
  SELECT
    (v_crf_map->>q.crf_id::text)::uuid,
    v_new_id,
    q.label, q.help_text, q.question_type, q.options, q.required, q.sort_order
  FROM public.study_crf_questions q
  WHERE q.template_version_id = p_source_version_id;

  RETURN v_new_id;
END;
$clone$;

-- ---------------------------------------------------------------
-- bulk_import_ecrf(study_id, version_id, payload jsonb, mode text)
-- Performs the append/upsert/replace import in a single transaction.
-- payload is an array of normalized rows (see lib/parsers/ecrf-csv.ts).
-- Returns a JSON object with counts.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bulk_import_ecrf(
  p_study_id   UUID,
  p_version_id UUID,
  p_payload    JSONB,
  p_mode       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $bulk$
#variable_conflict use_variable
DECLARE
  v_status               TEXT;
  v_owning_study         UUID;
  v_visits_created       INT := 0;
  v_visits_updated       INT := 0;
  v_crfs_created         INT := 0;
  v_crfs_updated         INT := 0;
  v_questions_created    INT := 0;
  v_questions_updated    INT := 0;
  rec                    JSONB;
  v_visit_id             UUID;
  v_crf_id               UUID;
  v_question_id          UUID;
  v_visit_seq            INT;
  v_crf_seq              INT;
  v_question_seq         INT;
  v_visit_key            TEXT;
  v_crf_key              TEXT;
  v_visit_seen           JSONB := '{}'::jsonb;
  v_crf_seen             JSONB := '{}'::jsonb;
BEGIN
  IF p_mode NOT IN ('append','upsert','replace') THEN
    RAISE EXCEPTION 'Invalid mode: %', p_mode;
  END IF;

  SELECT study_id, status INTO v_owning_study, v_status
  FROM public.study_ecrf_template_versions
  WHERE id = p_version_id;

  IF v_owning_study IS NULL THEN
    RAISE EXCEPTION 'Template version not found.';
  END IF;

  IF v_owning_study <> p_study_id THEN
    RAISE EXCEPTION 'Template version does not belong to this study.';
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Cannot edit a % version. Clone it to a new draft first.', v_status;
  END IF;

  IF p_mode = 'replace' THEN
    DELETE FROM public.study_crf_questions WHERE template_version_id = p_version_id;
    DELETE FROM public.study_crfs          WHERE template_version_id = p_version_id;
    DELETE FROM public.study_visit_definitions WHERE template_version_id = p_version_id;
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(p_payload)
  LOOP
    v_visit_key := rec->>'visit_name';
    IF v_visit_key IS NULL OR length(trim(v_visit_key)) = 0 THEN
      RAISE EXCEPTION 'visit_name is required on every row.';
    END IF;

    v_visit_id := NULL;

    -- Resolve / create the visit.
    IF (v_visit_seen ? v_visit_key) THEN
      v_visit_id := (v_visit_seen->>v_visit_key)::uuid;
    ELSE
      IF p_mode IN ('upsert') THEN
        SELECT id INTO v_visit_id FROM public.study_visit_definitions
         WHERE template_version_id = p_version_id AND visit_name = v_visit_key
         LIMIT 1;
      END IF;

      IF v_visit_id IS NULL THEN
        SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_visit_seq
          FROM public.study_visit_definitions
         WHERE template_version_id = p_version_id;

        INSERT INTO public.study_visit_definitions
          (study_id, template_version_id, visit_name, timepoint_label, timepoint_days, sort_order)
        VALUES (
          p_study_id, p_version_id,
          v_visit_key,
          NULLIF(rec->>'visit_timepoint_label', ''),
          NULLIF(rec->>'visit_timepoint_days','')::int,
          v_visit_seq
        )
        RETURNING id INTO v_visit_id;

        v_visits_created := v_visits_created + 1;
      ELSE
        UPDATE public.study_visit_definitions
           SET timepoint_label = COALESCE(NULLIF(rec->>'visit_timepoint_label',''), timepoint_label),
               timepoint_days  = COALESCE(NULLIF(rec->>'visit_timepoint_days','')::int, timepoint_days)
         WHERE id = v_visit_id;
        v_visits_updated := v_visits_updated + 1;
      END IF;

      v_visit_seen := v_visit_seen || jsonb_build_object(v_visit_key, v_visit_id::text);
    END IF;

    -- Resolve / create the CRF (skip if blank — visit-only row).
    IF NULLIF(rec->>'crf_name','') IS NOT NULL THEN
      v_crf_key := v_visit_id::text || '|' || (rec->>'crf_name');
      v_crf_id := NULL;

      IF (v_crf_seen ? v_crf_key) THEN
        v_crf_id := (v_crf_seen->>v_crf_key)::uuid;
      ELSE
        IF p_mode = 'upsert' THEN
          SELECT id INTO v_crf_id FROM public.study_crfs
           WHERE template_version_id = p_version_id
             AND visit_definition_id = v_visit_id
             AND name = (rec->>'crf_name')
           LIMIT 1;
        END IF;

        IF v_crf_id IS NULL THEN
          SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_crf_seq
            FROM public.study_crfs
           WHERE visit_definition_id = v_visit_id;

          INSERT INTO public.study_crfs
            (study_id, template_version_id, visit_definition_id, name, description, sort_order)
          VALUES (
            p_study_id, p_version_id, v_visit_id,
            rec->>'crf_name',
            NULLIF(rec->>'crf_description',''),
            v_crf_seq
          )
          RETURNING id INTO v_crf_id;

          v_crfs_created := v_crfs_created + 1;
        ELSE
          UPDATE public.study_crfs
             SET description = COALESCE(NULLIF(rec->>'crf_description',''), description)
           WHERE id = v_crf_id;
          v_crfs_updated := v_crfs_updated + 1;
        END IF;

        v_crf_seen := v_crf_seen || jsonb_build_object(v_crf_key, v_crf_id::text);
      END IF;

      -- Resolve / create the question (skip if blank — CRF-only row).
      IF NULLIF(rec->>'question_label','') IS NOT NULL THEN
        v_question_id := NULL;

        IF p_mode = 'upsert' THEN
          SELECT id INTO v_question_id FROM public.study_crf_questions
           WHERE crf_id = v_crf_id
             AND label = (rec->>'question_label')
           LIMIT 1;
        END IF;

        IF v_question_id IS NULL THEN
          SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_question_seq
            FROM public.study_crf_questions
           WHERE crf_id = v_crf_id;

          INSERT INTO public.study_crf_questions
            (crf_id, template_version_id, label, help_text, question_type, options, required, sort_order)
          VALUES (
            v_crf_id, p_version_id,
            rec->>'question_label',
            NULLIF(rec->>'question_help_text',''),
            COALESCE(NULLIF(rec->>'question_type',''), 'text'),
            CASE WHEN rec ? 'question_options' AND jsonb_typeof(rec->'question_options') = 'array'
                 THEN rec->'question_options' ELSE NULL END,
            COALESCE((rec->>'question_required')::boolean, false),
            v_question_seq
          );

          v_questions_created := v_questions_created + 1;
        ELSE
          UPDATE public.study_crf_questions
             SET help_text     = COALESCE(NULLIF(rec->>'question_help_text',''), help_text),
                 question_type = COALESCE(NULLIF(rec->>'question_type',''), question_type),
                 options       = CASE WHEN rec ? 'question_options'
                                            AND jsonb_typeof(rec->'question_options') = 'array'
                                  THEN rec->'question_options' ELSE options END,
                 required      = COALESCE((rec->>'question_required')::boolean, required)
           WHERE id = v_question_id;
          v_questions_updated := v_questions_updated + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'visits_created',     v_visits_created,
    'visits_updated',     v_visits_updated,
    'crfs_created',       v_crfs_created,
    'crfs_updated',       v_crfs_updated,
    'questions_created',  v_questions_created,
    'questions_updated',  v_questions_updated
  );
END;
$bulk$;
