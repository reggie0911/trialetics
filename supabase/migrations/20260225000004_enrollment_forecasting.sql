-- Enrollment Forecasting Module
-- Tables: enrollment_targets, enrollment_projections, enrollment_scenarios

-- =====================================================
-- 1. enrollment_targets
-- =====================================================
CREATE TABLE IF NOT EXISTS public.enrollment_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.clinical_regions(id) ON DELETE SET NULL,
  target_count INTEGER NOT NULL,
  target_date DATE NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('screen', 'enroll', 'complete')),
  milestone_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_targets_company_id ON public.enrollment_targets(company_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_targets_protocol_id ON public.enrollment_targets(protocol_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_targets_site_id ON public.enrollment_targets(site_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_targets_target_date ON public.enrollment_targets(target_date);

DROP TRIGGER IF EXISTS update_enrollment_targets_updated_at ON public.enrollment_targets;
CREATE TRIGGER update_enrollment_targets_updated_at
  BEFORE UPDATE ON public.enrollment_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.enrollment_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enrollment_targets in their company"
  ON public.enrollment_targets FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage enrollment_targets in their company"
  ON public.enrollment_targets FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 2. enrollment_projections
-- =====================================================
CREATE TABLE IF NOT EXISTS public.enrollment_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  projection_date DATE NOT NULL,
  projected_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  projection_name TEXT,
  method TEXT NOT NULL CHECK (method IN ('linear', 'historical', 'custom')),
  assumptions JSONB DEFAULT '{}',
  site_projections JSONB DEFAULT '{}',
  total_projected_count INTEGER,
  total_projected_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_projections_company_id ON public.enrollment_projections(company_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_projections_protocol_id ON public.enrollment_projections(protocol_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_projections_projection_date ON public.enrollment_projections(projection_date);

DROP TRIGGER IF EXISTS update_enrollment_projections_updated_at ON public.enrollment_projections;
CREATE TRIGGER update_enrollment_projections_updated_at
  BEFORE UPDATE ON public.enrollment_projections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.enrollment_projections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enrollment_projections in their company"
  ON public.enrollment_projections FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage enrollment_projections in their company"
  ON public.enrollment_projections FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- 3. enrollment_scenarios
-- =====================================================
CREATE TABLE IF NOT EXISTS public.enrollment_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('optimistic', 'baseline', 'pessimistic', 'custom')),
  parameters JSONB DEFAULT '{}',
  projected_first_enrolled DATE,
  projected_last_enrolled DATE,
  projected_total INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_scenarios_company_id ON public.enrollment_scenarios(company_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_scenarios_protocol_id ON public.enrollment_scenarios(protocol_id);

DROP TRIGGER IF EXISTS update_enrollment_scenarios_updated_at ON public.enrollment_scenarios;
CREATE TRIGGER update_enrollment_scenarios_updated_at
  BEFORE UPDATE ON public.enrollment_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.enrollment_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view enrollment_scenarios in their company"
  ON public.enrollment_scenarios FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage enrollment_scenarios in their company"
  ON public.enrollment_scenarios FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
