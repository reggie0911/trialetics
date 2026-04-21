-- =====================================================
-- Subject eCRF Tracking
-- Snapshots the live eCRF template (visits + CRFs) onto each new subject
-- and adds a per-CRF metric matrix:
--   - Data Expected (defaults to 1 per CRF)
--   - 5 boolean completion metrics (Data Entry, SDR, SDV, PI Signed, DM Lock)
--   - Single tri-state Query Status: 'none' | 'open' | 'answered'
-- Also adds a Part-11 audit log of every metric change.
-- =====================================================

-- ---------------------------------------------------------------
-- Augment subjects: link to the snapshot template version + when it was synced
-- ---------------------------------------------------------------
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS template_version_id UUID
    REFERENCES public.study_ecrf_template_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_subjects_template_version
  ON public.subjects(template_version_id);

-- ---------------------------------------------------------------
-- Augment subject_visits: link to the snapshot template + visit definition,
-- and keep a sort_order so the snapshot UI is stable across template edits.
-- ---------------------------------------------------------------
ALTER TABLE public.subject_visits
  ADD COLUMN IF NOT EXISTS template_version_id UUID
    REFERENCES public.study_ecrf_template_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visit_definition_id UUID
    REFERENCES public.study_visit_definitions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- One snapshot row per (subject, visit_definition); only enforced when
-- visit_definition_id IS NOT NULL so legacy hand-added visits keep working.
CREATE UNIQUE INDEX IF NOT EXISTS one_subject_visit_per_definition
  ON public.subject_visits(subject_id, visit_definition_id)
  WHERE visit_definition_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subject_visits_template_version
  ON public.subject_visits(template_version_id);

-- ---------------------------------------------------------------
-- subject_crfs: one row per (subject, subject_visit, CRF definition)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subject_crfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  subject_id          UUID NOT NULL REFERENCES public.subjects(id)        ON DELETE CASCADE,
  subject_visit_id    UUID NOT NULL REFERENCES public.subject_visits(id)  ON DELETE CASCADE,
  crf_definition_id   UUID          REFERENCES public.study_crfs(id)      ON DELETE SET NULL,
  template_version_id UUID NOT NULL REFERENCES public.study_ecrf_template_versions(id) ON DELETE RESTRICT,

  -- Denormalized snapshot so the row is meaningful even if the template row is deleted.
  crf_name   TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Expected data units for this CRF row. Auto-populated to 1 when snapshotting
  -- (one CRF == one expected data point). Stored (not computed) so it can later
  -- vary per CRF without a schema change.
  data_expected INTEGER NOT NULL DEFAULT 1 CHECK (data_expected >= 0),

  -- Five binary completion metrics (rendered as checkboxes in the UI).
  data_entry           BOOLEAN NOT NULL DEFAULT FALSE,
  source_data_review   BOOLEAN NOT NULL DEFAULT FALSE,
  source_data_verified BOOLEAN NOT NULL DEFAULT FALSE,
  pi_signed            BOOLEAN NOT NULL DEFAULT FALSE,
  data_management_lock BOOLEAN NOT NULL DEFAULT FALSE,

  -- Single tri-state query column (replaces three separate boolean flags).
  -- 'none' covers both "no query ever raised" and "query resolved" — the audit
  -- log retains the full open -> answered -> none history.
  query_status TEXT NOT NULL DEFAULT 'none'
    CHECK (query_status IN ('none','open','answered')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT subject_crf_unique_per_visit UNIQUE (subject_visit_id, crf_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_crfs_subject ON public.subject_crfs(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_crfs_visit   ON public.subject_crfs(subject_visit_id);
CREATE INDEX IF NOT EXISTS idx_subject_crfs_template
  ON public.subject_crfs(template_version_id);

-- Reuse the standard updated_at trigger function defined in clean_slate.
DROP TRIGGER IF EXISTS update_subject_crfs_updated_at ON public.subject_crfs;
CREATE TRIGGER update_subject_crfs_updated_at
  BEFORE UPDATE ON public.subject_crfs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.subject_crfs ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS: drop prior versions before recreating.
DROP POLICY IF EXISTS "subject_crfs_select" ON public.subject_crfs;
DROP POLICY IF EXISTS "subject_crfs_insert" ON public.subject_crfs;
DROP POLICY IF EXISTS "subject_crfs_update" ON public.subject_crfs;
DROP POLICY IF EXISTS "subject_crfs_delete" ON public.subject_crfs;

CREATE POLICY "subject_crfs_select" ON public.subject_crfs
  FOR SELECT USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_crfs_insert" ON public.subject_crfs
  FOR INSERT WITH CHECK (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_crfs_update" ON public.subject_crfs
  FOR UPDATE USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "subject_crfs_delete" ON public.subject_crfs
  FOR DELETE USING (
    subject_id IN (
      SELECT sub.id FROM public.subjects sub
      JOIN public.studies s ON sub.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------
-- subject_crf_metric_events: append-only audit log of every metric change.
-- Written by the server action / RPC layer; never UPDATE or DELETE.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subject_crf_metric_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_crf_id UUID NOT NULL REFERENCES public.subject_crfs(id) ON DELETE CASCADE,
  field          TEXT NOT NULL CHECK (field IN (
    'data_entry','source_data_review','source_data_verified',
    'pi_signed','data_management_lock','query_status'
  )),
  -- Stringified previous / new value: 'true' / 'false' for booleans and
  -- 'none' / 'open' / 'answered' for the query enum.
  previous_value TEXT,
  new_value      TEXT NOT NULL,
  actor_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subject_crf_metric_events_crf
  ON public.subject_crf_metric_events(subject_crf_id, created_at DESC);

ALTER TABLE public.subject_crf_metric_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subject_crf_metric_events_select" ON public.subject_crf_metric_events;
DROP POLICY IF EXISTS "subject_crf_metric_events_insert" ON public.subject_crf_metric_events;

CREATE POLICY "subject_crf_metric_events_select" ON public.subject_crf_metric_events
  FOR SELECT USING (
    subject_crf_id IN (
      SELECT sc.id FROM public.subject_crfs sc
      JOIN public.subjects sub ON sub.id = sc.subject_id
      JOIN public.studies   st ON st.id  = sub.study_id
      WHERE st.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- INSERT mirrors SELECT scope. The server action also calls
-- assertStudyWritableForCurrentUser so write authority is enforced twice.
CREATE POLICY "subject_crf_metric_events_insert" ON public.subject_crf_metric_events
  FOR INSERT WITH CHECK (
    subject_crf_id IN (
      SELECT sc.id FROM public.subject_crfs sc
      JOIN public.subjects sub ON sub.id = sc.subject_id
      JOIN public.studies   st ON st.id  = sub.study_id
      WHERE st.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- No UPDATE / DELETE policies => audit rows are immutable from any non-superuser path.
