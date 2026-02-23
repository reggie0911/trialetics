-- KRI Module: Key Risk Indicator definitions, thresholds, values, and alerts

-- Enum types
DO $$ BEGIN
  CREATE TYPE kri_category AS ENUM (
    'enrollment',
    'safety',
    'data_quality',
    'site_performance',
    'regulatory',
    'financial'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kri_direction AS ENUM ('higher_is_better', 'lower_is_better');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kri_alert_level AS ENUM ('yellow', 'red');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- kri_definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kri_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category kri_category NOT NULL,
  calculation_method TEXT,
  unit TEXT,
  data_source TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kri_definitions_company ON public.kri_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_category ON public.kri_definitions(category);
CREATE INDEX IF NOT EXISTS idx_kri_definitions_is_active ON public.kri_definitions(is_active);

DROP TRIGGER IF EXISTS update_kri_definitions_updated_at ON public.kri_definitions;
CREATE TRIGGER update_kri_definitions_updated_at
  BEFORE UPDATE ON public.kri_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kri_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kri_definitions in their company"
  ON public.kri_definitions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage kri_definitions in their company"
  ON public.kri_definitions FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.kri_definitions IS 'Key Risk Indicator definitions with category and calculation metadata';

-- ============================================================================
-- kri_thresholds
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kri_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_definition_id UUID NOT NULL REFERENCES public.kri_definitions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  green_upper NUMERIC(12,2),
  yellow_upper NUMERIC(12,2),
  red_upper NUMERIC(12,2),
  direction kri_direction NOT NULL DEFAULT 'lower_is_better',
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kri_thresholds_kri_definition ON public.kri_thresholds(kri_definition_id);
CREATE INDEX IF NOT EXISTS idx_kri_thresholds_company ON public.kri_thresholds(company_id);
CREATE INDEX IF NOT EXISTS idx_kri_thresholds_protocol ON public.kri_thresholds(protocol_id);

DROP TRIGGER IF EXISTS update_kri_thresholds_updated_at ON public.kri_thresholds;
CREATE TRIGGER update_kri_thresholds_updated_at
  BEFORE UPDATE ON public.kri_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kri_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kri_thresholds in their company"
  ON public.kri_thresholds FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage kri_thresholds in their company"
  ON public.kri_thresholds FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.kri_thresholds IS 'Thresholds per KRI definition (green/yellow/red) with optional protocol scope';

-- ============================================================================
-- kri_values
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kri_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_definition_id UUID NOT NULL REFERENCES public.kri_definitions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  value NUMERIC(12,4) NOT NULL,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kri_values_kri_definition ON public.kri_values(kri_definition_id);
CREATE INDEX IF NOT EXISTS idx_kri_values_company ON public.kri_values(company_id);
CREATE INDEX IF NOT EXISTS idx_kri_values_protocol ON public.kri_values(protocol_id);
CREATE INDEX IF NOT EXISTS idx_kri_values_site ON public.kri_values(site_id);
CREATE INDEX IF NOT EXISTS idx_kri_values_measurement_date ON public.kri_values(measurement_date);

ALTER TABLE public.kri_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kri_values in their company"
  ON public.kri_values FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage kri_values in their company"
  ON public.kri_values FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.kri_values IS 'Recorded KRI values with measurement date and optional site scope';

-- ============================================================================
-- kri_alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kri_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kri_value_id UUID NOT NULL REFERENCES public.kri_values(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  alert_level kri_alert_level NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  action_item_id UUID REFERENCES public.action_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kri_alerts_kri_value ON public.kri_alerts(kri_value_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_company ON public.kri_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_protocol ON public.kri_alerts(protocol_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_site ON public.kri_alerts(site_id);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_alert_level ON public.kri_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_kri_alerts_acknowledged ON public.kri_alerts(acknowledged);

ALTER TABLE public.kri_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kri_alerts in their company"
  ON public.kri_alerts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage kri_alerts in their company"
  ON public.kri_alerts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.kri_alerts IS 'KRI threshold breach alerts with optional action item linkage';
