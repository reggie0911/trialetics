-- =====================================================
-- Trip Report Template Versioning
-- =====================================================
--
-- Implements the "O - Template snapshot/versioning" backlog item from the
-- Trip Reports Gap Remediation plan. A trip report now snapshots the live
-- visit_report_templates row + its question rows at create time so later
-- edits to the template never silently mutate historical reports.
--
-- Mirrors the existing eCRF template-versions pattern in
-- 20260519000000_ecrf_template_versions.sql but is scoped to a single
-- visit_report_templates row (company-wide template, not study-scoped
-- workflow). Snapshots are immutable: INSERT-only RLS, no UPDATE / DELETE
-- policies.
--
-- Backfill: lazy. Existing reports without a snapshot keep using
-- trip_reports.template_id. New reads check template_version_id first and
-- fall back to the live template for legacy rows.

-- ---------------------------------------------------------------
-- visit_report_template_versions: one row per locked-in snapshot.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visit_report_template_versions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         UUID        NOT NULL REFERENCES public.visit_report_templates(id) ON DELETE RESTRICT,
  version_number      INT         NOT NULL,
  -- Snapshotted template metadata. Mirrors visit_report_templates columns
  -- so the live row can be edited or even soft-deleted without affecting
  -- historical PDFs / authoring views.
  name                TEXT        NOT NULL,
  visit_report_type   TEXT        NOT NULL,
  days_submission     INT         NOT NULL,
  days_approval       INT         NOT NULL,
  snapshot_reason     TEXT        NOT NULL CHECK (snapshot_reason IN ('on_create','on_first_edit')),
  snapshot_taken_by   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_visit_report_template_versions_template
  ON public.visit_report_template_versions(template_id);

ALTER TABLE public.visit_report_template_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visit_report_template_versions_select" ON public.visit_report_template_versions;
DROP POLICY IF EXISTS "visit_report_template_versions_insert" ON public.visit_report_template_versions;

-- SELECT: company-scoped via the live template's company_id.
CREATE POLICY "visit_report_template_versions_select" ON public.visit_report_template_versions
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM public.visit_report_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- INSERT: any authenticated company member (snapshots are written during
-- the normal report-create / first-edit flow, by the same user who owns
-- the live template's company).
CREATE POLICY "visit_report_template_versions_insert" ON public.visit_report_template_versions
  FOR INSERT WITH CHECK (
    template_id IN (
      SELECT id FROM public.visit_report_templates
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Intentionally no UPDATE / DELETE policies: snapshots are immutable.

-- ---------------------------------------------------------------
-- visit_report_template_question_versions: snapshotted questions for a
-- specific template version. CASCADE on the version so re-snapshotting
-- (the on_first_edit path) leaves a clean delete chain.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visit_report_template_question_versions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id UUID        NOT NULL REFERENCES public.visit_report_template_versions(id) ON DELETE CASCADE,
  -- Original visit_report_template_questions.id at snapshot time. Used to
  -- migrate any pre-snapshot trip_report_question_responses to the new
  -- snapshot's question rows on the on_first_edit re-snapshot path.
  -- Nullable so deleting a live question after a snapshot does not
  -- prevent future re-snapshots from succeeding.
  source_question_id  UUID        NULL,
  report_order        INT         NOT NULL DEFAULT 0,
  report_section      TEXT        NULL,
  report_sub_section  TEXT        NULL,
  question_text       TEXT        NOT NULL,
  sort_order          INT         NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_report_template_question_versions_version
  ON public.visit_report_template_question_versions(template_version_id);

CREATE INDEX IF NOT EXISTS idx_visit_report_template_question_versions_source
  ON public.visit_report_template_question_versions(template_version_id, source_question_id);

ALTER TABLE public.visit_report_template_question_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visit_report_template_question_versions_select" ON public.visit_report_template_question_versions;
DROP POLICY IF EXISTS "visit_report_template_question_versions_insert" ON public.visit_report_template_question_versions;

CREATE POLICY "visit_report_template_question_versions_select" ON public.visit_report_template_question_versions
  FOR SELECT USING (
    template_version_id IN (
      SELECT v.id FROM public.visit_report_template_versions v
      JOIN public.visit_report_templates t ON t.id = v.template_id
      WHERE t.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "visit_report_template_question_versions_insert" ON public.visit_report_template_question_versions
  FOR INSERT WITH CHECK (
    template_version_id IN (
      SELECT v.id FROM public.visit_report_template_versions v
      JOIN public.visit_report_templates t ON t.id = v.template_id
      WHERE t.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- Intentionally no UPDATE / DELETE policies: snapshotted questions are
-- immutable. Re-snapshots create a brand-new version row + new question
-- rows; nothing rewrites prior versions in place.

-- ---------------------------------------------------------------
-- trip_reports: optional pointer to the active snapshot for this report.
-- RESTRICT (not CASCADE / SET NULL): the snapshot must outlive the report
-- in case any audit consumer needs to render historical content.
-- ---------------------------------------------------------------
ALTER TABLE public.trip_reports
  ADD COLUMN IF NOT EXISTS template_version_id UUID NULL
    REFERENCES public.visit_report_template_versions(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_trip_reports_template_version
  ON public.trip_reports(template_version_id);

-- ---------------------------------------------------------------
-- trip_report_question_responses: dual-link to either the live question
-- (legacy reports) or the snapshotted question (snapshot reports).
-- ---------------------------------------------------------------
ALTER TABLE public.trip_report_question_responses
  ADD COLUMN IF NOT EXISTS template_question_version_id UUID NULL
    REFERENCES public.visit_report_template_question_versions(id) ON DELETE CASCADE;

-- Drop the previous full UNIQUE (trip_report_id, template_question_id)
-- constraint introduced by 20260319000000_visit_report_module.sql. The
-- inline UNIQUE there did not have an explicit name, so Postgres assigns
-- one based on the column list and truncates to 63 chars. Look it up in
-- pg_constraint by definition rather than name to be environment-safe.
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT c.conname INTO v_conname
  FROM   pg_constraint c
  JOIN   pg_class t ON t.oid = c.conrelid
  JOIN   pg_namespace n ON n.oid = t.relnamespace
  WHERE  n.nspname = 'public'
    AND  t.relname = 'trip_report_question_responses'
    AND  c.contype = 'u'
    AND  pg_get_constraintdef(c.oid) = 'UNIQUE (trip_report_id, template_question_id)'
  LIMIT  1;

  IF v_conname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.trip_report_question_responses DROP CONSTRAINT %I',
      v_conname
    );
  END IF;
END $$;

-- template_question_id is NOT NULL today. Snapshotted reports do not set
-- it, so relax the constraint.
ALTER TABLE public.trip_report_question_responses
  ALTER COLUMN template_question_id DROP NOT NULL;

-- At least one of the two question links must be set on every row.
ALTER TABLE public.trip_report_question_responses
  DROP CONSTRAINT IF EXISTS trip_report_question_responses_question_link_chk;
ALTER TABLE public.trip_report_question_responses
  ADD CONSTRAINT trip_report_question_responses_question_link_chk
    CHECK (template_question_id IS NOT NULL OR template_question_version_id IS NOT NULL);

-- Replacement uniqueness: one response per question, on whichever side
-- of the link applies. Partial indexes guarantee no row collisions
-- across legacy and snapshot reports for the same trip report.
CREATE UNIQUE INDEX IF NOT EXISTS trip_report_question_responses_legacy_unique
  ON public.trip_report_question_responses(trip_report_id, template_question_id)
  WHERE template_question_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trip_report_question_responses_snapshot_unique
  ON public.trip_report_question_responses(trip_report_id, template_question_version_id)
  WHERE template_question_version_id IS NOT NULL;
