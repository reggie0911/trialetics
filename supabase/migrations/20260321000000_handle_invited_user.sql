-- =====================================================
-- Handle invited users: join inviter's company instead of creating new one
-- =====================================================
-- When generateLink({ type: 'invite', data: { company_id, role, first_name, last_name } }) is used,
-- the metadata is stored in auth.users.raw_user_meta_data. This migration updates handle_new_user
-- to detect invites and insert the profile with the inviter's company_id.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  invite_company_id UUID;
  invite_role TEXT;
  invite_first_name TEXT;
  invite_last_name TEXT;
BEGIN
  -- Check for invite metadata (company_id from generateLink data)
  invite_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  invite_role := NEW.raw_user_meta_data->>'role';
  invite_first_name := NEW.raw_user_meta_data->>'first_name';
  invite_last_name := NEW.raw_user_meta_data->>'last_name';

  IF invite_company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.companies WHERE id = invite_company_id) THEN
    -- Invited user: join existing company
    INSERT INTO public.profiles (user_id, company_id, first_name, last_name, email, role)
    VALUES (
      NEW.id,
      invite_company_id,
      NULLIF(TRIM(invite_first_name), ''),
      NULLIF(TRIM(invite_last_name), ''),
      NEW.email,
      COALESCE(NULLIF(TRIM(invite_role), ''), 'user')
    );
  ELSE
    -- Normal signup: create new company and profile
    INSERT INTO public.companies (name, settings)
    VALUES (
      COALESCE(NEW.email, 'User') || ' Organization',
      '{}'::jsonb
    )
    RETURNING id INTO new_company_id;

    INSERT INTO public.profiles (user_id, company_id, email, role)
    VALUES (NEW.id, new_company_id, NEW.email, 'admin');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
