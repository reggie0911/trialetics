-- =====================================================
-- Patient Data Tracker Schema
-- =====================================================
-- This migration creates tables for storing patient data uploads,
-- patient records, column configurations, and header mappings.
-- All tables are project-scoped for multi-trial support.

-- =====================================================
-- 1. patient_uploads table
-- =====================================================
-- Tracks CSV uploads for patient data with metadata

CREATE TABLE IF NOT EXISTS public.patient_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  column_count INTEGER NOT NULL CHECK (column_count >= 0),
  filter_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.patient_uploads IS 'Tracks patient data CSV uploads with metadata';
COMMENT ON COLUMN public.patient_uploads.project_id IS 'Project (clinical trial) this upload belongs to';
COMMENT ON COLUMN public.patient_uploads.uploaded_by IS 'Profile ID of user who uploaded the data';
COMMENT ON COLUMN public.patient_uploads.filter_preferences IS 'Saved filter state for this upload (globalSearch, columnFilters, etc)';

-- Indexes for patient_uploads
CREATE INDEX idx_patient_uploads_project_id ON public.patient_uploads(project_id);
CREATE INDEX idx_patient_uploads_uploaded_by ON public.patient_uploads(uploaded_by);
CREATE INDEX idx_patient_uploads_created_at ON public.patient_uploads(created_at DESC);

-- =====================================================
-- 2. patients table
-- =====================================================
-- Stores individual patient records with normalized common fields
-- and JSONB columns for dynamic/categorized data

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.patient_uploads(id) ON DELETE CASCADE,
  
  -- Frequently queried normalized fields
  subject_id TEXT,
  sex TEXT,
  age TEXT,
  site_name TEXT,
  
  -- Categorized JSONB columns for dynamic data
  demographics JSONB DEFAULT '{}'::jsonb,
  visits JSONB DEFAULT '{}'::jsonb,
  measurements JSONB DEFAULT '{}'::jsonb,
  adverse_events JSONB DEFAULT '{}'::jsonb,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.patients IS 'Individual patient records with normalized common fields and JSONB for dynamic data';
COMMENT ON COLUMN public.patients.demographics IS 'Demographics data (BMI, BSA, etc)';
COMMENT ON COLUMN public.patients.visits IS 'Visit information and dates';
COMMENT ON COLUMN public.patients.measurements IS 'Clinical measurements (LVEF, LVEDV, gradients, etc)';
COMMENT ON COLUMN public.patients.adverse_events IS 'Adverse events data';
COMMENT ON COLUMN public.patients.extra_fields IS 'Any other fields not categorized';

-- Indexes for patients
CREATE INDEX idx_patients_upload_id ON public.patients(upload_id);
CREATE INDEX idx_patients_subject_id ON public.patients(subject_id);
CREATE INDEX idx_patients_site_name ON public.patients(site_name);

-- JSONB GIN indexes for fast queries on JSONB columns
CREATE INDEX idx_patients_demographics_gin ON public.patients USING GIN(demographics);
CREATE INDEX idx_patients_visits_gin ON public.patients USING GIN(visits);
CREATE INDEX idx_patients_measurements_gin ON public.patients USING GIN(measurements);
CREATE INDEX idx_patients_adverse_events_gin ON public.patients USING GIN(adverse_events);

-- =====================================================
-- 3. column_configs table
-- =====================================================
-- Stores column configurations (visibility, labels, order) per upload

CREATE TABLE IF NOT EXISTS public.column_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.patient_uploads(id) ON DELETE CASCADE,
  column_id TEXT NOT NULL,
  label TEXT NOT NULL,
  original_label TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  data_type TEXT NOT NULL CHECK (data_type IN ('text', 'number', 'date', 'categorical')),
  category TEXT CHECK (category IN ('demographics', 'visits', 'measurements', 'adverse_events', 'other')),
  visit_group TEXT,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(upload_id, column_id)
);

COMMENT ON TABLE public.column_configs IS 'Column configurations (visibility, labels, order) for each upload';
COMMENT ON COLUMN public.column_configs.column_id IS 'Original column identifier from CSV';
COMMENT ON COLUMN public.column_configs.label IS 'User-customized display label';
COMMENT ON COLUMN public.column_configs.visit_group IS 'Visit group for multi-level headers';
COMMENT ON COLUMN public.column_configs.table_order IS 'Display order in table';

-- Indexes for column_configs
CREATE INDEX idx_column_configs_upload_id ON public.column_configs(upload_id);
CREATE INDEX idx_column_configs_table_order ON public.column_configs(table_order);

-- =====================================================
-- 4. header_mappings table
-- =====================================================
-- Stores reusable header mappings at project level

CREATE TABLE IF NOT EXISTS public.header_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  original_header TEXT NOT NULL,
  customized_header TEXT NOT NULL,
  visit_group TEXT,
  table_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(project_id, original_header)
);

COMMENT ON TABLE public.header_mappings IS 'Reusable header mappings at project level for consistent column naming';
COMMENT ON COLUMN public.header_mappings.original_header IS 'Original column name from CSV';
COMMENT ON COLUMN public.header_mappings.customized_header IS 'Customized display name';
COMMENT ON COLUMN public.header_mappings.visit_group IS 'Visit group for multi-level headers';

-- Indexes for header_mappings
CREATE INDEX idx_header_mappings_project_id ON public.header_mappings(project_id);
CREATE INDEX idx_header_mappings_table_order ON public.header_mappings(table_order);

-- =====================================================
-- 5. Update triggers
-- =====================================================
-- Add updated_at triggers to new tables

CREATE TRIGGER set_updated_at_patient_uploads
  BEFORE UPDATE ON public.patient_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_column_configs
  BEFORE UPDATE ON public.column_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_header_mappings
  BEFORE UPDATE ON public.header_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.patient_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.column_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.header_mappings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- patient_uploads RLS policies
-- =====================================================

-- SELECT: Users can view uploads for projects they're assigned to
CREATE POLICY "Users can view uploads for their projects"
ON public.patient_uploads
FOR SELECT
USING (
  project_id IN (
    SELECT up.project_id 
    FROM public.user_projects up
    WHERE up.user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can create uploads for projects they're assigned to
CREATE POLICY "Users can create uploads for their projects"
ON public.patient_uploads
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT up.project_id 
    FROM public.user_projects up
    WHERE up.user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
  AND uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- UPDATE: Users can update uploads they created
CREATE POLICY "Users can update their own uploads"
ON public.patient_uploads
FOR UPDATE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- DELETE: Users can delete uploads they created
CREATE POLICY "Users can delete their own uploads"
ON public.patient_uploads
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- patients RLS policies
-- =====================================================

-- SELECT: Users can view patients for uploads they have access to
CREATE POLICY "Users can view patients for accessible uploads"
ON public.patients
FOR SELECT
USING (
  upload_id IN (
    SELECT pu.id 
    FROM public.patient_uploads pu
    WHERE pu.project_id IN (
      SELECT up.project_id 
      FROM public.user_projects up
      WHERE up.user_id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- INSERT: Users can insert patients for uploads they have access to
CREATE POLICY "Users can insert patients for accessible uploads"
ON public.patients
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT pu.id 
    FROM public.patient_uploads pu
    WHERE pu.project_id IN (
      SELECT up.project_id 
      FROM public.user_projects up
      WHERE up.user_id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- UPDATE: Users can update patients for uploads they created
CREATE POLICY "Users can update patients for their uploads"
ON public.patients
FOR UPDATE
USING (
  upload_id IN (
    SELECT id 
    FROM public.patient_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- DELETE: Users can delete patients for uploads they created
CREATE POLICY "Users can delete patients for their uploads"
ON public.patients
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.patient_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- column_configs RLS policies
-- =====================================================

-- SELECT: Users can view column configs for accessible uploads
CREATE POLICY "Users can view column configs for accessible uploads"
ON public.column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT pu.id 
    FROM public.patient_uploads pu
    WHERE pu.project_id IN (
      SELECT up.project_id 
      FROM public.user_projects up
      WHERE up.user_id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- INSERT: Users can insert column configs for accessible uploads
CREATE POLICY "Users can insert column configs for accessible uploads"
ON public.column_configs
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT pu.id 
    FROM public.patient_uploads pu
    WHERE pu.project_id IN (
      SELECT up.project_id 
      FROM public.user_projects up
      WHERE up.user_id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- UPDATE: Users can update column configs for uploads they can access
CREATE POLICY "Users can update column configs for accessible uploads"
ON public.column_configs
FOR UPDATE
USING (
  upload_id IN (
    SELECT pu.id 
    FROM public.patient_uploads pu
    WHERE pu.project_id IN (
      SELECT up.project_id 
      FROM public.user_projects up
      WHERE up.user_id = (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
);

-- DELETE: Users can delete column configs for uploads they created
CREATE POLICY "Users can delete column configs for their uploads"
ON public.column_configs
FOR DELETE
USING (
  upload_id IN (
    SELECT id 
    FROM public.patient_uploads
    WHERE uploaded_by = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- =====================================================
-- header_mappings RLS policies
-- =====================================================

-- SELECT: Users can view header mappings for projects they're assigned to
CREATE POLICY "Users can view header mappings for their projects"
ON public.header_mappings
FOR SELECT
USING (
  project_id IN (
    SELECT up.project_id 
    FROM public.user_projects up
    WHERE up.user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- INSERT: Users can create header mappings for projects they're assigned to
CREATE POLICY "Users can create header mappings for their projects"
ON public.header_mappings
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT up.project_id 
    FROM public.user_projects up
    WHERE up.user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- UPDATE: Users can update header mappings for projects they're assigned to
CREATE POLICY "Users can update header mappings for their projects"
ON public.header_mappings
FOR UPDATE
USING (
  project_id IN (
    SELECT up.project_id 
    FROM public.user_projects up
    WHERE up.user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- DELETE: Users can delete header mappings for projects they're assigned to
CREATE POLICY "Users can delete header mappings for their projects"
ON public.header_mappings
FOR DELETE
USING (
  project_id IN (
    SELECT up.project_id 
    FROM public.user_projects up
    WHERE up.user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);
