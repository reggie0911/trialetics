-- Fix trigger to ensure profile creation works properly
-- This migration addresses permission and execution issues

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Create improved trigger function with better error handling and logging
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
  -- Log the start of the function
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

  -- Create profile with company_id and set role as admin
  BEGIN
    INSERT INTO public.profiles (user_id, company_id, role)
    VALUES (
      NEW.id,
      new_company_id,
      'admin'
    )
    RETURNING id INTO new_profile_id;
    
    RAISE NOTICE 'Created profile with id: % for user: %', new_profile_id, NEW.id;
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

-- Step 3: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Step 4: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Ensure proper permissions on tables
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.companies TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.companies TO authenticated;

-- Step 6: Update RLS policies to be less restrictive for inserts
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
DROP POLICY IF EXISTS "Allow company creation" ON public.companies;

-- Allow service_role to bypass RLS for trigger operations
CREATE POLICY "Allow profile creation on signup" ON public.profiles 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow company creation" ON public.companies 
  FOR INSERT WITH CHECK (true);

-- Step 7: Add comment to track version
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates company and profile with improved logging - Fixed 2026-01-11 14:00';
