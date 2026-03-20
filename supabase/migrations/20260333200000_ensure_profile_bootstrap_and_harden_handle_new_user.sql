-- 1) profiles.is_active: required by app + proxy; ensure column exists with a safe default for trigger/RPC inserts.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  ALTER COLUMN is_active SET DEFAULT true;

UPDATE public.profiles
SET is_active = true
WHERE is_active IS NULL;

-- 2) Harden handle_new_user: never let invalid company_id metadata abort signup; set search_path; set profile flags explicitly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
  new_profile_id UUID;
  invite_company_id UUID;
  invite_role TEXT;
  invite_first_name TEXT;
  invite_last_name TEXT;
  join_study_id UUID;
  join_study_role TEXT;
  join_study_id_text TEXT;
  company_id_text TEXT;
BEGIN
  company_id_text := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'company_id', '')), '');
  invite_company_id := NULL;
  IF company_id_text IS NOT NULL THEN
    BEGIN
      invite_company_id := company_id_text::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        invite_company_id := NULL;
    END;
  END IF;

  invite_role := NEW.raw_user_meta_data->>'role';
  invite_first_name := NEW.raw_user_meta_data->>'first_name';
  invite_last_name := NEW.raw_user_meta_data->>'last_name';
  join_study_id_text := NEW.raw_user_meta_data->>'join_study_id';
  join_study_role := NEW.raw_user_meta_data->>'join_study_role';

  IF invite_company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.companies WHERE id = invite_company_id) THEN
    INSERT INTO public.profiles (
      user_id, company_id, first_name, last_name, email, role, is_active, is_platform_admin
    )
    VALUES (
      NEW.id,
      invite_company_id,
      NULLIF(TRIM(invite_first_name), ''),
      NULLIF(TRIM(invite_last_name), ''),
      NEW.email,
      COALESCE(NULLIF(TRIM(invite_role), ''), 'user'),
      true,
      false
    )
    RETURNING id INTO new_profile_id;

    IF join_study_id_text IS NOT NULL AND LENGTH(TRIM(join_study_id_text)) > 0 THEN
      BEGIN
        join_study_id := join_study_id_text::UUID;
      EXCEPTION
        WHEN invalid_text_representation THEN
          join_study_id := NULL;
      END;

      IF join_study_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.studies s WHERE s.id = join_study_id AND s.company_id = invite_company_id
      ) THEN
        INSERT INTO public.study_team_members (study_id, profile_id, role)
        VALUES (
          join_study_id,
          new_profile_id,
          COALESCE(NULLIF(TRIM(join_study_role), ''), 'clinical_research_associate')
        )
        ON CONFLICT (study_id, profile_id, role) DO NOTHING;
      END IF;
    END IF;
  ELSE
    INSERT INTO public.companies (name, settings)
    VALUES (
      COALESCE(NEW.email, 'User') || ' Organization',
      '{}'::jsonb
    )
    RETURNING id INTO new_company_id;

    INSERT INTO public.profiles (
      user_id, company_id, first_name, email, role, is_active, is_platform_admin
    )
    VALUES (
      NEW.id,
      new_company_id,
      NULLIF(TRIM(invite_first_name), ''),
      NEW.email,
      'admin',
      true,
      false
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3) Idempotent bootstrap for users who exist in auth but have no profile (trigger missing/failed/migrated).
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  uemail TEXT;
  umeta JSONB;
  new_company_id UUID;
  new_profile_id UUID;
  invite_company_id UUID;
  invite_role TEXT;
  invite_first_name TEXT;
  invite_last_name TEXT;
  join_study_id UUID;
  join_study_role TEXT;
  join_study_id_text TEXT;
  company_id_text TEXT;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = uid) THEN
    RETURN jsonb_build_object('ok', true, 'created', false);
  END IF;

  SELECT u.email, COALESCE(u.raw_user_meta_data, '{}'::jsonb)
  INTO uemail, umeta
  FROM auth.users u
  WHERE u.id = uid;

  IF uemail IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_user_missing');
  END IF;

  company_id_text := NULLIF(TRIM(COALESCE(umeta->>'company_id', '')), '');
  invite_company_id := NULL;
  IF company_id_text IS NOT NULL THEN
    BEGIN
      invite_company_id := company_id_text::UUID;
    EXCEPTION
      WHEN invalid_text_representation THEN
        invite_company_id := NULL;
    END;
  END IF;

  invite_role := umeta->>'role';
  invite_first_name := umeta->>'first_name';
  invite_last_name := umeta->>'last_name';
  join_study_id_text := umeta->>'join_study_id';
  join_study_role := umeta->>'join_study_role';

  IF invite_company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.companies WHERE id = invite_company_id) THEN
    INSERT INTO public.profiles (
      user_id, company_id, first_name, last_name, email, role, is_active, is_platform_admin
    )
    VALUES (
      uid,
      invite_company_id,
      NULLIF(TRIM(invite_first_name), ''),
      NULLIF(TRIM(invite_last_name), ''),
      uemail,
      COALESCE(NULLIF(TRIM(invite_role), ''), 'user'),
      true,
      false
    )
    RETURNING id INTO new_profile_id;

    IF join_study_id_text IS NOT NULL AND LENGTH(TRIM(join_study_id_text)) > 0 THEN
      BEGIN
        join_study_id := join_study_id_text::UUID;
      EXCEPTION
        WHEN invalid_text_representation THEN
          join_study_id := NULL;
      END;

      IF join_study_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.studies s WHERE s.id = join_study_id AND s.company_id = invite_company_id
      ) THEN
        INSERT INTO public.study_team_members (study_id, profile_id, role)
        VALUES (
          join_study_id,
          new_profile_id,
          COALESCE(NULLIF(TRIM(join_study_role), ''), 'clinical_research_associate')
        )
        ON CONFLICT (study_id, profile_id, role) DO NOTHING;
      END IF;
    END IF;

    RETURN jsonb_build_object('ok', true, 'created', true, 'path', 'invite');
  END IF;

  INSERT INTO public.companies (name, settings)
  VALUES (
    COALESCE(uemail, 'User') || ' Organization',
    '{}'::jsonb
  )
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (
    user_id, company_id, first_name, email, role, is_active, is_platform_admin
  )
  VALUES (
    uid,
    new_company_id,
    NULLIF(TRIM(invite_first_name), ''),
    uemail,
    'admin',
    true,
    false
  );

  RETURN jsonb_build_object('ok', true, 'created', true, 'path', 'new_company');
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'created', false, 'note', 'race_or_duplicate');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- 4) Re-assert trigger (in case it was never applied on a hosted project).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
