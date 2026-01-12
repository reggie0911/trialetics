-- Update the handle_new_user function to create a company and set user as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
    -- Profile already exists, do nothing
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log other errors but don't fail user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
