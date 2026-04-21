-- =====================================================
-- Visit Schedule revamp - anchor-driven, snapshot-aware
--
-- Adds the data layer for the new Visits tab:
--   1. Per-template window-before / window-after offsets on
--      study_visit_definitions
--   2. Snapshot fingerprint columns on subject_visits (timepoint_label,
--      timepoint_days, window_before_days, window_after_days) so a row stays
--      meaningful even after the template later changes
--   3. Per-subject schedule anchor selection (Screening | Randomization)
--   4. Backfill of existing snapshot rows from the live template
--   5. Re-emit snapshot_ecrf_to_subject / resync_ecrf_to_subject so they copy
--      the new timing fingerprint AND auto-recompute dates if anchor is set
--   6. recompute_subject_visit_dates(p_subject_id)
--      - planned_date = anchor + timepoint_days
--      - window_start = planned_date - window_before_days
--      - window_end   = planned_date + window_after_days
--      - SCHEDULED ROWS ONLY (completed/missed/skipped never silently rewritten)
--   7. apply_subject_visit_patch(p_visit_id, p_patch jsonb)
--      - Allow-listed UPDATE + audit log row per changed field
--   8. subject_visit_events table (Part-11 audit trail) + RLS
-- =====================================================

-- ---------------------------------------------------------------
-- 1. Per-template window offsets
-- ---------------------------------------------------------------
ALTER TABLE public.study_visit_definitions
  ADD COLUMN IF NOT EXISTS window_before_days INT NOT NULL DEFAULT 0
    CHECK (window_before_days >= 0),
  ADD COLUMN IF NOT EXISTS window_after_days INT NOT NULL DEFAULT 0
    CHECK (window_after_days >= 0);

-- ---------------------------------------------------------------
-- 2. Snapshot fingerprint on subject_visits
-- ---------------------------------------------------------------
ALTER TABLE public.subject_visits
  ADD COLUMN IF NOT EXISTS timepoint_label   TEXT,
  ADD COLUMN IF NOT EXISTS timepoint_days    INT,
  ADD COLUMN IF NOT EXISTS window_before_days INT NOT NULL DEFAULT 0
    CHECK (window_before_days >= 0),
  ADD COLUMN IF NOT EXISTS window_after_days INT NOT NULL DEFAULT 0
    CHECK (window_after_days >= 0);

-- ---------------------------------------------------------------
-- 3. Per-subject schedule anchor
-- ---------------------------------------------------------------
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS visit_anchor_kind TEXT NOT NULL DEFAULT 'screening'
    CHECK (visit_anchor_kind IN ('screening','randomization'));

-- ---------------------------------------------------------------
-- 4. Backfill: copy timepoint + window from study_visit_definitions
--    onto every subject_visits row that points at a definition.
-- ---------------------------------------------------------------
UPDATE public.subject_visits sv
   SET timepoint_label    = svd.timepoint_label,
       timepoint_days     = svd.timepoint_days,
       window_before_days = svd.window_before_days,
       window_after_days  = svd.window_after_days
  FROM public.study_visit_definitions svd
 WHERE sv.visit_definition_id = svd.id
   AND sv.timepoint_days IS NULL;

-- ---------------------------------------------------------------
-- 5a. Re-emit snapshot_ecrf_to_subject(p_subject_id)
--     Now copies timepoint_label / timepoint_days / window_before_days /
--     window_after_days into subject_visits, and (if the subject already has
--     an anchor date) calls recompute_subject_visit_dates() so the new rows
--     get planned_date + window_start/end out of the box.
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

  IF v_live_version IS NULL THEN
    RETURN jsonb_build_object(
      'visits_inserted', 0,
      'crfs_inserted',   0,
      'version_id',      NULL
    );
  END IF;

  IF v_existing_version IS NOT NULL AND v_existing_version = v_live_version THEN
    RETURN jsonb_build_object(
      'visits_inserted', 0,
      'crfs_inserted',   0,
      'version_id',      v_live_version
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

  -- Auto-fill planned_date / window range from the anchor when set.
  -- (Safe to call unconditionally; the RPC no-ops if the anchor date is null.)
  PERFORM public.recompute_subject_visit_dates(p_subject_id);

  RETURN jsonb_build_object(
    'visits_inserted', v_visits_inserted,
    'crfs_inserted',   v_crfs_inserted,
    'version_id',      v_live_version
  );
END;
$snapshot$;

-- ---------------------------------------------------------------
-- 5b. Re-emit resync_ecrf_to_subject(p_subject_id)
--     Same as snapshot but add-only. New visits get the timing fingerprint
--     copied; existing rows stay untouched. Calls recompute at the end too.
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
    SELECT id, visit_name, timepoint_label, timepoint_days,
           window_before_days, window_after_days, sort_order
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

  -- Auto-fill planned_date / window range on every row that still has none.
  -- recompute_subject_visit_dates is scheduled-only so it never overwrites
  -- finalized history.
  PERFORM public.recompute_subject_visit_dates(p_subject_id);

  RETURN jsonb_build_object(
    'visits_inserted', v_visits_inserted,
    'crfs_inserted',   v_crfs_inserted,
    'version_id',      v_live_version
  );
END;
$resync$;

-- ---------------------------------------------------------------
-- 6. recompute_subject_visit_dates(p_subject_id)
--    Refreshes planned_date / window_start / window_end on every SCHEDULED
--    subject_visits row using the subject's chosen anchor date.
--    Returns {updated, anchor_kind, anchor_date}.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_subject_visit_dates(p_subject_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $recompute$
#variable_conflict use_variable
DECLARE
  v_actor       UUID := auth.uid();
  v_anchor_kind TEXT;
  v_anchor_date DATE;
  v_updated     INT  := 0;
BEGIN
  SELECT visit_anchor_kind,
         CASE
           WHEN visit_anchor_kind = 'screening'     THEN screening_date
           WHEN visit_anchor_kind = 'randomization' THEN randomization_date
         END
    INTO v_anchor_kind, v_anchor_date
  FROM public.subjects
  WHERE id = p_subject_id;

  IF v_anchor_kind IS NULL THEN
    RAISE EXCEPTION 'Subject not found.';
  END IF;

  -- No anchor date set yet -> nothing to compute. Caller surfaces this as a
  -- "set the anchor date first" hint; not an error.
  IF v_anchor_date IS NULL THEN
    RETURN jsonb_build_object(
      'updated',     0,
      'anchor_kind', v_anchor_kind,
      'anchor_date', NULL
    );
  END IF;

  WITH updated AS (
    UPDATE public.subject_visits
       SET planned_date = v_anchor_date + timepoint_days,
           window_start = (v_anchor_date + timepoint_days)
                          - window_before_days,
           window_end   = (v_anchor_date + timepoint_days)
                          + window_after_days
     WHERE subject_id = p_subject_id
       AND timepoint_days IS NOT NULL
       AND status = 'scheduled'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated FROM updated;

  -- Single summary audit row per recompute call (per-field rows would explode
  -- the audit table on every anchor change).
  INSERT INTO public.subject_visit_events
    (subject_visit_id, field, previous_value, new_value, actor_user_id)
  SELECT id, 'recompute', NULL,
         v_updated::text || ' rows recomputed from '
         || v_anchor_kind || ' = ' || v_anchor_date::text,
         v_actor
    FROM public.subject_visits
   WHERE subject_id = p_subject_id
   LIMIT 1;

  RETURN jsonb_build_object(
    'updated',     v_updated,
    'anchor_kind', v_anchor_kind,
    'anchor_date', v_anchor_date
  );
END;
$recompute$;

-- ---------------------------------------------------------------
-- 7. subject_visit_events: append-only audit log of every timing change.
--    Mirrors subject_crf_metric_events shape.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subject_visit_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_visit_id UUID NOT NULL REFERENCES public.subject_visits(id)
                   ON DELETE CASCADE,
  field            TEXT NOT NULL CHECK (field IN (
    'planned_date','actual_date','window_start','window_end',
    'status','notes',
    'visit_anchor_kind','anchor_date','recompute'
  )),
  previous_value   TEXT,
  new_value        TEXT,
  actor_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_visit_events_visit
  ON public.subject_visit_events(subject_visit_id, created_at DESC);

ALTER TABLE public.subject_visit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_visit_events_select" ON public.subject_visit_events;
DROP POLICY IF EXISTS "subject_visit_events_insert" ON public.subject_visit_events;

CREATE POLICY "subject_visit_events_select" ON public.subject_visit_events
  FOR SELECT USING (
    subject_visit_id IN (
      SELECT sv.id FROM public.subject_visits sv
      JOIN public.subjects sub ON sub.id = sv.subject_id
      JOIN public.studies   st ON st.id  = sub.study_id
      WHERE st.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- INSERT mirrors SELECT scope. The server action wrapper still calls
-- assertStudyWritableForCurrentUser so write authority is enforced twice.
CREATE POLICY "subject_visit_events_insert" ON public.subject_visit_events
  FOR INSERT WITH CHECK (
    subject_visit_id IN (
      SELECT sv.id FROM public.subject_visits sv
      JOIN public.subjects sub ON sub.id = sv.subject_id
      JOIN public.studies   st ON st.id  = sub.study_id
      WHERE st.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- No UPDATE / DELETE policies => audit rows are immutable.

-- ---------------------------------------------------------------
-- 8. apply_subject_visit_patch(p_visit_id, p_patch jsonb)
--    Atomic UPDATE + audit-log INSERT of every changed timing field.
--
--    p_patch keys (all optional, allowlisted):
--      planned_date, actual_date, window_start, window_end -> 'YYYY-MM-DD' / null
--      status                                              -> 'scheduled'|'completed'|'missed'|'skipped'
--      notes                                               -> text / null
--
--    Returns the number of audit rows written (0 means "no change").
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_subject_visit_patch(
  p_visit_id UUID,
  p_patch    JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
AS $patch$
#variable_conflict use_variable
DECLARE
  v_actor          UUID := auth.uid();
  v_current        RECORD;
  v_events_written INT  := 0;

  v_planned_date   DATE;
  v_actual_date    DATE;
  v_window_start   DATE;
  v_window_end     DATE;
  v_status         TEXT;
  v_notes          TEXT;
  v_patch_status   TEXT;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'p_patch must be a JSON object.';
  END IF;

  SELECT * INTO v_current FROM public.subject_visits WHERE id = p_visit_id;
  IF v_current.id IS NULL THEN
    RAISE EXCEPTION 'subject_visit row not found.';
  END IF;

  -- Start with current values.
  v_planned_date := v_current.planned_date;
  v_actual_date  := v_current.actual_date;
  v_window_start := v_current.window_start;
  v_window_end   := v_current.window_end;
  v_status       := v_current.status;
  v_notes        := v_current.notes;

  -- Allowlisted overlay. Empty string is normalized to NULL for date columns.
  IF p_patch ? 'planned_date' THEN
    v_planned_date := NULLIF(p_patch->>'planned_date', '')::date;
  END IF;
  IF p_patch ? 'actual_date' THEN
    v_actual_date := NULLIF(p_patch->>'actual_date', '')::date;
  END IF;
  IF p_patch ? 'window_start' THEN
    v_window_start := NULLIF(p_patch->>'window_start', '')::date;
  END IF;
  IF p_patch ? 'window_end' THEN
    v_window_end := NULLIF(p_patch->>'window_end', '')::date;
  END IF;
  IF p_patch ? 'status' THEN
    v_patch_status := p_patch->>'status';
    IF v_patch_status NOT IN ('scheduled','completed','missed','skipped') THEN
      RAISE EXCEPTION 'Invalid status: %', v_patch_status;
    END IF;
    v_status := v_patch_status;
  END IF;
  IF p_patch ? 'notes' THEN
    v_notes := NULLIF(p_patch->>'notes', '');
  END IF;

  -- Apply the UPDATE.
  UPDATE public.subject_visits
     SET planned_date = v_planned_date,
         actual_date  = v_actual_date,
         window_start = v_window_start,
         window_end   = v_window_end,
         status       = v_status,
         notes        = v_notes
   WHERE id = p_visit_id;

  -- Write one audit row per CHANGED field.
  IF v_planned_date IS DISTINCT FROM v_current.planned_date THEN
    INSERT INTO public.subject_visit_events
      (subject_visit_id, field, previous_value, new_value, actor_user_id)
    VALUES (p_visit_id, 'planned_date',
            v_current.planned_date::text, v_planned_date::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_actual_date IS DISTINCT FROM v_current.actual_date THEN
    INSERT INTO public.subject_visit_events
      (subject_visit_id, field, previous_value, new_value, actor_user_id)
    VALUES (p_visit_id, 'actual_date',
            v_current.actual_date::text, v_actual_date::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_window_start IS DISTINCT FROM v_current.window_start THEN
    INSERT INTO public.subject_visit_events
      (subject_visit_id, field, previous_value, new_value, actor_user_id)
    VALUES (p_visit_id, 'window_start',
            v_current.window_start::text, v_window_start::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_window_end IS DISTINCT FROM v_current.window_end THEN
    INSERT INTO public.subject_visit_events
      (subject_visit_id, field, previous_value, new_value, actor_user_id)
    VALUES (p_visit_id, 'window_end',
            v_current.window_end::text, v_window_end::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_status IS DISTINCT FROM v_current.status THEN
    INSERT INTO public.subject_visit_events
      (subject_visit_id, field, previous_value, new_value, actor_user_id)
    VALUES (p_visit_id, 'status',
            v_current.status, v_status, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_notes IS DISTINCT FROM v_current.notes THEN
    INSERT INTO public.subject_visit_events
      (subject_visit_id, field, previous_value, new_value, actor_user_id)
    VALUES (p_visit_id, 'notes',
            v_current.notes, v_notes, v_actor);
    v_events_written := v_events_written + 1;
  END IF;

  RETURN v_events_written;
END;
$patch$;
