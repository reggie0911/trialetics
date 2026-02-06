-- =============================================
-- Contacts and Organizations Module
-- Creates tables for managing organizations, contacts, and their relationships
-- =============================================

-- =============================================
-- ENUM TYPES
-- =============================================

-- Organization types
DO $$ BEGIN
  CREATE TYPE organization_type AS ENUM ('site', 'sponsor', 'cro', 'vendor', 'lab', 'irb', 'regulatory');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Contact roles within organizations
DO $$ BEGIN
  CREATE TYPE contact_role AS ENUM ('principal_investigator', 'sub_investigator', 'coordinator', 'site_staff', 'sponsor_rep', 'cro_rep', 'regulatory', 'lab_director', 'qa_lead', 'project_manager', 'data_manager', 'finance', 'contracts', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organization roles in projects
DO $$ BEGIN
  CREATE TYPE organization_project_role AS ENUM ('sponsor', 'site', 'cro', 'lab', 'vendor', 'irb', 'regulatory');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Contact roles in projects
DO $$ BEGIN
  CREATE TYPE contact_project_role AS ENUM ('principal_investigator', 'sub_investigator', 'coordinator', 'medical_monitor', 'project_manager', 'data_manager', 'regulatory_lead', 'qa_lead', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Entity status
DO $$ BEGIN
  CREATE TYPE entity_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Address types
DO $$ BEGIN
  CREATE TYPE address_type AS ENUM ('primary', 'mailing', 'billing', 'shipping', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- ORGANIZATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  organization_type organization_type NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',
  phone TEXT,
  email TEXT,
  website TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for organizations
CREATE INDEX IF NOT EXISTS idx_organizations_company_id ON public.organizations(company_id);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON public.organizations(name);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CONTACTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  credentials TEXT,
  license_number TEXT,
  status entity_status NOT NULL DEFAULT 'active',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON public.contacts(last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ORGANIZATION_CONTACTS JUNCTION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.organization_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role contact_role NOT NULL DEFAULT 'other',
  is_primary BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, contact_id)
);

-- Indexes for organization_contacts
CREATE INDEX IF NOT EXISTS idx_org_contacts_org_id ON public.organization_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_contacts_contact_id ON public.organization_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_org_contacts_is_primary ON public.organization_contacts(is_primary);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_organization_contacts_updated_at ON public.organization_contacts;
CREATE TRIGGER update_organization_contacts_updated_at
  BEFORE UPDATE ON public.organization_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ORGANIZATION_PROJECTS JUNCTION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.organization_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role organization_project_role NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, project_id, role)
);

-- Indexes for organization_projects
CREATE INDEX IF NOT EXISTS idx_org_projects_org_id ON public.organization_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_projects_project_id ON public.organization_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_org_projects_role ON public.organization_projects(role);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_organization_projects_updated_at ON public.organization_projects;
CREATE TRIGGER update_organization_projects_updated_at
  BEFORE UPDATE ON public.organization_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- CONTACT_PROJECTS JUNCTION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.contact_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role contact_project_role NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, project_id, role)
);

-- Indexes for contact_projects
CREATE INDEX IF NOT EXISTS idx_contact_projects_contact_id ON public.contact_projects(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_projects_project_id ON public.contact_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_contact_projects_org_id ON public.contact_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_projects_role ON public.contact_projects(role);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_contact_projects_updated_at ON public.contact_projects;
CREATE TRIGGER update_contact_projects_updated_at
  BEFORE UPDATE ON public.contact_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ADDRESSES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('organization', 'contact')),
  entity_id UUID NOT NULL,
  address_type address_type NOT NULL DEFAULT 'primary',
  street_1 TEXT,
  street_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'United States',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for addresses
CREATE INDEX IF NOT EXISTS idx_addresses_entity ON public.addresses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_primary ON public.addresses(is_primary);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_addresses_updated_at ON public.addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ORGANIZATIONS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view organizations in their company" ON public.organizations;
CREATE POLICY "Users can view organizations in their company"
  ON public.organizations FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create organizations in their company" ON public.organizations;
CREATE POLICY "Users can create organizations in their company"
  ON public.organizations FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update organizations in their company" ON public.organizations;
CREATE POLICY "Users can update organizations in their company"
  ON public.organizations FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can delete organizations in their company" ON public.organizations;
CREATE POLICY "Admins can delete organizations in their company"
  ON public.organizations FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- CONTACTS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view contacts in their company" ON public.contacts;
CREATE POLICY "Users can view contacts in their company"
  ON public.contacts FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create contacts in their company" ON public.contacts;
CREATE POLICY "Users can create contacts in their company"
  ON public.contacts FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update contacts in their company" ON public.contacts;
CREATE POLICY "Users can update contacts in their company"
  ON public.contacts FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can delete contacts in their company" ON public.contacts;
CREATE POLICY "Admins can delete contacts in their company"
  ON public.contacts FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- ORGANIZATION_CONTACTS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view org contacts via organization" ON public.organization_contacts;
CREATE POLICY "Users can view org contacts via organization"
  ON public.organization_contacts FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage org contacts via organization" ON public.organization_contacts;
CREATE POLICY "Users can manage org contacts via organization"
  ON public.organization_contacts FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- ORGANIZATION_PROJECTS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view org projects via organization" ON public.organization_projects;
CREATE POLICY "Users can view org projects via organization"
  ON public.organization_projects FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage org projects via organization" ON public.organization_projects;
CREATE POLICY "Users can manage org projects via organization"
  ON public.organization_projects FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- CONTACT_PROJECTS RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view contact projects via contact" ON public.contact_projects;
CREATE POLICY "Users can view contact projects via contact"
  ON public.contact_projects FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage contact projects via contact" ON public.contact_projects;
CREATE POLICY "Users can manage contact projects via contact"
  ON public.contact_projects FOR ALL
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- ADDRESSES RLS POLICIES
-- =============================================

DROP POLICY IF EXISTS "Users can view addresses for their entities" ON public.addresses;
CREATE POLICY "Users can view addresses for their entities"
  ON public.addresses FOR SELECT
  USING (
    (entity_type = 'organization' AND entity_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    ))
    OR
    (entity_type = 'contact' AND entity_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    ))
  );

DROP POLICY IF EXISTS "Users can manage addresses for their entities" ON public.addresses;
CREATE POLICY "Users can manage addresses for their entities"
  ON public.addresses FOR ALL
  USING (
    (entity_type = 'organization' AND entity_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    ))
    OR
    (entity_type = 'contact' AND entity_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    ))
  );

-- =============================================
-- ADD contacts_organizations MODULE
-- =============================================

INSERT INTO public.modules (name, description, active)
VALUES ('contacts_organizations', 'Manage organizations and contacts for clinical trials', true)
ON CONFLICT (name) DO NOTHING;
