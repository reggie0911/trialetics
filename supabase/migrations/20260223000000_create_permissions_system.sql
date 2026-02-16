-- Module Permissions System
-- Role-based defaults and user-level overrides for module access control

-- 1. module_permissions table (role defaults per company)
CREATE TABLE IF NOT EXISTS public.module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, module_name, role)
);

CREATE INDEX IF NOT EXISTS idx_module_permissions_company_id ON public.module_permissions(company_id);
CREATE INDEX IF NOT EXISTS idx_module_permissions_role ON public.module_permissions(company_id, role);

-- 2. user_permission_overrides table (per-user overrides)
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  is_hidden BOOLEAN,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, module_name)
);

CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user_id ON public.user_permission_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_module_name ON public.user_permission_overrides(user_id, module_name);

-- Enable RLS on both tables
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for module_permissions
-- Admins in the company can read and modify
CREATE POLICY "Admins can manage module_permissions"
  ON public.module_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.company_id = module_permissions.company_id
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.company_id = module_permissions.company_id
      AND p.role = 'admin'
    )
  );

-- Users can read their company's role permissions (for displaying defaults)
CREATE POLICY "Users can read module_permissions for their company"
  ON public.module_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.company_id = module_permissions.company_id
    )
  );

-- RLS Policies for user_permission_overrides
-- Admins can manage overrides for users in their company
CREATE POLICY "Admins can manage user_permission_overrides"
  ON public.user_permission_overrides
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_p
      JOIN public.profiles target_p ON target_p.company_id = admin_p.company_id
      WHERE admin_p.user_id = auth.uid()
      AND admin_p.role = 'admin'
      AND target_p.id = user_permission_overrides.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles admin_p
      JOIN public.profiles target_p ON target_p.company_id = admin_p.company_id
      WHERE admin_p.user_id = auth.uid()
      AND admin_p.role = 'admin'
      AND target_p.id = user_permission_overrides.user_id
    )
  );

-- Users can read their own overrides
CREATE POLICY "Users can read own user_permission_overrides"
  ON public.user_permission_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.id = user_permission_overrides.user_id
    )
  );

-- Function to seed default permissions for a company (called when company is created or on first access)
CREATE OR REPLACE FUNCTION public.seed_company_module_permissions(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  module_names TEXT[] := ARRAY[
    'dashboard', 'contacts_organizations', 'org_chart', 'trip_reports',
    'document_management', 'clinical_trials', 'activity_calendar', 'rate_lists',
    'clinical_payments', 'clinical_training', 'visit_templates', 'source_data_verification',
    'mrace_tracker', 'ae_metrics', 'ecrf_query_tracker', 'sdv_tracker',
    'visit_window', 'med_compliance'
  ];
  m TEXT;
BEGIN
  FOREACH m IN ARRAY module_names
  LOOP
    -- Admin: all permissions
    INSERT INTO public.module_permissions (company_id, module_name, role, is_hidden, can_read, can_create, can_edit, can_delete)
    VALUES (p_company_id, m, 'admin', false, true, true, true, true)
    ON CONFLICT (company_id, module_name, role) DO NOTHING;

    -- User: read only
    INSERT INTO public.module_permissions (company_id, module_name, role, is_hidden, can_read, can_create, can_edit, can_delete)
    VALUES (p_company_id, m, 'user', false, true, false, false, false)
    ON CONFLICT (company_id, module_name, role) DO NOTHING;
  END LOOP;
END;
$$;

-- Trigger to seed permissions when a new company is created
CREATE OR REPLACE FUNCTION public.trigger_seed_permissions_on_company_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_company_module_permissions(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_permissions_on_company_insert ON public.companies;
CREATE TRIGGER seed_permissions_on_company_insert
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_seed_permissions_on_company_insert();

-- Seed permissions for all existing companies
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.companies
  LOOP
    PERFORM public.seed_company_module_permissions(c.id);
  END LOOP;
END;
$$;
