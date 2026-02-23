-- Feasibility and Site Selection Module
-- Site evaluation scoring, ranking, and selection decisions

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE feasibility_study_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feasibility_criteria_category AS ENUM (
    'therapeutic_experience', 'patient_population', 'regulatory',
    'infrastructure', 'investigator', 'logistics'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feasibility_evaluation_status AS ENUM ('pending', 'in_progress', 'scored', 'selected', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE site_selection_decision AS ENUM ('selected', 'backup', 'rejected', 'deferred');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Feasibility Studies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feasibility_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status feasibility_study_status DEFAULT 'draft',
  criteria_weights JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feasibility_studies_company ON public.feasibility_studies(company_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_studies_protocol ON public.feasibility_studies(protocol_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_studies_status ON public.feasibility_studies(status);

DROP TRIGGER IF EXISTS update_feasibility_studies_updated_at ON public.feasibility_studies;
CREATE TRIGGER update_feasibility_studies_updated_at
  BEFORE UPDATE ON public.feasibility_studies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.feasibility_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feasibility studies in their company"
  ON public.feasibility_studies FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage feasibility studies in their company"
  ON public.feasibility_studies FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.feasibility_studies IS 'Study-level feasibility assessment configurations';

DROP TRIGGER IF EXISTS audit_trigger_feasibility_studies ON public.feasibility_studies;
CREATE TRIGGER audit_trigger_feasibility_studies
  AFTER INSERT OR UPDATE OR DELETE ON public.feasibility_studies
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Feasibility Criteria
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feasibility_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feasibility_study_id UUID NOT NULL REFERENCES public.feasibility_studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category feasibility_criteria_category NOT NULL,
  weight NUMERIC(5,2) DEFAULT 1.0,
  max_score INTEGER DEFAULT 5,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feasibility_criteria_study ON public.feasibility_criteria(feasibility_study_id);

DROP TRIGGER IF EXISTS update_feasibility_criteria_updated_at ON public.feasibility_criteria;
CREATE TRIGGER update_feasibility_criteria_updated_at
  BEFORE UPDATE ON public.feasibility_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.feasibility_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feasibility criteria in their company"
  ON public.feasibility_criteria FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage feasibility criteria in their company"
  ON public.feasibility_criteria FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.feasibility_criteria IS 'Scoring criteria for feasibility evaluations';

DROP TRIGGER IF EXISTS audit_trigger_feasibility_criteria ON public.feasibility_criteria;
CREATE TRIGGER audit_trigger_feasibility_criteria
  AFTER INSERT OR UPDATE OR DELETE ON public.feasibility_criteria
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Feasibility Site Evaluations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feasibility_site_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feasibility_study_id UUID NOT NULL REFERENCES public.feasibility_studies(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status feasibility_evaluation_status DEFAULT 'pending',
  overall_score NUMERIC(6,2),
  notes TEXT,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feasibility_evaluations_study ON public.feasibility_site_evaluations(feasibility_study_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_evaluations_org ON public.feasibility_site_evaluations(organization_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_evaluations_status ON public.feasibility_site_evaluations(status);

DROP TRIGGER IF EXISTS update_feasibility_evaluations_updated_at ON public.feasibility_site_evaluations;
CREATE TRIGGER update_feasibility_evaluations_updated_at
  BEFORE UPDATE ON public.feasibility_site_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.feasibility_site_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feasibility evaluations in their company"
  ON public.feasibility_site_evaluations FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage feasibility evaluations in their company"
  ON public.feasibility_site_evaluations FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.feasibility_site_evaluations IS 'Per-site evaluation records for feasibility studies';

DROP TRIGGER IF EXISTS audit_trigger_feasibility_site_evaluations ON public.feasibility_site_evaluations;
CREATE TRIGGER audit_trigger_feasibility_site_evaluations
  AFTER INSERT OR UPDATE OR DELETE ON public.feasibility_site_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Feasibility Criterion Scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.feasibility_criterion_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  evaluation_id UUID NOT NULL REFERENCES public.feasibility_site_evaluations(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.feasibility_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  justification TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (evaluation_id, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_feasibility_scores_evaluation ON public.feasibility_criterion_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_feasibility_scores_criterion ON public.feasibility_criterion_scores(criterion_id);

DROP TRIGGER IF EXISTS update_feasibility_scores_updated_at ON public.feasibility_criterion_scores;
CREATE TRIGGER update_feasibility_scores_updated_at
  BEFORE UPDATE ON public.feasibility_criterion_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.feasibility_criterion_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feasibility scores in their company"
  ON public.feasibility_criterion_scores FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage feasibility scores in their company"
  ON public.feasibility_criterion_scores FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.feasibility_criterion_scores IS 'Individual criterion scores per site evaluation';

-- ============================================================================
-- Site Selection Decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_selection_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feasibility_study_id UUID NOT NULL REFERENCES public.feasibility_studies(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  decision site_selection_decision NOT NULL,
  rationale TEXT,
  decided_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_selection_study ON public.site_selection_decisions(feasibility_study_id);
CREATE INDEX IF NOT EXISTS idx_site_selection_org ON public.site_selection_decisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_selection_decision ON public.site_selection_decisions(decision);

DROP TRIGGER IF EXISTS update_site_selection_decisions_updated_at ON public.site_selection_decisions;
CREATE TRIGGER update_site_selection_decisions_updated_at
  BEFORE UPDATE ON public.site_selection_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_selection_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site selection decisions in their company"
  ON public.site_selection_decisions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage site selection decisions in their company"
  ON public.site_selection_decisions FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.site_selection_decisions IS 'Final site selection decisions with rationale';

DROP TRIGGER IF EXISTS audit_trigger_site_selection_decisions ON public.site_selection_decisions;
CREATE TRIGGER audit_trigger_site_selection_decisions
  AFTER INSERT OR UPDATE OR DELETE ON public.site_selection_decisions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
