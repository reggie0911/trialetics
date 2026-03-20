-- Per-company allowlist for built-in Study tracker routes (see lib/nav/study-trackers.ts keys)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS enabled_study_tracker_keys text[] NOT NULL
  DEFAULT ARRAY['patients', 'ae', 'ecrf-query-tracker', 'sdv-tracker', 'vw', 'mc']::text[];

COMMENT ON COLUMN public.companies.enabled_study_tracker_keys IS
  'Subset of built-in study tracker keys shown under Custom → Study trackers when has_tracker_access is true';

CREATE OR REPLACE FUNCTION public.set_company_study_tracker_keys(
  p_company_id uuid,
  p_keys text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_old jsonb;
  v_normalized text[];
  v_canonical text[] := ARRAY[
    'patients',
    'ae',
    'ecrf-query-tracker',
    'sdv-tracker',
    'vw',
    'mc'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'company not found';
  END IF;

  SELECT to_jsonb(enabled_study_tracker_keys)
  INTO v_old
  FROM public.companies WHERE id = p_company_id;

  SELECT COALESCE(
    ARRAY(
      SELECT k
      FROM unnest(v_canonical) AS k
      WHERE k = ANY (SELECT DISTINCT unnest(COALESCE(p_keys, ARRAY[]::text[])))
    ),
    ARRAY[]::text[]
  )
  INTO v_normalized;

  UPDATE public.companies
  SET enabled_study_tracker_keys = v_normalized, updated_at = NOW()
  WHERE id = p_company_id;

  INSERT INTO public.company_module_audit (company_id, changed_by, old_values, new_values)
  VALUES (
    p_company_id,
    v_profile_id,
    COALESCE(v_old, 'null'::jsonb),
    jsonb_build_object('enabled_study_tracker_keys', to_jsonb(v_normalized))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_company_study_tracker_keys(uuid, text[]) TO authenticated;
