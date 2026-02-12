-- Phase 4: Site Visits
-- Per Oracle CTMS: evaluation, initiation, monitoring, close-out, unscheduled
-- Visit Name, Visit Start, Visit Status, Assigned To

CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  visit_name TEXT NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('evaluation', 'initiation', 'monitoring', 'close_out', 'unscheduled')),
  visit_start TIMESTAMPTZ NOT NULL,
  visit_status TEXT NOT NULL DEFAULT 'planned' CHECK (visit_status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_organization_id ON public.site_visits(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_project_id ON public.site_visits(project_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_visit_start ON public.site_visits(visit_start DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_assigned_to ON public.site_visits(assigned_to_id);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_site_visits_updated_at ON public.site_visits;
CREATE TRIGGER update_site_visits_updated_at
  BEFORE UPDATE ON public.site_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Users can view site visits for organizations in their company
CREATE POLICY "Users can view site visits in their company"
  ON public.site_visits
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Users can manage site visits for organizations in their company
CREATE POLICY "Users can manage site visits in their company"
  ON public.site_visits
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.site_visits IS 'Site visits per Oracle CTMS: evaluation, initiation, monitoring, close-out, unscheduled';
