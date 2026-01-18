-- =====================================================
-- MC (Medication Compliance) Metrics Schema
-- =====================================================
-- This migration creates tables for storing MC data uploads,
-- MC records, and column configurations.
-- All tables are company-scoped for multi-company support.

-- =====================================================
-- 1. mc_header_mappings table
-- =====================================================
-- Stores custom header labels for MC columns per company

CREATE TABLE IF NOT EXISTS public.mc_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL,
  customized_header TEXT NOT NULL,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(company_id, original_header)
);

COMMENT ON TABLE public.mc_header_mappings IS 'Custom header label mappings for MC columns per company';
COMMENT ON COLUMN public.mc_header_mappings.original_header IS 'Original column name from CSV';
COMMENT ON COLUMN public.mc_header_mappings.customized_header IS 'Custom display label';
COMMENT ON COLUMN public.mc_header_mappings.table_order IS 'Display order in table';

-- Indexes for mc_header_mappings
CREATE INDEX idx_mc_header_mappings_company_id ON public.mc_header_mappings(company_id);
CREATE INDEX idx_mc_header_mappings_table_order ON public.mc_header_mappings(table_order);

-- =====================================================
-- 2. mc_uploads table
-- =====================================================
-- Tracks CSV uploads for MC data with metadata

CREATE TABLE IF NOT EXISTS public.mc_uploads (
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

COMMENT ON TABLE public.mc_uploads IS 'Tracks MC (medication compliance) data CSV uploads with metadata';
COMMENT ON COLUMN public.mc_uploads.company_id IS 'Company this upload belongs to';
COMMENT ON COLUMN public.mc_uploads.uploaded_by IS 'Profile ID of user who uploaded the data';
COMMENT ON COLUMN public.mc_uploads.filter_preferences IS 'Saved filter state for this upload (globalSearch, columnFilters, etc)';

-- Indexes for mc_uploads
CREATE INDEX idx_mc_uploads_company_id ON public.mc_uploads(company_id);
CREATE INDEX idx_mc_uploads_uploaded_by ON public.mc_uploads(uploaded_by);
CREATE INDEX idx_mc_uploads_created_at ON public.mc_uploads(created_at DESC);

-- =====================================================
-- 2. mc_records table
-- =====================================================
-- Stores individual MC records with normalized common fields
-- and JSONB column for dynamic/extra data

CREATE TABLE IF NOT EXISTS public.mc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.mc_uploads(id) ON DELETE CASCADE,
  
  -- Frequently queried normalized fields
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  medication_name TEXT,
  start_date TEXT,
  stop_date TEXT,
  
  -- JSONB column for all remaining MC data
  extra_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.mc_records IS 'Individual MC records with normalized common fields and JSONB for extra data';
COMMENT ON COLUMN public.mc_records.site_name IS 'Site name where medication was recorded';
COMMENT ON COLUMN public.mc_records.subject_id IS 'Subject/Patient identifier';
COMMENT ON COLUMN public.mc_records.event_name IS 'Event or visit name';
COMMENT ON COLUMN public.mc_records.medication_name IS 'Medication name (from 1.CCMED)';
COMMENT ON COLUMN public.mc_records.start_date IS 'Medication start date (from 1.CCSTDAT)';
COMMENT ON COLUMN public.mc_records.stop_date IS 'Medication stop date (from 1.CCSPDAT)';
COMMENT ON COLUMN public.mc_records.extra_fields IS 'All remaining MC fields (1.CCSVT, 1.CCIND, 1.CC1, 1.CCUNIT, etc)';

-- Indexes for mc_records
CREATE INDEX idx_mc_records_upload_id ON public.mc_records(upload_id);
CREATE INDEX idx_mc_records_site_name ON public.mc_records(site_name);
CREATE INDEX idx_mc_records_subject_id ON public.mc_records(subject_id);
CREATE INDEX idx_mc_records_medication_name ON public.mc_records(medication_name);
CREATE INDEX idx_mc_records_start_date ON public.mc_records(start_date);

-- JSONB GIN index for fast queries on extra_fields
CREATE INDEX idx_mc_records_extra_fields_gin ON public.mc_records USING GIN(extra_fields);

-- =====================================================
-- 4. mc_column_configs table
-- =====================================================
-- Stores column configurations (visibility, labels, order) per upload

CREATE TABLE IF NOT EXISTS public.mc_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.mc_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  label TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(upload_id, column_id)
);

COMMENT ON TABLE public.mc_column_configs IS 'Column configurations (visibility, labels, order) for each MC upload';
COMMENT ON COLUMN public.mc_column_configs.column_id IS 'Original column identifier from CSV';
COMMENT ON COLUMN public.mc_column_configs.label IS 'Display label (can be customized)';
COMMENT ON COLUMN public.mc_column_configs.table_order IS 'Display order in table';

-- Indexes for mc_column_configs
CREATE INDEX idx_mc_column_configs_upload_id ON public.mc_column_configs(upload_id);
CREATE INDEX idx_mc_column_configs_table_order ON public.mc_column_configs(table_order);

-- =====================================================
-- 5. Update triggers
-- =====================================================
-- Add updated_at triggers to new tables

CREATE TRIGGER set_updated_at_mc_uploads
  BEFORE UPDATE ON public.mc_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_mc_column_configs
  BEFORE UPDATE ON public.mc_column_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.mc_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mc_column_configs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- mc_header_mappings RLS policies
-- =====================================================

-- SELECT: Users can view header mappings for their company
CREATE POLICY "Users can view header mappings for their company"
ON public.mc_header_mappings
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create header mappings for their company
CREATE POLICY "Users can create header mappings for their company"
ON public.mc_header_mappings
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update header mappings for their company
CREATE POLICY "Users can update header mappings for their company"
ON public.mc_header_mappings
FOR UPDATE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete header mappings for their company
CREATE POLICY "Users can delete header mappings for their company"
ON public.mc_header_mappings
FOR DELETE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- mc_uploads RLS policies
-- =====================================================

-- SELECT: Users can view uploads for their company
CREATE POLICY "Users can view uploads for their company"
ON public.mc_uploads
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create uploads for their company
CREATE POLICY "Users can create uploads for their company"
ON public.mc_uploads
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- UPDATE: Users can update uploads they created
CREATE POLICY "Users can update their own uploads"
ON public.mc_uploads
FOR UPDATE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Users can delete uploads they created
CREATE POLICY "Users can delete their own uploads"
ON public.mc_uploads
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- mc_records RLS policies
-- =====================================================

-- SELECT: Users can view MC records for uploads they have access to
CREATE POLICY "Users can view mc records for accessible uploads"
ON public.mc_records
FOR SELECT
USING (
  upload_id IN (
    SELECT mu.id 
    FROM public.mc_uploads mu
    WHERE mu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert MC records for uploads they have access to
CREATE POLICY "Users can insert mc records for accessible uploads"
ON public.mc_records
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT mu.id 
    FROM public.mc_uploads mu
    WHERE mu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update MC records for uploads they created
CREATE POLICY "Users can update mc records for their uploads"
ON public.mc_records
FOR UPDATE
USING (
  upload_id IN (
    SELECT id 
    FROM public.mc_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DELETE: Users can delete MC records for uploads they created
CREATE POLICY "Users can delete mc records for their uploads"
ON public.mc_records
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.mc_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- mc_column_configs RLS policies
-- =====================================================

-- SELECT: Users can view column configs for accessible uploads
CREATE POLICY "Users can view column configs for accessible uploads"
ON public.mc_column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT mu.id 
    FROM public.mc_uploads mu
    WHERE mu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert column configs for accessible uploads
CREATE POLICY "Users can insert column configs for accessible uploads"
ON public.mc_column_configs
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT mu.id 
    FROM public.mc_uploads mu
    WHERE mu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update column configs for uploads they can access
CREATE POLICY "Users can update column configs for accessible uploads"
ON public.mc_column_configs
FOR UPDATE
USING (
  upload_id IN (
    SELECT mu.id 
    FROM public.mc_uploads mu
    WHERE mu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- DELETE: Users can delete column configs for uploads they created
CREATE POLICY "Users can delete column configs for their uploads"
ON public.mc_column_configs
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.mc_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);
