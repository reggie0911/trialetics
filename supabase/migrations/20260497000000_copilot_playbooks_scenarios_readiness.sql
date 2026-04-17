-- Copilot Phase 4: Playbooks, Playbook runs, Scenario projections,
-- Inspection readiness snapshots, NL Report definitions, Validation runs.
--
-- Tables in this migration:
--   * copilot_playbooks            -> reusable multi-step workflows
--   * copilot_playbook_runs        -> per-user runs with step state
--   * copilot_scenarios            -> what-if projections (input + output)
--   * copilot_readiness_snapshots  -> inspection readiness scores per scope
--   * copilot_report_definitions   -> NL-defined report specs the user saved
--   * copilot_validation_runs      -> golden-test results per agent/version
--
-- Conventions match the project standard:
--   - UUID PKs with gen_random_uuid()
--   - company_id + RLS via profiles.company_id = auth.uid()
--   - update_updated_at_column() trigger on tables that need it
--   - agent_id + agent_version columns recorded everywhere

------------------------------------------------------------------------------
-- 1. copilot_playbooks
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  category TEXT NULL, -- e.g. 'site_activation', 'monitoring', 'closeout'
  scope TEXT NOT NULL DEFAULT 'study' CHECK (scope IN ('study', 'site', 'subject', 'portfolio')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  agent_hints JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS copilot_playbooks_company_idx
  ON public.copilot_playbooks (company_id, scope) WHERE deleted_at IS NULL;

CREATE TRIGGER copilot_playbooks_set_updated_at
  BEFORE UPDATE ON public.copilot_playbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_playbooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_playbooks_select" ON public.copilot_playbooks;
CREATE POLICY "copilot_playbooks_select" ON public.copilot_playbooks
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      is_built_in = true
      OR company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "copilot_playbooks_insert" ON public.copilot_playbooks;
CREATE POLICY "copilot_playbooks_insert" ON public.copilot_playbooks
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "copilot_playbooks_update" ON public.copilot_playbooks;
CREATE POLICY "copilot_playbooks_update" ON public.copilot_playbooks
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND is_built_in = false
  );

DROP POLICY IF EXISTS "copilot_playbooks_delete" ON public.copilot_playbooks;
CREATE POLICY "copilot_playbooks_delete" ON public.copilot_playbooks
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND is_built_in = false
  );

------------------------------------------------------------------------------
-- 2. copilot_playbook_runs
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_playbook_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- TEXT (not UUID FK) so built-in playbooks (slug IDs) can be referenced
  -- alongside customer-specific playbook UUIDs without forcing a clone-on-use.
  playbook_id TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_id UUID NULL,
  site_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
  current_step INTEGER NOT NULL DEFAULT 0,
  step_states JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_playbook_runs_user_idx
  ON public.copilot_playbook_runs (user_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS copilot_playbook_runs_playbook_idx
  ON public.copilot_playbook_runs (playbook_id);

CREATE TRIGGER copilot_playbook_runs_set_updated_at
  BEFORE UPDATE ON public.copilot_playbook_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_playbook_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_playbook_runs_select" ON public.copilot_playbook_runs;
CREATE POLICY "copilot_playbook_runs_select" ON public.copilot_playbook_runs
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND (p.role = 'admin' OR p.is_platform_admin = true))
    )
  );

DROP POLICY IF EXISTS "copilot_playbook_runs_insert" ON public.copilot_playbook_runs;
CREATE POLICY "copilot_playbook_runs_insert" ON public.copilot_playbook_runs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "copilot_playbook_runs_update" ON public.copilot_playbook_runs;
CREATE POLICY "copilot_playbook_runs_update" ON public.copilot_playbook_runs
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "copilot_playbook_runs_delete" ON public.copilot_playbook_runs;
CREATE POLICY "copilot_playbook_runs_delete" ON public.copilot_playbook_runs
  FOR DELETE USING (user_id = auth.uid());

------------------------------------------------------------------------------
-- 3. copilot_scenarios
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_id UUID NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  inputs JSONB NOT NULL,
  projection JSONB NOT NULL,
  agent_id TEXT NOT NULL DEFAULT 'scenario-modeler',
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_scenarios_user_idx
  ON public.copilot_scenarios (user_id, created_at DESC);

ALTER TABLE public.copilot_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_scenarios_select" ON public.copilot_scenarios;
CREATE POLICY "copilot_scenarios_select" ON public.copilot_scenarios
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "copilot_scenarios_insert" ON public.copilot_scenarios;
CREATE POLICY "copilot_scenarios_insert" ON public.copilot_scenarios
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "copilot_scenarios_delete" ON public.copilot_scenarios;
CREATE POLICY "copilot_scenarios_delete" ON public.copilot_scenarios
  FOR DELETE USING (user_id = auth.uid());

------------------------------------------------------------------------------
-- 4. copilot_readiness_snapshots
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_readiness_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('study', 'site', 'portfolio')),
  scope_id UUID NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade TEXT NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  agent_id TEXT NOT NULL DEFAULT 'inspection-readiness',
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  generated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_readiness_scope_idx
  ON public.copilot_readiness_snapshots (scope_kind, scope_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS copilot_readiness_company_idx
  ON public.copilot_readiness_snapshots (company_id, generated_at DESC);

ALTER TABLE public.copilot_readiness_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_readiness_select" ON public.copilot_readiness_snapshots;
CREATE POLICY "copilot_readiness_select" ON public.copilot_readiness_snapshots
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "copilot_readiness_insert" ON public.copilot_readiness_snapshots;
CREATE POLICY "copilot_readiness_insert" ON public.copilot_readiness_snapshots
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

------------------------------------------------------------------------------
-- 5. copilot_report_definitions
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  spec JSONB NOT NULL,
  agent_id TEXT NOT NULL DEFAULT 'nl-report-builder',
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_report_definitions_user_idx
  ON public.copilot_report_definitions (user_id, created_at DESC);

CREATE TRIGGER copilot_report_definitions_set_updated_at
  BEFORE UPDATE ON public.copilot_report_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.copilot_report_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_report_definitions_all" ON public.copilot_report_definitions;
CREATE POLICY "copilot_report_definitions_all" ON public.copilot_report_definitions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

------------------------------------------------------------------------------
-- 6. copilot_validation_runs
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.copilot_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  model TEXT NULL,
  total_cases INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  results JSONB NOT NULL,
  duration_ms INTEGER NULL,
  triggered_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS copilot_validation_agent_idx
  ON public.copilot_validation_runs (agent_id, created_at DESC);

ALTER TABLE public.copilot_validation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "copilot_validation_select" ON public.copilot_validation_runs;
CREATE POLICY "copilot_validation_select" ON public.copilot_validation_runs
  FOR SELECT USING (
    company_id IS NULL
    OR company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "copilot_validation_insert" ON public.copilot_validation_runs;
CREATE POLICY "copilot_validation_insert" ON public.copilot_validation_runs
  FOR INSERT WITH CHECK (
    company_id IS NULL
    OR company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );
