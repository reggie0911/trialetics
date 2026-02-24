-- =====================================================
-- AI Attachments Storage Bucket
-- =====================================================
-- Private storage bucket for AI assistant file/image uploads

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-attachments',
  'ai-attachments',
  false,
  20971520, -- 20MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/csv', 'application/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/csv', 'application/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]::text[];

DROP POLICY IF EXISTS "Users can upload AI attachments" ON storage.objects;
CREATE POLICY "Users can upload AI attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'ai-attachments' AND
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view AI attachments" ON storage.objects;
CREATE POLICY "Users can view AI attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ai-attachments' AND
    auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can delete AI attachments" ON storage.objects;
CREATE POLICY "Users can delete AI attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'ai-attachments' AND
    auth.uid() IS NOT NULL
  );
