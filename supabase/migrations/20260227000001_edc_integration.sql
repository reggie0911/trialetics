-- EDC Integration Module
-- Integration configuration, field mappings, and sync logging

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE integration_type AS ENUM ('edc', 'safety', 'finance', 'irt');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM ('active', 'inactive', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_type AS ENUM ('manual', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE sync_status AS ENUM ('pending', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Integration Configs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_type integration_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status integration_status NOT NULL DEFAULT 'inactive',
  config_json JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_configs_company ON public.integration_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON public.integration_configs(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_configs_status ON public.integration_configs(status);

DROP TRIGGER IF EXISTS update_integration_configs_updated_at ON public.integration_configs;
CREATE TRIGGER update_integration_configs_updated_at
  BEFORE UPDATE ON public.integration_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integration configs in their company"
  ON public.integration_configs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage integration configs in their company"
  ON public.integration_configs FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.integration_configs IS 'Configuration for external system integrations (EDC, Safety, Finance, IRT)';

DROP TRIGGER IF EXISTS audit_trigger_integration_configs ON public.integration_configs;
CREATE TRIGGER audit_trigger_integration_configs
  AFTER INSERT OR UPDATE OR DELETE ON public.integration_configs
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Integration Field Mappings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_config_id UUID NOT NULL REFERENCES public.integration_configs(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_field TEXT NOT NULL,
  transform_rule TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_company ON public.integration_field_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_config ON public.integration_field_mappings(integration_config_id);

ALTER TABLE public.integration_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view field mappings in their company"
  ON public.integration_field_mappings FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage field mappings in their company"
  ON public.integration_field_mappings FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.integration_field_mappings IS 'Field-level mappings between external systems and CTMS tables';

-- ============================================================================
-- Integration Sync Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_config_id UUID NOT NULL REFERENCES public.integration_configs(id) ON DELETE CASCADE,
  sync_type sync_type NOT NULL DEFAULT 'manual',
  status sync_status NOT NULL DEFAULT 'pending',
  records_processed INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_company ON public.integration_sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_config ON public.integration_sync_logs(integration_config_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.integration_sync_logs(status);

ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync logs in their company"
  ON public.integration_sync_logs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage sync logs in their company"
  ON public.integration_sync_logs FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.integration_sync_logs IS 'Audit log of integration sync operations';
