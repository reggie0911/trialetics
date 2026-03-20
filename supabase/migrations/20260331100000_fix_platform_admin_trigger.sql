-- Fix: allow setting is_platform_admin from direct DB sessions (SQL editor,
-- service role, or any postgres-role connection where auth.jwt() is NULL).
-- The previous version only allowed jwt role = 'service_role', which blocked
-- the Supabase dashboard SQL editor and table editor (they run as postgres,
-- no JWT is present so auth.jwt() returns null).

CREATE OR REPLACE FUNCTION public.profiles_prevent_platform_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_jwt  jsonb;
  jwt_role text;
BEGIN
  raw_jwt  := auth.jwt();
  jwt_role := COALESCE(raw_jwt ->> 'role', '');

  -- Allow when:
  --   a) There is no JWT at all (direct DB connection: SQL editor, service role client, etc.)
  --   b) JWT role is 'service_role'
  IF raw_jwt IS NULL OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Authenticated API calls (anon / authenticated role):
  -- block any attempt to flip is_platform_admin
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_platform_admin IS TRUE THEN
      NEW.is_platform_admin := false;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    NEW.is_platform_admin := OLD.is_platform_admin;
  END IF;

  RETURN NEW;
END;
$$;
