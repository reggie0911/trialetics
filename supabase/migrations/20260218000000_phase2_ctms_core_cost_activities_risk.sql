-- Phase 2: CTMS Core — Oracle Alignment (Cost, Activities, Risk)
-- Adds: cost monitoring, protocol activities/tasks, risk resolution activities
-- Per Oracle CTMS: Cost View, Activities, Activity Plans, Tasks, Risks with Resolution

-- ============================================================================
-- 1. Cost Monitoring: Add cost fields to clinical_protocols
-- ============================================================================

ALTER TABLE public.clinical_protocols
  ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS budgeted_cost DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN public.clinical_protocols.actual_cost IS 'Actual cost rolled up from payments and activities';
COMMENT ON COLUMN public.clinical_protocols.budgeted_cost IS 'Budgeted cost for the protocol';
COMMENT ON COLUMN public.clinical_protocols.revenue IS 'Revenue for the protocol';

-- ============================================================================
-- 2. Cost Rollup View: Aggregates payment_records + contract amounts by protocol
-- ============================================================================

CREATE OR REPLACE VIEW public.protocol_cost_summary AS
SELECT
  cp.id AS protocol_id,
  cp.company_id,
  cp.protocol_number,
  cp.title,
  cp.currency_code,
  cp.budgeted_cost,
  cp.revenue,
  -- Rollup from payment_records (use protocol_id or derive from site)
  COALESCE(
    (SELECT COALESCE(SUM(pr.requested_amount), 0)
     FROM public.payment_records pr
     WHERE COALESCE(pr.protocol_id, (SELECT protocol_id FROM public.clinical_sites WHERE id = pr.site_id LIMIT 1)) = cp.id),
    0
  ) AS payment_requested_total,
  COALESCE(
    (SELECT COALESCE(SUM(pr.check_amount), 0)
     FROM public.payment_records pr
     WHERE COALESCE(pr.protocol_id, (SELECT protocol_id FROM public.clinical_sites WHERE id = pr.site_id LIMIT 1)) = cp.id),
    0
  ) AS payment_paid_total,
  COALESCE(
    (SELECT COALESCE(SUM(pr.earned_amount), 0)
     FROM public.payment_records pr
     WHERE COALESCE(pr.protocol_id, (SELECT protocol_id FROM public.clinical_sites WHERE id = pr.site_id LIMIT 1)) = cp.id),
    0
  ) AS payment_earned_total,
  -- Rollup from site_contracts
  COALESCE(
    (SELECT COALESCE(SUM(sc.contract_amount), 0)
     FROM public.site_contracts sc
     WHERE sc.protocol_id = cp.id),
    0
  ) AS contract_total,
  cp.actual_cost,
  cp.updated_at
FROM public.clinical_protocols cp;

COMMENT ON VIEW public.protocol_cost_summary IS 'Protocol-level cost rollup from payment_records and site_contracts';

-- Grant RLS: view uses underlying tables
-- Users see via clinical_protocols company RLS

-- ============================================================================
-- 3. Protocol Activities and Tasks (Oracle: Activities, Tasks)
-- ============================================================================

-- Activity status for protocol-level activities
DO $$ BEGIN
  CREATE TYPE protocol_activity_status AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'cancelled',
    'on_hold'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- protocol_tasks: Container for activities (Oracle: Tasks)
CREATE TABLE IF NOT EXISTS public.protocol_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  budgeted_cost DECIMAL(15,2) DEFAULT 0,
  actual_cost DECIMAL(15,2) DEFAULT 0,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_tasks_protocol ON public.protocol_tasks(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_tasks_company ON public.protocol_tasks(company_id);

DROP TRIGGER IF EXISTS update_protocol_tasks_updated_at ON public.protocol_tasks;
CREATE TRIGGER update_protocol_tasks_updated_at
  BEFORE UPDATE ON public.protocol_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.protocol_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol tasks in their company"
  ON public.protocol_tasks FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage protocol tasks in their company"
  ON public.protocol_tasks FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.protocol_tasks IS 'Project-level task containers (Oracle: Tasks) with budget/actual cost';

-- protocol_activities: Standalone activities with budget/actual cost
CREATE TABLE IF NOT EXISTS public.protocol_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.protocol_tasks(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  activity_type TEXT, -- e.g. 'milestone', 'deliverable', 'meeting', 'review'
  status protocol_activity_status NOT NULL DEFAULT 'planned',
  budgeted_cost DECIMAL(15,2) DEFAULT 0,
  actual_cost DECIMAL(15,2) DEFAULT 0,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_activities_protocol ON public.protocol_activities(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_activities_task ON public.protocol_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_protocol_activities_company ON public.protocol_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_protocol_activities_status ON public.protocol_activities(status);

DROP TRIGGER IF EXISTS update_protocol_activities_updated_at ON public.protocol_activities;
CREATE TRIGGER update_protocol_activities_updated_at
  BEFORE UPDATE ON public.protocol_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.protocol_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol activities in their company"
  ON public.protocol_activities FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage protocol activities in their company"
  ON public.protocol_activities FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.protocol_activities IS 'Project-level activities (Oracle: Standalone activities) with budget/actual cost';

-- protocol_activity_templates: Templates to generate protocol activities
CREATE TABLE IF NOT EXISTS public.protocol_activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  activity_type TEXT,
  default_budgeted_cost DECIMAL(15,2) DEFAULT 0,
  default_duration_days INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_activity_templates_company ON public.protocol_activity_templates(company_id);

ALTER TABLE public.protocol_activity_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity templates in their company"
  ON public.protocol_activity_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage activity templates in their company"
  ON public.protocol_activity_templates FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.protocol_activity_templates IS 'Templates for generating protocol activities (Oracle: Activity Plans)';

-- ============================================================================
-- 4. Risk Resolution Activities (Oracle: Resolution Activities per Risk)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.risk_resolution_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  risk_assessment_id UUID NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  completed_date DATE,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_resolution_activities_assessment ON public.risk_resolution_activities(risk_assessment_id);
CREATE INDEX IF NOT EXISTS idx_risk_resolution_activities_company ON public.risk_resolution_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_risk_resolution_activities_status ON public.risk_resolution_activities(status);

DROP TRIGGER IF EXISTS update_risk_resolution_activities_updated_at ON public.risk_resolution_activities;
CREATE TRIGGER update_risk_resolution_activities_updated_at
  BEFORE UPDATE ON public.risk_resolution_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.risk_resolution_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view risk resolution activities in their company"
  ON public.risk_resolution_activities FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage risk resolution activities in their company"
  ON public.risk_resolution_activities FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.risk_resolution_activities IS 'Resolution activities for risk assessments (Oracle: Risks Resolution Activities)';

-- ============================================================================
-- 5. Ad-hoc protocol risks (Oracle: free-form risk entry at project level)
--    Links to protocol for risks not from template-based assessments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.protocol_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  identified_date DATE DEFAULT CURRENT_DATE,
  resolved_date DATE,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_risks_protocol ON public.protocol_risks(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_risks_company ON public.protocol_risks(company_id);
CREATE INDEX IF NOT EXISTS idx_protocol_risks_status ON public.protocol_risks(status);

DROP TRIGGER IF EXISTS update_protocol_risks_updated_at ON public.protocol_risks;
CREATE TRIGGER update_protocol_risks_updated_at
  BEFORE UPDATE ON public.protocol_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.protocol_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol risks in their company"
  ON public.protocol_risks FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage protocol risks in their company"
  ON public.protocol_risks FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.protocol_risks IS 'Ad-hoc protocol-level risks (Oracle: free-form risk entry)';

-- protocol_risk_resolution_activities: Resolution activities for ad-hoc protocol risks
CREATE TABLE IF NOT EXISTS public.protocol_risk_resolution_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_risk_id UUID NOT NULL REFERENCES public.protocol_risks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date DATE,
  completed_date DATE,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_risk_resolution_activities_risk ON public.protocol_risk_resolution_activities(protocol_risk_id);
CREATE INDEX IF NOT EXISTS idx_protocol_risk_resolution_activities_company ON public.protocol_risk_resolution_activities(company_id);

DROP TRIGGER IF EXISTS update_protocol_risk_resolution_activities_updated_at ON public.protocol_risk_resolution_activities;
CREATE TRIGGER update_protocol_risk_resolution_activities_updated_at
  BEFORE UPDATE ON public.protocol_risk_resolution_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.protocol_risk_resolution_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol risk resolution activities in their company"
  ON public.protocol_risk_resolution_activities FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage protocol risk resolution activities in their company"
  ON public.protocol_risk_resolution_activities FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.protocol_risk_resolution_activities IS 'Resolution activities for ad-hoc protocol risks';
