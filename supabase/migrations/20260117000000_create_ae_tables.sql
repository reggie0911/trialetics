-- =====================================================
-- AE (Adverse Events) Metrics Schema
-- =====================================================
-- This migration creates tables for storing AE data uploads,
-- AE records, and column configurations.
-- All tables are company-scoped for multi-company support.

-- =====================================================
-- 1. ae_uploads table
-- =====================================================
-- Tracks CSV uploads for AE data with metadata

CREATE TABLE IF NOT EXISTS public.ae_uploads (
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

COMMENT ON TABLE public.ae_uploads IS 'Tracks AE (adverse events) data CSV uploads with metadata';
COMMENT ON COLUMN public.ae_uploads.company_id IS 'Company this upload belongs to';
COMMENT ON COLUMN public.ae_uploads.uploaded_by IS 'Profile ID of user who uploaded the data';
COMMENT ON COLUMN public.ae_uploads.filter_preferences IS 'Saved filter state for this upload (globalSearch, columnFilters, etc)';

-- Indexes for ae_uploads
CREATE INDEX idx_ae_uploads_company_id ON public.ae_uploads(company_id);
CREATE INDEX idx_ae_uploads_uploaded_by ON public.ae_uploads(uploaded_by);
CREATE INDEX idx_ae_uploads_created_at ON public.ae_uploads(created_at DESC);

-- =====================================================
-- 2. ae_records table
-- =====================================================
-- Stores individual AE records with normalized common fields
-- and JSONB column for dynamic/extra data

CREATE TABLE IF NOT EXISTS public.ae_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.ae_uploads(id) ON DELETE CASCADE,
  
  -- Frequently queried normalized fields
  site_name TEXT,
  subject_id TEXT,
  aedecod TEXT,
  aeser TEXT,
  aeout TEXT,
  aesercat1 TEXT,
  
  -- JSONB column for all remaining AE data
  extra_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ae_records IS 'Individual AE records with normalized common fields and JSONB for extra data';
COMMENT ON COLUMN public.ae_records.site_name IS 'Site name where AE occurred';
COMMENT ON COLUMN public.ae_records.subject_id IS 'Subject/Patient identifier';
COMMENT ON COLUMN public.ae_records.aedecod IS 'AE decoded term (category)';
COMMENT ON COLUMN public.ae_records.aeser IS 'Serious AE flag/indicator';
COMMENT ON COLUMN public.ae_records.aeout IS 'AE outcome';
COMMENT ON COLUMN public.ae_records.aesercat1 IS 'SAE category 1';
COMMENT ON COLUMN public.ae_records.extra_fields IS 'All remaining AE fields (AESTDAT, RWOSDAT, AEEXP, relationship fields, etc)';

-- Indexes for ae_records
CREATE INDEX idx_ae_records_upload_id ON public.ae_records(upload_id);
CREATE INDEX idx_ae_records_site_name ON public.ae_records(site_name);
CREATE INDEX idx_ae_records_subject_id ON public.ae_records(subject_id);
CREATE INDEX idx_ae_records_aedecod ON public.ae_records(aedecod);
CREATE INDEX idx_ae_records_aeser ON public.ae_records(aeser);

-- JSONB GIN index for fast queries on extra_fields
CREATE INDEX idx_ae_records_extra_fields_gin ON public.ae_records USING GIN(extra_fields);

-- =====================================================
-- 3. ae_column_configs table
-- =====================================================
-- Stores column configurations (visibility, labels, order) per upload

CREATE TABLE IF NOT EXISTS public.ae_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.ae_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  label TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(upload_id, column_id)
);

COMMENT ON TABLE public.ae_column_configs IS 'Column configurations (visibility, labels, order) for each AE upload';
COMMENT ON COLUMN public.ae_column_configs.column_id IS 'Original column identifier from CSV';
COMMENT ON COLUMN public.ae_column_configs.label IS 'Display label (can be customized)';
COMMENT ON COLUMN public.ae_column_configs.table_order IS 'Display order in table';

-- Indexes for ae_column_configs
CREATE INDEX idx_ae_column_configs_upload_id ON public.ae_column_configs(upload_id);
CREATE INDEX idx_ae_column_configs_table_order ON public.ae_column_configs(table_order);

-- =====================================================
-- 4. Update triggers
-- =====================================================
-- Add updated_at triggers to new tables

CREATE TRIGGER set_updated_at_ae_uploads
  BEFORE UPDATE ON public.ae_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_ae_column_configs
  BEFORE UPDATE ON public.ae_column_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.ae_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ae_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ae_column_configs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ae_uploads RLS policies
-- =====================================================

-- SELECT: Users can view uploads for their company
CREATE POLICY "Users can view uploads for their company"
ON public.ae_uploads
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create uploads for their company
CREATE POLICY "Users can create uploads for their company"
ON public.ae_uploads
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- UPDATE: Users can update uploads they created
CREATE POLICY "Users can update their own uploads"
ON public.ae_uploads
FOR UPDATE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Users can delete uploads they created
CREATE POLICY "Users can delete their own uploads"
ON public.ae_uploads
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- ae_records RLS policies
-- =====================================================

-- SELECT: Users can view AE records for uploads they have access to
CREATE POLICY "Users can view ae records for accessible uploads"
ON public.ae_records
FOR SELECT
USING (
  upload_id IN (
    SELECT au.id 
    FROM public.ae_uploads au
    WHERE au.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert AE records for uploads they have access to
CREATE POLICY "Users can insert ae records for accessible uploads"
ON public.ae_records
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT au.id 
    FROM public.ae_uploads au
    WHERE au.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update AE records for uploads they created
CREATE POLICY "Users can update ae records for their uploads"
ON public.ae_records
FOR UPDATE
USING (
  upload_id IN (
    SELECT id 
    FROM public.ae_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DELETE: Users can delete AE records for uploads they created
CREATE POLICY "Users can delete ae records for their uploads"
ON public.ae_records
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.ae_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- ae_column_configs RLS policies
-- =====================================================

-- SELECT: Users can view column configs for accessible uploads
CREATE POLICY "Users can view column configs for accessible uploads"
ON public.ae_column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT au.id 
    FROM public.ae_uploads au
    WHERE au.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert column configs for accessible uploads
CREATE POLICY "Users can insert column configs for accessible uploads"
ON public.ae_column_configs
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT au.id 
    FROM public.ae_uploads au
    WHERE au.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update column configs for uploads they can access
CREATE POLICY "Users can update column configs for accessible uploads"
ON public.ae_column_configs
FOR UPDATE
USING (
  upload_id IN (
    SELECT au.id 
    FROM public.ae_uploads au
    WHERE au.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- DELETE: Users can delete column configs for uploads they created
CREATE POLICY "Users can delete column configs for their uploads"
ON public.ae_column_configs
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.ae_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);
