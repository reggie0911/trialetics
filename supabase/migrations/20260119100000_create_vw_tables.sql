-- =====================================================
-- VW (Visit Window) Tracking Schema
-- =====================================================
-- This migration creates tables for storing VW data uploads,
-- VW records with alert status, and column configurations.
-- All tables are company-scoped for multi-company support.

-- =====================================================
-- 1. vw_header_mappings table
-- =====================================================
-- Stores custom header labels for VW columns per company

CREATE TABLE IF NOT EXISTS public.vw_header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL,
  customized_header TEXT NOT NULL,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(company_id, original_header)
);

COMMENT ON TABLE public.vw_header_mappings IS 'Custom header label mappings for VW columns per company';
COMMENT ON COLUMN public.vw_header_mappings.original_header IS 'Original column name from CSV';
COMMENT ON COLUMN public.vw_header_mappings.customized_header IS 'Custom display label';
COMMENT ON COLUMN public.vw_header_mappings.table_order IS 'Display order in table';

-- Indexes for vw_header_mappings
CREATE INDEX idx_vw_header_mappings_company_id ON public.vw_header_mappings(company_id);
CREATE INDEX idx_vw_header_mappings_table_order ON public.vw_header_mappings(table_order);

-- =====================================================
-- 2. vw_uploads table
-- =====================================================
-- Tracks CSV uploads for VW data with metadata

CREATE TABLE IF NOT EXISTS public.vw_uploads (
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

COMMENT ON TABLE public.vw_uploads IS 'Tracks VW (visit window) data CSV uploads with metadata';
COMMENT ON COLUMN public.vw_uploads.company_id IS 'Company this upload belongs to';
COMMENT ON COLUMN public.vw_uploads.uploaded_by IS 'Profile ID of user who uploaded the data';
COMMENT ON COLUMN public.vw_uploads.filter_preferences IS 'Saved filter state for this upload (globalSearch, columnFilters, etc)';

-- Indexes for vw_uploads
CREATE INDEX idx_vw_uploads_company_id ON public.vw_uploads(company_id);
CREATE INDEX idx_vw_uploads_uploaded_by ON public.vw_uploads(uploaded_by);
CREATE INDEX idx_vw_uploads_created_at ON public.vw_uploads(created_at DESC);

-- =====================================================
-- 3. vw_records table
-- =====================================================
-- Stores individual VW records with normalized common fields
-- and JSONB column for dynamic/extra data

CREATE TABLE IF NOT EXISTS public.vw_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.vw_uploads(id) ON DELETE CASCADE,
  
  -- Frequently queried normalized fields
  site_name TEXT,
  subject_id TEXT,
  event_name TEXT,
  event_status TEXT,
  procedure_date TEXT,
  death_date TEXT,
  event_date TEXT,
  planned_date TEXT,
  proposed_date TEXT,
  window_start_date TEXT,
  window_end_date TEXT,
  alert_status TEXT,
  
  -- JSONB column for all remaining VW data
  extra_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.vw_records IS 'Individual VW records with normalized common fields and JSONB for extra data';
COMMENT ON COLUMN public.vw_records.site_name IS 'Site name where visit is recorded';
COMMENT ON COLUMN public.vw_records.subject_id IS 'Subject/Patient identifier';
COMMENT ON COLUMN public.vw_records.event_name IS 'Event or visit name';
COMMENT ON COLUMN public.vw_records.event_status IS 'Status of the event/visit';
COMMENT ON COLUMN public.vw_records.procedure_date IS 'Procedure date from patients table';
COMMENT ON COLUMN public.vw_records.death_date IS 'Death date from patients table';
COMMENT ON COLUMN public.vw_records.event_date IS 'Actual event date';
COMMENT ON COLUMN public.vw_records.planned_date IS 'Planned visit date';
COMMENT ON COLUMN public.vw_records.proposed_date IS 'Proposed visit date (anchor for window calculation)';
COMMENT ON COLUMN public.vw_records.window_start_date IS 'Visit window start date';
COMMENT ON COLUMN public.vw_records.window_end_date IS 'Visit window end date';
COMMENT ON COLUMN public.vw_records.alert_status IS 'Calculated alert status: GREEN, YELLOW, or RED';
COMMENT ON COLUMN public.vw_records.extra_fields IS 'All remaining VW fields';

-- Indexes for vw_records
CREATE INDEX idx_vw_records_upload_id ON public.vw_records(upload_id);
CREATE INDEX idx_vw_records_site_name ON public.vw_records(site_name);
CREATE INDEX idx_vw_records_subject_id ON public.vw_records(subject_id);
CREATE INDEX idx_vw_records_event_name ON public.vw_records(event_name);
CREATE INDEX idx_vw_records_event_status ON public.vw_records(event_status);
CREATE INDEX idx_vw_records_alert_status ON public.vw_records(alert_status);

-- JSONB GIN index for fast queries on extra_fields
CREATE INDEX idx_vw_records_extra_fields_gin ON public.vw_records USING GIN(extra_fields);

-- =====================================================
-- 4. vw_column_configs table
-- =====================================================
-- Stores column configurations (visibility, labels, order) per upload

CREATE TABLE IF NOT EXISTS public.vw_column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.vw_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  label TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(upload_id, column_id)
);

COMMENT ON TABLE public.vw_column_configs IS 'Column configurations (visibility, labels, order) for each VW upload';
COMMENT ON COLUMN public.vw_column_configs.column_id IS 'Original column identifier from CSV';
COMMENT ON COLUMN public.vw_column_configs.label IS 'Display label (can be customized)';
COMMENT ON COLUMN public.vw_column_configs.table_order IS 'Display order in table';

-- Indexes for vw_column_configs
CREATE INDEX idx_vw_column_configs_upload_id ON public.vw_column_configs(upload_id);
CREATE INDEX idx_vw_column_configs_table_order ON public.vw_column_configs(table_order);

-- =====================================================
-- 5. Update triggers
-- =====================================================
-- Add updated_at triggers to new tables

CREATE TRIGGER set_updated_at_vw_uploads
  BEFORE UPDATE ON public.vw_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_vw_column_configs
  BEFORE UPDATE ON public.vw_column_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.vw_header_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vw_column_configs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- vw_header_mappings RLS policies
-- =====================================================

-- SELECT: Users can view header mappings for their company
CREATE POLICY "Users can view header mappings for their company"
ON public.vw_header_mappings
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create header mappings for their company
CREATE POLICY "Users can create header mappings for their company"
ON public.vw_header_mappings
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update header mappings for their company
CREATE POLICY "Users can update header mappings for their company"
ON public.vw_header_mappings
FOR UPDATE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete header mappings for their company
CREATE POLICY "Users can delete header mappings for their company"
ON public.vw_header_mappings
FOR DELETE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- =====================================================
-- vw_uploads RLS policies
-- =====================================================

-- SELECT: Users can view uploads for their company
CREATE POLICY "Users can view uploads for their company"
ON public.vw_uploads
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create uploads for their company
CREATE POLICY "Users can create uploads for their company"
ON public.vw_uploads
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- UPDATE: Users can update uploads they created
CREATE POLICY "Users can update their own uploads"
ON public.vw_uploads
FOR UPDATE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Users can delete uploads they created
CREATE POLICY "Users can delete their own uploads"
ON public.vw_uploads
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- vw_records RLS policies
-- =====================================================

-- SELECT: Users can view VW records for uploads they have access to
CREATE POLICY "Users can view vw records for accessible uploads"
ON public.vw_records
FOR SELECT
USING (
  upload_id IN (
    SELECT vu.id 
    FROM public.vw_uploads vu
    WHERE vu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert VW records for uploads they have access to
CREATE POLICY "Users can insert vw records for accessible uploads"
ON public.vw_records
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT vu.id 
    FROM public.vw_uploads vu
    WHERE vu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update VW records for uploads they created
CREATE POLICY "Users can update vw records for their uploads"
ON public.vw_records
FOR UPDATE
USING (
  upload_id IN (
    SELECT id 
    FROM public.vw_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DELETE: Users can delete VW records for uploads they created
CREATE POLICY "Users can delete vw records for their uploads"
ON public.vw_records
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.vw_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- vw_column_configs RLS policies
-- =====================================================

-- SELECT: Users can view column configs for accessible uploads
CREATE POLICY "Users can view column configs for accessible uploads"
ON public.vw_column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT vu.id 
    FROM public.vw_uploads vu
    WHERE vu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can insert column configs for accessible uploads
CREATE POLICY "Users can insert column configs for accessible uploads"
ON public.vw_column_configs
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT vu.id 
    FROM public.vw_uploads vu
    WHERE vu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update column configs for uploads they can access
CREATE POLICY "Users can update column configs for accessible uploads"
ON public.vw_column_configs
FOR UPDATE
USING (
  upload_id IN (
    SELECT vu.id 
    FROM public.vw_uploads vu
    WHERE vu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- DELETE: Users can delete column configs for uploads they created
CREATE POLICY "Users can delete column configs for their uploads"
ON public.vw_column_configs
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.vw_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);
