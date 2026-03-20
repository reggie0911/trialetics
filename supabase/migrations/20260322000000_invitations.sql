-- =====================================================
-- Invitations: track pending invites for team members
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  first_name TEXT,
  last_name TEXT,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_invitations_company_status ON public.invitations(company_id, status);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Company admins can view invitations for their company
CREATE POLICY "invitations_select" ON public.invitations
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = invitations.company_id
    )
  );

-- Company admins can insert invitations for their company
CREATE POLICY "invitations_insert" ON public.invitations
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = invitations.company_id
    )
  );

-- Company admins can update invitations for their company (e.g. mark accepted via admin client, or revoke)
CREATE POLICY "invitations_update" ON public.invitations
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin' AND p.company_id = invitations.company_id
    )
  );
