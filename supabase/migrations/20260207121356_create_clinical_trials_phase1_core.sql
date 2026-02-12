-- =============================================
-- Clinical Trials Module - Phase 1: Core Hierarchy
-- Creates foundational tables for Programs, Protocols, Regions, and Sites
-- Based on Oracle CTMS documentation structure
-- =============================================

-- =============================================
-- ENUM TYPES
-- =============================================

-- Protocol phases
DO $$ BEGIN
  CREATE TYPE protocol_phase AS ENUM (
    'phase_i',
    'phase_ii',
    'phase_iii',
    'phase_iv',
    'observational'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Protocol status
DO $$ BEGIN
  CREATE TYPE protocol_status AS ENUM (
    'planned',
    'in_progress',
    'on_hold',
    'completed',
    'terminated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Protocol design types
DO $$ BEGIN
  CREATE TYPE protocol_design AS ENUM (
    'randomized',
    'open_label',
    'double_blind',
    'single_blind',
    'crossover',
    'parallel',
    'observational'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Site status
DO $$ BEGIN
  CREATE TYPE site_status AS ENUM (
    'planned',
    'not_initiated',
    'initiated',
    'enrolling',
    'closed',
    'terminated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- CLINICAL PROGRAMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.clinical_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mechanism TEXT,
  application_id TEXT,
  status protocol_status NOT NULL DEFAULT 'planned',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for clinical_programs
CREATE INDEX IF NOT EXISTS idx_clinical_programs_company_id ON public.clinical_programs(company_id);
CREATE INDEX IF NOT EXISTS idx_clinical_programs_status ON public.clinical_programs(status);
CREATE INDEX IF NOT EXISTS idx_clinical_programs_name ON public.clinical_programs(name);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_clinical_programs_updated_at ON public.clinical_programs;
CREATE TRIGGER update_clinical_programs_updated_at
  BEFORE UPDATE ON public.clinical_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CLINICAL PROTOCOLS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.clinical_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.clinical_programs(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  protocol_number TEXT NOT NULL,
  title TEXT NOT NULL,
  phase protocol_phase,
  objective TEXT,
  design protocol_design,
  type TEXT,
  sponsor TEXT,
  status protocol_status NOT NULL DEFAULT 'planned',
  regions_required BOOLEAN DEFAULT false,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  planned_sites_count INTEGER,
  planned_subjects_count INTEGER,
  currency_code TEXT DEFAULT 'USD',
  exchange_date DATE,
  withholding_amount DECIMAL(15,2),
  withholding_percent DECIMAL(5,2),
  approval_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, protocol_number)
);

-- Indexes for clinical_protocols
CREATE INDEX IF NOT EXISTS idx_clinical_protocols_company_id ON public.clinical_protocols(company_id);
CREATE INDEX IF NOT EXISTS idx_clinical_protocols_program_id ON public.clinical_protocols(program_id);
CREATE INDEX IF NOT EXISTS idx_clinical_protocols_project_id ON public.clinical_protocols(project_id);
CREATE INDEX IF NOT EXISTS idx_clinical_protocols_status ON public.clinical_protocols(status);
CREATE INDEX IF NOT EXISTS idx_clinical_protocols_phase ON public.clinical_protocols(phase);
CREATE INDEX IF NOT EXISTS idx_clinical_protocols_protocol_number ON public.clinical_protocols(protocol_number);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_clinical_protocols_updated_at ON public.clinical_protocols;
CREATE TRIGGER update_clinical_protocols_updated_at
  BEFORE UPDATE ON public.clinical_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CLINICAL REGIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.clinical_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  region_name TEXT NOT NULL,
  planned_sites_count INTEGER,
  planned_subjects_count INTEGER,
  no_site_info BOOLEAN DEFAULT false,
  currency_code TEXT DEFAULT 'USD',
  exchange_date DATE,
  withholding_amount DECIMAL(15,2),
  withholding_percent DECIMAL(5,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(protocol_id, region_name)
);

-- Indexes for clinical_regions
CREATE INDEX IF NOT EXISTS idx_clinical_regions_company_id ON public.clinical_regions(company_id);
CREATE INDEX IF NOT EXISTS idx_clinical_regions_protocol_id ON public.clinical_regions(protocol_id);
CREATE INDEX IF NOT EXISTS idx_clinical_regions_region_name ON public.clinical_regions(region_name);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_clinical_regions_updated_at ON public.clinical_regions;
CREATE TRIGGER update_clinical_regions_updated_at
  BEFORE UPDATE ON public.clinical_regions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CLINICAL SITES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.clinical_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  region_id UUID REFERENCES public.clinical_regions(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  principal_investigator_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  site_number TEXT,
  status site_status NOT NULL DEFAULT 'planned',
  no_subject_info BOOLEAN DEFAULT false,
  last_completed_visit_date DATE,
  currency_code TEXT DEFAULT 'USD',
  exchange_date DATE,
  withholding_amount DECIMAL(15,2),
  withholding_percent DECIMAL(5,2),
  site_initiated_date DATE,
  site_terminated_date DATE,
  
  -- Site milestone fields
  site_qualification_date DATE,
  irb_approval_date DATE,
  irb_expiration_date DATE,
  irb_approval_number TEXT,
  irb_institution_name TEXT,
  close_out_date DATE,
  first_subject_enrolled_date DATE,
  last_subject_enrolled_date DATE,
  planned_subject_count INTEGER,
  enrolled_subject_count INTEGER DEFAULT 0,
  screen_failure_count INTEGER DEFAULT 0,
  completed_subject_count INTEGER DEFAULT 0,
  early_terminated_count INTEGER DEFAULT 0,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(protocol_id, site_number)
);

-- Indexes for clinical_sites
CREATE INDEX IF NOT EXISTS idx_clinical_sites_company_id ON public.clinical_sites(company_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sites_protocol_id ON public.clinical_sites(protocol_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sites_region_id ON public.clinical_sites(region_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sites_organization_id ON public.clinical_sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sites_pi_id ON public.clinical_sites(principal_investigator_id);
CREATE INDEX IF NOT EXISTS idx_clinical_sites_status ON public.clinical_sites(status);
CREATE INDEX IF NOT EXISTS idx_clinical_sites_site_number ON public.clinical_sites(site_number);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_clinical_sites_updated_at ON public.clinical_sites;
CREATE TRIGGER update_clinical_sites_updated_at
  BEFORE UPDATE ON public.clinical_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.clinical_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_sites ENABLE ROW LEVEL SECURITY;

-- Clinical Programs Policies
CREATE POLICY "Users can view clinical programs in their company"
  ON public.clinical_programs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert clinical programs in their company"
  ON public.clinical_programs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update clinical programs in their company"
  ON public.clinical_programs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete clinical programs in their company"
  ON public.clinical_programs FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Clinical Protocols Policies
CREATE POLICY "Users can view clinical protocols in their company"
  ON public.clinical_protocols FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert clinical protocols in their company"
  ON public.clinical_protocols FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update clinical protocols in their company"
  ON public.clinical_protocols FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete clinical protocols in their company"
  ON public.clinical_protocols FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Clinical Regions Policies
CREATE POLICY "Users can view clinical regions in their company"
  ON public.clinical_regions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert clinical regions in their company"
  ON public.clinical_regions FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update clinical regions in their company"
  ON public.clinical_regions FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete clinical regions in their company"
  ON public.clinical_regions FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Clinical Sites Policies
CREATE POLICY "Users can view clinical sites in their company"
  ON public.clinical_sites FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert clinical sites in their company"
  ON public.clinical_sites FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update clinical sites in their company"
  ON public.clinical_sites FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can delete clinical sites in their company"
  ON public.clinical_sites FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.clinical_programs IS 'Clinical programs - highest level initiative in clinical trial hierarchy';
COMMENT ON TABLE public.clinical_protocols IS 'Clinical protocols designed to assess safety and efficacy, linked to programs';
COMMENT ON TABLE public.clinical_regions IS 'Geographic regions for organizing sites within protocols (optional)';
COMMENT ON TABLE public.clinical_sites IS 'Clinical sites where protocols are conducted, linked to organizations and contacts';

COMMENT ON COLUMN public.clinical_protocols.regions_required IS 'If true, all sites must belong to a region; if false, sites can be directly under protocol';
COMMENT ON COLUMN public.clinical_sites.no_subject_info IS 'If true, only summary enrollment data is available (no individual subject records)';
