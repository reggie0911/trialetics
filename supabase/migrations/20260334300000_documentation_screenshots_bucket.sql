-- Public storage for documentation screenshots (markdown images). Platform admins upload; URLs are embedded in platform_documentation.body_markdown.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentation-screenshots',
  'documentation-screenshots',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']::text[];

DROP POLICY IF EXISTS "documentation_screenshots_select_public" ON storage.objects;
CREATE POLICY "documentation_screenshots_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documentation-screenshots');

DROP POLICY IF EXISTS "documentation_screenshots_insert_platform_admin" ON storage.objects;
CREATE POLICY "documentation_screenshots_insert_platform_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentation-screenshots'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_platform_admin = true
    )
  );

DROP POLICY IF EXISTS "documentation_screenshots_update_platform_admin" ON storage.objects;
CREATE POLICY "documentation_screenshots_update_platform_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documentation-screenshots'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_platform_admin = true
    )
  );

DROP POLICY IF EXISTS "documentation_screenshots_delete_platform_admin" ON storage.objects;
CREATE POLICY "documentation_screenshots_delete_platform_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentation-screenshots'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_platform_admin = true
    )
  );
