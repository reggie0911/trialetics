-- Soft deactivate / restore for subjects (reversible, preserves visits/milestones/CRF data)
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_subjects_study_active ON public.subjects (study_id, is_active);

COMMENT ON COLUMN public.subjects.is_active IS 'When false, subject is deactivated (hidden from default lists; no edits until restored).';
COMMENT ON COLUMN public.subjects.deactivated_at IS 'When the subject was deactivated.';
COMMENT ON COLUMN public.subjects.deactivated_by IS 'Profile (profiles.id) of the user who deactivated the subject.';
COMMENT ON COLUMN public.subjects.deactivation_reason IS 'Optional free-text reason for deactivation.';
