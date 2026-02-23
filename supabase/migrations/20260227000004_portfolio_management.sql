-- Portfolio Management Module
-- Cross-study dashboards and KPI snapshots

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE portfolio_health AS ENUM ('on_track', 'at_risk', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Portfolio Views
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.portfolio_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  protocol_ids UUID[] DEFAULT '{}',
  view_config JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_views_company ON public.portfolio_views(company_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_views_default ON public.portfolio_views(is_default);

DROP TRIGGER IF EXISTS update_portfolio_views_updated_at ON public.portfolio_views;
CREATE TRIGGER update_portfolio_views_updated_at
  BEFORE UPDATE ON public.portfolio_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.portfolio_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view portfolio views in their company"
  ON public.portfolio_views FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage portfolio views in their company"
  ON public.portfolio_views FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.portfolio_views IS 'Saved portfolio dashboard views with protocol selections and display config';

DROP TRIGGER IF EXISTS audit_trigger_portfolio_views ON public.portfolio_views;
CREATE TRIGGER audit_trigger_portfolio_views
  AFTER INSERT OR UPDATE OR DELETE ON public.portfolio_views
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Portfolio KPI Snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.portfolio_kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  enrollment_actual INT DEFAULT 0,
  enrollment_target INT DEFAULT 0,
  site_count INT DEFAULT 0,
  active_sites INT DEFAULT 0,
  budget_total NUMERIC(14,2) DEFAULT 0,
  budget_spent NUMERIC(14,2) DEFAULT 0,
  open_deviations INT DEFAULT 0,
  open_action_items INT DEFAULT 0,
  kri_alerts_active INT DEFAULT 0,
  overall_health portfolio_health NOT NULL DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_company ON public.portfolio_kpi_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_protocol ON public.portfolio_kpi_snapshots(protocol_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_date ON public.portfolio_kpi_snapshots(snapshot_date);

ALTER TABLE public.portfolio_kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view portfolio snapshots in their company"
  ON public.portfolio_kpi_snapshots FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage portfolio snapshots in their company"
  ON public.portfolio_kpi_snapshots FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.portfolio_kpi_snapshots IS 'Point-in-time KPI snapshots per protocol for portfolio trend analysis';
