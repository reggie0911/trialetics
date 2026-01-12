-- Fix user_protocols RLS policies to allow protocol assignment

-- Step 1: Drop existing restrictive policy
DROP POLICY IF EXISTS "Company users can create assignments" ON public.user_protocols;

-- Step 2: Create simpler, more permissive policy for creating assignments
-- Allow authenticated users to assign protocols if they have a profile and the protocol belongs to their company
CREATE POLICY "Users can assign protocols in their company" ON public.user_protocols
  FOR INSERT 
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- The user being assigned (user_id) must exist and be in a company
    EXISTS (
      SELECT 1 FROM public.profiles target_profile
      WHERE target_profile.id = user_protocols.user_id
      AND target_profile.company_id IS NOT NULL
    )
    AND
    -- The protocol must exist and belong to the same company as the user being assigned
    EXISTS (
      SELECT 1 FROM public.protocols prot
      JOIN public.profiles target_profile ON target_profile.company_id = prot.company_id
      WHERE prot.id = user_protocols.protocol_id
      AND target_profile.id = user_protocols.user_id
    )
    AND
    -- The current authenticated user must be in the same company
    EXISTS (
      SELECT 1 FROM public.profiles current_user_profile
      JOIN public.profiles target_profile ON current_user_profile.company_id = target_profile.company_id
      WHERE current_user_profile.user_id = auth.uid()
      AND target_profile.id = user_protocols.user_id
    )
  );

-- Step 3: Also create a simpler self-assignment policy
-- Allow users to assign protocols to themselves if the protocol is in their company
CREATE POLICY "Users can self-assign company protocols" ON public.user_protocols
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.id = user_protocols.user_id
    )
    AND
    EXISTS (
      SELECT 1 FROM public.protocols
      JOIN public.profiles ON profiles.company_id = protocols.company_id
      WHERE profiles.user_id = auth.uid()
      AND protocols.id = user_protocols.protocol_id
    )
  );

-- Step 4: Add comment to track this fix
COMMENT ON POLICY "Users can self-assign company protocols" ON public.user_protocols IS 'Allows users to assign company protocols to themselves - Fixed 2026-01-11 14:30';
