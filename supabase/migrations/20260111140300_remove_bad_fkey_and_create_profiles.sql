-- Fix: Remove any incorrect foreign key constraints and create profiles for existing users

-- Step 1: Drop incorrect foreign key if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    RAISE NOTICE 'Dropped incorrect foreign key constraint profiles_id_fkey';
  END IF;
END $$;

-- Step 2: Ensure id column has proper default
ALTER TABLE public.profiles 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 3: Create profiles for existing users
DO $$
DECLARE
  user_record RECORD;
  new_company_id UUID;
  new_profile_id UUID;
BEGIN
  FOR user_record IN 
    SELECT u.id as user_id, u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      RAISE NOTICE 'Creating profile for user: % (%)', user_record.email, user_record.user_id;
      
      -- Create a company for this user
      INSERT INTO public.companies (name, settings)
      VALUES (
        COALESCE(user_record.email, 'User') || ' Organization',
        '{}'::jsonb
      )
      RETURNING id INTO new_company_id;
      
      RAISE NOTICE 'Created company: %', new_company_id;
      
      -- Create profile for this user with explicit UUID
      INSERT INTO public.profiles (id, user_id, company_id, role)
      VALUES (
        gen_random_uuid(),
        user_record.user_id,
        new_company_id,
        'admin'
      )
      RETURNING id INTO new_profile_id;
      
      RAISE NOTICE 'Successfully created profile % for user: %', new_profile_id, user_record.user_id;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE WARNING 'Profile already exists for user %', user_record.user_id;
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user % (%): %', user_record.email, user_record.user_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Finished processing existing users';
END $$;
