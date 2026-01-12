-- Final comprehensive fix for user_protocols RLS policies
-- This ensures protocols can be assigned to users without issues
-- Using aliases to avoid reserved keyword conflicts

-- Step 1: Drop all existing policies on user_protocols
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.user_protocols;
DROP POLICY IF EXISTS "Users can view assignments in their company" ON public.user_protocols;
DROP POLICY IF EXISTS "Users can assign protocols in their company" ON public.user_protocols;
DROP POLICY IF EXISTS "Users can self-assign company protocols" ON public.user_protocols;
DROP POLICY IF EXISTS "Company users can create assignments" ON public.user_protocols;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.user_protocols;

-- Step 2: Create comprehensive SELECT policy
CREATE POLICY "user_protocols_select_policy" ON public.user_protocols
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_protocols.user_id
      AND p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
      AND p2.id = user_protocols.user_id
      AND p1.company_id IS NOT NULL
    )
  );

-- Step 3: Create simplified INSERT policy for self-assignment
CREATE POLICY "user_protocols_insert_self" ON public.user_protocols
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT p.id FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
    AND
    protocol_id IN (
      SELECT prot.id FROM public.protocols prot
      JOIN public.profiles prof ON prof.company_id = prot.company_id
      WHERE prof.user_id = auth.uid()
    )
  );

-- Step 4: Create INSERT policy for assigning to others in same company
CREATE POLICY "user_protocols_insert_company" ON public.user_protocols
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      JOIN public.protocols prot ON prot.company_id = p1.company_id
      WHERE p1.user_id = auth.uid()
      AND p2.id = user_protocols.user_id
      AND prot.id = user_protocols.protocol_id
      AND p1.company_id IS NOT NULL
    )
  );

-- Step 5: Create UPDATE policy
CREATE POLICY "user_protocols_update_policy" ON public.user_protocols
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'admin'
      AND p.company_id IN (
        SELECT p2.company_id FROM public.profiles p2
        WHERE p2.id = user_protocols.user_id
      )
    )
  );

-- Step 6: Create DELETE policy
CREATE POLICY "user_protocols_delete_policy" ON public.user_protocols
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_protocols.user_id
      AND p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
      AND p1.role = 'admin'
      AND p2.id = user_protocols.user_id
      AND p1.company_id IS NOT NULL
    )
  );

-- Step 7: Add helpful comments
COMMENT ON POLICY "user_protocols_select_policy" ON public.user_protocols IS 
  'Users can view their own protocol assignments and assignments within their company';

COMMENT ON POLICY "user_protocols_insert_self" ON public.user_protocols IS 
  'Users can assign company protocols to themselves - Primary policy for protocol creation';

COMMENT ON POLICY "user_protocols_insert_company" ON public.user_protocols IS 
  'Users can assign company protocols to other users in their company';

COMMENT ON POLICY "user_protocols_update_policy" ON public.user_protocols IS 
  'Only admins can update protocol assignments';

COMMENT ON POLICY "user_protocols_delete_policy" ON public.user_protocols IS 
  'Users can delete their own assignments, admins can delete any company assignments';

-- Step 8: Verify and provide summary
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_protocols';
  
  RAISE NOTICE 'user_protocols table now has % RLS policies', policy_count;
  RAISE NOTICE 'RLS policies updated successfully - 2026-01-11 16:00';
END $$;
