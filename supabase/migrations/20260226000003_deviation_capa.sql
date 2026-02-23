-- Deviation and CAPA Management
-- Deviation logging, root cause analysis, CAPA tracking, effectiveness monitoring

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE deviation_severity AS ENUM ('minor', 'major', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE deviation_status AS ENUM ('open', 'investigating', 'capa_required', 'capa_in_progress', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE capa_status AS ENUM ('planned', 'in_progress', 'completed', 'verified_effective', 'verified_ineffective', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE capa_type AS ENUM ('corrective', 'preventive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Deviation Categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deviation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.deviation_categories(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deviation_categories_company ON public.deviation_categories(company_id);

DROP TRIGGER IF EXISTS update_deviation_categories_updated_at ON public.deviation_categories;
CREATE TRIGGER update_deviation_categories_updated_at
  BEFORE UPDATE ON public.deviation_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.deviation_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deviation categories in their company"
  ON public.deviation_categories FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage deviation categories in their company"
  ON public.deviation_categories FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.deviation_categories IS 'ICH/GCP standard deviation categories';

-- ============================================================================
-- Deviations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  deviation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity deviation_severity NOT NULL DEFAULT 'minor',
  status deviation_status NOT NULL DEFAULT 'open',
  category_id UUID REFERENCES public.deviation_categories(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  detected_date DATE,
  detected_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  root_cause TEXT,
  impact_assessment TEXT,
  reported_to_sponsor BOOLEAN DEFAULT false,
  reported_to_irb BOOLEAN DEFAULT false,
  closed_date DATE,
  closed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deviations_company ON public.deviations(company_id);
CREATE INDEX IF NOT EXISTS idx_deviations_protocol ON public.deviations(protocol_id);
CREATE INDEX IF NOT EXISTS idx_deviations_status ON public.deviations(status);
CREATE INDEX IF NOT EXISTS idx_deviations_severity ON public.deviations(severity);
CREATE INDEX IF NOT EXISTS idx_deviations_category ON public.deviations(category_id);
CREATE INDEX IF NOT EXISTS idx_deviations_site ON public.deviations(site_id);
CREATE INDEX IF NOT EXISTS idx_deviations_number ON public.deviations(deviation_number);

DROP TRIGGER IF EXISTS update_deviations_updated_at ON public.deviations;
CREATE TRIGGER update_deviations_updated_at
  BEFORE UPDATE ON public.deviations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.deviations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deviations in their company"
  ON public.deviations FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage deviations in their company"
  ON public.deviations FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.deviations IS 'Protocol deviations with root cause and impact tracking';

-- Audit trigger
DROP TRIGGER IF EXISTS audit_trigger_deviations ON public.deviations;
CREATE TRIGGER audit_trigger_deviations
  AFTER INSERT OR UPDATE OR DELETE ON public.deviations
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- CAPAs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deviation_id UUID NOT NULL REFERENCES public.deviations(id) ON DELETE CASCADE,
  capa_number TEXT NOT NULL,
  type capa_type NOT NULL DEFAULT 'corrective',
  title TEXT NOT NULL,
  description TEXT,
  status capa_status NOT NULL DEFAULT 'planned',
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_completion_date DATE,
  root_cause_analysis TEXT,
  action_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capas_company ON public.capas(company_id);
CREATE INDEX IF NOT EXISTS idx_capas_deviation ON public.capas(deviation_id);
CREATE INDEX IF NOT EXISTS idx_capas_status ON public.capas(status);
CREATE INDEX IF NOT EXISTS idx_capas_assigned ON public.capas(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_capas_number ON public.capas(capa_number);

DROP TRIGGER IF EXISTS update_capas_updated_at ON public.capas;
CREATE TRIGGER update_capas_updated_at
  BEFORE UPDATE ON public.capas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.capas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view capas in their company"
  ON public.capas FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage capas in their company"
  ON public.capas FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.capas IS 'Corrective and Preventive Actions linked to deviations';

-- Audit trigger
DROP TRIGGER IF EXISTS audit_trigger_capas ON public.capas;
CREATE TRIGGER audit_trigger_capas
  AFTER INSERT OR UPDATE OR DELETE ON public.capas
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- CAPA Effectiveness Reviews
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.capa_effectiveness_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  capa_id UUID NOT NULL REFERENCES public.capas(id) ON DELETE CASCADE,
  review_date DATE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_effective BOOLEAN,
  findings TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_capa_reviews_company ON public.capa_effectiveness_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_capa_reviews_capa ON public.capa_effectiveness_reviews(capa_id);

ALTER TABLE public.capa_effectiveness_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view capa reviews in their company"
  ON public.capa_effectiveness_reviews FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage capa reviews in their company"
  ON public.capa_effectiveness_reviews FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.capa_effectiveness_reviews IS 'CAPA effectiveness verification reviews';

-- ============================================================================
-- Sequence for deviation numbers
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS deviation_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS capa_number_seq START 1;
