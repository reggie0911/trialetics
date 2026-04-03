-- Directory contact photos: avatars bucket path directory-contacts/{company_id}/{filename}
-- INSERT/DELETE are limited to the caller's company. SELECT allows this prefix so public URLs work in <img> without a JWT.

CREATE OR REPLACE FUNCTION public.avatars_directory_contacts_company_id(path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(path, '/', 1) = 'directory-contacts'
         AND length(btrim(split_part(path, '/', 2))) > 0
    THEN split_part(path, '/', 2)::uuid
    ELSE NULL
  END;
$$;

DROP POLICY IF EXISTS "avatars_directory_contacts_insert" ON storage.objects;
CREATE POLICY "avatars_directory_contacts_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.avatars_directory_contacts_company_id(name) IS NOT NULL
    AND public.avatars_directory_contacts_company_id(name) = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "avatars_directory_contacts_delete" ON storage.objects;
CREATE POLICY "avatars_directory_contacts_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND public.avatars_directory_contacts_company_id(name) IS NOT NULL
    AND public.avatars_directory_contacts_company_id(name) = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "avatars_directory_contacts_select" ON storage.objects;
CREATE POLICY "avatars_directory_contacts_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = 'directory-contacts'
  );
