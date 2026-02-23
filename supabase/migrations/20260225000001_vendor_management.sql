-- Vendor Management Module
-- Vendor profiles, contracts, deliverables, and KPI tracking

DO $$ BEGIN
  CREATE TYPE vendor_category AS ENUM ('cro', 'lab', 'logistics', 'technology', 'consulting', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vendor_contract_status AS ENUM ('draft', 'active', 'expired', 'terminated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vendor_deliverable_status AS ENUM ('pending', 'in_progress', 'delivered', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vendor_kpi_status AS ENUM ('on_track', 'at_risk', 'behind');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_category vendor_category NOT NULL DEFAULT 'other',
  services_description TEXT,
  contract_status vendor_contract_status NOT NULL DEFAULT 'draft',
  qualification_status TEXT,
  qualified_date DATE,
  qualification_expiry_date DATE,
  primary_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_company ON public.vendor_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_org ON public.vendor_profiles(organization_id);

DROP TRIGGER IF EXISTS update_vendor_profiles_updated_at ON public.vendor_profiles;
CREATE TRIGGER update_vendor_profiles_updated_at
  BEFORE UPDATE ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor profiles in their company"
  ON public.vendor_profiles FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage vendor profiles in their company"
  ON public.vendor_profiles FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.vendor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  contract_number TEXT,
  title TEXT NOT NULL,
  contract_type TEXT,
  start_date DATE,
  end_date DATE,
  total_value NUMERIC(14,2),
  currency TEXT DEFAULT 'USD',
  status vendor_contract_status NOT NULL DEFAULT 'draft',
  scope_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor ON public.vendor_contracts(vendor_profile_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_company ON public.vendor_contracts(company_id);

DROP TRIGGER IF EXISTS update_vendor_contracts_updated_at ON public.vendor_contracts;
CREATE TRIGGER update_vendor_contracts_updated_at
  BEFORE UPDATE ON public.vendor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vendor_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor contracts in their company"
  ON public.vendor_contracts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage vendor contracts in their company"
  ON public.vendor_contracts FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.vendor_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_contract_id UUID NOT NULL REFERENCES public.vendor_contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_date DATE,
  status vendor_deliverable_status NOT NULL DEFAULT 'pending',
  acceptance_criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_deliverables_contract ON public.vendor_deliverables(vendor_contract_id);
CREATE INDEX IF NOT EXISTS idx_vendor_deliverables_company ON public.vendor_deliverables(company_id);

DROP TRIGGER IF EXISTS update_vendor_deliverables_updated_at ON public.vendor_deliverables;
CREATE TRIGGER update_vendor_deliverables_updated_at
  BEFORE UPDATE ON public.vendor_deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vendor_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor deliverables in their company"
  ON public.vendor_deliverables FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage vendor deliverables in their company"
  ON public.vendor_deliverables FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.vendor_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  target_value NUMERIC(12,2),
  actual_value NUMERIC(12,2),
  unit TEXT,
  measurement_period_start DATE,
  measurement_period_end DATE,
  status vendor_kpi_status NOT NULL DEFAULT 'on_track',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_kpis_vendor ON public.vendor_kpis(vendor_profile_id);
CREATE INDEX IF NOT EXISTS idx_vendor_kpis_company ON public.vendor_kpis(company_id);

DROP TRIGGER IF EXISTS update_vendor_kpis_updated_at ON public.vendor_kpis;
CREATE TRIGGER update_vendor_kpis_updated_at
  BEFORE UPDATE ON public.vendor_kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.vendor_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor KPIs in their company"
  ON public.vendor_kpis FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage vendor KPIs in their company"
  ON public.vendor_kpis FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
