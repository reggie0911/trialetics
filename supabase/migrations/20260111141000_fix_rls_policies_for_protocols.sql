-- Fix RLS policies for protocols table to allow authenticated users to create protocols

-- Step 1: Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can create company protocols" ON public.protocols;
DROP POLICY IF EXISTS "Users can create protocols" ON public.protocols;

-- Step 2: Create more permissive policy for protocol creation
-- Allow any authenticated user to create protocols for their company
CREATE POLICY "Authenticated users can create protocols" ON public.protocols
  FOR INSERT 
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- User must have a profile with a company_id that matches the protocol's company_id
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id = protocols.company_id
    )
  );

-- Step 3: Ensure users can view protocols they have access to
DROP POLICY IF EXISTS "Users can view assigned protocols" ON public.protocols;
DROP POLICY IF EXISTS "Admins can view company protocols" ON public.protocols;

-- Create unified policy for viewing protocols
CREATE POLICY "Users can view accessible protocols" ON public.protocols
  FOR SELECT 
  USING (
    -- User is assigned to this protocol
    EXISTS (
      SELECT 1 FROM public.user_protocols up 
      JOIN public.profiles p ON p.id = up.user_id 
      WHERE p.user_id = auth.uid() 
      AND up.protocol_id = protocols.id
    )
    OR
    -- User is in the same company (for admins and other company users)
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id = protocols.company_id
    )
  );

-- Step 4: Allow updates for company users
DROP POLICY IF EXISTS "Admins can update company protocols" ON public.protocols;

CREATE POLICY "Company users can update protocols" ON public.protocols
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id = protocols.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id = protocols.company_id
    )
  );

-- Step 5: Allow deletes for company admins
DROP POLICY IF EXISTS "Admins can delete company protocols" ON public.protocols;

CREATE POLICY "Admins can delete protocols" ON public.protocols
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.company_id = protocols.company_id
      AND profiles.role = 'admin'
    )
  );

-- Step 6: Update user_protocols policies to be more permissive
DROP POLICY IF EXISTS "Users can view own protocol assignments" ON public.user_protocols;
DROP POLICY IF EXISTS "Admins can view company protocol assignments" ON public.user_protocols;
DROP POLICY IF EXISTS "Admins can create protocol assignments" ON public.user_protocols;

-- Allow users to view their assignments
CREATE POLICY "Users can view protocol assignments" ON public.user_protocols
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.id = user_protocols.user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid() 
      AND p2.id = user_protocols.user_id
    )
  );

-- Allow company users to create protocol assignments
CREATE POLICY "Company users can create assignments" ON public.user_protocols
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      JOIN public.protocols prot ON prot.company_id = p1.company_id
      WHERE p1.user_id = auth.uid() 
      AND p2.id = user_protocols.user_id
      AND prot.id = user_protocols.protocol_id
    )
  );

-- Allow company admins to delete protocol assignments
DROP POLICY IF EXISTS "Admins can delete protocol assignments" ON public.user_protocols;

CREATE POLICY "Admins can delete assignments" ON public.user_protocols
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid() 
      AND p1.role = 'admin'
      AND p2.id = user_protocols.user_id
    )
  );

-- Step 7: Add comment to track this fix
COMMENT ON POLICY "Authenticated users can create protocols" ON public.protocols IS 'Fixed RLS - allows authenticated users to create protocols for their company';
