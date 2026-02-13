-- Add logo_url to companies for company logo storage
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.companies.logo_url IS 'Public URL of company logo stored in avatars/companies/{companyId}/';

-- Add RLS policies for company logo uploads in avatars bucket
-- Company logos are stored under companies/{companyId}/{filename}
-- Admins of the company can upload/update/delete

-- Allow authenticated users to upload company logos (path must match companies/{companyId}/)
DROP POLICY IF EXISTS "Users can upload company logos" ON storage.objects;
CREATE POLICY "Users can upload company logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'companies' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
        AND p.company_id = ((storage.foldername(name))[2])::uuid
    )
  );

-- Allow users to update company logos (must be admin of that company)
DROP POLICY IF EXISTS "Users can update company logos" ON storage.objects;
CREATE POLICY "Users can update company logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'companies' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
        AND p.company_id = ((storage.foldername(name))[2])::uuid
    )
  );

-- Allow users to delete company logos (must be admin of that company)
DROP POLICY IF EXISTS "Users can delete company logos" ON storage.objects;
CREATE POLICY "Users can delete company logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'companies' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
        AND p.company_id = ((storage.foldername(name))[2])::uuid
    )
  );
