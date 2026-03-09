-- =============================================
-- CTMS Roles: Many-to-Many Role Structure
-- Reference table for 80+ roles across 9 categories
-- Junction table for contact-to-role assignments
-- =============================================

-- =============================================
-- CTMS ROLES REFERENCE TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.ctms_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'sponsor', 'cro', 'site', 'regulatory_ethics', 'vendors',
    'financial', 'governance', 'technology', 'platform'
  )),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctms_roles_category ON public.ctms_roles(category);
CREATE INDEX IF NOT EXISTS idx_ctms_roles_is_active ON public.ctms_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_ctms_roles_sort ON public.ctms_roles(category, sort_order);

DROP TRIGGER IF EXISTS update_ctms_roles_updated_at ON public.ctms_roles;
CREATE TRIGGER update_ctms_roles_updated_at
  BEFORE UPDATE ON public.ctms_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED CTMS ROLES (9 categories, 80+ roles)
-- =============================================

INSERT INTO public.ctms_roles (slug, name, category, sort_order) VALUES
-- 1. Sponsor Organization Roles
('chief_medical_officer', 'Chief Medical Officer (CMO)', 'sponsor', 1),
('vp_clinical_development', 'VP Clinical Development', 'sponsor', 2),
('clinical_program_director', 'Clinical Program Director', 'sponsor', 3),
('clinical_project_manager', 'Clinical Project Manager', 'sponsor', 4),
('clinical_trial_manager', 'Clinical Trial Manager', 'sponsor', 5),
('clinical_operations_lead', 'Clinical Operations Lead', 'sponsor', 6),
('clinical_research_scientist', 'Clinical Research Scientist', 'sponsor', 7),
('medical_monitor', 'Medical Monitor', 'sponsor', 8),
('safety_physician', 'Safety Physician', 'sponsor', 9),
('pharmacovigilance_manager', 'Pharmacovigilance Manager', 'sponsor', 10),
('regulatory_affairs_director', 'Regulatory Affairs Director', 'sponsor', 11),
('regulatory_affairs_manager', 'Regulatory Affairs Manager', 'sponsor', 12),
('quality_assurance_director', 'Quality Assurance Director', 'sponsor', 13),
('quality_assurance_auditor', 'Quality Assurance Auditor', 'sponsor', 14),
('data_management_director', 'Data Management Director', 'sponsor', 15),
('clinical_data_manager', 'Clinical Data Manager', 'sponsor', 16),
('biostatistics_director', 'Biostatistics Director', 'sponsor', 17),
('biostatistician', 'Biostatistician', 'sponsor', 18),
('clinical_systems_administrator', 'Clinical Systems Administrator', 'sponsor', 19),
-- 2. CRO Roles
('project_director', 'Project Director', 'cro', 1),
('cro_project_manager', 'Project Manager', 'cro', 2),
('cro_clinical_trial_manager', 'Clinical Trial Manager', 'cro', 3),
('clinical_research_associate', 'Clinical Research Associate (CRA)', 'cro', 4),
('senior_cra', 'Senior CRA', 'cro', 5),
('in_house_cra', 'In-House CRA', 'cro', 6),
('site_management_associate', 'Site Management Associate (SMA)', 'cro', 7),
('clinical_trial_assistant', 'Clinical Trial Assistant (CTA)', 'cro', 8),
('study_startup_specialist', 'Study Startup Specialist (SSU Specialist)', 'cro', 9),
('regulatory_specialist', 'Regulatory Specialist', 'cro', 10),
('cro_clinical_data_manager', 'Clinical Data Manager', 'cro', 11),
('cro_biostatistician', 'Biostatistician', 'cro', 12),
('medical_writer', 'Medical Writer', 'cro', 13),
('safety_specialist', 'Safety Specialist', 'cro', 14),
('vendor_manager', 'Vendor Manager', 'cro', 15),
('monitoring_manager', 'Monitoring Manager', 'cro', 16),
-- 3. Clinical Site Roles
('principal_investigator', 'Principal Investigator (PI)', 'site', 1),
('sub_investigator', 'Sub-Investigator', 'site', 2),
('co_investigator', 'Co-Investigator', 'site', 3),
('study_coordinator', 'Study Coordinator', 'site', 4),
('research_nurse', 'Research Nurse', 'site', 5),
('clinical_research_coordinator', 'Clinical Research Coordinator (CRC)', 'site', 6),
('site_data_manager', 'Site Data Manager', 'site', 7),
('site_regulatory_coordinator', 'Site Regulatory Coordinator', 'site', 8),
('pharmacist', 'Pharmacist / Investigational Drug Pharmacist', 'site', 9),
('lab_technician', 'Lab Technician', 'site', 10),
('radiology_technician', 'Radiology Technician', 'site', 11),
('cath_lab_technician', 'Cath Lab Technician', 'site', 12),
('device_specialist', 'Device Specialist', 'site', 13),
('research_assistant', 'Research Assistant', 'site', 14),
-- 4. Regulatory & Ethics Roles
('irb_chair', 'IRB Chair', 'regulatory_ethics', 1),
('irb_administrator', 'IRB Administrator', 'regulatory_ethics', 2),
('irb_coordinator', 'IRB Coordinator', 'regulatory_ethics', 3),
('ethics_committee_member', 'Ethics Committee Member', 'regulatory_ethics', 4),
('regulatory_agency_reviewer', 'Regulatory Agency Reviewer', 'regulatory_ethics', 5),
('regulatory_agency_project_manager', 'Regulatory Agency Project Manager', 'regulatory_ethics', 6),
('notified_body_representative', 'Notified Body Representative', 'regulatory_ethics', 7),
-- 5. Vendors & Service Providers
('central_lab_project_manager', 'Central Lab Project Manager', 'vendors', 1),
('imaging_core_lab_coordinator', 'Imaging Core Lab Coordinator', 'vendors', 2),
('dsmb_member', 'Data Safety Monitoring Board (DSMB) Member', 'vendors', 3),
('dsmb_chair', 'DSMB Chair', 'vendors', 4),
('medical_adjudication_committee_member', 'Medical Adjudication Committee Member', 'vendors', 5),
('cec_member', 'Clinical Events Committee (CEC) Member', 'vendors', 6),
('eclinical_systems_vendor_manager', 'eClinical Systems Vendor Manager', 'vendors', 7),
('edc_administrator', 'EDC Administrator', 'vendors', 8),
('randomization_iwrs_manager', 'Randomization / IWRS Manager', 'vendors', 9),
('drug_supply_manager', 'Drug Supply Manager', 'vendors', 10),
('logistics_manager', 'Logistics Manager', 'vendors', 11),
('clinical_supplies_manager', 'Clinical Supplies Manager', 'vendors', 12),
('biorepository_manager', 'Biorepository Manager', 'vendors', 13),
-- 6. Financial & Contracting Roles
('contracts_manager', 'Contracts Manager', 'financial', 1),
('clinical_contracts_specialist', 'Clinical Contracts Specialist', 'financial', 2),
('site_budget_specialist', 'Site Budget Specialist', 'financial', 3),
('grants_manager', 'Grants Manager', 'financial', 4),
('clinical_finance_manager', 'Clinical Finance Manager', 'financial', 5),
('accounts_payable_specialist', 'Accounts Payable Specialist', 'financial', 6),
('clinical_payments_manager', 'Clinical Payments Manager', 'financial', 7),
-- 7. Study Governance & Committees
('steering_committee_chair', 'Steering Committee Chair', 'governance', 1),
('steering_committee_member', 'Steering Committee Member', 'governance', 2),
('scientific_advisory_board_member', 'Scientific Advisory Board Member', 'governance', 3),
('endpoint_adjudication_committee_member', 'Endpoint Adjudication Committee Member', 'governance', 4),
('safety_monitoring_committee_member', 'Safety Monitoring Committee Member', 'governance', 5),
('protocol_review_committee_member', 'Protocol Review Committee Member', 'governance', 6),
-- 8. Technology & Systems Roles
('ctms_administrator', 'CTMS Administrator', 'technology', 1),
('edc_administrator_tech', 'EDC Administrator', 'technology', 2),
('etmf_manager', 'eTMF Manager', 'technology', 3),
('clinical_systems_architect', 'Clinical Systems Architect', 'technology', 4),
('clinical_data_integration_specialist', 'Clinical Data Integration Specialist', 'technology', 5),
('ai_analytics_specialist', 'AI Analytics Specialist', 'technology', 6),
-- 9. Trialetics / Internal Platform Roles
('global_ctms_administrator', 'Global CTMS Administrator', 'platform', 1),
('study_administrator', 'Study Administrator', 'platform', 2),
('site_user', 'Site User', 'platform', 3),
('sponsor_user', 'Sponsor User', 'platform', 4),
('cro_user', 'CRO User', 'platform', 5),
('vendor_user', 'Vendor User', 'platform', 6),
('read_only_user', 'Read-Only User', 'platform', 7),
('ai_operations_analyst', 'AI Operations Analyst', 'platform', 8),
('clinical_intelligence_analyst', 'Clinical Intelligence Analyst', 'platform', 9)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- CONTACT ROLE ASSIGNMENTS JUNCTION TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.contact_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.ctms_roles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_role_assignments_contact_id ON public.contact_role_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_role_assignments_role_id ON public.contact_role_assignments(role_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- ctms_roles: read-only for all authenticated users (reference data)
ALTER TABLE public.ctms_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view ctms_roles" ON public.ctms_roles;
CREATE POLICY "Anyone can view ctms_roles"
  ON public.ctms_roles FOR SELECT
  USING (true);

-- contact_role_assignments: company-scoped via contact
ALTER TABLE public.contact_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contact role assignments in their company" ON public.contact_role_assignments;
CREATE POLICY "Users can view contact role assignments in their company"
  ON public.contact_role_assignments FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert contact role assignments in their company" ON public.contact_role_assignments;
CREATE POLICY "Users can insert contact role assignments in their company"
  ON public.contact_role_assignments FOR INSERT
  WITH CHECK (
    contact_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update contact role assignments in their company" ON public.contact_role_assignments;
CREATE POLICY "Users can update contact role assignments in their company"
  ON public.contact_role_assignments FOR UPDATE
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete contact role assignments in their company" ON public.contact_role_assignments;
CREATE POLICY "Users can delete contact role assignments in their company"
  ON public.contact_role_assignments FOR DELETE
  USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );
