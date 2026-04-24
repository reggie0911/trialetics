-- Add optional study scoping for BrandForge and Custom Trackers.
-- Existing company-scoped records are preserved with NULL study_id.

ALTER TABLE public.bf_projects
  ADD COLUMN IF NOT EXISTS study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bf_projects_study_id
  ON public.bf_projects(study_id);

ALTER TABLE public.custom_tracker_definitions
  ADD COLUMN IF NOT EXISTS study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custom_tracker_definitions_study_id
  ON public.custom_tracker_definitions(study_id);

CREATE OR REPLACE FUNCTION public.ensure_study_and_company_match(study_id UUID, company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.studies s
    WHERE s.id = study_id
      AND s.company_id = company_id
  );
$$;

ALTER TABLE public.bf_projects
  DROP CONSTRAINT IF EXISTS bf_projects_study_matches_company;

ALTER TABLE public.bf_projects
  ADD CONSTRAINT bf_projects_study_matches_company
  CHECK (study_id IS NULL OR public.ensure_study_and_company_match(study_id, company_id));

ALTER TABLE public.custom_tracker_definitions
  DROP CONSTRAINT IF EXISTS custom_tracker_definitions_study_matches_company;

ALTER TABLE public.custom_tracker_definitions
  ADD CONSTRAINT custom_tracker_definitions_study_matches_company
  CHECK (study_id IS NULL OR public.ensure_study_and_company_match(study_id, company_id));
