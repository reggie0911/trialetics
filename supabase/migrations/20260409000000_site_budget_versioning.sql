-- Add versioning columns to site_budgets
ALTER TABLE public.site_budgets
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_budget_id UUID REFERENCES public.site_budgets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_site_budgets_supersedes ON public.site_budgets(supersedes_budget_id);
