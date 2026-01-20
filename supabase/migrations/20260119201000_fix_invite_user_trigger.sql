-- Update handle_new_user function to respect invitation metadata
-- This fixes the issue where invited users get wrong company_id and role

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
  metadata_company_id UUID;
  metadata_role TEXT;
  metadata_first_name TEXT;
  metadata_last_name TEXT;
BEGIN
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  
  -- Check if user was invited (has company_id in metadata)
  metadata_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  metadata_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  metadata_first_name := NEW.raw_user_meta_data->>'first_name';
  metadata_last_name := NEW.raw_user_meta_data->>'last_name';
  
  -- If invited user (has company_id in metadata), use that company
  IF metadata_company_id IS NOT NULL THEN
    new_company_id := metadata_company_id;
    RAISE NOTICE 'Using company from metadata: % for invited user: %', new_company_id, NEW.id;
  ELSE
    -- Create a new company for self-signup
    BEGIN
      INSERT INTO public.companies (name, settings)
      VALUES (
        COALESCE(NEW.email, 'User') || '''s Organization',
        '{}'::jsonb
      )
      RETURNING id INTO new_company_id;
      
      RAISE NOTICE 'Created new company: % for self-signup user: %', new_company_id, NEW.id;
      metadata_role := 'admin';  -- Self-signup users are admin of their company
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create company for user %: %', NEW.id, SQLERRM;
        RAISE;
    END;
  END IF;

  -- Create profile
  BEGIN
    INSERT INTO public.profiles (
      user_id, 
      email,
      first_name,
      last_name,
      company_id, 
      role,
      is_active,
      created_by_id,
      creator_email
    )
    VALUES (
      NEW.id,
      NEW.email,
      metadata_first_name,
      metadata_last_name,
      new_company_id,
      metadata_role,
      true,  -- New users are active by default
      NULL,
      NEW.email
    )
    RETURNING id INTO new_profile_id;
    
    RAISE NOTICE 'Created profile: % for user: % with role: % in company: %', 
      new_profile_id, NEW.id, metadata_role, new_company_id;
    
    -- If self-signup, update company to set creator
    IF metadata_company_id IS NULL THEN
      UPDATE public.companies
      SET created_by_id = new_profile_id,
          creator_email = NEW.email
      WHERE id = new_company_id;
    END IF;
    
  EXCEPTION
    WHEN unique_violation THEN
      RAISE WARNING 'Profile already exists for user %', NEW.id;
      RETURN NEW;
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates profile and company. Uses metadata from invitations or creates new company for self-signup - Fixed 2026-01-19 20:10';
