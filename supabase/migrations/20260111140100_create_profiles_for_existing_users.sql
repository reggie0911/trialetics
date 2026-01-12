-- Helper: Create profiles for existing users who don't have one
-- This script will retroactively create profiles for any existing auth.users

DO $$
DECLARE
  user_record RECORD;
  new_company_id UUID;
BEGIN
  -- Loop through all users in auth.users who don't have a profile
  FOR user_record IN 
    SELECT u.id, u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      RAISE NOTICE 'Creating profile for existing user: % (%)', user_record.email, user_record.id;
      
      -- Create a company for this user
      INSERT INTO public.companies (name, settings)
      VALUES (
        COALESCE(user_record.email, 'User') || ' Organization',
        '{}'::jsonb
      )
      RETURNING id INTO new_company_id;
      
      RAISE NOTICE 'Created company: %', new_company_id;
      
      -- Create profile for this user
      INSERT INTO public.profiles (user_id, company_id, role)
      VALUES (
        user_record.id,
        new_company_id,
        'admin'
      );
      
      RAISE NOTICE 'Created profile for user: %', user_record.id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user % (%): %', user_record.email, user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Finished creating profiles for existing users';
END $$;
