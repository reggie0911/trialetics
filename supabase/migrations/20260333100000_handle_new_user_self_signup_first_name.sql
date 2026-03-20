-- Self-service sign-up already sends first_name in raw_user_meta_data; invite_first_name is read from the same key.
-- Persist it on profiles for the "new company" path (was previously dropped).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
BEGIN
  invite_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  invite_role := NEW.raw_user_meta_data->>'role';
  invite_first_name := NEW.raw_user_meta_data->>'first_name';
  invite_last_name := NEW.raw_user_meta_data->>'last_name';
  join_study_id_text := NEW.raw_user_meta_data->>'join_study_id';
  join_study_role := NEW.raw_user_meta_data->>'join_study_role';

  IF invite_company_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.companies WHERE id = invite_company_id) THEN
    INSERT INTO public.profiles (user_id, company_id, first_name, last_name, email, role)
    VALUES (
      NEW.id,
      invite_company_id,
      NULLIF(TRIM(invite_first_name), ''),
      NULLIF(TRIM(invite_last_name), ''),
      NEW.email,
      COALESCE(NULLIF(TRIM(invite_role), ''), 'user')
    )
    RETURNING id INTO new_profile_id;

    IF join_study_id_text IS NOT NULL AND LENGTH(TRIM(join_study_id_text)) > 0 THEN
      BEGIN
        join_study_id := join_study_id_text::UUID;
      EXCEPTION WHEN invalid_text_representation THEN
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

    INSERT INTO public.profiles (user_id, company_id, first_name, email, role)
    VALUES (
      NEW.id,
      new_company_id,
      NULLIF(TRIM(invite_first_name), ''),
      NEW.email,
      'admin'
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
