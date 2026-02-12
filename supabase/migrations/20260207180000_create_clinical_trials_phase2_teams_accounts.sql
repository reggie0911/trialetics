-- ============================================================================
-- Clinical Trials Phase 2: Team Management, Account Associations, Protocol Versions
-- ============================================================================
-- This migration adds:
-- 1. Team assignment tables (protocol_teams, region_teams, site_teams)
-- 2. Team assignment history for audit trail
-- 3. Account association tables (protocol_accounts, region_accounts, site_accounts)
-- 4. Protocol versions table for amendment tracking
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Team roles
DO $$ BEGIN
  CREATE TYPE team_role AS ENUM (
    'study_manager',
    'clinical_director',
    'cra',
    'data_manager',
    'medical_monitor',
    'regulatory_specialist',
    'quality_assurance',
    'biostatistician',
    'pharmacovigilance',
    'site_coordinator'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Account type for associations
DO $$ BEGIN
  CREATE TYPE account_type AS ENUM (
    'irb',
    'central_irb',
    'cro',
    'regional_cro',
    'laboratory',
    'central_laboratory',
    'vendor',
    'pharmacy',
    'imaging_center'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- PROTOCOL VERSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.protocol_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  is_original BOOLEAN DEFAULT false,
  amendment_version TEXT,
  approval_date DATE,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(protocol_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_protocol_versions_protocol ON public.protocol_versions(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_versions_company ON public.protocol_versions(company_id);

-- RLS for protocol_versions
ALTER TABLE public.protocol_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view protocol versions in their company"
  ON public.protocol_versions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert protocol versions in their company"
  ON public.protocol_versions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update protocol versions in their company"
  ON public.protocol_versions FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete protocol versions in their company"
  ON public.protocol_versions FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at trigger
DROP TRIGGER IF EXISTS set_protocol_versions_updated_at ON public.protocol_versions;
CREATE TRIGGER set_protocol_versions_updated_at
  BEFORE UPDATE ON public.protocol_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TEAM ASSIGNMENTS
-- ============================================================================

-- Protocol Teams
CREATE TABLE IF NOT EXISTS public.protocol_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role team_role NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_teams_protocol ON public.protocol_teams(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_teams_user ON public.protocol_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_protocol_teams_company ON public.protocol_teams(company_id);

-- Region Teams
CREATE TABLE IF NOT EXISTS public.region_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.clinical_regions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role team_role NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_region_teams_region ON public.region_teams(region_id);
CREATE INDEX IF NOT EXISTS idx_region_teams_user ON public.region_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_region_teams_company ON public.region_teams(company_id);

-- Site Teams
CREATE TABLE IF NOT EXISTS public.site_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role team_role NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_teams_site ON public.site_teams(site_id);
CREATE INDEX IF NOT EXISTS idx_site_teams_user ON public.site_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_site_teams_company ON public.site_teams(company_id);

-- RLS for team tables
ALTER TABLE public.protocol_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_teams ENABLE ROW LEVEL SECURITY;

-- Protocol Teams RLS
CREATE POLICY "Users can view protocol teams in their company"
  ON public.protocol_teams FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert protocol teams in their company"
  ON public.protocol_teams FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update protocol teams in their company"
  ON public.protocol_teams FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete protocol teams in their company"
  ON public.protocol_teams FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Region Teams RLS
CREATE POLICY "Users can view region teams in their company"
  ON public.region_teams FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert region teams in their company"
  ON public.region_teams FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update region teams in their company"
  ON public.region_teams FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete region teams in their company"
  ON public.region_teams FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Site Teams RLS
CREATE POLICY "Users can view site teams in their company"
  ON public.site_teams FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert site teams in their company"
  ON public.site_teams FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update site teams in their company"
  ON public.site_teams FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete site teams in their company"
  ON public.site_teams FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at triggers
DROP TRIGGER IF EXISTS set_protocol_teams_updated_at ON public.protocol_teams;
CREATE TRIGGER set_protocol_teams_updated_at
  BEFORE UPDATE ON public.protocol_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_region_teams_updated_at ON public.region_teams;
CREATE TRIGGER set_region_teams_updated_at
  BEFORE UPDATE ON public.region_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_site_teams_updated_at ON public.site_teams;
CREATE TRIGGER set_site_teams_updated_at
  BEFORE UPDATE ON public.site_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TEAM ASSIGNMENT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('protocol', 'region', 'site')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role team_role NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_locked BOOLEAN DEFAULT false,
  changed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_history_entity ON public.team_assignment_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_team_history_user ON public.team_assignment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_team_history_company ON public.team_assignment_history(company_id);

-- RLS for team_assignment_history
ALTER TABLE public.team_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team history in their company"
  ON public.team_assignment_history FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert team history in their company"
  ON public.team_assignment_history FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- ACCOUNT ASSOCIATIONS
-- ============================================================================

-- Protocol Accounts
CREATE TABLE IF NOT EXISTS public.protocol_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_type account_type NOT NULL,
  is_central BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protocol_accounts_protocol ON public.protocol_accounts(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_accounts_org ON public.protocol_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_protocol_accounts_company ON public.protocol_accounts(company_id);

-- Region Accounts
CREATE TABLE IF NOT EXISTS public.region_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.clinical_regions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_type account_type NOT NULL,
  is_regional BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_region_accounts_region ON public.region_accounts(region_id);
CREATE INDEX IF NOT EXISTS idx_region_accounts_org ON public.region_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_region_accounts_company ON public.region_accounts(company_id);

-- Site Accounts
CREATE TABLE IF NOT EXISTS public.site_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_type account_type NOT NULL,
  start_date DATE,
  end_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_accounts_site ON public.site_accounts(site_id);
CREATE INDEX IF NOT EXISTS idx_site_accounts_org ON public.site_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_accounts_company ON public.site_accounts(company_id);

-- RLS for account tables
ALTER TABLE public.protocol_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_accounts ENABLE ROW LEVEL SECURITY;

-- Protocol Accounts RLS
CREATE POLICY "Users can view protocol accounts in their company"
  ON public.protocol_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert protocol accounts in their company"
  ON public.protocol_accounts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update protocol accounts in their company"
  ON public.protocol_accounts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete protocol accounts in their company"
  ON public.protocol_accounts FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Region Accounts RLS
CREATE POLICY "Users can view region accounts in their company"
  ON public.region_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert region accounts in their company"
  ON public.region_accounts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update region accounts in their company"
  ON public.region_accounts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete region accounts in their company"
  ON public.region_accounts FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Site Accounts RLS
CREATE POLICY "Users can view site accounts in their company"
  ON public.site_accounts FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert site accounts in their company"
  ON public.site_accounts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update site accounts in their company"
  ON public.site_accounts FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete site accounts in their company"
  ON public.site_accounts FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- Updated at triggers
DROP TRIGGER IF EXISTS set_protocol_accounts_updated_at ON public.protocol_accounts;
CREATE TRIGGER set_protocol_accounts_updated_at
  BEFORE UPDATE ON public.protocol_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_region_accounts_updated_at ON public.region_accounts;
CREATE TRIGGER set_region_accounts_updated_at
  BEFORE UPDATE ON public.region_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_site_accounts_updated_at ON public.site_accounts;
CREATE TRIGGER set_site_accounts_updated_at
  BEFORE UPDATE ON public.site_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
