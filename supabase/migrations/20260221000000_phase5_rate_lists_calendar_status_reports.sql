-- Phase 5: Enhanced Features - Rate lists, calendar, status reports, org chart
-- Per Oracle CTMS: Position types, rate lists, status report, organizational analysis

-- ============================================================================
-- 1. Position types and rate lists (Oracle: Admin Setup for team billing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.position_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_position_types_company ON public.position_types(company_id);

ALTER TABLE public.position_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view position types in their company"
  ON public.position_types FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage position types in their company"
  ON public.position_types FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_position_types_updated_at
  BEFORE UPDATE ON public.position_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.position_types IS 'Position types for team billing (Oracle: Admin Setup)';

-- Rate lists: hourly rates per position type, applied to protocols
CREATE TABLE IF NOT EXISTS public.rate_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  currency_code TEXT DEFAULT 'USD',
  effective_from DATE,
  effective_to DATE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_lists_company ON public.rate_lists(company_id);

ALTER TABLE public.rate_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rate lists in their company"
  ON public.rate_lists FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage rate lists in their company"
  ON public.rate_lists FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_rate_lists_updated_at
  BEFORE UPDATE ON public.rate_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Rate list items: position type + hourly rate
CREATE TABLE IF NOT EXISTS public.rate_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_list_id UUID NOT NULL REFERENCES public.rate_lists(id) ON DELETE CASCADE,
  position_type_id UUID NOT NULL REFERENCES public.position_types(id) ON DELETE CASCADE,
  hourly_rate DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rate_list_id, position_type_id)
);

CREATE INDEX IF NOT EXISTS idx_rate_list_items_rate_list ON public.rate_list_items(rate_list_id);
CREATE INDEX IF NOT EXISTS idx_rate_list_items_position ON public.rate_list_items(position_type_id);

ALTER TABLE public.rate_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rate list items"
  ON public.rate_list_items FOR SELECT
  USING (rate_list_id IN (SELECT id FROM public.rate_lists WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

CREATE POLICY "Users can manage rate list items"
  ON public.rate_list_items FOR ALL
  USING (rate_list_id IN (SELECT id FROM public.rate_lists WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

CREATE TRIGGER update_rate_list_items_updated_at
  BEFORE UPDATE ON public.rate_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link protocol to rate list (optional)
ALTER TABLE public.clinical_protocols
  ADD COLUMN IF NOT EXISTS rate_list_id UUID REFERENCES public.rate_lists(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.clinical_protocols.rate_list_id IS 'Optional rate list for team workbook billing';

-- ============================================================================
-- 2. Protocol status reports (Oracle: Status Report view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.protocol_status_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_start DATE,
  period_end DATE,
  progress_summary TEXT,
  forecast TEXT,
  issues TEXT,
  risks TEXT,
  next_steps TEXT,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_status_reports_protocol ON public.protocol_status_reports(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_status_reports_company ON public.protocol_status_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_protocol_status_reports_date ON public.protocol_status_reports(report_date);

ALTER TABLE public.protocol_status_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol status reports in their company"
  ON public.protocol_status_reports FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage protocol status reports in their company"
  ON public.protocol_status_reports FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TRIGGER update_protocol_status_reports_updated_at
  BEFORE UPDATE ON public.protocol_status_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.protocol_status_reports IS 'Protocol status reports (Oracle: Status Report view)';

-- ============================================================================
-- 3. Organizational analysis - manager_id on contacts for org chart
-- ============================================================================

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_manager ON public.contacts(manager_id);

COMMENT ON COLUMN public.contacts.manager_id IS 'Manager contact for org chart (Oracle: Organizational Analysis)';
