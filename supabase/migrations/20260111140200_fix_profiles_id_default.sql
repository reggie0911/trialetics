-- Fix: Ensure profiles.id has a default UUID generator

-- Check if id column has default, if not add it
DO $$
BEGIN
  -- Add default UUID generation to id column if not present
  ALTER TABLE public.profiles 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
  RAISE NOTICE 'Set default UUID generator for profiles.id';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not set default for profiles.id: %', SQLERRM;
END $$;

-- Now retry creating profiles for users without them
DO $$
DECLARE
  user_record RECORD;
  new_company_id UUID;
BEGIN
  FOR user_record IN 
    SELECT u.id, u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE p.id IS NULL
  LOOP
    BEGIN
      RAISE NOTICE 'Creating profile for user: % (%)', user_record.email, user_record.id;
      
      -- Create a company for this user
      INSERT INTO public.companies (name, settings)
      VALUES (
        COALESCE(user_record.email, 'User') || ' Organization',
        '{}'::jsonb
      )
      RETURNING id INTO new_company_id;
      
      -- Create profile for this user
      INSERT INTO public.profiles (user_id, company_id, role)
      VALUES (
        user_record.id,
        new_company_id,
        'admin'
      );
      
      RAISE NOTICE 'Successfully created profile for user: %', user_record.id;
    EXCEPTION
      WHEN unique_violation THEN
        RAISE WARNING 'Profile already exists for user %', user_record.id;
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create profile for user % (%): %', user_record.email, user_record.id, SQLERRM;
    END;
  END LOOP;
END $$;
