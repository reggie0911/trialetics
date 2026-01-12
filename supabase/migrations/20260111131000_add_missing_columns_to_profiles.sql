-- Emergency fix: Add missing user_id column to profiles table
-- The table exists but is missing critical columns

-- Step 1: Check and add missing columns to profiles table
DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added user_id column to profiles';
  END IF;

  -- Add company_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added company_id column to profiles';
  END IF;

  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN first_name TEXT;
    RAISE NOTICE 'Added first_name column to profiles';
  END IF;

  -- Add avatar_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to profiles';
  END IF;

  -- Add role column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'));
    RAISE NOTICE 'Added role column to profiles';
  END IF;

  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to profiles';
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to profiles';
  END IF;
END $$;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);

-- Step 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Step 4: Create basic policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Allow company creation" ON public.companies;

CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Allow profile creation on signup" ON public.profiles 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own company" ON public.companies 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.company_id = companies.id
  ));

CREATE POLICY "Allow company creation" ON public.companies 
  FOR INSERT WITH CHECK (true);

-- Step 5: Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a new company for the user
  INSERT INTO public.companies (name, settings)
  VALUES (
    COALESCE(NEW.email, 'User') || ' Organization',
    '{}'::jsonb
  )
  RETURNING id INTO new_company_id;

  -- Create profile with company_id and set role as admin
  INSERT INTO public.profiles (user_id, company_id, role)
  VALUES (
    NEW.id,
    new_company_id,
    'admin'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  WHEN foreign_key_violation THEN
    RAISE WARNING 'Foreign key violation when creating profile for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 6: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.companies TO authenticated;

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates company and profile - Fixed 2026-01-11 13:10';
