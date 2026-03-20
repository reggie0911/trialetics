-- =====================================================
-- Platform owner: module access, per-tracker licensing,
-- custom tracker tables (recreated if missing), audit trail
-- =====================================================

-- 1. Profiles: platform admin flag (never self-escalate via normal JWT)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.profiles_prevent_platform_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_platform_admin IS TRUE AND jwt_role IS DISTINCT FROM 'service_role' THEN
      NEW.is_platform_admin := false;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin AND jwt_role IS DISTINCT FROM 'service_role' THEN
    NEW.is_platform_admin := OLD.is_platform_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_platform_admin_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_platform_admin_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_prevent_platform_admin_escalation();

-- 2. Companies: CTMS / eTMF / tracker product flag (ctms_core may already add has_tracker_access)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS has_tracker_access BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_ctms_access BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_etmf_access BOOLEAN NOT NULL DEFAULT false;

-- 3. Optional audit trail
CREATE TABLE IF NOT EXISTS public.company_module_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_module_audit_company_id ON public.company_module_audit(company_id);
CREATE INDEX IF NOT EXISTS idx_company_module_audit_changed_at ON public.company_module_audit(changed_at DESC);

ALTER TABLE public.company_module_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins read company_module_audit" ON public.company_module_audit;
CREATE POLICY "Platform admins read company_module_audit"
  ON public.company_module_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
    )
  );

-- 4. Custom tracker definitions + fields + values
CREATE TABLE IF NOT EXISTS public.custom_tracker_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  icon TEXT,
  entity_type TEXT,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  platform_access_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, slug)
);

ALTER TABLE public.custom_tracker_definitions
  ADD COLUMN IF NOT EXISTS platform_access_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_custom_tracker_definitions_company_id ON public.custom_tracker_definitions(company_id);

CREATE TRIGGER update_custom_tracker_definitions_updated_at
  BEFORE UPDATE ON public.custom_tracker_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.custom_tracker_definitions_lock_platform_access_col()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := COALESCE(auth.jwt() ->> 'role', '');
  IF TG_OP = 'UPDATE'
     AND NEW.platform_access_enabled IS DISTINCT FROM OLD.platform_access_enabled
     AND jwt_role IS DISTINCT FROM 'service_role'
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
     ) THEN
    NEW.platform_access_enabled := OLD.platform_access_enabled;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS custom_tracker_definitions_lock_platform_access ON public.custom_tracker_definitions;
CREATE TRIGGER custom_tracker_definitions_lock_platform_access
  BEFORE UPDATE ON public.custom_tracker_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.custom_tracker_definitions_lock_platform_access_col();

CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tracker_definition_id UUID NOT NULL REFERENCES public.custom_tracker_definitions(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  field_label TEXT NOT NULL,
  options JSONB,
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_company_id ON public.custom_fields(company_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_tracker_definition_id ON public.custom_fields(tracker_definition_id);

CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tracker_definition_id UUID NOT NULL REFERENCES public.custom_tracker_definitions(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number DOUBLE PRECISION,
  value_date DATE,
  value_boolean BOOLEAN,
  value_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tracker_definition_id, entity_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_values_tracker ON public.custom_field_values(tracker_definition_id);
CREATE TRIGGER update_custom_field_values_updated_at
  BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS: companies — platform admins see all companies
DROP POLICY IF EXISTS "Platform admins select all companies" ON public.companies;
CREATE POLICY "Platform admins select all companies"
  ON public.companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
    )
  );

-- 6. RLS: custom tracker tables
ALTER TABLE public.custom_tracker_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "custom_tracker_definitions_select_tenant" ON public.custom_tracker_definitions;
CREATE POLICY "custom_tracker_definitions_select_tenant"
  ON public.custom_tracker_definitions
  FOR SELECT
  USING (
    company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND COALESCE(platform_access_enabled, true) = true
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = custom_tracker_definitions.company_id
        AND COALESCE(c.has_tracker_access, false) = true
    )
  );

DROP POLICY IF EXISTS "custom_tracker_definitions_select_platform" ON public.custom_tracker_definitions;
CREATE POLICY "custom_tracker_definitions_select_platform"
  ON public.custom_tracker_definitions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
    )
  );

DROP POLICY IF EXISTS "custom_tracker_definitions_insert_tenant" ON public.custom_tracker_definitions;
CREATE POLICY "custom_tracker_definitions_insert_tenant"
  ON public.custom_tracker_definitions
  WITH CHECK (
    company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = custom_tracker_definitions.company_id
        AND COALESCE(c.has_tracker_access, false) = true
    )
  );

DROP POLICY IF EXISTS "custom_tracker_definitions_update_tenant" ON public.custom_tracker_definitions;
CREATE POLICY "custom_tracker_definitions_update_tenant"
  ON public.custom_tracker_definitions
  FOR UPDATE
  USING (
    company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND COALESCE(platform_access_enabled, true) = true
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = custom_tracker_definitions.company_id
        AND COALESCE(c.has_tracker_access, false) = true
    )
  )
  WITH CHECK (
    company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = custom_tracker_definitions.company_id
        AND COALESCE(c.has_tracker_access, false) = true
    )
  );

DROP POLICY IF EXISTS "custom_fields_all_tenant" ON public.custom_fields;
CREATE POLICY "custom_fields_all_tenant"
  ON public.custom_fields
  FOR ALL
  USING (
    company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.custom_tracker_definitions d
      JOIN public.companies c ON c.id = d.company_id
      WHERE d.id = custom_fields.tracker_definition_id
        AND d.company_id = custom_fields.company_id
        AND COALESCE(d.platform_access_enabled, true) = true
        AND COALESCE(c.has_tracker_access, false) = true
    )
  )
  WITH CHECK (
    company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.custom_tracker_definitions d
      JOIN public.companies c ON c.id = d.company_id
      WHERE d.id = custom_fields.tracker_definition_id
        AND d.company_id = custom_fields.company_id
        AND COALESCE(d.platform_access_enabled, true) = true
        AND COALESCE(c.has_tracker_access, false) = true
    )
  );

DROP POLICY IF EXISTS "custom_fields_all_platform" ON public.custom_fields;
CREATE POLICY "custom_fields_all_platform"
  ON public.custom_fields
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
    )
  );

DROP POLICY IF EXISTS "custom_field_values_all_tenant" ON public.custom_field_values;
CREATE POLICY "custom_field_values_all_tenant"
  ON public.custom_field_values
  FOR ALL
  USING (
    company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.custom_tracker_definitions d
      JOIN public.companies c ON c.id = d.company_id
      WHERE d.id = custom_field_values.tracker_definition_id
        AND d.company_id = custom_field_values.company_id
        AND COALESCE(d.platform_access_enabled, true) = true
        AND COALESCE(c.has_tracker_access, false) = true
    )
  )
  WITH CHECK (
    company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.custom_tracker_definitions d
      JOIN public.companies c ON c.id = d.company_id
      WHERE d.id = custom_field_values.tracker_definition_id
        AND d.company_id = custom_field_values.company_id
        AND COALESCE(d.platform_access_enabled, true) = true
        AND COALESCE(c.has_tracker_access, false) = true
    )
  );

DROP POLICY IF EXISTS "custom_field_values_all_platform" ON public.custom_field_values;
CREATE POLICY "custom_field_values_all_platform"
  ON public.custom_field_values
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
    )
  );

-- 7. RPC: company module flags (SECURITY DEFINER writes audit)
CREATE OR REPLACE FUNCTION public.set_company_module_access(
  p_company_id uuid,
  p_has_ctms_access boolean,
  p_has_etmf_access boolean,
  p_has_tracker_access boolean
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
    'has_tracker_access', has_tracker_access
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
      'has_tracker_access', p_has_tracker_access
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tracker_platform_access(
  p_tracker_definition_id uuid,
  p_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_company_id uuid;
  v_old boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND COALESCE(p.is_platform_admin, false) = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  SELECT company_id, platform_access_enabled
  INTO v_company_id, v_old
  FROM public.custom_tracker_definitions
  WHERE id = p_tracker_definition_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'tracker not found';
  END IF;

  UPDATE public.custom_tracker_definitions
  SET platform_access_enabled = p_enabled, updated_at = NOW()
  WHERE id = p_tracker_definition_id;

  INSERT INTO public.company_module_audit (company_id, changed_by, old_values, new_values)
  VALUES (
    v_company_id,
    v_profile_id,
    jsonb_build_object('tracker_definition_id', p_tracker_definition_id, 'platform_access_enabled', v_old),
    jsonb_build_object('tracker_definition_id', p_tracker_definition_id, 'platform_access_enabled', p_enabled)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_company_module_access(uuid, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tracker_platform_access(uuid, boolean) TO authenticated;
