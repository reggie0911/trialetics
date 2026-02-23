-- Workflow Automation Engine
-- Trigger/action rule builder, conditional routing, notification engine

-- ============================================================================
-- Enum types
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE workflow_trigger_type AS ENUM ('record_created', 'record_updated', 'status_changed', 'date_reached', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE workflow_action_type AS ENUM ('send_notification', 'create_action_item', 'update_field', 'send_email', 'assign_task');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Workflow Rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  target_table TEXT NOT NULL,
  trigger_type workflow_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_company ON public.workflow_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_active ON public.workflow_rules(active);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_target ON public.workflow_rules(target_table);

DROP TRIGGER IF EXISTS update_workflow_rules_updated_at ON public.workflow_rules;
CREATE TRIGGER update_workflow_rules_updated_at
  BEFORE UPDATE ON public.workflow_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow rules in their company"
  ON public.workflow_rules FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage workflow rules in their company"
  ON public.workflow_rules FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.workflow_rules IS 'User-defined automation rules with triggers and conditions';

-- ============================================================================
-- Workflow Actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.workflow_rules(id) ON DELETE CASCADE,
  action_type workflow_action_type NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_actions_rule ON public.workflow_actions(rule_id);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_company ON public.workflow_actions(company_id);

ALTER TABLE public.workflow_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow actions in their company"
  ON public.workflow_actions FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage workflow actions in their company"
  ON public.workflow_actions FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.workflow_actions IS 'Actions to execute when a workflow rule is triggered';

-- ============================================================================
-- Workflow Execution Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.workflow_rules(id) ON DELETE CASCADE,
  trigger_record_id UUID,
  trigger_table TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped')),
  actions_executed JSONB,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_exec_company ON public.workflow_execution_log(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_rule ON public.workflow_execution_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_workflow_exec_date ON public.workflow_execution_log(executed_at DESC);

ALTER TABLE public.workflow_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow execution log in their company"
  ON public.workflow_execution_log FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage workflow execution log in their company"
  ON public.workflow_execution_log FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.workflow_execution_log IS 'Tracks workflow rule executions and results';
