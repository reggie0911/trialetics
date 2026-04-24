-- =====================================================
-- Per-subject window offset overrides
--
-- Lets coordinators override the protocol window on a single subject_visits
-- row without editing the study template. The integer offsets are now
-- allowlisted in `apply_subject_visit_patch`, validated as non-negative
-- integers, audited per change, and—when the row is still 'scheduled' and
-- has a planned_date—the function automatically derives window_start /
-- window_end so the State pill stays in sync.
-- =====================================================

-- 1. Allow the two new field names in the audit log CHECK constraint.
ALTER TABLE public.subject_visit_events
  DROP CONSTRAINT IF EXISTS subject_visit_events_field_check;

ALTER TABLE public.subject_visit_events
  ADD CONSTRAINT subject_visit_events_field_check CHECK (field IN (
    'planned_date','actual_date','window_start','window_end',
    'window_before_days','window_after_days',
    'status','notes',
    'visit_anchor_kind','anchor_date','recompute'
  ));

-- 2. Re-emit apply_subject_visit_patch to accept window_before_days and
--    window_after_days, validate them, audit them, and (when status is
--    still 'scheduled' and a planned_date exists) recompute window_start /
--    window_end from the updated offsets so the UI stays consistent.
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

  v_window_before  INT;
  v_window_after   INT;
  v_offsets_touched BOOLEAN := false;
  v_explicit_window BOOLEAN := false;
  v_offset_raw     TEXT;
  v_offset_num     INT;
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RAISE EXCEPTION 'p_patch must be a JSON object.';
  END IF;

  SELECT * INTO v_current FROM public.subject_visits WHERE id = p_visit_id;
  IF v_current.id IS NULL THEN
    RAISE EXCEPTION 'subject_visit row not found.';
  END IF;

  -- Start with current values.
  v_planned_date  := v_current.planned_date;
  v_actual_date   := v_current.actual_date;
  v_window_start  := v_current.window_start;
  v_window_end    := v_current.window_end;
  v_status        := v_current.status;
  v_notes         := v_current.notes;
  v_window_before := v_current.window_before_days;
  v_window_after  := v_current.window_after_days;

  -- Allowlisted overlay. Empty string is normalized to NULL for date columns.
  IF p_patch ? 'planned_date' THEN
    v_planned_date := NULLIF(p_patch->>'planned_date', '')::date;
  END IF;
  IF p_patch ? 'actual_date' THEN
    v_actual_date := NULLIF(p_patch->>'actual_date', '')::date;
  END IF;
  IF p_patch ? 'window_start' THEN
    v_window_start := NULLIF(p_patch->>'window_start', '')::date;
    v_explicit_window := true;
  END IF;
  IF p_patch ? 'window_end' THEN
    v_window_end := NULLIF(p_patch->>'window_end', '')::date;
    v_explicit_window := true;
  END IF;
  IF p_patch ? 'window_before_days' THEN
    v_offset_raw := NULLIF(p_patch->>'window_before_days', '');
    IF v_offset_raw IS NULL THEN
      v_offset_num := 0;
    ELSE
      v_offset_num := v_offset_raw::int;
      IF v_offset_num < 0 THEN
        RAISE EXCEPTION 'window_before_days must be >= 0';
      END IF;
    END IF;
    v_window_before := v_offset_num;
    v_offsets_touched := true;
  END IF;
  IF p_patch ? 'window_after_days' THEN
    v_offset_raw := NULLIF(p_patch->>'window_after_days', '');
    IF v_offset_raw IS NULL THEN
      v_offset_num := 0;
    ELSE
      v_offset_num := v_offset_raw::int;
      IF v_offset_num < 0 THEN
        RAISE EXCEPTION 'window_after_days must be >= 0';
      END IF;
    END IF;
    v_window_after := v_offset_num;
    v_offsets_touched := true;
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

  -- When offsets change but the caller didn't also send explicit window dates,
  -- derive window_start / window_end from planned_date so the State pill stays
  -- consistent. Only re-derive for scheduled rows; finalized history keeps
  -- whatever range it was completed against.
  IF v_offsets_touched
     AND NOT v_explicit_window
     AND v_status = 'scheduled'
     AND v_planned_date IS NOT NULL THEN
    v_window_start := v_planned_date - v_window_before;
    v_window_end   := v_planned_date + v_window_after;
  END IF;

  -- Apply the UPDATE.
  UPDATE public.subject_visits
     SET planned_date       = v_planned_date,
         actual_date        = v_actual_date,
         window_start       = v_window_start,
         window_end         = v_window_end,
         window_before_days = v_window_before,
         window_after_days  = v_window_after,
         status             = v_status,
         notes              = v_notes
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
  IF v_window_before IS DISTINCT FROM v_current.window_before_days THEN
    INSERT INTO public.subject_visit_events
      (subject_visit_id, field, previous_value, new_value, actor_user_id)
    VALUES (p_visit_id, 'window_before_days',
            v_current.window_before_days::text, v_window_before::text, v_actor);
    v_events_written := v_events_written + 1;
  END IF;
  IF v_window_after IS DISTINCT FROM v_current.window_after_days THEN
    INSERT INTO public.subject_visit_events
      (subject_visit_id, field, previous_value, new_value, actor_user_id)
    VALUES (p_visit_id, 'window_after_days',
            v_current.window_after_days::text, v_window_after::text, v_actor);
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
