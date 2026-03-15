-- =====================================================
-- Team Roles (company-level custom roles)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.team_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_team_roles_company ON public.team_roles(company_id);

ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_roles_select" ON public.team_roles
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "team_roles_insert" ON public.team_roles
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "team_roles_update" ON public.team_roles
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "team_roles_delete" ON public.team_roles
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- =====================================================
-- Study Team Members
-- =====================================================

CREATE TABLE IF NOT EXISTS public.study_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'custom' CHECK (role IN ('project_manager', 'CRA', 'data_manager', 'medical_monitor', 'statistician', 'regulatory', 'pharmacovigilance', 'custom')),
  custom_role_id UUID REFERENCES public.team_roles(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(study_id, profile_id, role)
);

CREATE INDEX IF NOT EXISTS idx_study_team_study ON public.study_team_members(study_id);
CREATE INDEX IF NOT EXISTS idx_study_team_profile ON public.study_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_study_team_site ON public.study_team_members(site_id);

ALTER TABLE public.study_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_team_members_select" ON public.study_team_members
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_team_members_insert" ON public.study_team_members
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_team_members_update" ON public.study_team_members
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "study_team_members_delete" ON public.study_team_members
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
