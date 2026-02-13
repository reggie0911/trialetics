-- Phase 1: Merge Projects into Clinical Protocols (Option B)
-- Replaces projects with clinical_protocols as the central CTMS entity
-- Migrates: user_projects → user_protocol_assignments
--           organization_projects → organization_protocols
--           contact_projects → contact_protocols
--           site_visits, site_contracts, site_documents: project_id → protocol_id
--           trip_report_templates, todos: project_id → protocol_id
-- Drops: projects table, user_projects

-- ============================================================================
-- 1. Ensure every project has a corresponding clinical_protocol
--    Projects already linked via clinical_protocols.project_id keep that protocol
--    Projects without a linked protocol get a new clinical_protocol created
-- ============================================================================

-- Create protocol from project for orphan projects (no linked clinical_protocol)
INSERT INTO public.clinical_protocols (
  company_id,
  protocol_number,
  title,
  phase,
  status,
  planned_sites_count,
  planned_subjects_count,
  planned_start_date,
  planned_end_date,
  project_id,
  created_by_id,
  creator_email
)
SELECT
  p.company_id,
  p.protocol_number,
  p.protocol_name,
  CASE p.trial_phase
    WHEN 'Phase I' THEN 'phase_i'::protocol_phase
    WHEN 'Phase II' THEN 'phase_ii'::protocol_phase
    WHEN 'Phase III' THEN 'phase_iii'::protocol_phase
    WHEN 'Phase IV' THEN 'phase_iv'::protocol_phase
    ELSE 'observational'::protocol_phase
  END,
  CASE p.protocol_status
    WHEN 'planning' THEN 'planned'::protocol_status
    WHEN 'approved' THEN 'in_progress'::protocol_status
    WHEN 'closed' THEN 'completed'::protocol_status
    ELSE 'planned'::protocol_status
  END,
  p.planned_sites,
  p.planned_subjects,
  p.planned_start_date,
  p.planned_end_date,
  p.id,
  p.created_by_id,
  p.creator_email
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.clinical_protocols cp
  WHERE cp.project_id = p.id
)
ON CONFLICT (company_id, protocol_number) DO UPDATE SET project_id = EXCLUDED.project_id;

-- ============================================================================
-- 2. Create user_protocol_assignments from user_projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_protocol_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_email TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, protocol_id)
);

CREATE INDEX IF NOT EXISTS idx_user_protocol_assignments_user_id ON public.user_protocol_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_protocol_assignments_protocol_id ON public.user_protocol_assignments(protocol_id);

-- Migrate user_projects → user_protocol_assignments (user_id = profile id, project_id → protocol_id)
INSERT INTO public.user_protocol_assignments (user_id, protocol_id, created_by_id, creator_email)
SELECT
  up.user_id,
  cp.id,
  up.created_by_id,
  up.creator_email
FROM public.user_projects up
JOIN public.clinical_protocols cp ON cp.project_id = up.project_id
ON CONFLICT (user_id, protocol_id) DO NOTHING;

-- RLS for user_protocol_assignments
ALTER TABLE public.user_protocol_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their protocol assignments"
  ON public.user_protocol_assignments FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id IN (
      SELECT p2.id FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid() AND p1.company_id IS NOT NULL
    )
  );

-- Users can assign protocols to themselves if protocol is in their company
CREATE POLICY "user_protocol_assignments_insert_self"
  ON public.user_protocol_assignments FOR INSERT
  WITH CHECK (
    user_protocol_assignments.user_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.clinical_protocols cp
      JOIN public.profiles prof ON prof.company_id = cp.company_id
      WHERE cp.id = user_protocol_assignments.protocol_id
        AND prof.user_id = auth.uid()
    )
  );

-- Users can assign protocols to others in same company
CREATE POLICY "user_protocol_assignments_insert_others"
  ON public.user_protocol_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.company_id = p2.company_id
      WHERE p1.user_id = auth.uid()
        AND p2.id = user_protocol_assignments.user_id
        AND p1.company_id IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.clinical_protocols cp
      JOIN public.profiles prof ON prof.company_id = cp.company_id
      WHERE cp.id = user_protocol_assignments.protocol_id
        AND prof.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete protocol assignments"
  ON public.user_protocol_assignments FOR DELETE
  USING (
    protocol_id IN (
      SELECT id FROM public.clinical_protocols
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.user_protocol_assignments IS 'User assignments to clinical protocols (replaces user_projects)';

-- ============================================================================
-- 3. Create organization_protocols from organization_projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organization_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  role organization_project_role NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  site_initiation_date DATE,
  site_qualification_date DATE,
  irb_approval_date DATE,
  irb_expiration_date DATE,
  irb_approval_number TEXT,
  irb_institution_name TEXT,
  close_out_date DATE,
  first_subject_enrolled_date DATE,
  last_subject_enrolled_date DATE,
  last_completed_visit_date DATE,
  planned_subject_count INTEGER DEFAULT 0,
  enrolled_subject_count INTEGER DEFAULT 0,
  screen_failure_count INTEGER DEFAULT 0,
  completed_subject_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, protocol_id, role)
);

CREATE INDEX IF NOT EXISTS idx_organization_protocols_org_id ON public.organization_protocols(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_protocols_protocol_id ON public.organization_protocols(protocol_id);
CREATE INDEX IF NOT EXISTS idx_organization_protocols_role ON public.organization_protocols(role);

DROP TRIGGER IF EXISTS update_organization_protocols_updated_at ON public.organization_protocols;
CREATE TRIGGER update_organization_protocols_updated_at
  BEFORE UPDATE ON public.organization_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate organization_projects → organization_protocols (including site milestone fields)
INSERT INTO public.organization_protocols (
  organization_id, protocol_id, role, status, start_date, end_date,
  site_initiation_date, site_qualification_date, irb_approval_date, irb_expiration_date,
  irb_approval_number, irb_institution_name, close_out_date,
  first_subject_enrolled_date, last_subject_enrolled_date, last_completed_visit_date,
  planned_subject_count, enrolled_subject_count, screen_failure_count, completed_subject_count
)
SELECT
  op.organization_id,
  cp.id,
  op.role,
  op.status,
  op.start_date,
  op.end_date,
  op.site_initiation_date,
  op.site_qualification_date,
  op.irb_approval_date,
  op.irb_expiration_date,
  op.irb_approval_number,
  op.irb_institution_name,
  op.close_out_date,
  op.first_subject_enrolled_date,
  op.last_subject_enrolled_date,
  op.last_completed_visit_date,
  op.planned_subject_count,
  op.enrolled_subject_count,
  op.screen_failure_count,
  op.completed_subject_count
FROM public.organization_projects op
JOIN public.clinical_protocols cp ON cp.project_id = op.project_id
ON CONFLICT (organization_id, protocol_id, role) DO NOTHING;

-- RLS for organization_protocols (copy from organization_projects)
ALTER TABLE public.organization_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization_protocols in their company"
  ON public.organization_protocols FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM public.organizations
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage organization_protocols in their company"
  ON public.organization_protocols FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- 4. Create contact_protocols from contact_projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contact_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  role contact_project_role NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, protocol_id, role)
);

CREATE INDEX IF NOT EXISTS idx_contact_protocols_contact_id ON public.contact_protocols(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_protocols_protocol_id ON public.contact_protocols(protocol_id);
CREATE INDEX IF NOT EXISTS idx_contact_protocols_org_id ON public.contact_protocols(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_protocols_role ON public.contact_protocols(role);

DROP TRIGGER IF EXISTS update_contact_protocols_updated_at ON public.contact_protocols;
CREATE TRIGGER update_contact_protocols_updated_at
  BEFORE UPDATE ON public.contact_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate contact_projects → contact_protocols
INSERT INTO public.contact_protocols (contact_id, protocol_id, organization_id, role, status, start_date, end_date)
SELECT
  cp_old.contact_id,
  cp.id,
  cp_old.organization_id,
  cp_old.role,
  cp_old.status,
  cp_old.start_date,
  cp_old.end_date
FROM public.contact_projects cp_old
JOIN public.clinical_protocols cp ON cp.project_id = cp_old.project_id
ON CONFLICT (contact_id, protocol_id, role) DO NOTHING;

-- RLS for contact_protocols
ALTER TABLE public.contact_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact_protocols in their company"
  ON public.contact_protocols FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM public.contacts
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage contact_protocols in their company"
  ON public.contact_protocols FOR ALL
  USING (
    contact_id IN (
      SELECT id FROM public.contacts
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    contact_id IN (
      SELECT id FROM public.contacts
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- 5. Add protocol_id to site_visits, migrate, drop project_id
-- ============================================================================

ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

UPDATE public.site_visits sv
SET protocol_id = COALESCE(
  (SELECT cp.id FROM public.clinical_protocols cp WHERE cp.project_id = sv.project_id LIMIT 1),
  (SELECT cp.id FROM public.clinical_protocols cp
   JOIN public.projects p ON p.company_id = cp.company_id AND p.protocol_number = cp.protocol_number
   WHERE p.id = sv.project_id LIMIT 1)
)
WHERE sv.project_id IS NOT NULL AND sv.protocol_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_site_visits_protocol_id ON public.site_visits(protocol_id);

ALTER TABLE public.site_visits DROP CONSTRAINT IF EXISTS site_visits_project_id_fkey;
ALTER TABLE public.site_visits DROP COLUMN IF EXISTS project_id;

DROP INDEX IF EXISTS idx_site_visits_project_id;

-- ============================================================================
-- 6. site_contracts: migrate project_id, drop project_id
--    (site_contracts already has protocol_id from clinical payments migration)
-- ============================================================================

UPDATE public.site_contracts sc
SET protocol_id = COALESCE(
  sc.protocol_id,
  (SELECT cp.id FROM public.clinical_protocols cp WHERE cp.project_id = sc.project_id LIMIT 1),
  (SELECT cp.id FROM public.clinical_protocols cp
   JOIN public.projects p ON p.company_id = cp.company_id AND p.protocol_number = cp.protocol_number
   WHERE p.id = sc.project_id LIMIT 1)
)
WHERE sc.project_id IS NOT NULL AND sc.protocol_id IS NULL;

ALTER TABLE public.site_contracts DROP CONSTRAINT IF EXISTS site_contracts_project_id_fkey;
ALTER TABLE public.site_contracts DROP COLUMN IF EXISTS project_id;

DROP INDEX IF EXISTS idx_site_contracts_project_id;

-- ============================================================================
-- 7. Add protocol_id to site_documents, migrate, drop project_id
-- ============================================================================

ALTER TABLE public.site_documents
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

UPDATE public.site_documents sd
SET protocol_id = COALESCE(
  (SELECT cp.id FROM public.clinical_protocols cp WHERE cp.project_id = sd.project_id LIMIT 1),
  (SELECT cp.id FROM public.clinical_protocols cp
   JOIN public.projects p ON p.company_id = cp.company_id AND p.protocol_number = cp.protocol_number
   WHERE p.id = sd.project_id LIMIT 1)
)
WHERE sd.project_id IS NOT NULL AND sd.protocol_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_site_documents_protocol_id ON public.site_documents(protocol_id);

ALTER TABLE public.site_documents DROP CONSTRAINT IF EXISTS site_documents_project_id_fkey;
ALTER TABLE public.site_documents DROP COLUMN IF EXISTS project_id;

DROP INDEX IF EXISTS idx_site_documents_project_id;

-- ============================================================================
-- 8. trip_report_templates: project_id → protocol_id
-- ============================================================================

ALTER TABLE public.trip_report_templates
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL;

UPDATE public.trip_report_templates trt
SET protocol_id = COALESCE(
  (SELECT cp.id FROM public.clinical_protocols cp WHERE cp.project_id = trt.project_id LIMIT 1),
  (SELECT cp.id FROM public.clinical_protocols cp
   JOIN public.projects p ON p.company_id = cp.company_id AND p.protocol_number = cp.protocol_number
   WHERE p.id = trt.project_id LIMIT 1)
)
WHERE trt.project_id IS NOT NULL AND trt.protocol_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_trip_report_templates_protocol_id ON public.trip_report_templates(protocol_id);

ALTER TABLE public.trip_report_templates DROP CONSTRAINT IF EXISTS trip_report_templates_project_id_fkey;
ALTER TABLE public.trip_report_templates DROP COLUMN IF EXISTS project_id;

DROP INDEX IF EXISTS idx_trip_report_templates_project_id;

-- ============================================================================
-- 9. todos: project_id → protocol_id
-- ============================================================================

ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE CASCADE;

UPDATE public.todos t
SET protocol_id = COALESCE(
  (SELECT cp.id FROM public.clinical_protocols cp WHERE cp.project_id = t.project_id LIMIT 1),
  (SELECT cp.id FROM public.clinical_protocols cp
   JOIN public.projects p ON p.company_id = cp.company_id AND p.protocol_number = cp.protocol_number
   WHERE p.id = t.project_id LIMIT 1)
)
WHERE t.project_id IS NOT NULL AND t.protocol_id IS NULL;

-- Make protocol_id NOT NULL after migration (todos historically required project)
ALTER TABLE public.todos ALTER COLUMN protocol_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_todos_protocol_id ON public.todos(protocol_id);
CREATE INDEX IF NOT EXISTS idx_todos_user_protocol ON public.todos(user_id, protocol_id);

-- Drop RLS policy that references project_id before dropping the column
DROP POLICY IF EXISTS "Users can view todos for their projects" ON public.todos;

ALTER TABLE public.todos DROP CONSTRAINT IF EXISTS todos_project_id_fkey;
ALTER TABLE public.todos DROP COLUMN IF EXISTS project_id;

DROP INDEX IF EXISTS idx_todos_user_project;
DROP INDEX IF EXISTS idx_todos_project_id;

-- ============================================================================
-- 10. document_records: update project_id (TEXT) to protocol_id where it stores project UUID
-- ============================================================================

UPDATE public.document_records dr
SET project_id = (
  SELECT cp.id::text FROM public.clinical_protocols cp
  WHERE cp.project_id::text = dr.project_id
  LIMIT 1
)
WHERE dr.project_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id::text = dr.project_id);

-- ============================================================================
-- 11. Recreate protocol_assignments view (replaces project_assignments)
-- ============================================================================

DROP VIEW IF EXISTS public.project_assignments;

CREATE OR REPLACE VIEW public.protocol_assignments AS
SELECT
  cp.id as protocol_id,
  cp.protocol_number,
  cp.title as protocol_name,
  cp.status as protocol_status,
  cp.phase as trial_phase,
  cp.company_id,
  c.name as company_name,
  prof.id as profile_id,
  prof.user_id,
  prof.email,
  prof.first_name,
  prof.last_name,
  prof.role,
  upa.assigned_at
FROM public.clinical_protocols cp
JOIN public.companies c ON c.id = cp.company_id
JOIN public.user_protocol_assignments upa ON upa.protocol_id = cp.id
JOIN public.profiles prof ON prof.id = upa.user_id;

COMMENT ON VIEW public.protocol_assignments IS 'User assignments to clinical protocols (replaces project_assignments)';

-- ============================================================================
-- 12. Drop clinical_protocols.project_id, then drop projects and user_projects
-- ============================================================================

ALTER TABLE public.clinical_protocols DROP CONSTRAINT IF EXISTS clinical_protocols_project_id_fkey;
ALTER TABLE public.clinical_protocols DROP COLUMN IF EXISTS project_id;

DROP INDEX IF EXISTS idx_clinical_protocols_project_id;

-- Drop organization_projects and contact_projects (replaced by organization_protocols, contact_protocols)
DROP TABLE IF EXISTS public.organization_projects CASCADE;
DROP TABLE IF EXISTS public.contact_projects CASCADE;

-- Drop user_projects
DROP TABLE IF EXISTS public.user_projects CASCADE;

-- Drop projects
DROP TABLE IF EXISTS public.projects CASCADE;

-- ============================================================================
-- 13. Update todos RLS to use protocol_id
-- ============================================================================

DROP POLICY IF EXISTS "Users can view todos for their projects" ON public.todos;
CREATE POLICY "Users can view todos for their protocols"
  ON public.todos FOR SELECT
  USING (
    user_id = auth.uid()
    OR protocol_id IN (
      SELECT cp.id FROM public.clinical_protocols cp
      WHERE cp.company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );
