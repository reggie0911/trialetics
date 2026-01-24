-- =====================================================
-- SDV Tracker Schema
-- =====================================================
-- This migration creates tables for storing SDV (Source Data Verification) Tracker data,
-- including dual-upload support for SDV Data and Site Data Entry, plus merged records.
-- All tables are company-scoped for multi-company support.

-- =====================================================
-- 1. sdv_header_mappings table
-- =====================================================
-- Stores custom header labels for SDV Tracker columns per company

CREATE TABLE IF NOT EXISTS public.sdv_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL,
  customized_header TEXT NOT NULL,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(company_id, original_header)
);

COMMENT ON TABLE public.sdv_header_mappings IS 'Custom header label mappings for SDV Tracker columns per company';
COMMENT ON COLUMN public.sdv_header_mappings.original_header IS 'Original column name from CSV';
COMMENT ON COLUMN public.sdv_header_mappings.customized_header IS 'Custom display label';
COMMENT ON COLUMN public.sdv_header_mappings.table_order IS 'Display order in table';

-- Indexes for sdv_header_mappings
CREATE INDEX idx_sdv_header_mappings_company_id ON public.sdv_header_mappings(company_id);
CREATE INDEX idx_sdv_header_mappings_table_order ON public.sdv_header_mappings(table_order);

-- =====================================================
-- 2. sdv_uploads table
-- =====================================================
-- Tracks CSV uploads for SDV Tracker data with metadata
-- Supports two upload types: 'site_data_entry' (primary) and 'sdv_data'

CREATE TABLE IF NOT EXISTS public.sdv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('site_data_entry', 'sdv_data')),
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  column_count INTEGER NOT NULL CHECK (column_count >= 0),
  filter_preferences JSONB DEFAULT '{}'::jsonb,
  -- Link to the primary upload for SDV data uploads
  primary_upload_id UUID REFERENCES public.sdv_uploads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sdv_uploads IS 'Tracks SDV Tracker data CSV uploads with metadata';
COMMENT ON COLUMN public.sdv_uploads.company_id IS 'Company this upload belongs to';
COMMENT ON COLUMN public.sdv_uploads.uploaded_by IS 'Profile ID of user who uploaded the data';
COMMENT ON COLUMN public.sdv_uploads.upload_type IS 'Type of upload: site_data_entry (primary) or sdv_data';
COMMENT ON COLUMN public.sdv_uploads.primary_upload_id IS 'For sdv_data uploads, references the primary site_data_entry upload';
COMMENT ON COLUMN public.sdv_uploads.filter_preferences IS 'Saved filter state for this upload';

-- Indexes for sdv_uploads
CREATE INDEX idx_sdv_uploads_company_id ON public.sdv_uploads(company_id);
CREATE INDEX idx_sdv_uploads_uploaded_by ON public.sdv_uploads(uploaded_by);
CREATE INDEX idx_sdv_uploads_upload_type ON public.sdv_uploads(upload_type);
CREATE INDEX idx_sdv_uploads_primary_upload_id ON public.sdv_uploads(primary_upload_id);
CREATE INDEX idx_sdv_uploads_created_at ON public.sdv_uploads(created_at DESC);

-- =====================================================
-- 3. sdv_records table
-- =====================================================
-- Stores individual SDV and Site Data Entry records with normalized fields
-- Records are keyed by merge_key for joining across data sources

CREATE TABLE IF NOT EXISTS public.sdv_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.sdv_uploads(id) ON DELETE CASCADE,
  
  -- Merge key for joining across uploads
  merge_key TEXT NOT NULL,
  
  -- Common normalized fields (from Site Data Entry - primary)
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  form_name TEXT,
  item_id TEXT,
  item_name TEXT,
  
  -- Site Data Entry specific fields
  item_export_label TEXT,
  edit_date_time TEXT,
  edit_by TEXT,
  
  -- SDV specific fields
  sdv_by TEXT,
  sdv_date TEXT,
  
  -- Calculated fields
  data_verified INTEGER DEFAULT 0,
  data_entered INTEGER DEFAULT 0,
  
  -- JSONB column for all remaining data
  extra_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sdv_records IS 'Individual SDV and Site Data Entry records with normalized fields';
COMMENT ON COLUMN public.sdv_records.merge_key IS 'Concatenated key: SubjectId|EventName|FormName|ItemId';
COMMENT ON COLUMN public.sdv_records.site_name IS 'Site name';
COMMENT ON COLUMN public.sdv_records.subject_id IS 'Subject/Patient identifier';
COMMENT ON COLUMN public.sdv_records.event_name IS 'Event or visit name';
COMMENT ON COLUMN public.sdv_records.form_name IS 'Form name';
COMMENT ON COLUMN public.sdv_records.item_id IS 'Item identifier';
COMMENT ON COLUMN public.sdv_records.item_name IS 'Item name (from SDV data)';
COMMENT ON COLUMN public.sdv_records.item_export_label IS 'Item export label (from Site Data Entry)';
COMMENT ON COLUMN public.sdv_records.edit_date_time IS 'Edit date/time (from Site Data Entry)';
COMMENT ON COLUMN public.sdv_records.edit_by IS 'Edited by user (from Site Data Entry)';
COMMENT ON COLUMN public.sdv_records.sdv_by IS 'SDV performed by user';
COMMENT ON COLUMN public.sdv_records.sdv_date IS 'SDV date';
COMMENT ON COLUMN public.sdv_records.data_verified IS '1 if SdvDate not empty, else 0';
COMMENT ON COLUMN public.sdv_records.data_entered IS '1 if EditDateTime not empty, else 0';
COMMENT ON COLUMN public.sdv_records.extra_fields IS 'All remaining fields';

-- Indexes for sdv_records
CREATE INDEX idx_sdv_records_upload_id ON public.sdv_records(upload_id);
CREATE INDEX idx_sdv_records_merge_key ON public.sdv_records(merge_key);
CREATE INDEX idx_sdv_records_site_name ON public.sdv_records(site_name);
CREATE INDEX idx_sdv_records_subject_id ON public.sdv_records(subject_id);
CREATE INDEX idx_sdv_records_event_name ON public.sdv_records(event_name);
CREATE INDEX idx_sdv_records_form_name ON public.sdv_records(form_name);
CREATE INDEX idx_sdv_records_item_id ON public.sdv_records(item_id);

-- JSONB GIN index for fast queries on extra_fields
CREATE INDEX idx_sdv_records_extra_fields_gin ON public.sdv_records USING GIN(extra_fields);

-- =====================================================
-- 4. sdv_merged_records table
-- =====================================================
-- Stores the merged view combining Site Data Entry, SDV Data, and eCRF records

CREATE TABLE IF NOT EXISTS public.sdv_merged_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.sdv_uploads(id) ON DELETE CASCADE,
  
  -- Merge key for joining
  merge_key TEXT NOT NULL,
  
  -- Display columns
  site_number TEXT,
  site_name TEXT,
  subject_id TEXT,
  visit_type TEXT,
  crf_name TEXT,
  crf_field TEXT,
  
  -- Calculated metrics
  data_verified INTEGER DEFAULT 0,
  data_entered INTEGER DEFAULT 0,
  data_expected INTEGER DEFAULT 0,
  data_needing_review INTEGER DEFAULT 0,
  sdv_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Query metrics from ecrf_records
  opened_queries INTEGER DEFAULT 0,
  answered_queries INTEGER DEFAULT 0,
  
  -- Estimated time
  estimate_hours NUMERIC(10,2) DEFAULT 0,
  estimate_days NUMERIC(10,2) DEFAULT 0,
  
  -- JSONB for additional data
  extra_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sdv_merged_records IS 'Merged SDV data combining Site Data Entry, SDV Data, and eCRF query records';
COMMENT ON COLUMN public.sdv_merged_records.merge_key IS 'Concatenated key for joining data sources';
COMMENT ON COLUMN public.sdv_merged_records.site_number IS 'Site number from patients table';
COMMENT ON COLUMN public.sdv_merged_records.site_name IS 'Site name from Site Data Entry';
COMMENT ON COLUMN public.sdv_merged_records.subject_id IS 'Subject ID from Site Data Entry';
COMMENT ON COLUMN public.sdv_merged_records.visit_type IS 'Event/visit name from Site Data Entry';
COMMENT ON COLUMN public.sdv_merged_records.crf_name IS 'Form name from Site Data Entry';
COMMENT ON COLUMN public.sdv_merged_records.crf_field IS 'Item export label from Site Data Entry';
COMMENT ON COLUMN public.sdv_merged_records.data_verified IS 'Count of verified data points';
COMMENT ON COLUMN public.sdv_merged_records.data_entered IS 'Count of entered data points';
COMMENT ON COLUMN public.sdv_merged_records.data_expected IS 'Count of expected data points';
COMMENT ON COLUMN public.sdv_merged_records.data_needing_review IS 'data_entered - data_verified';
COMMENT ON COLUMN public.sdv_merged_records.sdv_percent IS '(data_verified / data_entered) * 100';
COMMENT ON COLUMN public.sdv_merged_records.opened_queries IS 'Count of Query Raised from ecrf_records';
COMMENT ON COLUMN public.sdv_merged_records.answered_queries IS 'Count of Query Resolved from ecrf_records';
COMMENT ON COLUMN public.sdv_merged_records.estimate_hours IS 'data_needing_review / 60';
COMMENT ON COLUMN public.sdv_merged_records.estimate_days IS '(data_needing_review / 60) / 7';

-- Indexes for sdv_merged_records
CREATE INDEX idx_sdv_merged_records_upload_id ON public.sdv_merged_records(upload_id);
CREATE INDEX idx_sdv_merged_records_merge_key ON public.sdv_merged_records(merge_key);
CREATE INDEX idx_sdv_merged_records_site_name ON public.sdv_merged_records(site_name);
CREATE INDEX idx_sdv_merged_records_subject_id ON public.sdv_merged_records(subject_id);
CREATE INDEX idx_sdv_merged_records_visit_type ON public.sdv_merged_records(visit_type);
CREATE INDEX idx_sdv_merged_records_crf_name ON public.sdv_merged_records(crf_name);

-- =====================================================
-- 5. sdv_column_configs table
-- =====================================================
-- Stores column configurations (visibility, labels, order) per upload

CREATE TABLE IF NOT EXISTS public.sdv_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.sdv_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  label TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(upload_id, column_id)
);

COMMENT ON TABLE public.sdv_column_configs IS 'Column configurations (visibility, labels, order) for each SDV Tracker upload';
COMMENT ON COLUMN public.sdv_column_configs.column_id IS 'Original column identifier';
COMMENT ON COLUMN public.sdv_column_configs.label IS 'Display label (can be customized)';
COMMENT ON COLUMN public.sdv_column_configs.table_order IS 'Display order in table';

-- Indexes for sdv_column_configs
CREATE INDEX idx_sdv_column_configs_upload_id ON public.sdv_column_configs(upload_id);
CREATE INDEX idx_sdv_column_configs_table_order ON public.sdv_column_configs(table_order);

-- =====================================================
-- 6. Update triggers
-- =====================================================
-- Add updated_at triggers to new tables

CREATE TRIGGER set_updated_at_sdv_header_mappings
  BEFORE UPDATE ON public.sdv_header_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_sdv_uploads
  BEFORE UPDATE ON public.sdv_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_sdv_merged_records
  BEFORE UPDATE ON public.sdv_merged_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_sdv_column_configs
  BEFORE UPDATE ON public.sdv_column_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.sdv_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdv_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdv_merged_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdv_column_configs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- sdv_header_mappings RLS policies
-- =====================================================

-- SELECT: Users can view header mappings for their company
CREATE POLICY "sdv_Users can view header mappings for their company"
ON public.sdv_header_mappings
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create header mappings for their company
CREATE POLICY "sdv_Users can create header mappings for their company"
ON public.sdv_header_mappings
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update header mappings for their company
CREATE POLICY "sdv_Users can update header mappings for their company"
ON public.sdv_header_mappings
FOR UPDATE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete header mappings for their company
CREATE POLICY "sdv_Users can delete header mappings for their company"
ON public.sdv_header_mappings
FOR DELETE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- sdv_uploads RLS policies
-- =====================================================

-- SELECT: Users can view uploads for their company
CREATE POLICY "sdv_Users can view uploads for their company"
ON public.sdv_uploads
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create uploads for their company
CREATE POLICY "sdv_Users can create uploads for their company"
ON public.sdv_uploads
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- UPDATE: Users can update uploads they created
CREATE POLICY "sdv_Users can update their own uploads"
ON public.sdv_uploads
FOR UPDATE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Users can delete uploads they created
CREATE POLICY "sdv_Users can delete their own uploads"
ON public.sdv_uploads
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- sdv_records RLS policies
-- =====================================================

-- SELECT: Users can view records for uploads they have access to
CREATE POLICY "sdv_Users can view records for accessible uploads"
ON public.sdv_records
FOR SELECT
USING (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert records for uploads they have access to
CREATE POLICY "sdv_Users can insert records for accessible uploads"
ON public.sdv_records
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update records for uploads they created
CREATE POLICY "sdv_Users can update records for their uploads"
ON public.sdv_records
FOR UPDATE
USING (
  upload_id IN (
    SELECT id 
    FROM public.sdv_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DELETE: Users can delete records for uploads they created
CREATE POLICY "sdv_Users can delete records for their uploads"
ON public.sdv_records
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.sdv_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- sdv_merged_records RLS policies
-- =====================================================

-- SELECT: Users can view merged records for uploads they have access to
CREATE POLICY "sdv_Users can view merged records for accessible uploads"
ON public.sdv_merged_records
FOR SELECT
USING (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert merged records for uploads they have access to
CREATE POLICY "sdv_Users can insert merged records for accessible uploads"
ON public.sdv_merged_records
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update merged records for uploads they created
CREATE POLICY "sdv_Users can update merged records for their uploads"
ON public.sdv_merged_records
FOR UPDATE
USING (
  upload_id IN (
    SELECT id 
    FROM public.sdv_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DELETE: Users can delete merged records for uploads they created
CREATE POLICY "sdv_Users can delete merged records for their uploads"
ON public.sdv_merged_records
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.sdv_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- sdv_column_configs RLS policies
-- =====================================================

-- SELECT: Users can view column configs for accessible uploads
CREATE POLICY "sdv_Users can view column configs for accessible uploads"
ON public.sdv_column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert column configs for accessible uploads
CREATE POLICY "sdv_Users can insert column configs for accessible uploads"
ON public.sdv_column_configs
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update column configs for uploads they can access
CREATE POLICY "sdv_Users can update column configs for accessible uploads"
ON public.sdv_column_configs
FOR UPDATE
USING (
  upload_id IN (
    SELECT su.id 
    FROM public.sdv_uploads su
    WHERE su.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- DELETE: Users can delete column configs for uploads they created
CREATE POLICY "sdv_Users can delete column configs for their uploads"
ON public.sdv_column_configs
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.sdv_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);
