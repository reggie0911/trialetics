-- Phase 6: Structural Enhancements
-- 1. Satellite sites: parent_organization_id on organizations
-- 2. Site team employees: organization_team_members links org to profiles

-- =====================================================
-- 1. Add parent_organization_id to organizations
-- =====================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS parent_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON public.organizations(parent_organization_id);

COMMENT ON COLUMN public.organizations.parent_organization_id IS 'Parent site for satellite sites; one parent, many children per Oracle CTMS';

-- =====================================================
-- 2. organization_team_members table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('cra', 'monitor', 'study_manager', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_org_team_members_organization_id ON public.organization_team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_team_members_profile_id ON public.organization_team_members(profile_id);

ALTER TABLE public.organization_team_members ENABLE ROW LEVEL SECURITY;

-- Users can view team members for orgs in their company
CREATE POLICY "Users can view org team members in their company"
  ON public.organization_team_members
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Users can manage team members for orgs in their company
CREATE POLICY "Users can manage org team members in their company"
  ON public.organization_team_members
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.organization_team_members IS 'Site team employees: CRAs assign profiles to site organizations per Oracle CTMS';
