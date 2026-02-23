-- Custom Fields and Trackers Module
-- Dynamic field builder, custom tracker creation, validation rules

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE custom_field_type AS ENUM ('text', 'number', 'date', 'select', 'multiselect', 'boolean', 'url');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Custom Tracker Definitions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_tracker_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  icon TEXT,
  entity_type TEXT,
  columns JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_tracker_definitions_company ON public.custom_tracker_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_tracker_definitions_slug ON public.custom_tracker_definitions(slug);
CREATE INDEX IF NOT EXISTS idx_tracker_definitions_active ON public.custom_tracker_definitions(active);

DROP TRIGGER IF EXISTS update_tracker_definitions_updated_at ON public.custom_tracker_definitions;
CREATE TRIGGER update_tracker_definitions_updated_at
  BEFORE UPDATE ON public.custom_tracker_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.custom_tracker_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tracker definitions in their company"
  ON public.custom_tracker_definitions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage tracker definitions in their company"
  ON public.custom_tracker_definitions FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.custom_tracker_definitions IS 'User-defined tracker definitions with configurable columns';

DROP TRIGGER IF EXISTS audit_trigger_tracker_definitions ON public.custom_tracker_definitions;
CREATE TRIGGER audit_trigger_tracker_definitions
  AFTER INSERT OR UPDATE OR DELETE ON public.custom_tracker_definitions
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================================================
-- Custom Fields
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tracker_definition_id UUID NOT NULL REFERENCES public.custom_tracker_definitions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type custom_field_type NOT NULL DEFAULT 'text',
  field_label TEXT NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_company ON public.custom_fields(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_tracker ON public.custom_fields(tracker_definition_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_sort ON public.custom_fields(sort_order);

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom fields in their company"
  ON public.custom_fields FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage custom fields in their company"
  ON public.custom_fields FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.custom_fields IS 'Field definitions for custom trackers';

-- ============================================================================
-- Custom Field Values
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tracker_definition_id UUID NOT NULL REFERENCES public.custom_tracker_definitions(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,
  value_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_values_company ON public.custom_field_values(company_id);
CREATE INDEX IF NOT EXISTS idx_field_values_tracker ON public.custom_field_values(tracker_definition_id);
CREATE INDEX IF NOT EXISTS idx_field_values_entity ON public.custom_field_values(entity_id);
CREATE INDEX IF NOT EXISTS idx_field_values_field ON public.custom_field_values(field_id);

DROP TRIGGER IF EXISTS update_field_values_updated_at ON public.custom_field_values;
CREATE TRIGGER update_field_values_updated_at
  BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view field values in their company"
  ON public.custom_field_values FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage field values in their company"
  ON public.custom_field_values FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.custom_field_values IS 'EAV storage for custom field data across tracker entities';
