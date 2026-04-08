-- Catalog item ↔ study site association (operational link; not inventory quantity).

CREATE TABLE IF NOT EXISTS public.ip_item_site_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.ip_items(id) ON DELETE CASCADE,
  study_site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ip_item_site_links_item_study_site_unique UNIQUE (item_id, study_site_id)
);

CREATE INDEX IF NOT EXISTS idx_ip_item_site_links_study_id ON public.ip_item_site_links(study_id);
CREATE INDEX IF NOT EXISTS idx_ip_item_site_links_item_id ON public.ip_item_site_links(item_id);

ALTER TABLE public.ip_item_site_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ip_item_site_links_select" ON public.ip_item_site_links
  FOR SELECT USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "ip_item_site_links_insert" ON public.ip_item_site_links
  FOR INSERT WITH CHECK (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.ip_items i
      WHERE i.id = item_id AND i.study_id = study_id
    )
    AND EXISTS (
      SELECT 1 FROM public.study_sites ss
      WHERE ss.id = study_site_id AND ss.study_id = study_id
    )
  );

CREATE POLICY "ip_item_site_links_update" ON public.ip_item_site_links
  FOR UPDATE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "ip_item_site_links_delete" ON public.ip_item_site_links
  FOR DELETE USING (
    study_id IN (
      SELECT id FROM public.studies
      WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_item_site_links TO authenticated;
