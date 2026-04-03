-- The "Company members can view same-company profiles" policy queried the
-- profiles table from within its own SELECT policy, causing infinite recursion
-- that blocked ALL profile reads (including a user reading their own profile).
--
-- Fix: use a SECURITY DEFINER function to look up the caller's company_id
-- without triggering RLS on profiles.

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Company members can view same-company profiles" ON public.profiles;

CREATE POLICY "Company members can view same-company profiles" ON public.profiles
  FOR SELECT USING (
    company_id IS NOT NULL
    AND company_id = public.get_my_company_id()
  );
