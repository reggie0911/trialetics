-- Safety Database Integration Module
-- Manual SAE entry and safety reconciliation records

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE safety_event_type AS ENUM ('sae', 'susar', 'aesi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE safety_reporting_status AS ENUM ('draft', 'submitted', 'acknowledged', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Safety Reconciliation Records
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.safety_reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  event_type safety_event_type NOT NULL DEFAULT 'sae',
  event_number TEXT NOT NULL,
  event_description TEXT,
  onset_date DATE,
  awareness_date DATE,
  reported_date DATE,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporting_status safety_reporting_status NOT NULL DEFAULT 'draft',
  seriousness_criteria TEXT[],
  outcome TEXT,
  narrative TEXT,
  integration_config_id UUID REFERENCES public.integration_configs(id) ON DELETE SET NULL,
  external_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_records_company ON public.safety_reconciliation_records(company_id);
CREATE INDEX IF NOT EXISTS idx_safety_records_protocol ON public.safety_reconciliation_records(protocol_id);
CREATE INDEX IF NOT EXISTS idx_safety_records_subject ON public.safety_reconciliation_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_safety_records_event_type ON public.safety_reconciliation_records(event_type);
CREATE INDEX IF NOT EXISTS idx_safety_records_status ON public.safety_reconciliation_records(reporting_status);
CREATE INDEX IF NOT EXISTS idx_safety_records_number ON public.safety_reconciliation_records(event_number);

DROP TRIGGER IF EXISTS update_safety_records_updated_at ON public.safety_reconciliation_records;
CREATE TRIGGER update_safety_records_updated_at
  BEFORE UPDATE ON public.safety_reconciliation_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.safety_reconciliation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view safety records in their company"
  ON public.safety_reconciliation_records FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage safety records in their company"
  ON public.safety_reconciliation_records FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.safety_reconciliation_records IS 'Safety event records for SAE/SUSAR/AESI tracking and reconciliation';

DROP TRIGGER IF EXISTS audit_trigger_safety_records ON public.safety_reconciliation_records;
CREATE TRIGGER audit_trigger_safety_records
  AFTER INSERT OR UPDATE OR DELETE ON public.safety_reconciliation_records
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

CREATE SEQUENCE IF NOT EXISTS safety_event_number_seq START 1;
