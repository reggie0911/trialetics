-- Reconciliation Enhancement: Document status tracking between sponsor and site

-- ============================================================================
-- reconciliation_records
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  sponsor_status TEXT NOT NULL CHECK (sponsor_status IN ('present', 'missing', 'expired')),
  site_status TEXT NOT NULL CHECK (site_status IN ('present', 'missing', 'expired')),
  match_status TEXT NOT NULL CHECK (match_status IN ('match', 'mismatch', 'sponsor_only', 'site_only')),
  sponsor_expiration_date DATE,
  site_expiration_date DATE,
  last_checked_date DATE,
  resolved_date DATE,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_records_company ON public.reconciliation_records(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_protocol ON public.reconciliation_records(protocol_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_site ON public.reconciliation_records(site_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_match_status ON public.reconciliation_records(match_status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_document_type ON public.reconciliation_records(document_type);
CREATE INDEX IF NOT EXISTS idx_reconciliation_records_last_checked ON public.reconciliation_records(last_checked_date);

DROP TRIGGER IF EXISTS update_reconciliation_records_updated_at ON public.reconciliation_records;
CREATE TRIGGER update_reconciliation_records_updated_at
  BEFORE UPDATE ON public.reconciliation_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.reconciliation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reconciliation_records in their company"
  ON public.reconciliation_records FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage reconciliation_records in their company"
  ON public.reconciliation_records FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.reconciliation_records IS 'Document reconciliation tracking between sponsor and site files';
