-- Phase 3: Site Status History
-- Per Oracle CTMS: "Old Status, New Status, Date, Employee Login"

CREATE TABLE IF NOT EXISTS public.organization_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  changed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_org_status_history_org_id 
  ON public.organization_status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_status_history_changed_at 
  ON public.organization_status_history(changed_at DESC);

ALTER TABLE public.organization_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view status history for organizations in their company
CREATE POLICY "Users can view org status history in their company"
  ON public.organization_status_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Only the database/trigger inserts (service role) - or we allow app inserts via service
-- For app-level inserts, we need INSERT policy. Use auth.uid() for insert.
CREATE POLICY "Users can insert org status history for their company orgs"
  ON public.organization_status_history
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE public.organization_status_history IS 'Tracks status changes for organizations (sites) per Oracle CTMS';
