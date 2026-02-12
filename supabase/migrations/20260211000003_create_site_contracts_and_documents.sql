-- Phase 5: Site Contracts & Documents
-- Per Oracle CTMS: contract amount, type, payees, accounts
-- Document tracking: sent date, expected date, received date, expiration

-- =====================================================
-- 1. site_contracts table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.site_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  contract_number TEXT,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('clinical_trial', 'feasibility', 'site_budget', 'master_service', 'other')),
  contract_amount DECIMAL(15,2),
  currency_code TEXT DEFAULT 'USD',
  payee_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'executed', 'terminated', 'expired')),
  effective_date DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_contracts_organization_id ON public.site_contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_contracts_project_id ON public.site_contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_site_contracts_payee_contact_id ON public.site_contracts(payee_contact_id);
CREATE INDEX IF NOT EXISTS idx_site_contracts_status ON public.site_contracts(status);

DROP TRIGGER IF EXISTS update_site_contracts_updated_at ON public.site_contracts;
CREATE TRIGGER update_site_contracts_updated_at
  BEFORE UPDATE ON public.site_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site contracts in their company"
  ON public.site_contracts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage site contracts in their company"
  ON public.site_contracts
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.site_contracts IS 'Contracts associated with sites per Oracle CTMS: amount, type, payees';

-- =====================================================
-- 2. site_documents table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.site_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('protocol', 'icf', 'irb', 'regulatory', 'site_file', 'fda_form', 'other')),
  sent_date DATE,
  expected_date DATE,
  received_date DATE,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'received', 'approved', 'expired', 'superseded')),
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_documents_organization_id ON public.site_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_documents_project_id ON public.site_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_site_documents_document_type ON public.site_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_site_documents_status ON public.site_documents(status);
CREATE INDEX IF NOT EXISTS idx_site_documents_expiration_date ON public.site_documents(expiration_date);

DROP TRIGGER IF EXISTS update_site_documents_updated_at ON public.site_documents;
CREATE TRIGGER update_site_documents_updated_at
  BEFORE UPDATE ON public.site_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site documents in their company"
  ON public.site_documents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage site documents in their company"
  ON public.site_documents
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.site_documents IS 'Document tracking at sites per Oracle CTMS: sent, expected, received, expiration dates';
