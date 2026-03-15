-- =====================================================
-- Study Budgets
-- =====================================================

CREATE TABLE IF NOT EXISTS public.study_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'active')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_budgets_study ON public.study_budgets(study_id);

CREATE TRIGGER update_study_budgets_updated_at
  BEFORE UPDATE ON public.study_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.study_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_budgets_select" ON public.study_budgets
  FOR SELECT USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "study_budgets_insert" ON public.study_budgets
  FOR INSERT WITH CHECK (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "study_budgets_update" ON public.study_budgets
  FOR UPDATE USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "study_budgets_delete" ON public.study_budgets
  FOR DELETE USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );

-- =====================================================
-- Budget Line Items
-- =====================================================

CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.study_budgets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_cost NUMERIC(14,2) GENERATED ALWAYS AS (unit_cost * quantity) STORED,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_line_items_budget ON public.budget_line_items(budget_id);

ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_line_items_select" ON public.budget_line_items
  FOR SELECT USING (
    budget_id IN (
      SELECT b.id FROM public.study_budgets b
      JOIN public.studies s ON b.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "budget_line_items_insert" ON public.budget_line_items
  FOR INSERT WITH CHECK (
    budget_id IN (
      SELECT b.id FROM public.study_budgets b
      JOIN public.studies s ON b.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "budget_line_items_update" ON public.budget_line_items
  FOR UPDATE USING (
    budget_id IN (
      SELECT b.id FROM public.study_budgets b
      JOIN public.studies s ON b.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "budget_line_items_delete" ON public.budget_line_items
  FOR DELETE USING (
    budget_id IN (
      SELECT b.id FROM public.study_budgets b
      JOIN public.studies s ON b.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- Site Payments
-- =====================================================

CREATE TABLE IF NOT EXISTS public.site_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL DEFAULT 'milestone' CHECK (payment_type IN ('startup', 'milestone', 'per_subject', 'pass_through')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  invoice_number TEXT,
  invoice_date DATE,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_payments_site ON public.site_payments(site_id);
CREATE INDEX IF NOT EXISTS idx_site_payments_study ON public.site_payments(study_id);
CREATE INDEX IF NOT EXISTS idx_site_payments_status ON public.site_payments(status);

ALTER TABLE public.site_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_payments_select" ON public.site_payments
  FOR SELECT USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "site_payments_insert" ON public.site_payments
  FOR INSERT WITH CHECK (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "site_payments_update" ON public.site_payments
  FOR UPDATE USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "site_payments_delete" ON public.site_payments
  FOR DELETE USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );

-- =====================================================
-- Payment Schedules
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  milestone_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'due', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_site ON public.payment_schedules(site_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_study ON public.payment_schedules(study_id);

ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_schedules_select" ON public.payment_schedules
  FOR SELECT USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "payment_schedules_insert" ON public.payment_schedules
  FOR INSERT WITH CHECK (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "payment_schedules_update" ON public.payment_schedules
  FOR UPDATE USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "payment_schedules_delete" ON public.payment_schedules
  FOR DELETE USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
