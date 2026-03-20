-- Optional study + study_role on company join links; validate study belongs to link's company.
-- Extend handle_new_user to create study_team_members when join_study_* metadata is present (idempotent).

ALTER TABLE public.company_join_links
  ADD COLUMN IF NOT EXISTS study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL;

ALTER TABLE public.company_join_links
  ADD COLUMN IF NOT EXISTS study_role TEXT;

ALTER TABLE public.company_join_links DROP CONSTRAINT IF EXISTS company_join_links_study_role_check;
ALTER TABLE public.company_join_links ADD CONSTRAINT company_join_links_study_role_check CHECK (
  study_role IS NULL OR study_role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'inventory_specialist', 'medical_writer', 'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist', 'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

CREATE OR REPLACE FUNCTION public.enforce_join_link_study_company()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.study_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.studies s
      WHERE s.id = NEW.study_id AND s.company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'study_id must reference a study in the same company as the join link';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_join_link_study_company_trg ON public.company_join_links;
CREATE TRIGGER enforce_join_link_study_company_trg
  BEFORE INSERT OR UPDATE OF study_id, company_id ON public.company_join_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_join_link_study_company();

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
