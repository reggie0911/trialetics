-- =====================================================
-- eCRF Template Versions
-- Adds per-study versioning to the eCRF Builder so a study can have many
-- draft / archived versions but exactly one live version at a time.
--
-- Also tightens write policies on all eCRF tables to require company-admin
-- (profiles.role = 'admin') in addition to existing company scoping.
-- =====================================================

-- ---------------------------------------------------------------
-- study_ecrf_template_versions
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_ecrf_template_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id        UUID        NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  version_number  INT         NOT NULL,
  name            TEXT,
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','live','archived')),
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ,
  UNIQUE (study_id, version_number)
);

-- Exactly one live version per study.
CREATE UNIQUE INDEX IF NOT EXISTS one_live_ecrf_version_per_study
  ON public.study_ecrf_template_versions(study_id)
  WHERE status = 'live';

CREATE INDEX IF NOT EXISTS idx_ecrf_template_versions_study_status
  ON public.study_ecrf_template_versions(study_id, status);

ALTER TABLE public.study_ecrf_template_versions ENABLE ROW LEVEL SECURITY;

-- Drop any prior versions of these policies so re-running the migration is safe.
DROP POLICY IF EXISTS "ecrf_template_versions_select"        ON public.study_ecrf_template_versions;
DROP POLICY IF EXISTS "ecrf_template_versions_insert_admin"  ON public.study_ecrf_template_versions;
DROP POLICY IF EXISTS "ecrf_template_versions_update_admin"  ON public.study_ecrf_template_versions;
DROP POLICY IF EXISTS "ecrf_template_versions_delete_admin"  ON public.study_ecrf_template_versions;

-- SELECT: company-scoped (any company member may read).
CREATE POLICY "ecrf_template_versions_select" ON public.study_ecrf_template_versions
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Writes: company-scoped AND admin.
CREATE POLICY "ecrf_template_versions_insert_admin" ON public.study_ecrf_template_versions
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "ecrf_template_versions_update_admin" ON public.study_ecrf_template_versions
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "ecrf_template_versions_delete_admin" ON public.study_ecrf_template_versions
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------------
-- Add template_version_id to existing eCRF tables (nullable for backfill).
-- ---------------------------------------------------------------
ALTER TABLE public.study_visit_definitions
  ADD COLUMN IF NOT EXISTS template_version_id UUID
    REFERENCES public.study_ecrf_template_versions(id) ON DELETE CASCADE;

ALTER TABLE public.study_crfs
  ADD COLUMN IF NOT EXISTS template_version_id UUID
    REFERENCES public.study_ecrf_template_versions(id) ON DELETE CASCADE;

ALTER TABLE public.study_crf_questions
  ADD COLUMN IF NOT EXISTS template_version_id UUID
    REFERENCES public.study_ecrf_template_versions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_study_visit_definitions_template_version
  ON public.study_visit_definitions(template_version_id);

CREATE INDEX IF NOT EXISTS idx_study_crfs_template_version
  ON public.study_crfs(template_version_id);

CREATE INDEX IF NOT EXISTS idx_study_crf_questions_template_version
  ON public.study_crf_questions(template_version_id);

-- ---------------------------------------------------------------
-- Backfill: every existing study with eCRF rows gets a v1 'live' version,
-- and every existing visit/CRF/question is pointed at it.
-- ---------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  new_version_id UUID;
BEGIN
  FOR rec IN
    SELECT DISTINCT study_id FROM (
      SELECT study_id FROM public.study_visit_definitions WHERE template_version_id IS NULL
      UNION
      SELECT study_id FROM public.study_crfs WHERE template_version_id IS NULL
    ) AS s
  LOOP
    INSERT INTO public.study_ecrf_template_versions
      (study_id, version_number, name, status, published_at)
    VALUES
      (rec.study_id, 1, 'Version 1', 'live', NOW())
    RETURNING id INTO new_version_id;

    UPDATE public.study_visit_definitions
       SET template_version_id = new_version_id
     WHERE study_id = rec.study_id AND template_version_id IS NULL;

    UPDATE public.study_crfs
       SET template_version_id = new_version_id
     WHERE study_id = rec.study_id AND template_version_id IS NULL;

    UPDATE public.study_crf_questions q
       SET template_version_id = new_version_id
      FROM public.study_crfs c
     WHERE q.crf_id = c.id
       AND c.study_id = rec.study_id
       AND q.template_version_id IS NULL;
  END LOOP;
END$$;

-- After backfill, enforce NOT NULL on all three tables.
ALTER TABLE public.study_visit_definitions
  ALTER COLUMN template_version_id SET NOT NULL;

ALTER TABLE public.study_crfs
  ALTER COLUMN template_version_id SET NOT NULL;

ALTER TABLE public.study_crf_questions
  ALTER COLUMN template_version_id SET NOT NULL;

-- ---------------------------------------------------------------
-- Tighten write policies on existing eCRF tables to require admin role.
-- SELECT policies remain unchanged (any company member may read templates).
-- ---------------------------------------------------------------

-- study_visit_definitions
DROP POLICY IF EXISTS "study_visit_definitions_insert"        ON public.study_visit_definitions;
DROP POLICY IF EXISTS "study_visit_definitions_update"        ON public.study_visit_definitions;
DROP POLICY IF EXISTS "study_visit_definitions_delete"        ON public.study_visit_definitions;
DROP POLICY IF EXISTS "study_visit_definitions_insert_admin"  ON public.study_visit_definitions;
DROP POLICY IF EXISTS "study_visit_definitions_update_admin"  ON public.study_visit_definitions;
DROP POLICY IF EXISTS "study_visit_definitions_delete_admin"  ON public.study_visit_definitions;

CREATE POLICY "study_visit_definitions_insert_admin" ON public.study_visit_definitions
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "study_visit_definitions_update_admin" ON public.study_visit_definitions
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "study_visit_definitions_delete_admin" ON public.study_visit_definitions
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- study_crfs
DROP POLICY IF EXISTS "study_crfs_insert"        ON public.study_crfs;
DROP POLICY IF EXISTS "study_crfs_update"        ON public.study_crfs;
DROP POLICY IF EXISTS "study_crfs_delete"        ON public.study_crfs;
DROP POLICY IF EXISTS "study_crfs_insert_admin"  ON public.study_crfs;
DROP POLICY IF EXISTS "study_crfs_update_admin"  ON public.study_crfs;
DROP POLICY IF EXISTS "study_crfs_delete_admin"  ON public.study_crfs;

CREATE POLICY "study_crfs_insert_admin" ON public.study_crfs
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "study_crfs_update_admin" ON public.study_crfs
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "study_crfs_delete_admin" ON public.study_crfs
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- study_crf_questions
DROP POLICY IF EXISTS "study_crf_questions_insert"        ON public.study_crf_questions;
DROP POLICY IF EXISTS "study_crf_questions_update"        ON public.study_crf_questions;
DROP POLICY IF EXISTS "study_crf_questions_delete"        ON public.study_crf_questions;
DROP POLICY IF EXISTS "study_crf_questions_insert_admin"  ON public.study_crf_questions;
DROP POLICY IF EXISTS "study_crf_questions_update_admin"  ON public.study_crf_questions;
DROP POLICY IF EXISTS "study_crf_questions_delete_admin"  ON public.study_crf_questions;

CREATE POLICY "study_crf_questions_insert_admin" ON public.study_crf_questions
  FOR INSERT WITH CHECK (
    crf_id IN (
      SELECT c.id FROM public.study_crfs c
      JOIN public.studies s ON s.id = c.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "study_crf_questions_update_admin" ON public.study_crf_questions
  FOR UPDATE USING (
    crf_id IN (
      SELECT c.id FROM public.study_crfs c
      JOIN public.studies s ON s.id = c.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "study_crf_questions_delete_admin" ON public.study_crf_questions
  FOR DELETE USING (
    crf_id IN (
      SELECT c.id FROM public.study_crfs c
      JOIN public.studies s ON s.id = c.study_id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
