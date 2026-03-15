-- =====================================================
-- Site Contacts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.site_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_contacts_site ON public.site_contacts(site_id);

ALTER TABLE public.site_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_contacts_select" ON public.site_contacts
  FOR SELECT USING (
    site_id IN (
      SELECT ss.id FROM public.study_sites ss
      JOIN public.studies s ON ss.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "site_contacts_insert" ON public.site_contacts
  FOR INSERT WITH CHECK (
    site_id IN (
      SELECT ss.id FROM public.study_sites ss
      JOIN public.studies s ON ss.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "site_contacts_update" ON public.site_contacts
  FOR UPDATE USING (
    site_id IN (
      SELECT ss.id FROM public.study_sites ss
      JOIN public.studies s ON ss.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "site_contacts_delete" ON public.site_contacts
  FOR DELETE USING (
    site_id IN (
      SELECT ss.id FROM public.study_sites ss
      JOIN public.studies s ON ss.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- =====================================================
-- Site Startup Checklist
-- =====================================================

CREATE TABLE IF NOT EXISTS public.site_startup_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'complete')),
  due_date DATE,
  completed_date DATE,
  assigned_to TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_startup_checklist_site ON public.site_startup_checklist(site_id);

CREATE TRIGGER update_site_startup_checklist_updated_at
  BEFORE UPDATE ON public.site_startup_checklist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_startup_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_select" ON public.site_startup_checklist
  FOR SELECT USING (
    site_id IN (
      SELECT ss.id FROM public.study_sites ss
      JOIN public.studies s ON ss.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "checklist_insert" ON public.site_startup_checklist
  FOR INSERT WITH CHECK (
    site_id IN (
      SELECT ss.id FROM public.study_sites ss
      JOIN public.studies s ON ss.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "checklist_update" ON public.site_startup_checklist
  FOR UPDATE USING (
    site_id IN (
      SELECT ss.id FROM public.study_sites ss
      JOIN public.studies s ON ss.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "checklist_delete" ON public.site_startup_checklist
  FOR DELETE USING (
    site_id IN (
      SELECT ss.id FROM public.study_sites ss
      JOIN public.studies s ON ss.study_id = s.id
      WHERE s.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
