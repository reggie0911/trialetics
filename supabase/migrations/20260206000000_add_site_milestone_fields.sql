-- Add site milestone fields to organization_projects table
-- These fields track site-specific milestones, IRB information, and subject enrollment data

ALTER TABLE public.organization_projects 
ADD COLUMN IF NOT EXISTS site_initiation_date DATE,
ADD COLUMN IF NOT EXISTS site_qualification_date DATE,
ADD COLUMN IF NOT EXISTS irb_approval_date DATE,
ADD COLUMN IF NOT EXISTS irb_expiration_date DATE,
ADD COLUMN IF NOT EXISTS irb_approval_number TEXT,
ADD COLUMN IF NOT EXISTS irb_institution_name TEXT,
ADD COLUMN IF NOT EXISTS close_out_date DATE,
ADD COLUMN IF NOT EXISTS first_subject_enrolled_date DATE,
ADD COLUMN IF NOT EXISTS last_subject_enrolled_date DATE,
ADD COLUMN IF NOT EXISTS last_completed_visit_date DATE,
ADD COLUMN IF NOT EXISTS planned_subject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enrolled_subject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS screen_failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_subject_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.organization_projects.site_initiation_date IS 'Date when the site was initiated for the project';
COMMENT ON COLUMN public.organization_projects.site_qualification_date IS 'Date when the site was qualified for the project';
COMMENT ON COLUMN public.organization_projects.irb_approval_date IS 'Date when IRB approval was received';
COMMENT ON COLUMN public.organization_projects.irb_expiration_date IS 'Date when IRB approval expires';
COMMENT ON COLUMN public.organization_projects.irb_approval_number IS 'IRB approval reference number';
COMMENT ON COLUMN public.organization_projects.irb_institution_name IS 'Name of the IRB institution';
COMMENT ON COLUMN public.organization_projects.close_out_date IS 'Date when the site was closed out';
COMMENT ON COLUMN public.organization_projects.first_subject_enrolled_date IS 'Date when first subject was enrolled';
COMMENT ON COLUMN public.organization_projects.last_subject_enrolled_date IS 'Date when last subject was enrolled';
COMMENT ON COLUMN public.organization_projects.last_completed_visit_date IS 'Date of last completed visit';
COMMENT ON COLUMN public.organization_projects.planned_subject_count IS 'Planned number of subjects to enroll';
COMMENT ON COLUMN public.organization_projects.enrolled_subject_count IS 'Number of subjects enrolled';
COMMENT ON COLUMN public.organization_projects.screen_failure_count IS 'Number of subject screen failures';
COMMENT ON COLUMN public.organization_projects.completed_subject_count IS 'Number of subjects who completed the study';
