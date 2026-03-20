-- =====================================================
-- Company Join Links: shareable URLs for self-signup into a company
-- =====================================================

CREATE TABLE public.company_join_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  label       TEXT,
  expires_at  TIMESTAMPTZ,
  max_uses    INT,
  use_count   INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_join_links_company ON public.company_join_links(company_id);
CREATE INDEX idx_join_links_token ON public.company_join_links(token);

ALTER TABLE public.company_join_links ENABLE ROW LEVEL SECURITY;

-- Admins can view their company's join links
CREATE POLICY "join_links_select" ON public.company_join_links
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can insert join links for their company
CREATE POLICY "join_links_insert" ON public.company_join_links
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admins can update their company's join links (e.g. revoke, increment use_count)
CREATE POLICY "join_links_update" ON public.company_join_links
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
