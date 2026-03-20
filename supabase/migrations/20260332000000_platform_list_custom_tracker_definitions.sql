-- Platform admin: list all custom_tracker_definitions with company name (bypasses PostgREST embed/RLS edge cases)

CREATE OR REPLACE FUNCTION public.platform_list_custom_tracker_definitions()
RETURNS TABLE (
  id uuid,
  company_id uuid,
  company_name text,
  name text,
  slug text,
  platform_access_enabled boolean,
  active boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.company_id,
    c.name::text AS company_name,
    d.name,
    d.slug,
    d.platform_access_enabled,
    d.active,
    d.updated_at
  FROM public.custom_tracker_definitions d
  JOIN public.companies c ON c.id = d.company_id
  ORDER BY c.name ASC, d.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_list_custom_tracker_definitions() TO authenticated;
