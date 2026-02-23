-- Site Management Enhancement
-- Site performance scorecards and scoring criteria

DO $$ BEGIN
  CREATE TYPE scorecard_criterion_category AS ENUM ('enrollment', 'data_quality', 'compliance', 'safety', 'operational');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 1. Site Scorecard Criteria (company-level templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_scorecard_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  criterion_name TEXT NOT NULL,
  category scorecard_criterion_category NOT NULL,
  weight NUMERIC(5,2) DEFAULT 1.0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_criteria_company ON public.site_scorecard_criteria(company_id);

DROP TRIGGER IF EXISTS update_scorecard_criteria_updated_at ON public.site_scorecard_criteria;
CREATE TRIGGER update_scorecard_criteria_updated_at
  BEFORE UPDATE ON public.site_scorecard_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_scorecard_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scorecard criteria in their company"
  ON public.site_scorecard_criteria FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage scorecard criteria in their company"
  ON public.site_scorecard_criteria FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- 2. Site Scorecards
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  scorecard_date DATE NOT NULL DEFAULT CURRENT_DATE,
  enrollment_score NUMERIC(5,2),
  data_quality_score NUMERIC(5,2),
  compliance_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  notes TEXT,
  scored_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_scorecards_company ON public.site_scorecards(company_id);
CREATE INDEX IF NOT EXISTS idx_site_scorecards_protocol ON public.site_scorecards(protocol_id);
CREATE INDEX IF NOT EXISTS idx_site_scorecards_site ON public.site_scorecards(site_id);

DROP TRIGGER IF EXISTS update_site_scorecards_updated_at ON public.site_scorecards;
CREATE TRIGGER update_site_scorecards_updated_at
  BEFORE UPDATE ON public.site_scorecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site scorecards in their company"
  ON public.site_scorecards FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage site scorecards in their company"
  ON public.site_scorecards FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.site_scorecards IS 'Performance scorecards for clinical sites';
COMMENT ON TABLE public.site_scorecard_criteria IS 'Scoring criteria templates for site scorecards';
