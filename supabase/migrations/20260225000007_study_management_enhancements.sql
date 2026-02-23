-- Study Management Enhancements
-- Adds governance assignments and protocol milestones

-- ============================================================================
-- 1. Protocol Governance
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE protocol_governance_role AS ENUM (
    'medical_monitor', 'safety_officer', 'project_lead',
    'data_manager', 'statistician'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.protocol_governance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role protocol_governance_role NOT NULL,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  removed_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_governance_protocol ON public.protocol_governance(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_governance_contact ON public.protocol_governance(contact_id);
CREATE INDEX IF NOT EXISTS idx_protocol_governance_company ON public.protocol_governance(company_id);

DROP TRIGGER IF EXISTS update_protocol_governance_updated_at ON public.protocol_governance;
CREATE TRIGGER update_protocol_governance_updated_at
  BEFORE UPDATE ON public.protocol_governance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.protocol_governance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol governance in their company"
  ON public.protocol_governance FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage protocol governance in their company"
  ON public.protocol_governance FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.protocol_governance IS 'Study governance team assignments per protocol';

-- ============================================================================
-- 2. Protocol Milestones
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE milestone_type AS ENUM ('regulatory', 'enrollment', 'data', 'reporting', 'closeout');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE milestone_status AS ENUM ('pending', 'on_track', 'at_risk', 'delayed', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.protocol_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  milestone_type milestone_type NOT NULL,
  baseline_date DATE,
  forecast_date DATE,
  actual_date DATE,
  status milestone_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_milestones_protocol ON public.protocol_milestones(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_milestones_company ON public.protocol_milestones(company_id);
CREATE INDEX IF NOT EXISTS idx_protocol_milestones_status ON public.protocol_milestones(status);

DROP TRIGGER IF EXISTS update_protocol_milestones_updated_at ON public.protocol_milestones;
CREATE TRIGGER update_protocol_milestones_updated_at
  BEFORE UPDATE ON public.protocol_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.protocol_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol milestones in their company"
  ON public.protocol_milestones FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage protocol milestones in their company"
  ON public.protocol_milestones FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.protocol_milestones IS 'Study milestones with baseline/forecast/actual tracking';
