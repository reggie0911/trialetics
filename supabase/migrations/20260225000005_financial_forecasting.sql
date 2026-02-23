-- Financial Forecasting Module
-- Tables: budget_line_items, spend_actuals, spend_forecasts, variance_reports

-- =====================================================
-- 1. budget_line_items
-- =====================================================
CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('site_costs', 'personnel', 'travel', 'vendor', 'other')),
  subcategory TEXT,
  description TEXT,
  budgeted_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  period_start DATE,
  period_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_line_items_company_id ON public.budget_line_items(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_protocol_id ON public.budget_line_items(protocol_id);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_category ON public.budget_line_items(category);

DROP TRIGGER IF EXISTS update_budget_line_items_updated_at ON public.budget_line_items;
CREATE TRIGGER update_budget_line_items_updated_at
  BEFORE UPDATE ON public.budget_line_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget_line_items in their company"
  ON public.budget_line_items FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage budget_line_items in their company"
  ON public.budget_line_items FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 2. spend_actuals
-- =====================================================
CREATE TABLE IF NOT EXISTS public.spend_actuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_line_item_id UUID REFERENCES public.budget_line_items(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  spend_date DATE NOT NULL,
  description TEXT,
  payment_record_id UUID REFERENCES public.payment_records(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spend_actuals_company_id ON public.spend_actuals(company_id);
CREATE INDEX IF NOT EXISTS idx_spend_actuals_protocol_id ON public.spend_actuals(protocol_id);
CREATE INDEX IF NOT EXISTS idx_spend_actuals_budget_line_item_id ON public.spend_actuals(budget_line_item_id);
CREATE INDEX IF NOT EXISTS idx_spend_actuals_spend_date ON public.spend_actuals(spend_date);

DROP TRIGGER IF EXISTS update_spend_actuals_updated_at ON public.spend_actuals;
CREATE TRIGGER update_spend_actuals_updated_at
  BEFORE UPDATE ON public.spend_actuals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.spend_actuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view spend_actuals in their company"
  ON public.spend_actuals FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage spend_actuals in their company"
  ON public.spend_actuals FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 3. spend_forecasts
-- =====================================================
CREATE TABLE IF NOT EXISTS public.spend_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecasted_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  forecast_name TEXT,
  forecast_period_start DATE NOT NULL,
  forecast_period_end DATE NOT NULL,
  total_forecasted_spend NUMERIC(14,2),
  assumptions JSONB DEFAULT '{}',
  line_item_forecasts JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spend_forecasts_company_id ON public.spend_forecasts(company_id);
CREATE INDEX IF NOT EXISTS idx_spend_forecasts_protocol_id ON public.spend_forecasts(protocol_id);
CREATE INDEX IF NOT EXISTS idx_spend_forecasts_forecast_date ON public.spend_forecasts(forecast_date);

DROP TRIGGER IF EXISTS update_spend_forecasts_updated_at ON public.spend_forecasts;
CREATE TRIGGER update_spend_forecasts_updated_at
  BEFORE UPDATE ON public.spend_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.spend_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view spend_forecasts in their company"
  ON public.spend_forecasts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage spend_forecasts in their company"
  ON public.spend_forecasts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 4. variance_reports
-- =====================================================
CREATE TABLE IF NOT EXISTS public.variance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_budgeted NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_actual NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_variance NUMERIC(14,2) NOT NULL DEFAULT 0,
  variance_percentage NUMERIC(5,2),
  category_breakdown JSONB DEFAULT '{}',
  generated_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variance_reports_company_id ON public.variance_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_variance_reports_protocol_id ON public.variance_reports(protocol_id);
CREATE INDEX IF NOT EXISTS idx_variance_reports_report_date ON public.variance_reports(report_date);

DROP TRIGGER IF EXISTS update_variance_reports_updated_at ON public.variance_reports;
CREATE TRIGGER update_variance_reports_updated_at
  BEFORE UPDATE ON public.variance_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.variance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variance_reports in their company"
  ON public.variance_reports FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage variance_reports in their company"
  ON public.variance_reports FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
