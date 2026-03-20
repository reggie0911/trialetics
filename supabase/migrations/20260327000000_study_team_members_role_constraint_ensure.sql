-- Ensure study_team_members / invitations role CHECK matches the app (TypeScript TEAM_ROLE_OPTIONS).
-- Safe if 20260325000000_study_role_options_expansion.sql already ran (updates no-op, constraint recreated).
-- Drop CHECK before data updates so legacy role values can be rewritten without violating the old allow-list.

ALTER TABLE public.study_team_members DROP CONSTRAINT IF EXISTS study_team_members_role_check;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_study_role_check;

UPDATE public.study_team_members SET role = 'clinical_research_associate' WHERE role = 'CRA';
UPDATE public.study_team_members SET role = 'clinical_project_manager' WHERE role = 'project_manager';
UPDATE public.study_team_members SET role = 'clinical_data_manager' WHERE role = 'data_manager';
UPDATE public.study_team_members SET role = 'clinical_project_manager' WHERE role = 'medical_monitor';
UPDATE public.study_team_members SET role = 'biostatistician' WHERE role = 'statistician';
UPDATE public.study_team_members SET role = 'regulatory_specialist' WHERE role = 'regulatory';
UPDATE public.study_team_members SET role = 'safety_specialist' WHERE role = 'pharmacovigilance';

UPDATE public.invitations SET study_role = 'clinical_research_associate' WHERE study_role = 'CRA';
UPDATE public.invitations SET study_role = 'clinical_project_manager' WHERE study_role = 'project_manager';
UPDATE public.invitations SET study_role = 'clinical_data_manager' WHERE study_role = 'data_manager';
UPDATE public.invitations SET study_role = 'clinical_project_manager' WHERE study_role = 'medical_monitor';
UPDATE public.invitations SET study_role = 'biostatistician' WHERE study_role = 'statistician';
UPDATE public.invitations SET study_role = 'regulatory_specialist' WHERE study_role = 'regulatory';
UPDATE public.invitations SET study_role = 'safety_specialist' WHERE study_role = 'pharmacovigilance';

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

ALTER TABLE public.study_team_members ALTER COLUMN role SET DEFAULT 'clinical_research_associate';
ALTER TABLE public.invitations ALTER COLUMN study_role SET DEFAULT 'clinical_research_associate';
