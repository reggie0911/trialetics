-- CTMS Reports & Analytics module foundation:
-- - Normalized reporting views
-- - Saved report definitions
-- - Report run audit trail
-- - Export audit trail

-- ---------------------------------------------------------------------------
-- Normalized reporting views
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.report_tasks;
CREATE VIEW public.report_tasks WITH (security_invoker = true) AS
SELECT
  t.id AS task_id,
  s.company_id,
  t.study_id,
  s.title AS study_title,
  s.protocol_number,
  t.site_id,
  ss.site_number,
  ss.name AS site_name,
  t.milestone_id,
  sm.name AS milestone_name,
  t.assigned_to AS assigned_to_profile_id,
  COALESCE(pa.display_name, CONCAT_WS(' ', pa.first_name, pa.last_name), pa.email) AS assigned_to_name,
  t.created_by AS created_by_profile_id,
  COALESCE(pc.display_name, CONCAT_WS(' ', pc.first_name, pc.last_name), pc.email) AS created_by_name,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.on_track_status,
  t.planned_start_date,
  t.due_date,
  t.completed_date,
  t.created_at,
  t.updated_at
FROM public.tasks t
JOIN public.studies s ON s.id = t.study_id
LEFT JOIN public.study_sites ss ON ss.id = t.site_id
LEFT JOIN public.study_milestones sm ON sm.id = t.milestone_id
LEFT JOIN public.profiles pa ON pa.id = t.assigned_to
LEFT JOIN public.profiles pc ON pc.id = t.created_by;

DROP VIEW IF EXISTS public.report_trip_reports;
CREATE VIEW public.report_trip_reports WITH (security_invoker = true) AS
SELECT
  tr.id AS trip_report_id,
  s.company_id,
  mv.study_id,
  s.title AS study_title,
  s.protocol_number,
  tr.visit_id,
  mv.visit_name,
  mv.visit_type,
  mv.status AS visit_status,
  mv.planned_date AS visit_planned_date,
  mv.actual_date AS visit_actual_date,
  mv.site_id,
  ss.site_number,
  ss.name AS site_name,
  tr.status,
  tr.report_status,
  tr.created_by AS created_by_profile_id,
  COALESCE(pc.display_name, CONCAT_WS(' ', pc.first_name, pc.last_name), pc.email) AS created_by_name,
  tr.reviewer_id,
  COALESCE(pr.display_name, CONCAT_WS(' ', pr.first_name, pr.last_name), pr.email) AS reviewer_name,
  tr.approved_by,
  COALESCE(pa.display_name, CONCAT_WS(' ', pa.first_name, pa.last_name), pa.email) AS approved_by_name,
  tr.submission_due_date,
  tr.submitted_date,
  tr.approval_due_date,
  tr.approved_date,
  tr.created_at,
  tr.reviewed_at
FROM public.trip_reports tr
JOIN public.monitoring_visits mv ON mv.id = tr.visit_id
JOIN public.studies s ON s.id = mv.study_id
LEFT JOIN public.study_sites ss ON ss.id = mv.site_id
LEFT JOIN public.profiles pc ON pc.id = tr.created_by
LEFT JOIN public.profiles pr ON pr.id = tr.reviewer_id
LEFT JOIN public.profiles pa ON pa.id = tr.approved_by;

DROP VIEW IF EXISTS public.report_subjects;
CREATE VIEW public.report_subjects WITH (security_invoker = true) AS
SELECT
  subj.id AS subject_id,
  s.company_id,
  subj.study_id,
  s.title AS study_title,
  s.protocol_number,
  subj.site_id,
  ss.site_number,
  ss.name AS site_name,
  subj.subject_number,
  subj.status,
  subj.screening_number,
  subj.screening_date,
  subj.randomization_number,
  subj.randomization_date,
  subj.completion_date,
  subj.withdrawal_date,
  subj.withdrawal_reason,
  subj.created_at,
  subj.updated_at
FROM public.subjects subj
JOIN public.studies s ON s.id = subj.study_id
LEFT JOIN public.study_sites ss ON ss.id = subj.site_id;

DROP VIEW IF EXISTS public.report_sites;
CREATE VIEW public.report_sites WITH (security_invoker = true) AS
SELECT
  ss.id AS site_id,
  s.company_id,
  ss.study_id,
  s.title AS study_title,
  s.protocol_number,
  ss.site_number,
  ss.name AS site_name,
  ss.status,
  ss.city,
  ss.state,
  ss.postal_code,
  ss.activation_date,
  ss.target_enrollment,
  ss.pi_name,
  ss.pi_email,
  ss.pi_directory_contact_id,
  ss.created_at,
  ss.updated_at
FROM public.study_sites ss
JOIN public.studies s ON s.id = ss.study_id;

DROP VIEW IF EXISTS public.report_invoices;
CREATE VIEW public.report_invoices WITH (security_invoker = true) AS
SELECT
  fi.id AS invoice_id,
  fi.company_id,
  fi.study_id,
  s.title AS study_title,
  s.protocol_number,
  fi.site_id,
  ss.site_number,
  ss.name AS site_name,
  fi.institution_id,
  i.name AS institution_name,
  fi.external_invoice_id,
  fi.status,
  fi.entity_type,
  fi.amount,
  fi.currency,
  fi.received_at,
  fi.due_at,
  fi.approval_step,
  fi.created_by_profile_id,
  COALESCE(pc.display_name, CONCAT_WS(' ', pc.first_name, pc.last_name), pc.email) AS created_by_name,
  fi.created_at,
  fi.updated_at
FROM public.finance_invoices fi
JOIN public.studies s ON s.id = fi.study_id
LEFT JOIN public.study_sites ss ON ss.id = fi.site_id
LEFT JOIN public.institutions i ON i.id = fi.institution_id
LEFT JOIN public.profiles pc ON pc.id = fi.created_by_profile_id;

DROP VIEW IF EXISTS public.report_inventory_transactions;
CREATE VIEW public.report_inventory_transactions WITH (security_invoker = true) AS
SELECT
  ile.id AS entry_id,
  s.company_id,
  ile.study_id,
  s.title AS study_title,
  s.protocol_number,
  ile.entry_type,
  ile.quantity_delta,
  ile.performed_at,
  ile.performed_by_profile_id,
  COALESCE(pp.display_name, CONCAT_WS(' ', pp.first_name, pp.last_name), pp.email) AS performed_by_name,
  ile.lot_id,
  il.lot_number,
  il.batch_number,
  il.serial_number,
  il.item_id,
  ii.name AS item_name,
  ii.category AS item_category,
  ii.unit AS item_unit,
  ile.ip_order_id,
  ile.from_study_site_id,
  fss.site_number AS from_site_number,
  fss.name AS from_site_name,
  ile.to_study_site_id,
  tss.site_number AS to_site_number,
  tss.name AS to_site_name,
  ile.subject_id,
  subj.subject_number,
  ile.metadata
FROM public.ip_ledger_entries ile
JOIN public.studies s ON s.id = ile.study_id
JOIN public.ip_lots il ON il.id = ile.lot_id
JOIN public.ip_items ii ON ii.id = il.item_id
LEFT JOIN public.profiles pp ON pp.id = ile.performed_by_profile_id
LEFT JOIN public.study_sites fss ON fss.id = ile.from_study_site_id
LEFT JOIN public.study_sites tss ON tss.id = ile.to_study_site_id
LEFT JOIN public.subjects subj ON subj.id = ile.subject_id;

GRANT SELECT ON public.report_tasks TO authenticated;
GRANT SELECT ON public.report_trip_reports TO authenticated;
GRANT SELECT ON public.report_subjects TO authenticated;
GRANT SELECT ON public.report_sites TO authenticated;
GRANT SELECT ON public.report_invoices TO authenticated;
GRANT SELECT ON public.report_inventory_transactions TO authenticated;

-- ---------------------------------------------------------------------------
-- Reporting metadata tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  dataset_key TEXT NOT NULL CHECK (
    dataset_key IN (
      'report_tasks',
      'report_trip_reports',
      'report_subjects',
      'report_sites',
      'report_invoices',
      'report_inventory_transactions'
    )
  ),
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
  selected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  grouping JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  chart_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule_config JSONB,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  updated_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_runs_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL,
  report_definition_id UUID REFERENCES public.report_definitions(id) ON DELETE SET NULL,
  dataset_key TEXT NOT NULL CHECK (
    dataset_key IN (
      'report_tasks',
      'report_trip_reports',
      'report_subjects',
      'report_sites',
      'report_invoices',
      'report_inventory_transactions'
    )
  ),
  run_context TEXT NOT NULL DEFAULT 'interactive' CHECK (
    run_context IN ('quick', 'custom', 'saved', 'scheduled', 'export_preview', 'interactive')
  ),
  status TEXT NOT NULL DEFAULT 'started' CHECK (
    status IN ('started', 'succeeded', 'failed', 'cancelled')
  ),
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '[]'::jsonb,
  grouping JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  row_count INTEGER,
  duration_ms INTEGER,
  error_code TEXT,
  error_message TEXT,
  executed_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_exports_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL,
  report_run_id UUID REFERENCES public.report_runs_audit(id) ON DELETE SET NULL,
  report_definition_id UUID REFERENCES public.report_definitions(id) ON DELETE SET NULL,
  dataset_key TEXT NOT NULL CHECK (
    dataset_key IN (
      'report_tasks',
      'report_trip_reports',
      'report_subjects',
      'report_sites',
      'report_invoices',
      'report_inventory_transactions'
    )
  ),
  export_format TEXT NOT NULL CHECK (export_format IN ('csv', 'xlsx', 'pdf')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'succeeded', 'failed', 'cancelled')
  ),
  file_name TEXT NOT NULL,
  storage_path TEXT,
  bytes_written BIGINT,
  row_count INTEGER,
  export_context TEXT NOT NULL DEFAULT 'manual' CHECK (
    export_context IN ('manual', 'scheduled', 'api')
  ),
  requested_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS report_definitions_company_study_idx
  ON public.report_definitions (company_id, study_id);
CREATE INDEX IF NOT EXISTS report_definitions_dataset_idx
  ON public.report_definitions (dataset_key);
CREATE INDEX IF NOT EXISTS report_definitions_owner_idx
  ON public.report_definitions (created_by_profile_id);
CREATE INDEX IF NOT EXISTS report_definitions_updated_idx
  ON public.report_definitions (updated_at DESC);

CREATE INDEX IF NOT EXISTS report_runs_audit_company_study_idx
  ON public.report_runs_audit (company_id, study_id);
CREATE INDEX IF NOT EXISTS report_runs_audit_dataset_idx
  ON public.report_runs_audit (dataset_key, created_at DESC);
CREATE INDEX IF NOT EXISTS report_runs_audit_executed_by_idx
  ON public.report_runs_audit (executed_by_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS report_runs_audit_status_idx
  ON public.report_runs_audit (status, created_at DESC);

CREATE INDEX IF NOT EXISTS report_exports_audit_company_study_idx
  ON public.report_exports_audit (company_id, study_id);
CREATE INDEX IF NOT EXISTS report_exports_audit_dataset_idx
  ON public.report_exports_audit (dataset_key, created_at DESC);
CREATE INDEX IF NOT EXISTS report_exports_audit_requested_by_idx
  ON public.report_exports_audit (requested_by_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS report_exports_audit_status_idx
  ON public.report_exports_audit (status, created_at DESC);

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_exports_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_definitions_select" ON public.report_definitions;
CREATE POLICY "report_definitions_select" ON public.report_definitions
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "report_definitions_insert" ON public.report_definitions;
CREATE POLICY "report_definitions_insert" ON public.report_definitions
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND created_by_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      study_id IS NULL
      OR study_id IN (
        SELECT id
        FROM public.studies
        WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "report_definitions_update" ON public.report_definitions;
CREATE POLICY "report_definitions_update" ON public.report_definitions
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      created_by_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.company_id = report_definitions.company_id
          AND p.role = 'admin'
      )
    )
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      study_id IS NULL
      OR study_id IN (
        SELECT id
        FROM public.studies
        WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "report_definitions_delete" ON public.report_definitions;
CREATE POLICY "report_definitions_delete" ON public.report_definitions
  FOR DELETE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      created_by_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.company_id = report_definitions.company_id
          AND p.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS "report_runs_audit_select" ON public.report_runs_audit;
CREATE POLICY "report_runs_audit_select" ON public.report_runs_audit
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "report_runs_audit_insert" ON public.report_runs_audit;
CREATE POLICY "report_runs_audit_insert" ON public.report_runs_audit
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND executed_by_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      study_id IS NULL
      OR study_id IN (
        SELECT id
        FROM public.studies
        WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "report_runs_audit_update" ON public.report_runs_audit;
CREATE POLICY "report_runs_audit_update" ON public.report_runs_audit
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      executed_by_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.company_id = report_runs_audit.company_id
          AND p.role = 'admin'
      )
    )
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "report_exports_audit_select" ON public.report_exports_audit;
CREATE POLICY "report_exports_audit_select" ON public.report_exports_audit
  FOR SELECT USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "report_exports_audit_insert" ON public.report_exports_audit;
CREATE POLICY "report_exports_audit_insert" ON public.report_exports_audit
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND requested_by_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      study_id IS NULL
      OR study_id IN (
        SELECT id
        FROM public.studies
        WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "report_exports_audit_update" ON public.report_exports_audit;
CREATE POLICY "report_exports_audit_update" ON public.report_exports_audit
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      requested_by_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND p.company_id = report_exports_audit.company_id
          AND p.role = 'admin'
      )
    )
  ) WITH CHECK (
    company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );
