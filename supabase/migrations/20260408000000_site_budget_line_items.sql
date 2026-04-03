-- Extend site_budgets with document, overhead, and payment info columns
ALTER TABLE public.site_budgets
  ADD COLUMN IF NOT EXISTS document_path TEXT,
  ADD COLUMN IF NOT EXISTS overhead_rate NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS payment_info JSONB;

-- Per-site budget line items with sections, overhead, and payment routing
CREATE TABLE IF NOT EXISTS public.site_budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_budget_id UUID NOT NULL REFERENCES public.site_budgets(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  description TEXT NOT NULL,
  cost_basis TEXT,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_cost NUMERIC(14,2) GENERATED ALWAYS AS (unit_cost * quantity) STORED,
  overhead_rate NUMERIC(5,4),
  overhead_amount NUMERIC(14,2) GENERATED ALWAYS AS (
    CASE WHEN overhead_rate IS NOT NULL THEN unit_cost * quantity * overhead_rate ELSE 0 END
  ) STORED,
  cost_with_overhead NUMERIC(14,2) GENERATED ALWAYS AS (
    unit_cost * quantity + CASE WHEN overhead_rate IS NOT NULL THEN unit_cost * quantity * overhead_rate ELSE 0 END
  ) STORED,
  paid_to TEXT NOT NULL DEFAULT 'site' CHECK (paid_to IN ('site', 'irb', 'vendor')),
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_budget_line_items_budget ON public.site_budget_line_items(site_budget_id);

ALTER TABLE public.site_budget_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_budget_line_items_select" ON public.site_budget_line_items
  FOR SELECT USING (
    site_budget_id IN (
      SELECT sb.id FROM public.site_budgets sb
      JOIN public.studies s ON sb.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "site_budget_line_items_insert" ON public.site_budget_line_items
  FOR INSERT WITH CHECK (
    site_budget_id IN (
      SELECT sb.id FROM public.site_budgets sb
      JOIN public.studies s ON sb.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "site_budget_line_items_update" ON public.site_budget_line_items
  FOR UPDATE USING (
    site_budget_id IN (
      SELECT sb.id FROM public.site_budgets sb
      JOIN public.studies s ON sb.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "site_budget_line_items_delete" ON public.site_budget_line_items
  FOR DELETE USING (
    site_budget_id IN (
      SELECT sb.id FROM public.site_budgets sb
      JOIN public.studies s ON sb.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
