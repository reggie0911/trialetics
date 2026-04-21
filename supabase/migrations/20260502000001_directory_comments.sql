-- Polymorphic directory comments (institution, directory_contact, committee)

CREATE TABLE IF NOT EXISTS public.directory_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('institution', 'directory_contact', 'committee')),
  entity_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_directory_comments_entity
  ON public.directory_comments(entity_type, entity_id, created_at DESC);

ALTER TABLE public.directory_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "directory_comments_select" ON public.directory_comments
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "directory_comments_insert" ON public.directory_comments
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY "directory_comments_update" ON public.directory_comments
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND author_id = auth.uid()
  );

CREATE POLICY "directory_comments_delete" ON public.directory_comments
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND author_id = auth.uid()
  );
