-- ============================================================================
-- Clinical Payments Module
-- Based on Oracle CTMS: Setting Up and Making Clinical Payments
-- Tables: payment_exceptions, payment_activities, payment_splits, payment_records
-- Schema adjustments: site_contracts (clinical_site_id, protocol_id)
-- ============================================================================

-- ============================================================================
-- 1. Schema Adjustments: site_contracts
-- ============================================================================

ALTER TABLE public.site_contracts
  ADD COLUMN IF NOT EXISTS clinical_site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_site_contracts_clinical_site_id ON public.site_contracts(clinical_site_id);
CREATE INDEX IF NOT EXISTS idx_site_contracts_protocol_id ON public.site_contracts(protocol_id);

COMMENT ON COLUMN public.site_contracts.clinical_site_id IS 'Clinical site this contract is associated with';
COMMENT ON COLUMN public.site_contracts.protocol_id IS 'Clinical protocol this contract is associated with';

-- ============================================================================
-- 2. payment_exceptions - Site-specific overrides for template activity amounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  template_activity_id UUID NOT NULL REFERENCES public.template_activities(id) ON DELETE CASCADE,
  template_visit_id UUID NOT NULL REFERENCES public.template_visits(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  exception_amount DECIMAL(15,2) NOT NULL,
  currency_code TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, template_activity_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_exceptions_site ON public.payment_exceptions(site_id);
CREATE INDEX IF NOT EXISTS idx_payment_exceptions_company ON public.payment_exceptions(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_exceptions_template_activity ON public.payment_exceptions(template_activity_id);

DROP TRIGGER IF EXISTS update_payment_exceptions_updated_at ON public.payment_exceptions;
CREATE TRIGGER update_payment_exceptions_updated_at
  BEFORE UPDATE ON public.payment_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment exceptions in their company"
  ON public.payment_exceptions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payment exceptions in their company"
  ON public.payment_exceptions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payment exceptions in their company"
  ON public.payment_exceptions FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete payment exceptions in their company"
  ON public.payment_exceptions FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.payment_exceptions IS 'Site-specific payment amount overrides for template activities';

-- ============================================================================
-- 3. payment_activities - From completed subject activities; links to payment records
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  subject_activity_id UUID NOT NULL REFERENCES public.subject_activities(id) ON DELETE CASCADE,
  subject_visit_id UUID NOT NULL REFERENCES public.subject_visits(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.site_contracts(id) ON DELETE SET NULL,
  payee_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  standard_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  deviation_amount DECIMAL(15,2) DEFAULT 0,
  actual_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  is_completed BOOLEAN DEFAULT false,
  is_unplanned BOOLEAN DEFAULT false,
  payment_record_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_activities_site ON public.payment_activities(site_id);
CREATE INDEX IF NOT EXISTS idx_payment_activities_company ON public.payment_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_activities_subject_activity ON public.payment_activities(subject_activity_id);
CREATE INDEX IF NOT EXISTS idx_payment_activities_completed ON public.payment_activities(is_completed);
CREATE INDEX IF NOT EXISTS idx_payment_activities_payment_record ON public.payment_activities(payment_record_id);

DROP TRIGGER IF EXISTS update_payment_activities_updated_at ON public.payment_activities;
CREATE TRIGGER update_payment_activities_updated_at
  BEFORE UPDATE ON public.payment_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment activities in their company"
  ON public.payment_activities FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payment activities in their company"
  ON public.payment_activities FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payment activities in their company"
  ON public.payment_activities FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete payment activities in their company"
  ON public.payment_activities FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.payment_activities IS 'Payment activities from subject activities; generated into payment records';

-- ============================================================================
-- 4. payment_records - Final payment records for processing
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.clinical_regions(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.site_contracts(id) ON DELETE SET NULL,
  payee_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  payment_number TEXT UNIQUE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('interim', 'final', 'unplanned')) DEFAULT 'interim',
  status TEXT NOT NULL CHECK (status IN ('to_be_processed', 'in_progress', 'processed')) DEFAULT 'to_be_processed',
  earned_amount DECIMAL(15,2) DEFAULT 0,
  requested_amount DECIMAL(15,2) DEFAULT 0,
  check_amount DECIMAL(15,2),
  check_date DATE,
  check_number TEXT,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_site ON public.payment_records(site_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_company ON public.payment_records(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_protocol ON public.payment_records(protocol_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON public.payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_payment_number ON public.payment_records(payment_number);

DROP TRIGGER IF EXISTS update_payment_records_updated_at ON public.payment_records;
CREATE TRIGGER update_payment_records_updated_at
  BEFORE UPDATE ON public.payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment records in their company"
  ON public.payment_records FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payment records in their company"
  ON public.payment_records FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payment records in their company"
  ON public.payment_records FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete payment records in their company"
  ON public.payment_records FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.payment_records IS 'Final payment records ready for processing';

-- Add FK from payment_activities to payment_records (after payment_records exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_activities_payment_record'
  ) THEN
    ALTER TABLE public.payment_activities
      ADD CONSTRAINT fk_payment_activities_payment_record
      FOREIGN KEY (payment_record_id) REFERENCES public.payment_records(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 5. payment_splits - Multiple payees per payment activity (optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_activity_id UUID NOT NULL REFERENCES public.payment_activities(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.site_contracts(id) ON DELETE CASCADE,
  payee_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  split_percentage DECIMAL(5,2) NOT NULL,
  split_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_splits_activity ON public.payment_splits(payment_activity_id);

ALTER TABLE public.payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment splits in their company"
  ON public.payment_splits FOR SELECT
  USING (
    payment_activity_id IN (
      SELECT id FROM public.payment_activities
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage payment splits in their company"
  ON public.payment_splits FOR ALL
  USING (
    payment_activity_id IN (
      SELECT id FROM public.payment_activities
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    payment_activity_id IN (
      SELECT id FROM public.payment_activities
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.payment_splits IS 'Split payment activities between multiple payees';

-- ============================================================================
-- 6. Sequence for payment_number generation
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.payment_number_seq START 1;
