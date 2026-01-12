-- Fix infinite recursion in user_protocols RLS policies
-- The issue: SELECT policy was checking user_protocols while trying to access user_protocols
-- Solution: Simplify policies to avoid self-referencing

-- Step 1: Drop all existing policies on user_protocols
DROP POLICY IF EXISTS "user_protocols_select_policy" ON public.user_protocols;
DROP POLICY IF EXISTS "user_protocols_insert_self" ON public.user_protocols;
DROP POLICY IF EXISTS "user_protocols_insert_company" ON public.user_protocols;
DROP POLICY IF EXISTS "user_protocols_update_policy" ON public.user_protocols;
DROP POLICY IF EXISTS "user_protocols_delete_policy" ON public.user_protocols;

-- Step 2: Create non-recursive SELECT policy
-- Users can see assignments if they ARE the user or share a company with the assigned user
CREATE POLICY "user_protocols_select_simple" ON public.user_protocols
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

-- Step 3: Create simplified INSERT policy for self-assignment
-- This is the critical policy that allows protocol creation to work
CREATE POLICY "user_protocols_insert_simple" ON public.user_protocols
  FOR INSERT
  WITH CHECK (
    -- User can only assign to their own profile
    user_id = (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND
    -- Protocol must belong to user's company
    protocol_id IN (
      SELECT prot.id 
      FROM public.protocols prot
      JOIN public.profiles prof ON prof.company_id = prot.company_id
      WHERE prof.user_id = auth.uid()
    )
  );

-- Step 4: Create INSERT policy for assigning to others (admin/company users)
CREATE POLICY "user_protocols_insert_others" ON public.user_protocols
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
    -- Protocol must belong to the same company
    protocol_id IN (
      SELECT prot.id 
      FROM public.protocols prot
      JOIN public.profiles prof ON prof.company_id = prot.company_id
      WHERE prof.user_id = auth.uid()
    )
  );

-- Step 5: Create UPDATE policy (admin only)
CREATE POLICY "user_protocols_update_simple" ON public.user_protocols
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
      AND p1.role = 'admin'
      AND p2.id = user_protocols.user_id
      AND p1.company_id IS NOT NULL
    )
  );

-- Step 6: Create DELETE policy
CREATE POLICY "user_protocols_delete_simple" ON public.user_protocols
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
      AND p2.id = user_protocols.user_id
      AND p1.company_id IS NOT NULL
    )
  );

-- Step 7: Verify the policies are set correctly
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_protocols';
  
  RAISE NOTICE 'user_protocols table now has % RLS policies', policy_count;
  RAISE NOTICE 'Fixed infinite recursion - policies simplified - 2026-01-11 17:00';
END $$;
