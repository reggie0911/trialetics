-- Financial System Integration Module
-- Export configurations and export logs for ERP integration

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE financial_export_format AS ENUM ('csv', 'xlsx', 'json');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE financial_export_status AS ENUM ('pending', 'generating', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Financial Export Configs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_export_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  export_format financial_export_format NOT NULL DEFAULT 'csv',
  target_system TEXT,
  column_mapping JSONB DEFAULT '[]'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  schedule TEXT,
  active BOOLEAN DEFAULT true,
  last_export_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_export_configs_company ON public.financial_export_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_export_configs_active ON public.financial_export_configs(active);

DROP TRIGGER IF EXISTS update_financial_export_configs_updated_at ON public.financial_export_configs;
CREATE TRIGGER update_financial_export_configs_updated_at
  BEFORE UPDATE ON public.financial_export_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_export_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial export configs in their company"
  ON public.financial_export_configs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage financial export configs in their company"
  ON public.financial_export_configs FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.financial_export_configs IS 'Configuration for financial data exports to ERP systems';

DROP TRIGGER IF EXISTS audit_trigger_financial_export_configs ON public.financial_export_configs;
CREATE TRIGGER audit_trigger_financial_export_configs
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_export_configs
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Financial Export Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES public.financial_export_configs(id) ON DELETE CASCADE,
  status financial_export_status NOT NULL DEFAULT 'pending',
  file_name TEXT,
  record_count INT DEFAULT 0,
  error_message TEXT,
  generated_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_export_logs_company ON public.financial_export_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_export_logs_config ON public.financial_export_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_financial_export_logs_status ON public.financial_export_logs(status);

ALTER TABLE public.financial_export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial export logs in their company"
  ON public.financial_export_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage financial export logs in their company"
  ON public.financial_export_logs FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.financial_export_logs IS 'Audit log of financial export operations';
