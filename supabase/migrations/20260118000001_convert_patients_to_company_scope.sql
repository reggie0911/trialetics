-- =====================================================
-- Convert Patient Data Tracker from Project-Scoped to Company-Scoped
-- =====================================================
-- This migration converts the patient tracker tables from project-based
-- to company-based scoping, matching the AE Metrics architecture.
--
-- WARNING: This is a breaking change that affects data access patterns.
-- All users in a company will now see all patient data for that company.

-- =====================================================
-- Step 1: Drop existing RLS policies
-- =====================================================

-- Drop patient_uploads policies
DROP POLICY IF EXISTS "Users can view uploads for their projects" ON public.patient_uploads;
DROP POLICY IF EXISTS "Users can create uploads for their projects" ON public.patient_uploads;
DROP POLICY IF EXISTS "Users can update their own uploads" ON public.patient_uploads;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON public.patient_uploads;
DROP POLICY IF EXISTS "Users can view uploads for their company" ON public.patient_uploads;
DROP POLICY IF EXISTS "Users can create uploads for their company" ON public.patient_uploads;

-- Drop patients policies
DROP POLICY IF EXISTS "Users can view patients for accessible uploads" ON public.patients;
DROP POLICY IF EXISTS "Users can insert patients for accessible uploads" ON public.patients;
DROP POLICY IF EXISTS "Users can update patients for their uploads" ON public.patients;
DROP POLICY IF EXISTS "Users can delete patients for their uploads" ON public.patients;

-- Drop column_configs policies
DROP POLICY IF EXISTS "Users can view column configs for accessible uploads" ON public.column_configs;
DROP POLICY IF EXISTS "Users can insert column configs for accessible uploads" ON public.column_configs;
DROP POLICY IF EXISTS "Users can update column configs for accessible uploads" ON public.column_configs;
DROP POLICY IF EXISTS "Users can delete column configs for their uploads" ON public.column_configs;

-- Drop header_mappings policies
DROP POLICY IF EXISTS "Users can view header mappings for their projects" ON public.header_mappings;
DROP POLICY IF EXISTS "Users can create header mappings for their projects" ON public.header_mappings;
DROP POLICY IF EXISTS "Users can update header mappings for their projects" ON public.header_mappings;
DROP POLICY IF EXISTS "Users can delete header mappings for their projects" ON public.header_mappings;
DROP POLICY IF EXISTS "Users can view header mappings for their company" ON public.header_mappings;
DROP POLICY IF EXISTS "Users can create header mappings for their company" ON public.header_mappings;
DROP POLICY IF EXISTS "Users can update header mappings for their company" ON public.header_mappings;
DROP POLICY IF EXISTS "Users can delete header mappings for their company" ON public.header_mappings;

-- =====================================================
-- Step 2: Alter table schemas
-- =====================================================

-- Migrate patient_uploads: project_id → company_id
-- First, add company_id column (nullable temporarily)
DO $$ 
BEGIN
  -- Only add company_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patient_uploads' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.patient_uploads ADD COLUMN company_id UUID;
  END IF;
END $$;

-- Populate company_id from project's company (only if project_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patient_uploads' 
    AND column_name = 'project_id'
  ) THEN
    UPDATE public.patient_uploads pu
    SET company_id = p.company_id
    FROM public.projects p
    WHERE pu.project_id = p.id AND pu.company_id IS NULL;
  END IF;
END $$;

-- Make company_id NOT NULL and add foreign key
ALTER TABLE public.patient_uploads 
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_patient_uploads_company'
  ) THEN
    ALTER TABLE public.patient_uploads
    ADD CONSTRAINT fk_patient_uploads_company 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop project_id column and its constraints (only if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'patient_uploads' 
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.patient_uploads DROP CONSTRAINT IF EXISTS patient_uploads_project_id_fkey;
    ALTER TABLE public.patient_uploads DROP COLUMN project_id;
  END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_patient_uploads_project_id;
CREATE INDEX IF NOT EXISTS idx_patient_uploads_company_id ON public.patient_uploads(company_id);

-- Update comments
COMMENT ON COLUMN public.patient_uploads.company_id IS 'Company this upload belongs to';

-- Migrate header_mappings: project_id → company_id
-- First, add company_id column (nullable temporarily)
DO $$ 
BEGIN
  -- Only add company_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'header_mappings' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.header_mappings ADD COLUMN company_id UUID;
  END IF;
END $$;

-- Populate company_id from project's company (only if project_id column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'header_mappings' 
    AND column_name = 'project_id'
  ) THEN
    UPDATE public.header_mappings hm
    SET company_id = p.company_id
    FROM public.projects p
    WHERE hm.project_id = p.id AND hm.company_id IS NULL;
  END IF;
END $$;

-- Make company_id NOT NULL and add foreign key
ALTER TABLE public.header_mappings 
ALTER COLUMN company_id SET NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_header_mappings_company'
  ) THEN
    ALTER TABLE public.header_mappings
    ADD CONSTRAINT fk_header_mappings_company 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop project_id column and its constraints (only if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'header_mappings' 
    AND column_name = 'project_id'
  ) THEN
    -- Drop old unique constraint
    ALTER TABLE public.header_mappings DROP CONSTRAINT IF EXISTS header_mappings_project_id_original_header_key;
    ALTER TABLE public.header_mappings DROP CONSTRAINT IF EXISTS header_mappings_project_id_fkey;
    ALTER TABLE public.header_mappings DROP COLUMN project_id;
  END IF;
END $$;

-- Add new unique constraint for company_id + original_header
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'header_mappings_company_id_original_header_key'
  ) THEN
    ALTER TABLE public.header_mappings
    ADD CONSTRAINT header_mappings_company_id_original_header_key 
    UNIQUE(company_id, original_header);
  END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_header_mappings_project_id;
CREATE INDEX IF NOT EXISTS idx_header_mappings_company_id ON public.header_mappings(company_id);

-- =====================================================
-- Step 3: Create new company-scoped RLS policies
-- =====================================================

-- =====================================================
-- patient_uploads RLS policies (company-scoped)
-- =====================================================

-- SELECT: Users can view uploads for their company
CREATE POLICY "Users can view uploads for their company"
ON public.patient_uploads
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create uploads for their company
CREATE POLICY "Users can create uploads for their company"
ON public.patient_uploads
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
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
-- patients RLS policies (company-scoped)
-- =====================================================

-- SELECT: Users can view patients for uploads they have access to
CREATE POLICY "Users can view patients for accessible uploads"
ON public.patients
FOR SELECT
USING (
  upload_id IN (
    SELECT pu.id 
    FROM public.patient_uploads pu
    WHERE pu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
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
    WHERE pu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
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
-- column_configs RLS policies (company-scoped)
-- =====================================================

-- SELECT: Users can view column configs for accessible uploads
CREATE POLICY "Users can view column configs for accessible uploads"
ON public.column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT pu.id 
    FROM public.patient_uploads pu
    WHERE pu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
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
    WHERE pu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
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
    WHERE pu.company_id = (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
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
-- header_mappings RLS policies (company-scoped)
-- =====================================================

-- SELECT: Users can view header mappings for their company
CREATE POLICY "Users can view header mappings for their company"
ON public.header_mappings
FOR SELECT
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- INSERT: Users can create header mappings for their company
CREATE POLICY "Users can create header mappings for their company"
ON public.header_mappings
FOR INSERT
WITH CHECK (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- UPDATE: Users can update header mappings for their company
CREATE POLICY "Users can update header mappings for their company"
ON public.header_mappings
FOR UPDATE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- DELETE: Users can delete header mappings for their company
CREATE POLICY "Users can delete header mappings for their company"
ON public.header_mappings
FOR DELETE
USING (
  company_id = (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  )
);
