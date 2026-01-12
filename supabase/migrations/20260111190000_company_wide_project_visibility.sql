-- Migration: Enable company-wide project visibility for admin users
-- Created: 2026-01-11 19:00
-- Description: Updates RLS policies to allow admin users to see all projects in their company,
--              while regular users continue to see only explicitly assigned projects.

BEGIN;

-- Drop the old projects select policy
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;

-- Create new policy with company-wide visibility for admins
CREATE POLICY "projects_select_company_scope" ON public.projects
  FOR SELECT
  USING (
    -- Admins can see all projects in their company
    company_id IN (
      SELECT p.company_id 
      FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
        AND p.role = 'admin'
        AND p.company_id IS NOT NULL
    )
    OR
    -- Regular users can see projects explicitly assigned to them
    id IN (
      SELECT up.project_id
      FROM public.user_projects up
      JOIN public.profiles p ON up.user_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Add comment to document the policy
COMMENT ON POLICY "projects_select_company_scope" ON public.projects IS 
  'Admin users can view all company projects; regular users can view only assigned projects';

-- Verification notice
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed - 2026-01-11 19:00';
  RAISE NOTICE '✅ Projects RLS policy updated for company-wide admin visibility';
  RAISE NOTICE '✅ Admin users can now see all projects in their company';
  RAISE NOTICE '✅ Regular users continue to see only assigned projects';
END $$;

COMMIT;
