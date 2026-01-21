-- =====================================================
-- eCRF Query Tracker Schema
-- =====================================================
-- This migration creates tables for storing eCRF Query Tracker data uploads,
-- query records, and column configurations.
-- All tables are company-scoped for multi-company support.

-- =====================================================
-- 1. ecrf_header_mappings table
-- =====================================================
-- Stores custom header labels for eCRF Query Tracker columns per company

CREATE TABLE IF NOT EXISTS public.ecrf_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL,
  customized_header TEXT NOT NULL,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(company_id, original_header)
);

COMMENT ON TABLE public.ecrf_header_mappings IS 'Custom header label mappings for eCRF Query Tracker columns per company';
COMMENT ON COLUMN public.ecrf_header_mappings.original_header IS 'Original column name from CSV';
COMMENT ON COLUMN public.ecrf_header_mappings.customized_header IS 'Custom display label';
COMMENT ON COLUMN public.ecrf_header_mappings.table_order IS 'Display order in table';

-- Indexes for ecrf_header_mappings
CREATE INDEX idx_ecrf_header_mappings_company_id ON public.ecrf_header_mappings(company_id);
CREATE INDEX idx_ecrf_header_mappings_table_order ON public.ecrf_header_mappings(table_order);

-- =====================================================
-- 2. ecrf_uploads table
-- =====================================================
-- Tracks CSV uploads for eCRF Query Tracker data with metadata

CREATE TABLE IF NOT EXISTS public.ecrf_uploads (
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

COMMENT ON TABLE public.ecrf_uploads IS 'Tracks eCRF Query Tracker data CSV uploads with metadata';
COMMENT ON COLUMN public.ecrf_uploads.company_id IS 'Company this upload belongs to';
COMMENT ON COLUMN public.ecrf_uploads.uploaded_by IS 'Profile ID of user who uploaded the data';
COMMENT ON COLUMN public.ecrf_uploads.filter_preferences IS 'Saved filter state for this upload (globalSearch, columnFilters, etc)';

-- Indexes for ecrf_uploads
CREATE INDEX idx_ecrf_uploads_company_id ON public.ecrf_uploads(company_id);
CREATE INDEX idx_ecrf_uploads_uploaded_by ON public.ecrf_uploads(uploaded_by);
CREATE INDEX idx_ecrf_uploads_created_at ON public.ecrf_uploads(created_at DESC);

-- =====================================================
-- 3. ecrf_records table
-- =====================================================
-- Stores individual eCRF query records with normalized common fields
-- and JSONB column for dynamic/extra data

CREATE TABLE IF NOT EXISTS public.ecrf_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.ecrf_uploads(id) ON DELETE CASCADE,
  
  -- Frequently queried normalized fields
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  event_date TEXT,
  form_name TEXT,
  query_type TEXT,
  query_text TEXT,
  query_state TEXT,
  query_resolution TEXT,
  user_name TEXT,
  date_time TEXT,
  user_role TEXT,
  query_raised_by_role TEXT,
  
  -- JSONB column for all remaining query data
  extra_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ecrf_records IS 'Individual eCRF query records with normalized common fields and JSONB for extra data';
COMMENT ON COLUMN public.ecrf_records.site_name IS 'Site name where query was raised';
COMMENT ON COLUMN public.ecrf_records.subject_id IS 'Subject/Patient identifier';
COMMENT ON COLUMN public.ecrf_records.event_name IS 'Event or visit name';
COMMENT ON COLUMN public.ecrf_records.event_date IS 'Event date';
COMMENT ON COLUMN public.ecrf_records.form_name IS 'Form name where query occurred';
COMMENT ON COLUMN public.ecrf_records.query_type IS 'Type of query (e.g., Data Clarification, Missing Data)';
COMMENT ON COLUMN public.ecrf_records.query_text IS 'Query text/description';
COMMENT ON COLUMN public.ecrf_records.query_state IS 'Query state (e.g., Open, Closed, Resolved)';
COMMENT ON COLUMN public.ecrf_records.query_resolution IS 'Query resolution description';
COMMENT ON COLUMN public.ecrf_records.user_name IS 'User who acted on the query';
COMMENT ON COLUMN public.ecrf_records.date_time IS 'Date and time of query action';
COMMENT ON COLUMN public.ecrf_records.user_role IS 'Role of user who acted on the query';
COMMENT ON COLUMN public.ecrf_records.query_raised_by_role IS 'Role of user who raised the query';
COMMENT ON COLUMN public.ecrf_records.extra_fields IS 'All remaining query fields';

-- Indexes for ecrf_records
CREATE INDEX idx_ecrf_records_upload_id ON public.ecrf_records(upload_id);
CREATE INDEX idx_ecrf_records_site_name ON public.ecrf_records(site_name);
CREATE INDEX idx_ecrf_records_subject_id ON public.ecrf_records(subject_id);
CREATE INDEX idx_ecrf_records_event_name ON public.ecrf_records(event_name);
CREATE INDEX idx_ecrf_records_form_name ON public.ecrf_records(form_name);
CREATE INDEX idx_ecrf_records_query_state ON public.ecrf_records(query_state);
CREATE INDEX idx_ecrf_records_query_type ON public.ecrf_records(query_type);
CREATE INDEX idx_ecrf_records_user_role ON public.ecrf_records(user_role);
CREATE INDEX idx_ecrf_records_query_raised_by_role ON public.ecrf_records(query_raised_by_role);

-- JSONB GIN index for fast queries on extra_fields
CREATE INDEX idx_ecrf_records_extra_fields_gin ON public.ecrf_records USING GIN(extra_fields);

-- =====================================================
-- 4. ecrf_column_configs table
-- =====================================================
-- Stores column configurations (visibility, labels, order) per upload

CREATE TABLE IF NOT EXISTS public.ecrf_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.ecrf_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  label TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(upload_id, column_id)
);

COMMENT ON TABLE public.ecrf_column_configs IS 'Column configurations (visibility, labels, order) for each eCRF Query Tracker upload';
COMMENT ON COLUMN public.ecrf_column_configs.column_id IS 'Original column identifier from CSV';
COMMENT ON COLUMN public.ecrf_column_configs.label IS 'Display label (can be customized)';
COMMENT ON COLUMN public.ecrf_column_configs.table_order IS 'Display order in table';

-- Indexes for ecrf_column_configs
CREATE INDEX idx_ecrf_column_configs_upload_id ON public.ecrf_column_configs(upload_id);
CREATE INDEX idx_ecrf_column_configs_table_order ON public.ecrf_column_configs(table_order);

-- =====================================================
-- 5. Update triggers
-- =====================================================
-- Add updated_at triggers to new tables

CREATE TRIGGER set_updated_at_ecrf_header_mappings
  BEFORE UPDATE ON public.ecrf_header_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_ecrf_uploads
  BEFORE UPDATE ON public.ecrf_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_ecrf_column_configs
  BEFORE UPDATE ON public.ecrf_column_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.ecrf_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecrf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecrf_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ecrf_column_configs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ecrf_header_mappings RLS policies
-- =====================================================

-- SELECT: Users can view header mappings for their company
CREATE POLICY "Users can view header mappings for their company"
ON public.ecrf_header_mappings
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create header mappings for their company
CREATE POLICY "Users can create header mappings for their company"
ON public.ecrf_header_mappings
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update header mappings for their company
CREATE POLICY "Users can update header mappings for their company"
ON public.ecrf_header_mappings
FOR UPDATE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete header mappings for their company
CREATE POLICY "Users can delete header mappings for their company"
ON public.ecrf_header_mappings
FOR DELETE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- ecrf_uploads RLS policies
-- =====================================================

-- SELECT: Users can view uploads for their company
CREATE POLICY "Users can view uploads for their company"
ON public.ecrf_uploads
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create uploads for their company
CREATE POLICY "Users can create uploads for their company"
ON public.ecrf_uploads
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- UPDATE: Users can update uploads they created
CREATE POLICY "Users can update their own uploads"
ON public.ecrf_uploads
FOR UPDATE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Users can delete uploads they created
CREATE POLICY "Users can delete their own uploads"
ON public.ecrf_uploads
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- ecrf_records RLS policies
-- =====================================================

-- SELECT: Users can view query records for uploads they have access to
CREATE POLICY "Users can view query records for accessible uploads"
ON public.ecrf_records
FOR SELECT
USING (
  upload_id IN (
    SELECT eu.id 
    FROM public.ecrf_uploads eu
    WHERE eu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert query records for uploads they have access to
CREATE POLICY "Users can insert query records for accessible uploads"
ON public.ecrf_records
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT eu.id 
    FROM public.ecrf_uploads eu
    WHERE eu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update query records for uploads they created
CREATE POLICY "Users can update query records for their uploads"
ON public.ecrf_records
FOR UPDATE
USING (
  upload_id IN (
    SELECT id 
    FROM public.ecrf_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DELETE: Users can delete query records for uploads they created
CREATE POLICY "Users can delete query records for their uploads"
ON public.ecrf_records
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.ecrf_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- ecrf_column_configs RLS policies
-- =====================================================

-- SELECT: Users can view column configs for accessible uploads
CREATE POLICY "Users can view column configs for accessible uploads"
ON public.ecrf_column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT eu.id 
    FROM public.ecrf_uploads eu
    WHERE eu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert column configs for accessible uploads
CREATE POLICY "Users can insert column configs for accessible uploads"
ON public.ecrf_column_configs
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT eu.id 
    FROM public.ecrf_uploads eu
    WHERE eu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update column configs for uploads they can access
CREATE POLICY "Users can update column configs for accessible uploads"
ON public.ecrf_column_configs
FOR UPDATE
USING (
  upload_id IN (
    SELECT eu.id 
    FROM public.ecrf_uploads eu
    WHERE eu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- DELETE: Users can delete column configs for uploads they created
CREATE POLICY "Users can delete column configs for their uploads"
ON public.ecrf_column_configs
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.ecrf_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);
