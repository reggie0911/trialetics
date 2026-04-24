-- =====================================================
-- eCRF Template — per-row audit columns
--
-- Adds `updated_at` / `updated_by` to the four template-level tables that
-- power the eCRF Builder so the redesigned page can show "Last updated <date>
-- by <person>" on each row of the visit / CRF / question tree.
--
-- Column defaults backfill existing rows to NOW(); a single shared trigger
-- keeps both columns fresh on every UPDATE without requiring callers to set
-- them explicitly.
-- =====================================================

-- ---------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------
ALTER TABLE public.study_visit_definitions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.study_crfs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.study_crf_questions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.study_ecrf_template_versions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------
-- Helpful indexes for the "Last updated" sort + change-log queries.
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_study_visit_definitions_updated_at
  ON public.study_visit_definitions (template_version_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_crfs_updated_at
  ON public.study_crfs (template_version_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_crf_questions_updated_at
  ON public.study_crf_questions (template_version_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_ecrf_template_versions_updated_at
  ON public.study_ecrf_template_versions (study_id, updated_at DESC);

-- ---------------------------------------------------------------
-- Shared BEFORE UPDATE trigger.
--
-- Always advances `updated_at`. `updated_by` is set to `auth.uid()` when the
-- request runs in an authenticated client context. When the server uses the
-- service role (no `auth.uid()`), we preserve any value the caller set so
-- internal jobs can attribute writes when desired.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_template_row_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by, OLD.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_definitions_audit ON public.study_visit_definitions;
CREATE TRIGGER trg_visit_definitions_audit
  BEFORE UPDATE ON public.study_visit_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_row_audit();

DROP TRIGGER IF EXISTS trg_study_crfs_audit ON public.study_crfs;
CREATE TRIGGER trg_study_crfs_audit
  BEFORE UPDATE ON public.study_crfs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_row_audit();

DROP TRIGGER IF EXISTS trg_study_crf_questions_audit ON public.study_crf_questions;
CREATE TRIGGER trg_study_crf_questions_audit
  BEFORE UPDATE ON public.study_crf_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_row_audit();

DROP TRIGGER IF EXISTS trg_study_ecrf_template_versions_audit ON public.study_ecrf_template_versions;
CREATE TRIGGER trg_study_ecrf_template_versions_audit
  BEFORE UPDATE ON public.study_ecrf_template_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_row_audit();

-- ---------------------------------------------------------------
-- BEFORE INSERT trigger to capture the creating user when callers don't
-- explicitly provide `updated_by`. Mirrors the existing `created_by`
-- behavior on `study_ecrf_template_versions`.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_template_row_audit_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF NEW.updated_by IS NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visit_definitions_audit_insert ON public.study_visit_definitions;
CREATE TRIGGER trg_visit_definitions_audit_insert
  BEFORE INSERT ON public.study_visit_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_row_audit_insert();

DROP TRIGGER IF EXISTS trg_study_crfs_audit_insert ON public.study_crfs;
CREATE TRIGGER trg_study_crfs_audit_insert
  BEFORE INSERT ON public.study_crfs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_row_audit_insert();

DROP TRIGGER IF EXISTS trg_study_crf_questions_audit_insert ON public.study_crf_questions;
CREATE TRIGGER trg_study_crf_questions_audit_insert
  BEFORE INSERT ON public.study_crf_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_row_audit_insert();

DROP TRIGGER IF EXISTS trg_study_ecrf_template_versions_audit_insert ON public.study_ecrf_template_versions;
CREATE TRIGGER trg_study_ecrf_template_versions_audit_insert
  BEFORE INSERT ON public.study_ecrf_template_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_template_row_audit_insert();
