-- =====================================================
-- Study CRF Builder
-- Adds study-level CRF templates, visit/CRF assignments, and CRF questions.
-- Reuses the existing study_visit_definitions table.
-- =====================================================

-- ---------------------------------------------------------------
-- study_crfs: study-scoped CRF library
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_crfs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id    UUID        NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_crfs_study_id
  ON public.study_crfs(study_id);

ALTER TABLE public.study_crfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_crfs_select" ON public.study_crfs;
DROP POLICY IF EXISTS "study_crfs_insert" ON public.study_crfs;
DROP POLICY IF EXISTS "study_crfs_update" ON public.study_crfs;
DROP POLICY IF EXISTS "study_crfs_delete" ON public.study_crfs;

CREATE POLICY "study_crfs_select" ON public.study_crfs
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_crfs_insert" ON public.study_crfs
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_crfs_update" ON public.study_crfs
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_crfs_delete" ON public.study_crfs
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------
-- study_visit_crfs: many-to-many join between visit definitions and CRFs
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_visit_crfs (
  visit_definition_id UUID NOT NULL REFERENCES public.study_visit_definitions(id) ON DELETE CASCADE,
  crf_id              UUID NOT NULL REFERENCES public.study_crfs(id) ON DELETE CASCADE,
  sort_order          INT  NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (visit_definition_id, crf_id)
);

CREATE INDEX IF NOT EXISTS idx_study_visit_crfs_visit
  ON public.study_visit_crfs(visit_definition_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_study_visit_crfs_crf
  ON public.study_visit_crfs(crf_id);

ALTER TABLE public.study_visit_crfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_visit_crfs_select" ON public.study_visit_crfs;
DROP POLICY IF EXISTS "study_visit_crfs_insert" ON public.study_visit_crfs;
DROP POLICY IF EXISTS "study_visit_crfs_update" ON public.study_visit_crfs;
DROP POLICY IF EXISTS "study_visit_crfs_delete" ON public.study_visit_crfs;

CREATE POLICY "study_visit_crfs_select" ON public.study_visit_crfs
  FOR SELECT USING (
    visit_definition_id IN (
      SELECT vd.id FROM public.study_visit_definitions vd
      JOIN public.studies s ON s.id = vd.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_visit_crfs_insert" ON public.study_visit_crfs
  FOR INSERT WITH CHECK (
    visit_definition_id IN (
      SELECT vd.id FROM public.study_visit_definitions vd
      JOIN public.studies s ON s.id = vd.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_visit_crfs_update" ON public.study_visit_crfs
  FOR UPDATE USING (
    visit_definition_id IN (
      SELECT vd.id FROM public.study_visit_definitions vd
      JOIN public.studies s ON s.id = vd.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_visit_crfs_delete" ON public.study_visit_crfs
  FOR DELETE USING (
    visit_definition_id IN (
      SELECT vd.id FROM public.study_visit_definitions vd
      JOIN public.studies s ON s.id = vd.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------
-- study_crf_questions: questions belonging to a CRF (shared across all assignments)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_crf_questions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  crf_id        UUID        NOT NULL REFERENCES public.study_crfs(id) ON DELETE CASCADE,
  label         TEXT        NOT NULL CHECK (length(trim(label)) > 0),
  help_text     TEXT,
  question_type TEXT        NOT NULL CHECK (
    question_type IN ('text','textarea','number','date','single_select','multi_select','yes_no')
  ),
  options       JSONB,
  required      BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_crf_questions_crf
  ON public.study_crf_questions(crf_id, sort_order);

ALTER TABLE public.study_crf_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_crf_questions_select" ON public.study_crf_questions;
DROP POLICY IF EXISTS "study_crf_questions_insert" ON public.study_crf_questions;
DROP POLICY IF EXISTS "study_crf_questions_update" ON public.study_crf_questions;
DROP POLICY IF EXISTS "study_crf_questions_delete" ON public.study_crf_questions;

CREATE POLICY "study_crf_questions_select" ON public.study_crf_questions
  FOR SELECT USING (
    crf_id IN (
      SELECT c.id FROM public.study_crfs c
      JOIN public.studies s ON s.id = c.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_crf_questions_insert" ON public.study_crf_questions
  FOR INSERT WITH CHECK (
    crf_id IN (
      SELECT c.id FROM public.study_crfs c
      JOIN public.studies s ON s.id = c.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_crf_questions_update" ON public.study_crf_questions
  FOR UPDATE USING (
    crf_id IN (
      SELECT c.id FROM public.study_crfs c
      JOIN public.studies s ON s.id = c.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_crf_questions_delete" ON public.study_crf_questions
  FOR DELETE USING (
    crf_id IN (
      SELECT c.id FROM public.study_crfs c
      JOIN public.studies s ON s.id = c.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
