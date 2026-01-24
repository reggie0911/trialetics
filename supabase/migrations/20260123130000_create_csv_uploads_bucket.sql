-- =====================================================
-- CSV Uploads Storage Bucket
-- =====================================================
-- Creates a private storage bucket for CSV file uploads
-- Used for SDV Tracker and other module data imports

-- Create csv-uploads bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'csv-uploads', 
  'csv-uploads', 
  false,
  104857600, -- 100MB limit
  ARRAY['text/csv', 'application/csv', 'text/plain']::text[]
)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['text/csv', 'application/csv', 'text/plain']::text[];

-- Allow authenticated users to upload CSV files to their company folder
DROP POLICY IF EXISTS "Users can upload CSV files" ON storage.objects;
CREATE POLICY "Users can upload CSV files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'csv-uploads' AND
    auth.uid() IS NOT NULL
  );

-- Allow users to view their company's CSV files
DROP POLICY IF EXISTS "Users can view CSV files" ON storage.objects;
CREATE POLICY "Users can view CSV files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'csv-uploads' AND
    auth.uid() IS NOT NULL
  );

-- Allow users to delete their own uploads
DROP POLICY IF EXISTS "Users can delete own CSV files" ON storage.objects;
CREATE POLICY "Users can delete own CSV files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'csv-uploads' AND
    auth.uid() IS NOT NULL
  );
