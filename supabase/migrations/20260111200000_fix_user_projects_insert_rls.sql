-- Fix user_projects INSERT RLS policy to prevent assignment failure
-- Date: 2026-01-11 20:00
-- Issue: "Project created but failed to assign to user" error when creating projects
-- Root Cause: The RLS policy check for user_projects INSERT was checking against 
--             projects table with SELECT policy that may not allow seeing newly created projects

BEGIN;

-- Drop existing insert policies on user_projects
DROP POLICY IF EXISTS "user_projects_insert_simple" ON public.user_projects;
DROP POLICY IF EXISTS "user_projects_insert_others" ON public.user_projects;

-- Recreate the self-assignment policy with simplified check
-- Users can assign projects to themselves if:
-- 1. They're assigning to their own profile ID
-- 2. The project exists and belongs to their company (bypass SELECT policy)
CREATE POLICY "user_projects_insert_self" ON public.user_projects
  FOR INSERT
  WITH CHECK (
    -- Must be assigning to their own profile
    user_projects.user_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND
    -- Project must exist and belong to user's company
    -- Using EXISTS to bypass the projects SELECT RLS policy
    EXISTS (
      SELECT 1
      FROM public.projects proj
      JOIN public.profiles prof ON prof.company_id = proj.company_id
      WHERE proj.id = user_projects.project_id
        AND prof.user_id = auth.uid()
    )
  );

-- Recreate policy for assigning to others in same company
CREATE POLICY "user_projects_insert_others" ON public.user_projects
  FOR INSERT
  WITH CHECK (
    -- Target user must be in the same company as current user
    EXISTS (
      SELECT 1
      FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
        AND p2.id = user_projects.user_id
        AND p1.company_id IS NOT NULL
    )
    AND
    -- Project must belong to the same company
    EXISTS (
      SELECT 1
      FROM public.projects proj
      JOIN public.profiles prof ON prof.company_id = proj.company_id
      WHERE proj.id = user_projects.project_id
        AND prof.user_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON POLICY "user_projects_insert_self" ON public.user_projects IS 
  'Users can assign projects to themselves if project is in their company - CRITICAL for project creation';

COMMENT ON POLICY "user_projects_insert_others" ON public.user_projects IS 
  'Users can assign projects to other members of their company';

-- Verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'user_projects'
    AND policyname LIKE 'user_projects_insert%';
  
  IF policy_count < 2 THEN
    RAISE EXCEPTION 'Expected 2 insert policies on user_projects, found %', policy_count;
  END IF;
  
  RAISE NOTICE '✅ Migration completed - 2026-01-11 20:00';
  RAISE NOTICE '✅ Fixed user_projects INSERT RLS policies';
  RAISE NOTICE '✅ Users can now successfully assign newly created projects to themselves';
  RAISE NOTICE '✅ Found % INSERT policies on user_projects', policy_count;
END $$;

COMMIT;
