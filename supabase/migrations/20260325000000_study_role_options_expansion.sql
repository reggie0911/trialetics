-- =====================================================
-- Expand Study Role Options
-- =====================================================
-- Replace old role values with new clinical trial role list.
-- Drop CHECK constraints first: updates to new values would violate the old role allow-list.

-- 1. Remove old CHECK constraints (must happen before data migration)
ALTER TABLE public.study_team_members DROP CONSTRAINT IF EXISTS study_team_members_role_check;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_study_role_check;

-- 2. Migrate study_team_members: old values -> new equivalents
UPDATE public.study_team_members SET role = 'clinical_research_associate' WHERE role = 'CRA';
UPDATE public.study_team_members SET role = 'clinical_project_manager' WHERE role = 'project_manager';
UPDATE public.study_team_members SET role = 'clinical_data_manager' WHERE role = 'data_manager';
UPDATE public.study_team_members SET role = 'clinical_project_manager' WHERE role = 'medical_monitor';
UPDATE public.study_team_members SET role = 'biostatistician' WHERE role = 'statistician';
UPDATE public.study_team_members SET role = 'regulatory_specialist' WHERE role = 'regulatory';
UPDATE public.study_team_members SET role = 'safety_specialist' WHERE role = 'pharmacovigilance';

-- 3. Migrate invitations: old values -> new equivalents
UPDATE public.invitations SET study_role = 'clinical_research_associate' WHERE study_role = 'CRA';
UPDATE public.invitations SET study_role = 'clinical_project_manager' WHERE study_role = 'project_manager';
UPDATE public.invitations SET study_role = 'clinical_data_manager' WHERE study_role = 'data_manager';
UPDATE public.invitations SET study_role = 'clinical_project_manager' WHERE study_role = 'medical_monitor';
UPDATE public.invitations SET study_role = 'biostatistician' WHERE study_role = 'statistician';
UPDATE public.invitations SET study_role = 'regulatory_specialist' WHERE study_role = 'regulatory';
UPDATE public.invitations SET study_role = 'safety_specialist' WHERE study_role = 'pharmacovigilance';

-- 4. New CHECK constraints
ALTER TABLE public.study_team_members ADD CONSTRAINT study_team_members_role_check CHECK (
  role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'inventory_specialist', 'medical_writer', 'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist', 'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

ALTER TABLE public.invitations ADD CONSTRAINT invitations_study_role_check CHECK (
  study_role IS NULL OR study_role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'inventory_specialist', 'medical_writer', 'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist', 'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

-- Update default for study_team_members.role (was 'custom'; keep for new rows without explicit role)
ALTER TABLE public.study_team_members ALTER COLUMN role SET DEFAULT 'clinical_research_associate';

-- Update default for invitations.study_role
ALTER TABLE public.invitations ALTER COLUMN study_role SET DEFAULT 'clinical_research_associate';
