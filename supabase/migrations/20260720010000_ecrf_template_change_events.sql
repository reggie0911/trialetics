-- =====================================================
-- eCRF Template — change log events
--
-- Append-only audit log that captures every create / update / delete made
-- to the four template-level tables that power the eCRF Builder. The
-- redesigned page surfaces these events in a "Change log" dialog and uses
-- them to drive the per-row "Last updated by" stamp and "Compare versions"
-- diff view.
--
-- Mirrors the immutable-event pattern established by `subject_visit_events`
-- (`20260524000000_visit_schedule_anchor.sql` lines 426–471) and
-- `subject_crf_metric_events`.
-- =====================================================

-- ---------------------------------------------------------------
-- study_ecrf_template_events
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_ecrf_template_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id            UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  template_version_id UUID NOT NULL REFERENCES public.study_ecrf_template_versions(id) ON DELETE CASCADE,
  entity_kind         TEXT NOT NULL CHECK (entity_kind IN ('version','visit','crf','question')),
  entity_id           UUID NOT NULL,
  entity_label        TEXT,
  action              TEXT NOT NULL CHECK (action IN (
    'create','update','delete','reorder','publish','archive','clone','bulk_import'
  )),
  field               TEXT,
  old_value           JSONB,
  new_value           JSONB,
  actor_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ecrf_template_events_version
  ON public.study_ecrf_template_events (template_version_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ecrf_template_events_study
  ON public.study_ecrf_template_events (study_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ecrf_template_events_entity
  ON public.study_ecrf_template_events (entity_kind, entity_id, created_at DESC);

ALTER TABLE public.study_ecrf_template_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ecrf_template_events_select" ON public.study_ecrf_template_events;
DROP POLICY IF EXISTS "ecrf_template_events_insert" ON public.study_ecrf_template_events;

-- SELECT: company members may read the change log for studies in their company.
-- Mirrors `study_ecrf_template_versions_select`.
CREATE POLICY "ecrf_template_events_select" ON public.study_ecrf_template_events
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- INSERT: triggers always run as SECURITY INVOKER. The triggering UPDATE/INSERT/DELETE
-- statement on the template tables is itself admin-gated by RLS, so we only need to
-- enforce the company-scope check here.
CREATE POLICY "ecrf_template_events_insert" ON public.study_ecrf_template_events
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- No UPDATE / DELETE policies => events are immutable once written.

-- ---------------------------------------------------------------
-- Helpers — diff JSONB for an UPDATE and emit one event row per changed
-- field. Whitelists per entity prevent noise from internal columns
-- (`updated_at`, `updated_by`, etc.).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ecrf_emit_field_events(
  p_study_id            UUID,
  p_template_version_id UUID,
  p_entity_kind         TEXT,
  p_entity_id           UUID,
  p_entity_label        TEXT,
  p_old                 JSONB,
  p_new                 JSONB,
  p_fields              TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  f       TEXT;
  v_old   JSONB;
  v_new   JSONB;
  written INT := 0;
BEGIN
  FOREACH f IN ARRAY p_fields
  LOOP
    v_old := p_old -> f;
    v_new := p_new -> f;
    IF v_old IS DISTINCT FROM v_new THEN
      INSERT INTO public.study_ecrf_template_events (
        study_id, template_version_id, entity_kind, entity_id, entity_label,
        action, field, old_value, new_value, actor_id
      ) VALUES (
        p_study_id, p_template_version_id, p_entity_kind, p_entity_id, p_entity_label,
        'update', f, v_old, v_new, auth.uid()
      );
      written := written + 1;
    END IF;
  END LOOP;
  -- Whole-row "update" sentinel only when no individual field changed but the
  -- row was still touched (rare; safe no-op otherwise).
  IF written = 0 AND p_old IS DISTINCT FROM p_new THEN
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, field, old_value, new_value, actor_id
    ) VALUES (
      p_study_id, p_template_version_id, p_entity_kind, p_entity_id, p_entity_label,
      'update', NULL, NULL, NULL, auth.uid()
    );
  END IF;
END;
$$;

-- ---------------------------------------------------------------
-- Per-table triggers
-- ---------------------------------------------------------------

-- 1. study_ecrf_template_versions — version-level events.
CREATE OR REPLACE FUNCTION public.ecrf_log_version_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, new_value, actor_id
    ) VALUES (
      NEW.study_id, NEW.id, 'version', NEW.id,
      COALESCE(NEW.name, 'Version ' || NEW.version_number::TEXT),
      'create', to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Special-case publish / archive transitions for cleaner change-log entries.
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'live' THEN
      INSERT INTO public.study_ecrf_template_events (
        study_id, template_version_id, entity_kind, entity_id, entity_label,
        action, field, old_value, new_value, actor_id
      ) VALUES (
        NEW.study_id, NEW.id, 'version', NEW.id,
        COALESCE(NEW.name, 'Version ' || NEW.version_number::TEXT),
        'publish', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status), auth.uid()
      );
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'archived' THEN
      INSERT INTO public.study_ecrf_template_events (
        study_id, template_version_id, entity_kind, entity_id, entity_label,
        action, field, old_value, new_value, actor_id
      ) VALUES (
        NEW.study_id, NEW.id, 'version', NEW.id,
        COALESCE(NEW.name, 'Version ' || NEW.version_number::TEXT),
        'archive', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status), auth.uid()
      );
    END IF;

    PERFORM public.ecrf_emit_field_events(
      NEW.study_id, NEW.id, 'version', NEW.id,
      COALESCE(NEW.name, 'Version ' || NEW.version_number::TEXT),
      to_jsonb(OLD), to_jsonb(NEW),
      ARRAY['name','status','version_number']
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, old_value, actor_id
    ) VALUES (
      OLD.study_id, OLD.id, 'version', OLD.id,
      COALESCE(OLD.name, 'Version ' || OLD.version_number::TEXT),
      'delete', to_jsonb(OLD), auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecrf_template_version_log ON public.study_ecrf_template_versions;
CREATE TRIGGER trg_ecrf_template_version_log
  AFTER INSERT OR UPDATE OR DELETE ON public.study_ecrf_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.ecrf_log_version_change();

-- 2. study_visit_definitions — visit-level events.
CREATE OR REPLACE FUNCTION public.ecrf_log_visit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, new_value, actor_id
    ) VALUES (
      NEW.study_id, NEW.template_version_id, 'visit', NEW.id, NEW.visit_name,
      'create', to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Pure sort_order changes are emitted as "reorder" so the change log
    -- can group them visually.
    IF OLD.sort_order IS DISTINCT FROM NEW.sort_order
       AND OLD.visit_name IS NOT DISTINCT FROM NEW.visit_name
       AND OLD.timepoint_label IS NOT DISTINCT FROM NEW.timepoint_label
       AND OLD.timepoint_days IS NOT DISTINCT FROM NEW.timepoint_days
       AND OLD.window_before_days IS NOT DISTINCT FROM NEW.window_before_days
       AND OLD.window_after_days IS NOT DISTINCT FROM NEW.window_after_days THEN
      INSERT INTO public.study_ecrf_template_events (
        study_id, template_version_id, entity_kind, entity_id, entity_label,
        action, field, old_value, new_value, actor_id
      ) VALUES (
        NEW.study_id, NEW.template_version_id, 'visit', NEW.id, NEW.visit_name,
        'reorder', 'sort_order', to_jsonb(OLD.sort_order), to_jsonb(NEW.sort_order), auth.uid()
      );
      RETURN NEW;
    END IF;

    PERFORM public.ecrf_emit_field_events(
      NEW.study_id, NEW.template_version_id, 'visit', NEW.id, NEW.visit_name,
      to_jsonb(OLD), to_jsonb(NEW),
      ARRAY['visit_name','timepoint_label','timepoint_days','window_before_days','window_after_days','sort_order']
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, old_value, actor_id
    ) VALUES (
      OLD.study_id, OLD.template_version_id, 'visit', OLD.id, OLD.visit_name,
      'delete', to_jsonb(OLD), auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecrf_visit_log ON public.study_visit_definitions;
CREATE TRIGGER trg_ecrf_visit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.study_visit_definitions
  FOR EACH ROW EXECUTE FUNCTION public.ecrf_log_visit_change();

-- 3. study_crfs — CRF-level events.
CREATE OR REPLACE FUNCTION public.ecrf_log_crf_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, new_value, actor_id
    ) VALUES (
      NEW.study_id, NEW.template_version_id, 'crf', NEW.id, NEW.name,
      'create', to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.sort_order IS DISTINCT FROM NEW.sort_order
       AND OLD.name IS NOT DISTINCT FROM NEW.name
       AND OLD.description IS NOT DISTINCT FROM NEW.description
       AND OLD.visit_definition_id IS NOT DISTINCT FROM NEW.visit_definition_id THEN
      INSERT INTO public.study_ecrf_template_events (
        study_id, template_version_id, entity_kind, entity_id, entity_label,
        action, field, old_value, new_value, actor_id
      ) VALUES (
        NEW.study_id, NEW.template_version_id, 'crf', NEW.id, NEW.name,
        'reorder', 'sort_order', to_jsonb(OLD.sort_order), to_jsonb(NEW.sort_order), auth.uid()
      );
      RETURN NEW;
    END IF;

    PERFORM public.ecrf_emit_field_events(
      NEW.study_id, NEW.template_version_id, 'crf', NEW.id, NEW.name,
      to_jsonb(OLD), to_jsonb(NEW),
      ARRAY['name','description','visit_definition_id','sort_order']
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, old_value, actor_id
    ) VALUES (
      OLD.study_id, OLD.template_version_id, 'crf', OLD.id, OLD.name,
      'delete', to_jsonb(OLD), auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecrf_crf_log ON public.study_crfs;
CREATE TRIGGER trg_ecrf_crf_log
  AFTER INSERT OR UPDATE OR DELETE ON public.study_crfs
  FOR EACH ROW EXECUTE FUNCTION public.ecrf_log_crf_change();

-- 4. study_crf_questions — question-level events.
--    Resolves study_id via the parent CRF row.
CREATE OR REPLACE FUNCTION public.ecrf_log_question_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_study_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT study_id INTO v_study_id FROM public.study_crfs WHERE id = NEW.crf_id;
    IF v_study_id IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, new_value, actor_id
    ) VALUES (
      v_study_id, NEW.template_version_id, 'question', NEW.id, NEW.label,
      'create', to_jsonb(NEW), auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT study_id INTO v_study_id FROM public.study_crfs WHERE id = NEW.crf_id;
    IF v_study_id IS NULL THEN RETURN NEW; END IF;

    IF OLD.sort_order IS DISTINCT FROM NEW.sort_order
       AND OLD.label IS NOT DISTINCT FROM NEW.label
       AND OLD.help_text IS NOT DISTINCT FROM NEW.help_text
       AND OLD.question_type IS NOT DISTINCT FROM NEW.question_type
       AND OLD.required IS NOT DISTINCT FROM NEW.required
       AND OLD.options IS NOT DISTINCT FROM NEW.options
       AND OLD.crf_id IS NOT DISTINCT FROM NEW.crf_id THEN
      INSERT INTO public.study_ecrf_template_events (
        study_id, template_version_id, entity_kind, entity_id, entity_label,
        action, field, old_value, new_value, actor_id
      ) VALUES (
        v_study_id, NEW.template_version_id, 'question', NEW.id, NEW.label,
        'reorder', 'sort_order', to_jsonb(OLD.sort_order), to_jsonb(NEW.sort_order), auth.uid()
      );
      RETURN NEW;
    END IF;

    PERFORM public.ecrf_emit_field_events(
      v_study_id, NEW.template_version_id, 'question', NEW.id, NEW.label,
      to_jsonb(OLD), to_jsonb(NEW),
      ARRAY['label','help_text','question_type','required','options','sort_order','crf_id']
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT study_id INTO v_study_id FROM public.study_crfs WHERE id = OLD.crf_id;
    IF v_study_id IS NULL THEN RETURN OLD; END IF;
    INSERT INTO public.study_ecrf_template_events (
      study_id, template_version_id, entity_kind, entity_id, entity_label,
      action, old_value, actor_id
    ) VALUES (
      v_study_id, OLD.template_version_id, 'question', OLD.id, OLD.label,
      'delete', to_jsonb(OLD), auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecrf_question_log ON public.study_crf_questions;
CREATE TRIGGER trg_ecrf_question_log
  AFTER INSERT OR UPDATE OR DELETE ON public.study_crf_questions
  FOR EACH ROW EXECUTE FUNCTION public.ecrf_log_question_change();
