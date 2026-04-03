-- Persist full Budget Wizard form state for round-trip edit after create.
ALTER TABLE public.study_budgets
  ADD COLUMN IF NOT EXISTS wizard_inputs JSONB;

COMMENT ON COLUMN public.study_budgets.wizard_inputs IS 'Snapshot of Budget Wizard fields (studyInputs, assumptions, drivers, optional template flags) for edit/regenerate flows.';
