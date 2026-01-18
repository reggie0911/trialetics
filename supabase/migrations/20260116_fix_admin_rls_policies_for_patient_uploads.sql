-- Fix RLS policies to allow admins to insert/update/delete on patient_uploads and header_mappings
-- for any project in their company, while regular users still need user_projects assignment

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can create uploads for their projects" ON patient_uploads;
DROP POLICY IF EXISTS "Users can create header mappings for their projects" ON header_mappings;

-- Create new INSERT policy for patient_uploads that handles both admin and regular users
CREATE POLICY "Users can create uploads for their projects" ON patient_uploads
FOR INSERT
WITH CHECK (
  -- Must be the uploader
  uploaded_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  AND (
    -- Admin: can upload to any project in their company
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN projects proj ON proj.company_id = p.company_id
      WHERE p.user_id = auth.uid()
        AND p.role = 'admin'
        AND proj.id = patient_uploads.project_id
    )
    OR
    -- Regular user: must be assigned to the project
    project_id IN (
      SELECT up.project_id
      FROM user_projects up
      WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  )
);

-- Create new INSERT policy for header_mappings that handles both admin and regular users
CREATE POLICY "Users can create header mappings for their projects" ON header_mappings
FOR INSERT
WITH CHECK (
  -- Admin: can create mappings for any project in their company
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN projects proj ON proj.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
      AND proj.id = header_mappings.project_id
  )
  OR
  -- Regular user: must be assigned to the project
  project_id IN (
    SELECT up.project_id
    FROM user_projects up
    WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Also update SELECT, UPDATE, DELETE policies for header_mappings to be consistent
DROP POLICY IF EXISTS "Users can view header mappings for their projects" ON header_mappings;
DROP POLICY IF EXISTS "Users can update header mappings for their projects" ON header_mappings;
DROP POLICY IF EXISTS "Users can delete header mappings for their projects" ON header_mappings;

CREATE POLICY "Users can view header mappings for their projects" ON header_mappings
FOR SELECT
USING (
  -- Admin: can view mappings for any project in their company
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN projects proj ON proj.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
      AND proj.id = header_mappings.project_id
  )
  OR
  -- Regular user: must be assigned to the project
  project_id IN (
    SELECT up.project_id
    FROM user_projects up
    WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update header mappings for their projects" ON header_mappings
FOR UPDATE
USING (
  -- Admin: can update mappings for any project in their company
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN projects proj ON proj.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
      AND proj.id = header_mappings.project_id
  )
  OR
  -- Regular user: must be assigned to the project
  project_id IN (
    SELECT up.project_id
    FROM user_projects up
    WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete header mappings for their projects" ON header_mappings
FOR DELETE
USING (
  -- Admin: can delete mappings for any project in their company
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN projects proj ON proj.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
      AND proj.id = header_mappings.project_id
  )
  OR
  -- Regular user: must be assigned to the project
  project_id IN (
    SELECT up.project_id
    FROM user_projects up
    WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Update patient_uploads policies for consistency
DROP POLICY IF EXISTS "Users can view uploads for their projects" ON patient_uploads;
DROP POLICY IF EXISTS "Users can update their own uploads" ON patient_uploads;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON patient_uploads;

CREATE POLICY "Users can view uploads for their projects" ON patient_uploads
FOR SELECT
USING (
  -- Admin: can view uploads for any project in their company
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN projects proj ON proj.company_id = p.company_id
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
      AND proj.id = patient_uploads.project_id
  )
  OR
  -- Regular user: must be assigned to the project
  project_id IN (
    SELECT up.project_id
    FROM user_projects up
    WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own uploads" ON patient_uploads
FOR UPDATE
USING (
  uploaded_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their own uploads" ON patient_uploads
FOR DELETE
USING (
  uploaded_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Update patients table policies to match new pattern
DROP POLICY IF EXISTS "Users can view patients for accessible uploads" ON patients;
DROP POLICY IF EXISTS "Users can insert patients for accessible uploads" ON patients;
DROP POLICY IF EXISTS "Users can update patients for their uploads" ON patients;
DROP POLICY IF EXISTS "Users can delete patients for their uploads" ON patients;

CREATE POLICY "Users can view patients for accessible uploads" ON patients
FOR SELECT
USING (
  upload_id IN (
    SELECT pu.id FROM patient_uploads pu
    WHERE (
      -- Admin: can view patients for any project in their company
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects proj ON proj.company_id = p.company_id
        WHERE p.user_id = auth.uid()
          AND p.role = 'admin'
          AND proj.id = pu.project_id
      )
      OR
      -- Regular user: must be assigned to the project
      pu.project_id IN (
        SELECT up.project_id
        FROM user_projects up
        WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can insert patients for accessible uploads" ON patients
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT pu.id FROM patient_uploads pu
    WHERE (
      -- Admin: can insert patients for any project in their company
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects proj ON proj.company_id = p.company_id
        WHERE p.user_id = auth.uid()
          AND p.role = 'admin'
          AND proj.id = pu.project_id
      )
      OR
      -- Regular user: must be assigned to the project
      pu.project_id IN (
        SELECT up.project_id
        FROM user_projects up
        WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can update patients for their uploads" ON patients
FOR UPDATE
USING (
  upload_id IN (
    SELECT id FROM patient_uploads WHERE uploaded_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete patients for their uploads" ON patients
FOR DELETE
USING (
  upload_id IN (
    SELECT id FROM patient_uploads WHERE uploaded_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

-- Update column_configs table policies to match new pattern
DROP POLICY IF EXISTS "Users can view column configs for accessible uploads" ON column_configs;
DROP POLICY IF EXISTS "Users can insert column configs for accessible uploads" ON column_configs;
DROP POLICY IF EXISTS "Users can update column configs for accessible uploads" ON column_configs;
DROP POLICY IF EXISTS "Users can delete column configs for their uploads" ON column_configs;

CREATE POLICY "Users can view column configs for accessible uploads" ON column_configs
FOR SELECT
USING (
  upload_id IN (
    SELECT pu.id FROM patient_uploads pu
    WHERE (
      -- Admin: can view configs for any project in their company
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects proj ON proj.company_id = p.company_id
        WHERE p.user_id = auth.uid()
          AND p.role = 'admin'
          AND proj.id = pu.project_id
      )
      OR
      -- Regular user: must be assigned to the project
      pu.project_id IN (
        SELECT up.project_id
        FROM user_projects up
        WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can insert column configs for accessible uploads" ON column_configs
FOR INSERT
WITH CHECK (
  upload_id IN (
    SELECT pu.id FROM patient_uploads pu
    WHERE (
      -- Admin: can insert configs for any project in their company
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects proj ON proj.company_id = p.company_id
        WHERE p.user_id = auth.uid()
          AND p.role = 'admin'
          AND proj.id = pu.project_id
      )
      OR
      -- Regular user: must be assigned to the project
      pu.project_id IN (
        SELECT up.project_id
        FROM user_projects up
        WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can update column configs for accessible uploads" ON column_configs
FOR UPDATE
USING (
  upload_id IN (
    SELECT pu.id FROM patient_uploads pu
    WHERE (
      -- Admin: can update configs for any project in their company
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN projects proj ON proj.company_id = p.company_id
        WHERE p.user_id = auth.uid()
          AND p.role = 'admin'
          AND proj.id = pu.project_id
      )
      OR
      -- Regular user: must be assigned to the project
      pu.project_id IN (
        SELECT up.project_id
        FROM user_projects up
        WHERE up.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Users can delete column configs for their uploads" ON column_configs
FOR DELETE
USING (
  upload_id IN (
    SELECT id FROM patient_uploads WHERE uploaded_by = (SELECT id FROM profiles WHERE user_id = auth.uid())
  )
);

