-- =====================================================
-- Invitations: add optional study assignment for invite flow
-- =====================================================
-- When inviting a user, admins can optionally pre-assign them to a study.
-- On invite acceptance, a study_team_member record is created automatically.

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS study_role TEXT DEFAULT 'CRA' CHECK (
    study_role IS NULL OR study_role IN (
      'project_manager', 'CRA', 'data_manager', 'medical_monitor',
      'statistician', 'regulatory', 'pharmacovigilance', 'custom'
    )
  );

CREATE INDEX IF NOT EXISTS idx_invitations_study_id ON public.invitations(study_id);
