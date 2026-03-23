-- =====================================================
-- CTMS Global Directory: role catalog, institutions,
-- directory contacts, committees, junctions, audit
-- + M7: site_contacts.directory_contact_id,
--       studies.sponsor_institution_id,
--       study_sites.pi_directory_contact_id
-- =====================================================

-- ---------- Role catalog (global, read-only for app users) ----------

CREATE TABLE IF NOT EXISTS public.directory_role_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.directory_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.directory_role_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_directory_roles_category ON public.directory_roles(category_id);

ALTER TABLE public.directory_role_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.directory_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "directory_role_categories_select"
  ON public.directory_role_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

CREATE POLICY "directory_roles_select"
  ON public.directory_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.company_id IS NOT NULL
    )
  );

-- ---------- Institutions ----------

CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN (
    'sponsor', 'cro', 'clinical_site', 'vendor', 'irb_ec', 'lab', 'government', 'other'
  )),
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_region TEXT,
  postal_code TEXT,
  country_code TEXT,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  parent_institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_institutions_company ON public.institutions(company_id);
CREATE INDEX IF NOT EXISTS idx_institutions_name ON public.institutions(company_id, name);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON public.institutions(company_id, organization_type);
CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions(company_id, status);

CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institutions_select" ON public.institutions
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "institutions_insert" ON public.institutions
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "institutions_update" ON public.institutions
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "institutions_delete" ON public.institutions
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ---------- Directory contacts ----------

CREATE TABLE IF NOT EXISTS public.directory_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  department TEXT,
  country_code TEXT,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  primary_directory_role_id UUID REFERENCES public.directory_roles(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  primary_institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_directory_contacts_company ON public.directory_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_directory_contacts_name ON public.directory_contacts(company_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_directory_contacts_email ON public.directory_contacts(company_id, email);
CREATE INDEX IF NOT EXISTS idx_directory_contacts_status ON public.directory_contacts(company_id, status);

CREATE TRIGGER update_directory_contacts_updated_at
  BEFORE UPDATE ON public.directory_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.directory_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "directory_contacts_select" ON public.directory_contacts
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "directory_contacts_insert" ON public.directory_contacts
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "directory_contacts_update" ON public.directory_contacts
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "directory_contacts_delete" ON public.directory_contacts
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

-- ---------- Secondary roles (M2M contact <-> directory role) ----------

CREATE TABLE IF NOT EXISTS public.directory_contact_secondary_roles (
  directory_contact_id UUID NOT NULL REFERENCES public.directory_contacts(id) ON DELETE CASCADE,
  directory_role_id UUID NOT NULL REFERENCES public.directory_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (directory_contact_id, directory_role_id)
);

CREATE INDEX IF NOT EXISTS idx_dcsr_role ON public.directory_contact_secondary_roles(directory_role_id);

ALTER TABLE public.directory_contact_secondary_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dcsr_select" ON public.directory_contact_secondary_roles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dcsr_insert" ON public.directory_contact_secondary_roles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dcsr_delete" ON public.directory_contact_secondary_roles FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ---------- Contact <-> Study ----------

CREATE TABLE IF NOT EXISTS public.directory_contact_study (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_contact_id UUID NOT NULL REFERENCES public.directory_contacts(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  directory_role_id UUID REFERENCES public.directory_roles(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (directory_contact_id, study_id)
);

CREATE INDEX IF NOT EXISTS idx_dcs_study ON public.directory_contact_study(study_id);
CREATE INDEX IF NOT EXISTS idx_dcs_contact ON public.directory_contact_study(directory_contact_id);

ALTER TABLE public.directory_contact_study ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dcs_select" ON public.directory_contact_study FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    JOIN public.studies s ON s.id = study_id AND s.company_id = c.company_id
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dcs_insert" ON public.directory_contact_study FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    JOIN public.studies s ON s.id = study_id AND s.company_id = c.company_id
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dcs_update" ON public.directory_contact_study FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dcs_delete" ON public.directory_contact_study FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ---------- Contact <-> Study site ----------

CREATE TABLE IF NOT EXISTS public.directory_contact_study_site (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_contact_id UUID NOT NULL REFERENCES public.directory_contacts(id) ON DELETE CASCADE,
  study_site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  directory_role_id UUID REFERENCES public.directory_roles(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (directory_contact_id, study_site_id)
);

CREATE INDEX IF NOT EXISTS idx_dcss_site ON public.directory_contact_study_site(study_site_id);
CREATE INDEX IF NOT EXISTS idx_dcss_contact ON public.directory_contact_study_site(directory_contact_id);

ALTER TABLE public.directory_contact_study_site ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dcss_select" ON public.directory_contact_study_site FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    JOIN public.study_sites ss ON ss.id = study_site_id
    JOIN public.studies s ON s.id = ss.study_id AND s.company_id = c.company_id
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dcss_insert" ON public.directory_contact_study_site FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    JOIN public.study_sites ss ON ss.id = study_site_id
    JOIN public.studies s ON s.id = ss.study_id AND s.company_id = c.company_id
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dcss_update" ON public.directory_contact_study_site FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dcss_delete" ON public.directory_contact_study_site FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ---------- Contact <-> Institution (M2M + primary flag) ----------

CREATE TABLE IF NOT EXISTS public.directory_contact_institution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  directory_contact_id UUID NOT NULL REFERENCES public.directory_contacts(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (directory_contact_id, institution_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dci_one_primary_per_contact
  ON public.directory_contact_institution (directory_contact_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_dci_institution ON public.directory_contact_institution(institution_id);

ALTER TABLE public.directory_contact_institution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dci_select" ON public.directory_contact_institution FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    JOIN public.institutions i ON i.id = institution_id AND i.company_id = c.company_id
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dci_insert" ON public.directory_contact_institution FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    JOIN public.institutions i ON i.id = institution_id AND i.company_id = c.company_id
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dci_update" ON public.directory_contact_institution FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "dci_delete" ON public.directory_contact_institution FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.directory_contacts c
    WHERE c.id = directory_contact_id
      AND c.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ---------- Institution <-> Study ----------

CREATE TABLE IF NOT EXISTS public.institution_study (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'sponsor', 'cro', 'central_lab', 'imaging_vendor', 'other'
  )),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, study_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_institution_study_study ON public.institution_study(study_id);

ALTER TABLE public.institution_study ENABLE ROW LEVEL SECURITY;

CREATE POLICY "is_select" ON public.institution_study FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.institutions i
    JOIN public.studies s ON s.id = study_id AND s.company_id = i.company_id
    WHERE i.id = institution_id
      AND i.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "is_insert" ON public.institution_study FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institutions i
    JOIN public.studies s ON s.id = study_id AND s.company_id = i.company_id
    WHERE i.id = institution_id
      AND i.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "is_update" ON public.institution_study FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = institution_id
      AND i.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "is_delete" ON public.institution_study FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = institution_id
      AND i.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ---------- Institution <-> Study site ----------

CREATE TABLE IF NOT EXISTS public.institution_study_site (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  study_site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (institution_id, study_site_id)
);

CREATE INDEX IF NOT EXISTS idx_iss_site ON public.institution_study_site(study_site_id);

ALTER TABLE public.institution_study_site ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iss_select" ON public.institution_study_site FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.institutions i
    JOIN public.study_sites ss ON ss.id = study_site_id
    JOIN public.studies s ON s.id = ss.study_id AND s.company_id = i.company_id
    WHERE i.id = institution_id
      AND i.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "iss_insert" ON public.institution_study_site FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.institutions i
    JOIN public.study_sites ss ON ss.id = study_site_id
    JOIN public.studies s ON s.id = ss.study_id AND s.company_id = i.company_id
    WHERE i.id = institution_id
      AND i.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "iss_update" ON public.institution_study_site FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = institution_id
      AND i.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "iss_delete" ON public.institution_study_site FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.institutions i
    WHERE i.id = institution_id
      AND i.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ---------- Committees ----------

CREATE TABLE IF NOT EXISTS public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  committee_type TEXT NOT NULL CHECK (committee_type IN (
    'steering', 'dsmb', 'cec', 'medical_adjudication', 'safety_monitoring', 'protocol_review', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_committees_company ON public.committees(company_id);
CREATE INDEX IF NOT EXISTS idx_committees_study ON public.committees(study_id);

CREATE TRIGGER update_committees_updated_at
  BEFORE UPDATE ON public.committees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "committees_select" ON public.committees
  FOR SELECT USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "committees_insert" ON public.committees
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "committees_update" ON public.committees
  FOR UPDATE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "committees_delete" ON public.committees
  FOR DELETE USING (company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  directory_contact_id UUID NOT NULL REFERENCES public.directory_contacts(id) ON DELETE CASCADE,
  directory_role_id UUID REFERENCES public.directory_roles(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (committee_id, directory_contact_id)
);

CREATE INDEX IF NOT EXISTS idx_committee_members_contact ON public.committee_members(directory_contact_id);

ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cm_select" ON public.committee_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.committees co
    WHERE co.id = committee_id
      AND co.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "cm_insert" ON public.committee_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.committees co
    JOIN public.directory_contacts c ON c.id = directory_contact_id AND c.company_id = co.company_id
    WHERE co.id = committee_id
      AND co.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "cm_update" ON public.committee_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.committees co
    WHERE co.id = committee_id
      AND co.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);
CREATE POLICY "cm_delete" ON public.committee_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.committees co
    WHERE co.id = committee_id
      AND co.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- ---------- Audit & assignment history ----------

CREATE TABLE IF NOT EXISTS public.directory_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_directory_audit_company_time ON public.directory_audit_log(company_id, changed_at DESC);

ALTER TABLE public.directory_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dal_select" ON public.directory_audit_log FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "dal_insert" ON public.directory_audit_log FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.directory_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN (
    'contact_study', 'contact_site', 'contact_institution', 'institution_study', 'institution_site', 'committee_member'
  )),
  junction_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dah_company_time ON public.directory_assignment_history(company_id, changed_at DESC);

ALTER TABLE public.directory_assignment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dah_select" ON public.directory_assignment_history FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "dah_insert" ON public.directory_assignment_history FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

-- ---------- M7: link existing entities ----------

ALTER TABLE public.site_contacts
  ADD COLUMN IF NOT EXISTS directory_contact_id UUID REFERENCES public.directory_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_site_contacts_directory_contact ON public.site_contacts(directory_contact_id);

ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS sponsor_institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_studies_sponsor_institution ON public.studies(sponsor_institution_id);

ALTER TABLE public.study_sites
  ADD COLUMN IF NOT EXISTS pi_directory_contact_id UUID REFERENCES public.directory_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_sites_pi_directory_contact ON public.study_sites(pi_directory_contact_id);

-- RLS: site_contacts already scoped via site; new FK does not change scope

-- ---------- Seed role categories & roles ----------

INSERT INTO public.directory_role_categories (code, name, sort_order) VALUES
  ('sponsor', 'Sponsor organization', 10),
  ('cro', 'CRO', 20),
  ('site', 'Clinical site', 30),
  ('regulatory_ethics', 'Regulatory & ethics', 40),
  ('vendors', 'Vendors & service providers', 50),
  ('financial', 'Financial & contracting', 60),
  ('governance', 'Study governance & committees', 70),
  ('technology', 'Technology & systems', 80)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.directory_roles (category_id, name, sort_order)
SELECT c.id, r.name, r.ord FROM public.directory_role_categories c
INNER JOIN (VALUES
  -- sponsor
  ('sponsor', 'Chief Medical Officer (CMO)', 1),
  ('sponsor', 'VP Clinical', 2),
  ('sponsor', 'Clinical Program Director', 3),
  ('sponsor', 'Clinical Project Manager', 4),
  ('sponsor', 'Clinical Trial Manager', 5),
  ('sponsor', 'Director Clinical Operations', 6),
  ('sponsor', 'Medical Monitor', 7),
  ('sponsor', 'Safety Physician', 8),
  ('sponsor', 'Pharmacovigilance Manager', 9),
  ('sponsor', 'Regulatory Affairs Director', 10),
  ('sponsor', 'Regulatory Affairs Manager', 11),
  ('sponsor', 'Quality Assurance Director', 12),
  ('sponsor', 'Quality Assurance Auditor', 13),
  ('sponsor', 'Data Management Director', 14),
  ('sponsor', 'Clinical Data Manager', 15),
  ('sponsor', 'Biostatistics Director', 16),
  ('sponsor', 'Biostatistician', 17),
  ('sponsor', 'Clinical Systems Administrator', 18),
  ('sponsor', 'Project Manager (Sponsor)', 19),
  ('sponsor', 'Clinical Research Associate (Sponsor)', 20),
  ('sponsor', 'Clinical Trial Assistant (Sponsor)', 21),
  ('sponsor', 'Monitoring Manager (Sponsor)', 22),
  -- cro
  ('cro', 'Project Director', 1),
  ('cro', 'Project Manager (CRO)', 2),
  ('cro', 'Clinical Trial Manager', 3),
  ('cro', 'Clinical Research Associate (CRO)', 4),
  ('cro', 'In-House CRA (CRO)', 5),
  ('cro', 'Site Management Associate (SMA)', 6),
  ('cro', 'Clinical Trial Assistant (CTA)', 7),
  ('cro', 'Study Startup Specialist (SSU Specialist)', 8),
  ('cro', 'Regulatory Specialist', 9),
  ('cro', 'Clinical Data Manager', 10),
  ('cro', 'Biostatistician', 11),
  ('cro', 'Medical Writer', 12),
  ('cro', 'Safety Specialist', 13),
  ('cro', 'Vendor Manager', 14),
  ('cro', 'Monitoring Manager (CRO)', 15),
  -- site
  ('site', 'Principal Investigator (PI)', 1),
  ('site', 'Sub-Investigator', 2),
  ('site', 'Co-Investigator', 3),
  ('site', 'Study Coordinator', 4),
  ('site', 'Research Nurse', 5),
  ('site', 'Lead Study Coordinator', 6),
  ('site', 'Site Data Manager', 7),
  ('site', 'Site Regulatory Coordinator', 8),
  ('site', 'Pharmacist', 9),
  ('site', 'Lab Technician', 10),
  ('site', 'Radiology Technician', 11),
  ('site', 'Cath Lab Technician', 12),
  ('site', 'Device Specialist', 13),
  ('site', 'Research Assistant', 14),
  ('site', 'Fellow', 15),
  -- regulatory_ethics
  ('regulatory_ethics', 'IRB Chair', 1),
  ('regulatory_ethics', 'IRB Administrator', 2),
  ('regulatory_ethics', 'IRB Coordinator', 3),
  ('regulatory_ethics', 'Ethics Committee Member', 4),
  ('regulatory_ethics', 'Regulatory Agency Reviewer', 5),
  ('regulatory_ethics', 'Regulatory Agency Project Manager', 6),
  ('regulatory_ethics', 'Notified Body Representative', 7),
  -- vendors
  ('vendors', 'Central Lab Project Manager', 1),
  ('vendors', 'Imaging Core Lab Coordinator', 2),
  ('vendors', 'Data Safety Monitoring Board (DSMB) Member', 3),
  ('vendors', 'DSMB Chair', 4),
  ('vendors', 'Medical Adjudication Committee Member', 5),
  ('vendors', 'Clinical Events Committee (CEC) Member', 6),
  ('vendors', 'eClinical Systems Vendor Manager', 7),
  ('vendors', 'EDC Administrator', 8),
  ('vendors', 'Randomization / IWRS Manager', 9),
  ('vendors', 'Drug Supply Manager', 10),
  ('vendors', 'Logistics Manager', 11),
  ('vendors', 'Clinical Supplies Manager', 12),
  ('vendors', 'Biorepository Manager', 13),
  -- financial
  ('financial', 'Contracts Manager', 1),
  ('financial', 'Clinical Contracts Specialist', 2),
  ('financial', 'Site Budget Specialist', 3),
  ('financial', 'Grants Manager', 4),
  ('financial', 'Clinical Finance Manager', 5),
  ('financial', 'Accounts Payable Specialist', 6),
  ('financial', 'Clinical Payments Manager', 7),
  -- governance
  ('governance', 'Steering Committee Chair', 1),
  ('governance', 'Steering Committee Member', 2),
  ('governance', 'Scientific Advisory Board Member', 3),
  ('governance', 'Endpoint Adjudication Committee Member', 4),
  ('governance', 'Safety Monitoring Committee Member', 5),
  ('governance', 'Protocol Review Committee Member', 6),
  -- technology
  ('technology', 'CTMS Administrator', 1),
  ('technology', 'EDC Administrator', 2),
  ('technology', 'eTMF Manager', 3),
  ('technology', 'Clinical Systems Architect', 4),
  ('technology', 'Clinical Data Integration Specialist', 5),
  ('technology', 'AI Analytics Specialist', 6)
) AS r(cat_code, name, ord) ON c.code = r.cat_code
ON CONFLICT (category_id, name) DO NOTHING;
