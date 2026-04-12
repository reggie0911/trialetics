-- Extend platform RPC to toggle BrandForge per company (has_brandforge_access).

DROP FUNCTION IF EXISTS public.set_company_module_access(uuid, boolean, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.set_company_module_access(
  p_company_id uuid,
  p_has_ctms_access boolean,
  p_has_etmf_access boolean,
  p_has_tracker_access boolean,
  p_has_eisf_access boolean,
  p_has_brandforge_access boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_old jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT jsonb_build_object(
    'has_ctms_access', has_ctms_access,
    'has_etmf_access', has_etmf_access,
    'has_tracker_access', has_tracker_access,
    'has_eisf_access', has_eisf_access,
    'has_brandforge_access', has_brandforge_access
  )
  INTO v_old
  FROM public.companies WHERE id = p_company_id;

  IF v_old IS NULL THEN
    RAISE EXCEPTION 'company not found';
  END IF;

  UPDATE public.companies
  SET
    has_ctms_access = p_has_ctms_access,
    has_etmf_access = p_has_etmf_access,
    has_tracker_access = p_has_tracker_access,
    has_eisf_access = p_has_eisf_access,
    has_brandforge_access = p_has_brandforge_access,
    updated_at = NOW()
  WHERE id = p_company_id;

  INSERT INTO public.company_module_audit (company_id, changed_by, old_values, new_values)
  VALUES (
    p_company_id,
    v_profile_id,
    COALESCE(v_old, '{}'::jsonb),
    jsonb_build_object(
      'has_ctms_access', p_has_ctms_access,
      'has_etmf_access', p_has_etmf_access,
      'has_tracker_access', p_has_tracker_access,
      'has_eisf_access', p_has_eisf_access,
      'has_brandforge_access', p_has_brandforge_access
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_company_module_access(uuid, boolean, boolean, boolean, boolean, boolean) TO authenticated;
