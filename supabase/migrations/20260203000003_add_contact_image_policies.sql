-- Add RLS policies for contact image uploads to avatars bucket
-- Contact images are stored under contacts/{contactId}/{filename}

-- Allow authenticated users to upload contact images
DROP POLICY IF EXISTS "Users can upload contact images" ON storage.objects;
CREATE POLICY "Users can upload contact images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'contacts'
  );

-- Allow users to update contact images
DROP POLICY IF EXISTS "Users can update contact images" ON storage.objects;
CREATE POLICY "Users can update contact images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'contacts'
  );

-- Allow users to delete contact images
DROP POLICY IF EXISTS "Users can delete contact images" ON storage.objects;
CREATE POLICY "Users can delete contact images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'contacts'
  );
