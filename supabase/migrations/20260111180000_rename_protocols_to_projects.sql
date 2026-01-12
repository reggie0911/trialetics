-- Rename protocols to projects and add creator tracking
-- This migration renames tables and adds creator fields to all tables
-- Date: 2026-01-11 18:00

-- ============================================================================
-- PHASE 1: Drop dependent objects
-- ============================================================================

-- Drop all RLS policies on protocols table
DROP POLICY IF EXISTS "protocols_select_policy" ON public.protocols;
DROP POLICY IF EXISTS "protocols_insert_policy" ON public.protocols;
DROP POLICY IF EXISTS "protocols_update_policy" ON public.protocols;
DROP POLICY IF EXISTS "protocols_delete_policy" ON public.protocols;

-- Drop all RLS policies on user_protocols table
DROP POLICY IF EXISTS "user_protocols_select_simple" ON public.user_protocols;
DROP POLICY IF EXISTS "user_protocols_insert_simple" ON public.user_protocols;
DROP POLICY IF EXISTS "user_protocols_insert_others" ON public.user_protocols;
DROP POLICY IF EXISTS "user_protocols_update_simple" ON public.user_protocols;
DROP POLICY IF EXISTS "user_protocols_delete_simple" ON public.user_protocols;

-- Drop the protocol_assignments view
DROP VIEW IF EXISTS public.protocol_assignments;

-- ============================================================================
-- PHASE 2: Rename tables
-- ============================================================================

-- Rename protocols table to projects
ALTER TABLE public.protocols RENAME TO projects;

-- Rename user_protocols table to user_projects
ALTER TABLE public.user_protocols RENAME TO user_projects;

-- ============================================================================
-- PHASE 3: Rename columns
-- ============================================================================

-- Rename protocol_id to project_id in user_projects table
ALTER TABLE public.user_projects RENAME COLUMN protocol_id TO project_id;

-- ============================================================================
-- PHASE 4: Add creator tracking fields to all tables
-- ============================================================================

-- Add creator fields to companies table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- Add foreign key constraint for companies
ALTER TABLE public.companies
  ADD CONSTRAINT fk_companies_created_by 
  FOREIGN KEY (created_by_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- Add creator fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- Add foreign key constraint for profiles
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_created_by 
  FOREIGN KEY (created_by_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- Add creator fields to projects table (formerly protocols)
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- Add foreign key constraint for projects
ALTER TABLE public.projects
  ADD CONSTRAINT fk_projects_created_by 
  FOREIGN KEY (created_by_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- Add creator fields to modules table
ALTER TABLE public.modules 
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- Add foreign key constraint for modules
ALTER TABLE public.modules
  ADD CONSTRAINT fk_modules_created_by 
  FOREIGN KEY (created_by_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- Add creator fields to user_projects table (formerly user_protocols)
ALTER TABLE public.user_projects 
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- Add foreign key constraint for user_projects
ALTER TABLE public.user_projects
  ADD CONSTRAINT fk_user_projects_created_by 
  FOREIGN KEY (created_by_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- Add creator fields to user_modules table
ALTER TABLE public.user_modules 
  ADD COLUMN IF NOT EXISTS created_by_id UUID,
  ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- Add foreign key constraint for user_modules
ALTER TABLE public.user_modules
  ADD CONSTRAINT fk_user_modules_created_by 
  FOREIGN KEY (created_by_id) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- ============================================================================
-- PHASE 5: Create indexes on creator fields
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by_id);
CREATE INDEX IF NOT EXISTS idx_modules_created_by ON public.modules(created_by_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_created_by ON public.user_projects(created_by_id);
CREATE INDEX IF NOT EXISTS idx_user_modules_created_by ON public.user_modules(created_by_id);

-- ============================================================================
-- PHASE 6: Rename existing indexes
-- ============================================================================

-- Rename indexes on projects table (formerly protocols)
ALTER INDEX IF EXISTS idx_protocols_company_id RENAME TO idx_projects_company_id;
ALTER INDEX IF EXISTS idx_protocols_status RENAME TO idx_projects_status;
ALTER INDEX IF EXISTS idx_protocols_trial_phase RENAME TO idx_projects_trial_phase;
ALTER INDEX IF EXISTS idx_protocols_created_at RENAME TO idx_projects_created_at;

-- Rename indexes on user_projects table (formerly user_protocols)
ALTER INDEX IF EXISTS idx_user_protocols_user_id RENAME TO idx_user_projects_user_id;
ALTER INDEX IF EXISTS idx_user_protocols_protocol_id RENAME TO idx_user_projects_project_id;
ALTER INDEX IF EXISTS idx_user_protocols_assigned_at RENAME TO idx_user_projects_assigned_at;

-- ============================================================================
-- PHASE 7: Recreate the project_assignments view
-- ============================================================================

CREATE OR REPLACE VIEW public.project_assignments AS
SELECT 
  p.id as project_id,
  p.protocol_number,
  p.protocol_name,
  p.protocol_status,
  p.trial_phase,
  p.company_id,
  c.name as company_name,
  prof.id as profile_id,
  prof.user_id,
  prof.email,
  prof.first_name,
  prof.last_name,
  prof.role,
  up.assigned_at
FROM public.projects p
JOIN public.companies c ON c.id = p.company_id
JOIN public.user_projects up ON up.project_id = p.id
JOIN public.profiles prof ON prof.id = up.user_id;

COMMENT ON VIEW public.project_assignments IS 'Convenient view showing all project assignments with user and company details';

-- ============================================================================
-- PHASE 8: Recreate RLS policies for projects table
-- ============================================================================

-- Enable RLS on projects (should already be enabled, but ensuring)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Users can view projects assigned to them or in their company
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT
  USING (
    -- Project is assigned to the user
    id IN (
      SELECT project_id 
      FROM public.user_projects 
      WHERE user_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
    OR
    -- Project belongs to user's company
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can create projects for their company
CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Company users can update their company's projects
CREATE POLICY "projects_update_policy" ON public.projects
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Admins can delete projects
CREATE POLICY "projects_delete_policy" ON public.projects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
      AND company_id = projects.company_id
    )
  );

-- ============================================================================
-- PHASE 9: Recreate RLS policies for user_projects table
-- ============================================================================

-- Enable RLS on user_projects (should already be enabled, but ensuring)
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- Users can see assignments if they ARE the user or share a company with the assigned user
CREATE POLICY "user_projects_select_simple" ON public.user_projects
  FOR SELECT
  USING (
    -- Check if this is the current user's profile ID
    user_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    -- Check if the assigned user shares a company with current user
    user_id IN (
      SELECT p2.id 
      FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
      AND p1.company_id IS NOT NULL
    )
  );

-- User can only assign to their own profile (critical policy for project creation)
CREATE POLICY "user_projects_insert_simple" ON public.user_projects
  FOR INSERT
  WITH CHECK (
    -- User can only assign to their own profile
    user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND
    -- Project must belong to user's company
    project_id IN (
      SELECT prot.id 
      FROM public.projects prot
      JOIN public.profiles prof ON prof.company_id = prot.company_id
      WHERE prof.user_id = auth.uid()
    )
  );

-- Users can assign projects to others in same company (admin/company users)
CREATE POLICY "user_projects_insert_others" ON public.user_projects
  FOR INSERT
  WITH CHECK (
    -- Target user must be in the same company as current user
    user_id IN (
      SELECT p2.id 
      FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
      AND p1.company_id IS NOT NULL
    )
    AND
    -- Project must belong to the same company
    project_id IN (
      SELECT prot.id 
      FROM public.projects prot
      JOIN public.profiles prof ON prof.company_id = prot.company_id
      WHERE prof.user_id = auth.uid()
    )
  );

-- Only admins can update project assignments
CREATE POLICY "user_projects_update_simple" ON public.user_projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
      AND p1.role = 'admin'
      AND p2.id = user_projects.user_id
      AND p1.company_id IS NOT NULL
    )
  );

-- Users can delete their own assignments; admins can delete any company assignments
CREATE POLICY "user_projects_delete_simple" ON public.user_projects
  FOR DELETE
  USING (
    -- User can delete their own assignments
    user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    OR
    -- Admins can delete any assignment in their company
    EXISTS (
      SELECT 1 
      FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
      AND p1.role = 'admin'
      AND p2.id = user_projects.user_id
      AND p1.company_id IS NOT NULL
    )
  );

-- ============================================================================
-- PHASE 10: Update trigger name
-- ============================================================================

-- Drop old trigger
DROP TRIGGER IF EXISTS update_user_protocols_updated_at ON public.user_projects;

-- Create new trigger with updated name
CREATE TRIGGER update_user_projects_updated_at 
  BEFORE UPDATE ON public.user_projects
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PHASE 11: Update handle_new_user function to set creator fields
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_company_id UUID;
  new_profile_id UUID;
BEGIN
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  
  -- Create a new company for the user
  BEGIN
    INSERT INTO public.companies (name, settings)
    VALUES (
      COALESCE(NEW.email, 'User') || ' Organization',
      '{}'::jsonb
    )
    RETURNING id INTO new_company_id;
    
    RAISE NOTICE 'Created company with id: % for user: %', new_company_id, NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create company for user %: %', NEW.id, SQLERRM;
      RAISE;
  END;

  -- Create profile with company_id, email, and set role as admin
  -- Also set created_by_id and creator_email to null for initial signup
  BEGIN
    INSERT INTO public.profiles (
      user_id, 
      email, 
      company_id, 
      role,
      created_by_id,
      creator_email
    )
    VALUES (
      NEW.id,
      NEW.email,
      new_company_id,
      'admin',
      NULL,  -- Self-created on signup
      NEW.email  -- Set creator email to self
    )
    RETURNING id INTO new_profile_id;
    
    RAISE NOTICE 'Created profile with id: % for user: %', new_profile_id, NEW.id;
    
    -- Update the company to set the creator as the profile we just created
    UPDATE public.companies
    SET created_by_id = new_profile_id,
        creator_email = NEW.email
    WHERE id = new_company_id;
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE WARNING 'Profile already exists for user %', NEW.id;
    WHEN foreign_key_violation THEN
      RAISE WARNING 'Foreign key violation when creating profile for user %: %', NEW.id, SQLERRM;
      RAISE;
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
      RAISE;
  END;
  
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PHASE 12: Update table and column comments
-- ============================================================================

COMMENT ON TABLE public.projects IS 'Clinical trial projects owned by companies (formerly protocols)';
COMMENT ON TABLE public.user_projects IS 'Junction table assigning users to projects (formerly user_protocols)';

COMMENT ON COLUMN public.projects.company_id IS 'Foreign key to companies table - projects belong to companies';
COMMENT ON COLUMN public.user_projects.user_id IS 'Foreign key to profiles table (not auth.users)';
COMMENT ON COLUMN public.user_projects.project_id IS 'Foreign key to projects table';

-- Add comments for creator fields
COMMENT ON COLUMN public.companies.created_by_id IS 'Profile ID of the user who created this company';
COMMENT ON COLUMN public.companies.creator_email IS 'Email of the user who created this company';
COMMENT ON COLUMN public.profiles.created_by_id IS 'Profile ID of the user who created this profile';
COMMENT ON COLUMN public.profiles.creator_email IS 'Email of the user who created this profile';
COMMENT ON COLUMN public.projects.created_by_id IS 'Profile ID of the user who created this project';
COMMENT ON COLUMN public.projects.creator_email IS 'Email of the user who created this project';
COMMENT ON COLUMN public.modules.created_by_id IS 'Profile ID of the user who created this module';
COMMENT ON COLUMN public.modules.creator_email IS 'Email of the user who created this module';
COMMENT ON COLUMN public.user_projects.created_by_id IS 'Profile ID of the user who created this assignment';
COMMENT ON COLUMN public.user_projects.creator_email IS 'Email of the user who created this assignment';
COMMENT ON COLUMN public.user_modules.created_by_id IS 'Profile ID of the user who created this grant';
COMMENT ON COLUMN public.user_modules.creator_email IS 'Email of the user who created this grant';

-- Update policy comments
COMMENT ON POLICY "projects_select_policy" ON public.projects IS 
  'Users can view projects assigned to them or in their company';

COMMENT ON POLICY "projects_insert_policy" ON public.projects IS 
  'Authenticated users can create projects for their company';

COMMENT ON POLICY "projects_update_policy" ON public.projects IS 
  'Company users can update their company projects';

COMMENT ON POLICY "projects_delete_policy" ON public.projects IS 
  'Only admins can delete projects';

COMMENT ON POLICY "user_projects_select_simple" ON public.user_projects IS 
  'Users can view their own project assignments and assignments within their company';

COMMENT ON POLICY "user_projects_insert_simple" ON public.user_projects IS 
  'Users can assign company projects to themselves - Primary policy for project creation';

COMMENT ON POLICY "user_projects_insert_others" ON public.user_projects IS 
  'Users can assign company projects to other users in their company';

COMMENT ON POLICY "user_projects_update_simple" ON public.user_projects IS 
  'Only admins can update project assignments';

COMMENT ON POLICY "user_projects_delete_simple" ON public.user_projects IS 
  'Users can delete their own assignments, admins can delete any company assignments';

-- ============================================================================
-- PHASE 13: Verify schema integrity
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Check that projects table exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'projects';
  
  IF table_count = 0 THEN
    RAISE EXCEPTION 'projects table does not exist after migration';
  END IF;
  
  -- Check that user_projects table exists
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'user_projects';
  
  IF table_count = 0 THEN
    RAISE EXCEPTION 'user_projects table does not exist after migration';
  END IF;
  
  -- Check RLS policies on projects
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'projects';
  
  RAISE NOTICE 'projects table has % RLS policies', policy_count;
  
  -- Check RLS policies on user_projects
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_projects';
  
  RAISE NOTICE 'user_projects table has % RLS policies', policy_count;
  
  RAISE NOTICE '✅ Migration completed successfully - 2026-01-11 18:00';
  RAISE NOTICE '✅ Tables renamed: protocols → projects, user_protocols → user_projects';
  RAISE NOTICE '✅ Column renamed: protocol_id → project_id in user_projects';
  RAISE NOTICE '✅ Creator tracking fields added to all tables';
  RAISE NOTICE '✅ All RLS policies recreated';
END $$;
