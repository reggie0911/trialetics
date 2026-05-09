-- Finance Module Phase 1: cross-cutting tables (comments, saved views, Phase 3 staging).

-- -------------------------------------------------------------------------
-- fm_scheduled_report
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fm_scheduled_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  report_key TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('daily', 'weekly', 'monthly', 'once')),
  next_run_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_scheduled_report_study_status_next
  ON public.fm_scheduled_report(study_id, status, next_run_at);

CREATE TRIGGER fm_scheduled_report_set_updated_at
  BEFORE UPDATE ON public.fm_scheduled_report
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- -------------------------------------------------------------------------
-- fm_export_job
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fm_export_job (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  export_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_storage_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fm_export_job_study_status
  ON public.fm_export_job(study_id, status);

CREATE TRIGGER fm_export_job_set_updated_at
  BEFORE UPDATE ON public.fm_export_job
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- -------------------------------------------------------------------------
-- fm_forecast_scenario
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fm_forecast_scenario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_forecast_scenario_study_status
  ON public.fm_forecast_scenario(study_id, status);

CREATE TRIGGER fm_forecast_scenario_set_updated_at
  BEFORE UPDATE ON public.fm_forecast_scenario
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- -------------------------------------------------------------------------
-- fm_approval_delegation
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fm_approval_delegation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  delegator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  delegate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_approval_delegation_study_status
  ON public.fm_approval_delegation(study_id, status);

CREATE TRIGGER fm_approval_delegation_set_updated_at
  BEFORE UPDATE ON public.fm_approval_delegation
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- -------------------------------------------------------------------------
-- fm_approval_policy
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fm_approval_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_approval_policy_study_status
  ON public.fm_approval_policy(study_id, status);

CREATE TRIGGER fm_approval_policy_set_updated_at
  BEFORE UPDATE ON public.fm_approval_policy
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- -------------------------------------------------------------------------
-- fm_entity_comment
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fm_entity_comment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  body TEXT NOT NULL,
  mention_user_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_entity_comment_study_entity
  ON public.fm_entity_comment(study_id, entity_type, entity_id);

CREATE TRIGGER fm_entity_comment_set_updated_at
  BEFORE UPDATE ON public.fm_entity_comment
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- -------------------------------------------------------------------------
-- fm_table_view — per-user saved filters/columns (RLS: own rows only)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fm_table_view (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_key TEXT NOT NULL,
  name TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, study_id, table_key, name)
);

CREATE INDEX IF NOT EXISTS idx_fm_table_view_user_table
  ON public.fm_table_view(user_id, table_key);
CREATE INDEX IF NOT EXISTS idx_fm_table_view_study_table
  ON public.fm_table_view(study_id, table_key);

CREATE TRIGGER fm_table_view_set_updated_at
  BEFORE UPDATE ON public.fm_table_view
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- -------------------------------------------------------------------------
-- RLS: company-scoped tables (standard Finance pattern)
-- -------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'fm_scheduled_report',
    'fm_export_job',
    'fm_forecast_scenario',
    'fm_approval_delegation',
    'fm_approval_policy',
    'fm_entity_comment'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (company_id = public.fm_current_company_id());',
      tbl || '_select', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (company_id = public.fm_current_company_id());',
      tbl || '_insert', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (company_id = public.fm_current_company_id()) WITH CHECK (company_id = public.fm_current_company_id());',
      tbl || '_update', tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (company_id = public.fm_current_company_id());',
      tbl || '_delete', tbl
    );
  END LOOP;
END $$;

-- fm_table_view: same company + row owner
ALTER TABLE public.fm_table_view ENABLE ROW LEVEL SECURITY;

CREATE POLICY fm_table_view_select ON public.fm_table_view
  FOR SELECT USING (
    company_id = public.fm_current_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY fm_table_view_insert ON public.fm_table_view
  FOR INSERT WITH CHECK (
    company_id = public.fm_current_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY fm_table_view_update ON public.fm_table_view
  FOR UPDATE USING (
    company_id = public.fm_current_company_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    company_id = public.fm_current_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY fm_table_view_delete ON public.fm_table_view
  FOR DELETE USING (
    company_id = public.fm_current_company_id()
    AND user_id = auth.uid()
  );
