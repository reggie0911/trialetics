-- =====================================================
-- KRI Definitions
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'enrollment' CHECK (category IN ('enrollment', 'data_quality', 'safety', 'site_performance', 'regulatory', 'financial')),
  calculation_method TEXT,
  threshold_yellow NUMERIC(10,2),
  threshold_red NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kri_definitions_company ON public.kri_definitions(company_id);

CREATE TRIGGER update_kri_definitions_updated_at
  BEFORE UPDATE ON public.kri_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kri_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kri_definitions_select" ON public.kri_definitions
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "kri_definitions_insert" ON public.kri_definitions
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "kri_definitions_update" ON public.kri_definitions
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "kri_definitions_delete" ON public.kri_definitions
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- KRI Values
-- =====================================================

CREATE TABLE IF NOT EXISTS public.kri_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_definition_id UUID NOT NULL REFERENCES public.kri_definitions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  period TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kri_values_definition ON public.kri_values(kri_definition_id);
CREATE INDEX IF NOT EXISTS idx_kri_values_study ON public.kri_values(study_id);
CREATE INDEX IF NOT EXISTS idx_kri_values_site ON public.kri_values(site_id);

ALTER TABLE public.kri_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kri_values_select" ON public.kri_values
  FOR SELECT USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "kri_values_insert" ON public.kri_values
  FOR INSERT WITH CHECK (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "kri_values_update" ON public.kri_values
  FOR UPDATE USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "kri_values_delete" ON public.kri_values
  FOR DELETE USING (
    study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  );

-- =====================================================
-- Saved Reports
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'enrollment' CHECK (report_type IN ('enrollment', 'site_performance', 'kri_summary', 'financial_summary', 'subject_status', 'visit_summary', 'custom')),
  filters JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_reports_company ON public.saved_reports(company_id);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_reports_select" ON public.saved_reports
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "saved_reports_insert" ON public.saved_reports
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "saved_reports_delete" ON public.saved_reports
  FOR DELETE USING (created_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
