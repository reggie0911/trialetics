-- Link propagated site lines back to study budget lines for re-sync / diff.
ALTER TABLE public.site_budget_line_items
  ADD COLUMN IF NOT EXISTS source_line_id UUID REFERENCES public.budget_line_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_site_budget_line_items_source_line
  ON public.site_budget_line_items (source_line_id)
  WHERE source_line_id IS NOT NULL;

COMMENT ON COLUMN public.site_budget_line_items.source_line_id IS 'Study budget_line_items.id when this row was propagated from the study master. null for manually added lines.';
