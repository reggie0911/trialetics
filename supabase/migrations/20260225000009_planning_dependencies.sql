-- Planning and Milestones Enhancement
-- Activity dependency tracking for critical path analysis

DO $$ BEGIN
  CREATE TYPE dependency_type AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.activity_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  predecessor_id UUID NOT NULL REFERENCES public.protocol_activities(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES public.protocol_activities(id) ON DELETE CASCADE,
  dependency_type dependency_type NOT NULL DEFAULT 'finish_to_start',
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (predecessor_id <> successor_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_deps_predecessor ON public.activity_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_activity_deps_successor ON public.activity_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_activity_deps_company ON public.activity_dependencies(company_id);

ALTER TABLE public.activity_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity dependencies in their company"
  ON public.activity_dependencies FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage activity dependencies in their company"
  ON public.activity_dependencies FOR ALL
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.activity_dependencies IS 'Dependency relationships between protocol activities for critical path analysis';
