-- Platform admin: create custom_tracker_definitions for any company (bypass tenant INSERT RLS)

CREATE OR REPLACE FUNCTION public.platform_create_custom_tracker_definition(
  p_company_id uuid,
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_icon text DEFAULT NULL,
  p_entity_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_new_id uuid;
  v_slug text;
  v_has_tracker boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT COALESCE(c.has_tracker_access, false)
  INTO v_has_tracker
  FROM public.companies c
  WHERE c.id = p_company_id;

  IF v_has_tracker IS NULL THEN
    RAISE EXCEPTION 'company not found';
  END IF;

  IF v_has_tracker IS NOT TRUE THEN
    RAISE EXCEPTION 'company does not have custom tracker module access';
  END IF;

  v_slug := lower(trim(p_slug));
  IF v_slug = '' THEN
    RAISE EXCEPTION 'slug is required';
  END IF;

  IF trim(p_name) = '' THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  INSERT INTO public.custom_tracker_definitions (
    company_id,
    name,
    description,
    slug,
    icon,
    entity_type,
    columns,
    active,
    platform_access_enabled,
    created_by_id
  )
  VALUES (
    p_company_id,
    trim(p_name),
    NULLIF(trim(p_description), ''),
    v_slug,
    NULLIF(trim(p_icon), ''),
    NULLIF(trim(p_entity_type), ''),
    '[]'::jsonb,
    true,
    true,
    v_profile_id
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.company_module_audit (company_id, changed_by, old_values, new_values)
  VALUES (
    p_company_id,
    v_profile_id,
    '{}'::jsonb,
    jsonb_build_object(
      'action', 'platform_create_custom_tracker_definition',
      'tracker_definition_id', v_new_id,
      'name', trim(p_name),
      'slug', v_slug
    )
  );

  RETURN v_new_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Tracker slug already exists for this company';
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_create_custom_tracker_definition(
  uuid, text, text, text, text, text
) TO authenticated;
