-- Resource Management Module
-- CRA workload tracking, assignment optimization, capacity planning

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE resource_assignment_status AS ENUM ('active', 'planned', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Resource Assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  allocation_percentage NUMERIC(5,2) DEFAULT 100,
  start_date DATE,
  end_date DATE,
  status resource_assignment_status NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_assignments_company ON public.resource_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_profile ON public.resource_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_protocol ON public.resource_assignments(protocol_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_status ON public.resource_assignments(status);

DROP TRIGGER IF EXISTS update_resource_assignments_updated_at ON public.resource_assignments;
CREATE TRIGGER update_resource_assignments_updated_at
  BEFORE UPDATE ON public.resource_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.resource_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resource assignments in their company"
  ON public.resource_assignments FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage resource assignments in their company"
  ON public.resource_assignments FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.resource_assignments IS 'Staff assignments to protocols with role and allocation tracking';

DROP TRIGGER IF EXISTS audit_trigger_resource_assignments ON public.resource_assignments;
CREATE TRIGGER audit_trigger_resource_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.resource_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Resource Capacity
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resource_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  available_hours NUMERIC(8,2) DEFAULT 0,
  allocated_hours NUMERIC(8,2) DEFAULT 0,
  utilization_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_capacity_company ON public.resource_capacity(company_id);
CREATE INDEX IF NOT EXISTS idx_resource_capacity_profile ON public.resource_capacity(profile_id);
CREATE INDEX IF NOT EXISTS idx_resource_capacity_period ON public.resource_capacity(period_start, period_end);

DROP TRIGGER IF EXISTS update_resource_capacity_updated_at ON public.resource_capacity;
CREATE TRIGGER update_resource_capacity_updated_at
  BEFORE UPDATE ON public.resource_capacity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.resource_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resource capacity in their company"
  ON public.resource_capacity FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage resource capacity in their company"
  ON public.resource_capacity FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.resource_capacity IS 'Staff capacity and utilization tracking by time period';

-- ============================================================================
-- Resource Forecasts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resource_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  needed_fte NUMERIC(6,2) DEFAULT 0,
  filled_fte NUMERIC(6,2) DEFAULT 0,
  gap_fte NUMERIC(6,2) DEFAULT 0,
  forecast_period_start DATE NOT NULL,
  forecast_period_end DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_forecasts_company ON public.resource_forecasts(company_id);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_protocol ON public.resource_forecasts(protocol_id);
CREATE INDEX IF NOT EXISTS idx_resource_forecasts_period ON public.resource_forecasts(forecast_period_start, forecast_period_end);

ALTER TABLE public.resource_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view resource forecasts in their company"
  ON public.resource_forecasts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage resource forecasts in their company"
  ON public.resource_forecasts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.resource_forecasts IS 'FTE demand forecasts by role and protocol for capacity planning';
