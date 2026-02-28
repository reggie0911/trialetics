-- RBAC Enhancement
-- Fine-grained entity-level permissions and access audit logging

-- ============================================================================
-- Module Permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, module_id, permission_key)
);

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN
    SELECT c.column_name, c.udt_name
    FROM (VALUES
      ('module_id', 'uuid'),
      ('permission_key', 'text'),
      ('label', 'text'),
      ('description', 'text')
    ) AS c(column_name, udt_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'module_permissions' AND column_name = col.column_name
    ) THEN
      EXECUTE format('ALTER TABLE public.module_permissions ADD COLUMN %I %s', col.column_name, col.udt_name);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_module_permissions_company ON public.module_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_module ON public.module_permissions(module_id);

ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view module permissions in their company"
    ON public.module_permissions FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage module permissions in their company"
    ON public.module_permissions FOR ALL
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.module_permissions IS 'Defines available permission keys per module';

-- ============================================================================
-- User Permission Overrides
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, user_id, module_id, permission_key)
);

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN
    SELECT c.column_name, c.udt_name
    FROM (VALUES
      ('company_id', 'uuid'),
      ('user_id', 'uuid'),
      ('module_id', 'uuid'),
      ('permission_key', 'text'),
      ('granted', 'boolean'),
      ('granted_by_id', 'uuid')
    ) AS c(column_name, udt_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'user_permission_overrides' AND column_name = col.column_name
    ) THEN
      EXECUTE format('ALTER TABLE public.user_permission_overrides ADD COLUMN %I %s', col.column_name, col.udt_name);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_company ON public.user_permission_overrides(company_id);
CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_user ON public.user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_module ON public.user_permission_overrides(module_id);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view permission overrides in their company"
    ON public.user_permission_overrides FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage permission overrides in their company"
    ON public.user_permission_overrides FOR ALL
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.user_permission_overrides IS 'Per-user permission grants/revocations per module';

-- ============================================================================
-- Access Audit Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  details JSONB,
  performed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN
    SELECT c.column_name, c.udt_name
    FROM (VALUES
      ('company_id', 'uuid'),
      ('user_id', 'uuid'),
      ('action', 'text'),
      ('target_user_id', 'uuid'),
      ('module_id', 'uuid'),
      ('details', 'jsonb'),
      ('performed_by_id', 'uuid')
    ) AS c(column_name, udt_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'access_audit_log' AND column_name = col.column_name
    ) THEN
      EXECUTE format('ALTER TABLE public.access_audit_log ADD COLUMN %I %s', col.column_name, col.udt_name);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_access_audit_company ON public.access_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_user ON public.access_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_target ON public.access_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_created ON public.access_audit_log(created_at DESC);

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view access audit log in their company"
    ON public.access_audit_log FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage access audit log in their company"
    ON public.access_audit_log FOR ALL
    USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'))
    WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE public.access_audit_log IS 'Tracks permission and access changes for compliance';
