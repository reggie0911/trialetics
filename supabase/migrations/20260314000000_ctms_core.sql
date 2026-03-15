-- =====================================================
-- CTMS CORE - Studies, Countries, Sites + Tracker Gating
-- =====================================================

-- 1. Add tracker access flag to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS has_tracker_access BOOLEAN NOT NULL DEFAULT false;

-- 2. Studies
CREATE TABLE IF NOT EXISTS public.studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_number TEXT NOT NULL,
  title TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('Phase I', 'Phase II', 'Phase III', 'Phase IV', 'Phase I/II', 'Phase II/III')),
  therapeutic_area TEXT,
  indication TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'closed', 'on_hold')),
  sponsor TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_studies_company_id ON public.studies(company_id);
CREATE INDEX IF NOT EXISTS idx_studies_status ON public.studies(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_studies_protocol_number ON public.studies(company_id, protocol_number);

CREATE TRIGGER update_studies_updated_at
  BEFORE UPDATE ON public.studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Study Countries
CREATE TABLE IF NOT EXISTS public.study_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  country_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'regulatory_submitted', 'approved', 'enrolling', 'closed')),
  regulatory_status TEXT DEFAULT 'not_started' CHECK (regulatory_status IN ('not_started', 'in_progress', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_study_countries_study_id ON public.study_countries(study_id);

CREATE TRIGGER update_study_countries_updated_at
  BEFORE UPDATE ON public.study_countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Study Sites
CREATE TABLE IF NOT EXISTS public.study_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  study_country_id UUID REFERENCES public.study_countries(id) ON DELETE SET NULL,
  site_number TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  pi_name TEXT,
  pi_email TEXT,
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'selected', 'initiated', 'activated', 'enrolling', 'closed')),
  activation_date DATE,
  target_enrollment INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_id, site_number)
);

CREATE INDEX IF NOT EXISTS idx_study_sites_study_id ON public.study_sites(study_id);
CREATE INDEX IF NOT EXISTS idx_study_sites_study_country_id ON public.study_sites(study_country_id);
CREATE INDEX IF NOT EXISTS idx_study_sites_status ON public.study_sites(status);

CREATE TRIGGER update_study_sites_updated_at
  BEFORE UPDATE ON public.study_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE public.studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sites ENABLE ROW LEVEL SECURITY;

-- Studies: company-scoped
CREATE POLICY "studies_select" ON public.studies
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "studies_insert" ON public.studies
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "studies_update" ON public.studies
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "studies_delete" ON public.studies
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Study Countries: scoped via study -> company
CREATE POLICY "study_countries_select" ON public.study_countries
  FOR SELECT USING (study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_countries_insert" ON public.study_countries
  FOR INSERT WITH CHECK (study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_countries_update" ON public.study_countries
  FOR UPDATE USING (study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_countries_delete" ON public.study_countries
  FOR DELETE USING (study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));

-- Study Sites: scoped via study -> company
CREATE POLICY "study_sites_select" ON public.study_sites
  FOR SELECT USING (study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_sites_insert" ON public.study_sites
  FOR INSERT WITH CHECK (study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_sites_update" ON public.study_sites
  FOR UPDATE USING (study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
CREATE POLICY "study_sites_delete" ON public.study_sites
  FOR DELETE USING (study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())));
