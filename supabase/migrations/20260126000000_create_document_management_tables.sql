-- =====================================================
-- Document Management Schema
-- =====================================================
-- This migration creates tables for storing Document Management data uploads,
-- document records, and column configurations.
-- All tables are company-scoped for multi-company support.

-- =====================================================
-- 1. document_header_mappings table
-- =====================================================
-- Stores custom header labels for Document Management columns per company

CREATE TABLE IF NOT EXISTS public.document_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL,
  customized_header TEXT NOT NULL,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(company_id, original_header)
);

COMMENT ON TABLE public.document_header_mappings IS 'Custom header label mappings for Document Management columns per company';
COMMENT ON COLUMN public.document_header_mappings.original_header IS 'Original column name from CSV';
COMMENT ON COLUMN public.document_header_mappings.customized_header IS 'Custom display label';
COMMENT ON COLUMN public.document_header_mappings.table_order IS 'Display order in table';

-- Indexes for document_header_mappings
CREATE INDEX idx_document_header_mappings_company_id ON public.document_header_mappings(company_id);
CREATE INDEX idx_document_header_mappings_table_order ON public.document_header_mappings(table_order);

-- =====================================================
-- 2. document_uploads table
-- =====================================================
-- Tracks CSV uploads for Document Management data with metadata

CREATE TABLE IF NOT EXISTS public.document_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  column_count INTEGER NOT NULL CHECK (column_count >= 0),
  filter_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.document_uploads IS 'Tracks Document Management data CSV uploads with metadata';
COMMENT ON COLUMN public.document_uploads.company_id IS 'Company this upload belongs to';
COMMENT ON COLUMN public.document_uploads.uploaded_by IS 'Profile ID of user who uploaded the data';
COMMENT ON COLUMN public.document_uploads.filter_preferences IS 'Saved filter state for this upload (globalSearch, columnFilters, etc)';

-- Indexes for document_uploads
CREATE INDEX idx_document_uploads_company_id ON public.document_uploads(company_id);
CREATE INDEX idx_document_uploads_uploaded_by ON public.document_uploads(uploaded_by);
CREATE INDEX idx_document_uploads_created_at ON public.document_uploads(created_at DESC);

-- =====================================================
-- 3. document_records table
-- =====================================================
-- Stores individual document records with normalized common fields
-- and JSONB column for dynamic/extra data

CREATE TABLE IF NOT EXISTS public.document_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.document_uploads(id) ON DELETE CASCADE,
  
  -- Frequently queried normalized fields
  document_name TEXT,
  document_type TEXT,
  document_category TEXT,
  version TEXT,
  status TEXT,
  site_name TEXT,
  project_id TEXT,
  upload_date DATE,
  approval_date DATE,
  expiration_date DATE,
  approved_by TEXT,
  file_url TEXT,
  file_size INTEGER,
  
  -- JSONB column for all remaining document data
  extra_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.document_records IS 'Individual document records with normalized common fields and JSONB for extra data';
COMMENT ON COLUMN public.document_records.document_name IS 'Document name/title';
COMMENT ON COLUMN public.document_records.document_type IS 'Document type (Protocol, ICF, IRB, Regulatory, Site File, etc.)';
COMMENT ON COLUMN public.document_records.document_category IS 'Document category';
COMMENT ON COLUMN public.document_records.version IS 'Document version';
COMMENT ON COLUMN public.document_records.status IS 'Document status (Draft, Under Review, Approved, Expired, Superseded)';
COMMENT ON COLUMN public.document_records.site_name IS 'Site name associated with document';
COMMENT ON COLUMN public.document_records.project_id IS 'Project/protocol identifier';
COMMENT ON COLUMN public.document_records.upload_date IS 'Date document was uploaded';
COMMENT ON COLUMN public.document_records.approval_date IS 'Date document was approved';
COMMENT ON COLUMN public.document_records.expiration_date IS 'Date document expires';
COMMENT ON COLUMN public.document_records.approved_by IS 'Person who approved the document';
COMMENT ON COLUMN public.document_records.file_url IS 'Link to actual document file';
COMMENT ON COLUMN public.document_records.file_size IS 'File size in bytes';
COMMENT ON COLUMN public.document_records.extra_fields IS 'All remaining document fields';

-- Indexes for document_records
CREATE INDEX idx_document_records_upload_id ON public.document_records(upload_id);
CREATE INDEX idx_document_records_document_name ON public.document_records(document_name);
CREATE INDEX idx_document_records_document_type ON public.document_records(document_type);
CREATE INDEX idx_document_records_status ON public.document_records(status);
CREATE INDEX idx_document_records_site_name ON public.document_records(site_name);
CREATE INDEX idx_document_records_expiration_date ON public.document_records(expiration_date);
CREATE INDEX idx_document_records_project_id ON public.document_records(project_id);

-- JSONB GIN index for fast queries on extra_fields
CREATE INDEX idx_document_records_extra_fields_gin ON public.document_records USING GIN(extra_fields);

-- =====================================================
-- 4. document_column_configs table
-- =====================================================
-- Stores column configurations (visibility, labels, order) per upload

CREATE TABLE IF NOT EXISTS public.document_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.document_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  label TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(upload_id, column_id)
);

COMMENT ON TABLE public.document_column_configs IS 'Column configurations (visibility, labels, order) for each Document Management upload';
COMMENT ON COLUMN public.document_column_configs.column_id IS 'Original column identifier from CSV';
COMMENT ON COLUMN public.document_column_configs.label IS 'Display label (can be customized)';
COMMENT ON COLUMN public.document_column_configs.table_order IS 'Display order in table';

-- Indexes for document_column_configs
CREATE INDEX idx_document_column_configs_upload_id ON public.document_column_configs(upload_id);
CREATE INDEX idx_document_column_configs_table_order ON public.document_column_configs(table_order);

-- =====================================================
-- 5. Update triggers
-- =====================================================
-- Add updated_at triggers to new tables

CREATE TRIGGER set_updated_at_document_header_mappings
  BEFORE UPDATE ON public.document_header_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_document_uploads
  BEFORE UPDATE ON public.document_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_document_column_configs
  BEFORE UPDATE ON public.document_column_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.document_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_column_configs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- document_header_mappings RLS policies
-- =====================================================

-- SELECT: Users can view header mappings for their company
CREATE POLICY "doc_Users can view header mappings for their company"
ON public.document_header_mappings
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create header mappings for their company
CREATE POLICY "doc_Users can create header mappings for their company"
ON public.document_header_mappings
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update header mappings for their company
CREATE POLICY "doc_Users can update header mappings for their company"
ON public.document_header_mappings
FOR UPDATE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete header mappings for their company
CREATE POLICY "doc_Users can delete header mappings for their company"
ON public.document_header_mappings
FOR DELETE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- document_uploads RLS policies
-- =====================================================

-- SELECT: Users can view uploads for their company
CREATE POLICY "doc_Users can view uploads for their company"
ON public.document_uploads
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create uploads for their company
CREATE POLICY "doc_Users can create uploads for their company"
ON public.document_uploads
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- UPDATE: Users can update uploads they created
CREATE POLICY "doc_Users can update their own uploads"
ON public.document_uploads
FOR UPDATE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Users can delete uploads they created
CREATE POLICY "doc_Users can delete their own uploads"
ON public.document_uploads
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- document_records RLS policies
-- =====================================================

-- SELECT: Users can view document records for uploads they have access to
CREATE POLICY "doc_Users can view records for accessible uploads"
ON public.document_records
FOR SELECT
USING (
  upload_id IN (
    SELECT du.id 
    FROM public.document_uploads du
    WHERE du.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert document records for uploads they have access to
CREATE POLICY "doc_Users can insert records for accessible uploads"
ON public.document_records
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT du.id 
    FROM public.document_uploads du
    WHERE du.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update document records for uploads they created
CREATE POLICY "doc_Users can update records for their uploads"
ON public.document_records
FOR UPDATE
USING (
  upload_id IN (
    SELECT id 
    FROM public.document_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DELETE: Users can delete document records for uploads they created
CREATE POLICY "doc_Users can delete records for their uploads"
ON public.document_records
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.document_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- document_column_configs RLS policies
-- =====================================================

-- SELECT: Users can view column configs for accessible uploads
CREATE POLICY "doc_Users can view column configs for accessible uploads"
ON public.document_column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT du.id 
    FROM public.document_uploads du
    WHERE du.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert column configs for accessible uploads
CREATE POLICY "doc_Users can insert column configs for accessible uploads"
ON public.document_column_configs
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT du.id 
    FROM public.document_uploads du
    WHERE du.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update column configs for uploads they can access
CREATE POLICY "doc_Users can update column configs for accessible uploads"
ON public.document_column_configs
FOR UPDATE
USING (
  upload_id IN (
    SELECT du.id 
    FROM public.document_uploads du
    WHERE du.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- DELETE: Users can delete column configs for uploads they created
CREATE POLICY "doc_Users can delete column configs for their uploads"
ON public.document_column_configs
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.document_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);
