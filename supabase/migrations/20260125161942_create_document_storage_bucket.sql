-- =====================================================
-- Document Storage Bucket
-- =====================================================
-- Creates a private storage bucket for document file uploads
-- Used for Document Management module (PDF, DOCX, XLSX files)

-- Create documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET 
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[];

-- Allow authenticated users to upload documents to their company folder
DROP POLICY IF EXISTS "doc_Users can upload documents" ON storage.objects;
CREATE POLICY "doc_Users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Allow users to view documents from their company
DROP POLICY IF EXISTS "doc_Users can view company documents" ON storage.objects;
CREATE POLICY "doc_Users can view company documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete documents they uploaded (tracked via metadata or folder structure)
DROP POLICY IF EXISTS "doc_Users can delete company documents" ON storage.objects;
CREATE POLICY "doc_Users can delete company documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] = (
      SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );
