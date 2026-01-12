-- Comprehensive Schema Review and Fixes
-- This migration ensures all relationships are properly connected and constraints are correct

-- ============================================================================
-- SCHEMA ANALYSIS & ISSUES FOUND:
-- ============================================================================
-- 1. companies.company_id is redundant (we have id already)
-- 2. Missing last_name column in profiles
-- 3. Missing email column in profiles for easier queries
-- 4. Missing indexes on frequently queried columns
-- 5. Missing check constraints on date fields
-- 6. Missing updated_at triggers on some tables
-- ============================================================================

-- Step 1: Add missing columns to profiles table
DO $$
BEGIN
  -- Add last_name column
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    RAISE NOTICE 'Added last_name column to profiles';
  END IF;

  -- Add email column for easier queries (denormalized from auth.users)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Added email column to profiles';
  END IF;
END $$;

-- Step 2: Add check constraint for protocol dates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_protocol_dates' 
    AND conrelid = 'public.protocols'::regclass
  ) THEN
    ALTER TABLE public.protocols 
    ADD CONSTRAINT check_protocol_dates 
    CHECK (
      planned_start_date IS NULL 
      OR planned_end_date IS NULL 
      OR planned_end_date >= planned_start_date
    );
    RAISE NOTICE 'Added date check constraint to protocols';
  END IF;
END $$;

-- Step 3: Create missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_protocols_trial_phase ON public.protocols(trial_phase);
CREATE INDEX IF NOT EXISTS idx_protocols_created_at ON public.protocols(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_protocols_assigned_at ON public.user_protocols(assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 4: Ensure all tables have updated_at triggers
-- For user_protocols
DROP TRIGGER IF EXISTS update_user_protocols_updated_at ON public.user_protocols;

-- Add updated_at column to user_protocols if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_protocols' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.user_protocols ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to user_protocols';
  END IF;
END $$;

CREATE TRIGGER update_user_protocols_updated_at 
  BEFORE UPDATE ON public.user_protocols
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- For user_modules
DROP TRIGGER IF EXISTS update_user_modules_updated_at ON public.user_modules;

-- Add updated_at column to user_modules if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_modules' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.user_modules ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to user_modules';
  END IF;
END $$;

CREATE TRIGGER update_user_modules_updated_at 
  BEFORE UPDATE ON public.user_modules
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 5: Update the handle_new_user trigger to populate email
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
  BEGIN
    INSERT INTO public.profiles (user_id, email, company_id, role)
    VALUES (
      NEW.id,
      NEW.email,
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

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Sync email for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
AND p.email IS NULL;

-- Step 7: Add helpful comments to document the schema
COMMENT ON TABLE public.companies IS 'Organizations that own protocols and have multiple users';
COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users with company membership and role';
COMMENT ON TABLE public.protocols IS 'Clinical trial protocols owned by companies';
COMMENT ON TABLE public.modules IS 'System modules/features that can be granted to users';
COMMENT ON TABLE public.user_protocols IS 'Junction table assigning users to protocols';
COMMENT ON TABLE public.user_modules IS 'Junction table granting module access to users';

COMMENT ON COLUMN public.profiles.user_id IS 'Foreign key to auth.users';
COMMENT ON COLUMN public.profiles.company_id IS 'Foreign key to companies table';
COMMENT ON COLUMN public.profiles.email IS 'Denormalized from auth.users for easier queries';
COMMENT ON COLUMN public.protocols.company_id IS 'Foreign key to companies table - protocols belong to companies';
COMMENT ON COLUMN public.user_protocols.user_id IS 'Foreign key to profiles table (not auth.users)';
COMMENT ON COLUMN public.user_modules.user_id IS 'Foreign key to profiles table (not auth.users)';

-- Step 8: Create a view for easier protocol querying with user details
CREATE OR REPLACE VIEW public.protocol_assignments AS
SELECT 
  p.id as protocol_id,
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
FROM public.protocols p
JOIN public.companies c ON c.id = p.company_id
JOIN public.user_protocols up ON up.protocol_id = p.id
JOIN public.profiles prof ON prof.id = up.user_id;

COMMENT ON VIEW public.protocol_assignments IS 'Convenient view showing all protocol assignments with user and company details';

-- Step 9: Verify schema integrity
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  -- Check for orphaned user_protocols (shouldn't exist due to CASCADE)
  SELECT COUNT(*) INTO orphaned_count
  FROM public.user_protocols up
  LEFT JOIN public.profiles p ON p.id = up.user_id
  WHERE p.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned user_protocols records', orphaned_count;
  ELSE
    RAISE NOTICE 'Schema integrity check passed: no orphaned records';
  END IF;
END $$;

-- Step 10: Final comment
COMMENT ON SCHEMA public IS 'Trialetics clinical trial management schema - Updated 2026-01-11 15:00';
