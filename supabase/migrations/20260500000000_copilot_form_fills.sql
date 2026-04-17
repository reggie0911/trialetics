-- Copilot form filling, table updates, template completion (Phase 7)
--
-- Tables:
--   copilot_field_mappings  — learned column→field mappings per (company, source signature, target)
--   copilot_proposals       — pending fill / update / template proposals (resumable)
--   copilot_templates       — reusable structured templates (visit report, CAPA, letter, exec update, custom)
--   copilot_fill_audit      — per-field audit (one row per accepted field) — append-only
--
-- Pattern: per-user RLS, append-only audit, agent versioning everywhere,
-- soft-delete on templates. The per-field audit table is *separate* from
-- the broader `copilot_audit_log` so its schema can stay narrow and
-- queryable per `target_id`/`field_path` without bloating the existing
-- audit feed.

-- =====================================================================
-- copilot_field_mappings
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.copilot_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  /** sha256 of (sorted source column names + doc_type) — drives second-time auto-map. */
  source_signature TEXT NOT NULL,

  /** Either a target form id or a target table id (mutually exclusive). */
  target_form_id TEXT,
  target_table_id TEXT,

  /** mapping: { sourceColumn: { fieldPath, confidence, transform? } } */
  mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  hit_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  agent_id TEXT NOT NULL DEFAULT 'table-mapper',
  agent_version TEXT NOT NULL DEFAULT '1.0.0',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT copilot_field_mappings_target_chk CHECK (
    (target_form_id IS NOT NULL) <> (target_table_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_copilot_field_mappings_lookup
  ON public.copilot_field_mappings(company_id, source_signature, target_form_id, target_table_id);
CREATE INDEX IF NOT EXISTS idx_copilot_field_mappings_user
  ON public.copilot_field_mappings(user_id, last_used_at DESC);

ALTER TABLE public.copilot_field_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_field_mappings_select ON public.copilot_field_mappings;
CREATE POLICY copilot_field_mappings_select ON public.copilot_field_mappings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_field_mappings_insert ON public.copilot_field_mappings;
CREATE POLICY copilot_field_mappings_insert ON public.copilot_field_mappings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_field_mappings_update ON public.copilot_field_mappings;
CREATE POLICY copilot_field_mappings_update ON public.copilot_field_mappings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_field_mappings_delete ON public.copilot_field_mappings;
CREATE POLICY copilot_field_mappings_delete ON public.copilot_field_mappings
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.copilot_field_mappings_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS copilot_field_mappings_touch_updated_at ON public.copilot_field_mappings;
CREATE TRIGGER copilot_field_mappings_touch_updated_at
  BEFORE UPDATE ON public.copilot_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.copilot_field_mappings_touch_updated_at();

-- =====================================================================
-- copilot_proposals
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.copilot_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  kind TEXT NOT NULL,                -- form_fill | table_update | template_fill
  target_id TEXT NOT NULL,           -- registered form id, table id, or template id
  scope_kind TEXT,                   -- study | site | subject | tracker | global
  scope_id TEXT,

  payload JSONB NOT NULL,            -- the full proposal (fields[]/ops[]/sections[])
  status TEXT NOT NULL DEFAULT 'pending',
  source_document_ids JSONB NOT NULL DEFAULT '[]'::jsonb,

  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL DEFAULT '1.0.0',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT copilot_proposals_kind_chk CHECK (
    kind IN ('form_fill', 'table_update', 'template_fill')
  ),
  CONSTRAINT copilot_proposals_status_chk CHECK (
    status IN ('pending', 'partially_accepted', 'accepted', 'rejected', 'discarded')
  )
);

CREATE INDEX IF NOT EXISTS idx_copilot_proposals_user
  ON public.copilot_proposals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_proposals_target
  ON public.copilot_proposals(company_id, target_id, status);

ALTER TABLE public.copilot_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_proposals_select ON public.copilot_proposals;
CREATE POLICY copilot_proposals_select ON public.copilot_proposals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_proposals_insert ON public.copilot_proposals;
CREATE POLICY copilot_proposals_insert ON public.copilot_proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_proposals_update ON public.copilot_proposals;
CREATE POLICY copilot_proposals_update ON public.copilot_proposals
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS copilot_proposals_delete ON public.copilot_proposals;
CREATE POLICY copilot_proposals_delete ON public.copilot_proposals
  FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.copilot_proposals_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS copilot_proposals_touch_updated_at ON public.copilot_proposals;
CREATE TRIGGER copilot_proposals_touch_updated_at
  BEFORE UPDATE ON public.copilot_proposals
  FOR EACH ROW EXECUTE FUNCTION public.copilot_proposals_touch_updated_at();

-- =====================================================================
-- copilot_templates
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.copilot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL,                -- visit_report | capa | letter | exec_update | custom
  /**
   * sections: [{ id, label, kind: 'narrative'|'structured', placeholders?: [], guidance? }]
   * Used by template-completer to know what to fill and what to leave as placeholders.
   */
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,

  study_scope UUID,                  -- optional: scope to a single study
  version INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT copilot_templates_kind_chk CHECK (
    kind IN ('visit_report', 'capa', 'letter', 'exec_update', 'custom')
  )
);

CREATE INDEX IF NOT EXISTS idx_copilot_templates_company
  ON public.copilot_templates(company_id, kind)
  WHERE deleted_at IS NULL;

ALTER TABLE public.copilot_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_templates_select ON public.copilot_templates;
CREATE POLICY copilot_templates_select ON public.copilot_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = copilot_templates.company_id
    )
  );

DROP POLICY IF EXISTS copilot_templates_insert ON public.copilot_templates;
CREATE POLICY copilot_templates_insert ON public.copilot_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = copilot_templates.company_id
    )
  );

DROP POLICY IF EXISTS copilot_templates_update ON public.copilot_templates;
CREATE POLICY copilot_templates_update ON public.copilot_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = copilot_templates.company_id
    )
  );

DROP POLICY IF EXISTS copilot_templates_delete ON public.copilot_templates;
CREATE POLICY copilot_templates_delete ON public.copilot_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = copilot_templates.company_id
    )
  );

CREATE OR REPLACE FUNCTION public.copilot_templates_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS copilot_templates_touch_updated_at ON public.copilot_templates;
CREATE TRIGGER copilot_templates_touch_updated_at
  BEFORE UPDATE ON public.copilot_templates
  FOR EACH ROW EXECUTE FUNCTION public.copilot_templates_touch_updated_at();

-- =====================================================================
-- copilot_fill_audit  (per-field, append-only)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.copilot_fill_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  proposal_id UUID REFERENCES public.copilot_proposals(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,                -- form_fill | table_update | template_fill
  target_id TEXT NOT NULL,
  /** dot-path within the form/template, or row identifier within a table update */
  field_path TEXT NOT NULL,
  before_value JSONB,
  after_value JSONB,

  /** confidence at the time of acceptance (0..1) */
  confidence NUMERIC(4,3),
  /** provenance — array of {documentId, chunkId, excerpt} or other CardSource shapes */
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,

  /** filled when the user edited the proposed value before accepting */
  reason_for_change TEXT,
  /** required for fields on regulated forms (per registry config) */
  e_signature_id UUID,

  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL DEFAULT '1.0.0',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT copilot_fill_audit_kind_chk CHECK (
    kind IN ('form_fill', 'table_update', 'template_fill')
  )
);

CREATE INDEX IF NOT EXISTS idx_copilot_fill_audit_target
  ON public.copilot_fill_audit(company_id, target_id, field_path);
CREATE INDEX IF NOT EXISTS idx_copilot_fill_audit_user
  ON public.copilot_fill_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_fill_audit_proposal
  ON public.copilot_fill_audit(proposal_id);

ALTER TABLE public.copilot_fill_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_fill_audit_select ON public.copilot_fill_audit;
CREATE POLICY copilot_fill_audit_select ON public.copilot_fill_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.company_id = copilot_fill_audit.company_id
    )
  );

DROP POLICY IF EXISTS copilot_fill_audit_insert ON public.copilot_fill_audit;
CREATE POLICY copilot_fill_audit_insert ON public.copilot_fill_audit
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Append-only: block any UPDATE or DELETE.
CREATE OR REPLACE FUNCTION public.copilot_fill_audit_no_modify()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'copilot_fill_audit is append-only; UPDATE/DELETE blocked';
END
$$;

DROP TRIGGER IF EXISTS copilot_fill_audit_no_update ON public.copilot_fill_audit;
CREATE TRIGGER copilot_fill_audit_no_update
  BEFORE UPDATE ON public.copilot_fill_audit
  FOR EACH ROW EXECUTE FUNCTION public.copilot_fill_audit_no_modify();

DROP TRIGGER IF EXISTS copilot_fill_audit_no_delete ON public.copilot_fill_audit;
CREATE TRIGGER copilot_fill_audit_no_delete
  BEFORE DELETE ON public.copilot_fill_audit
  FOR EACH ROW EXECUTE FUNCTION public.copilot_fill_audit_no_modify();

COMMENT ON TABLE public.copilot_field_mappings IS
  'Trialetics Copilot learned source-column → target-field mappings (Phase 7).';
COMMENT ON TABLE public.copilot_proposals IS
  'Pending Copilot proposals (form_fill / table_update / template_fill) — resumable across sessions.';
COMMENT ON TABLE public.copilot_templates IS
  'Reusable structured templates (visit report / CAPA / letter / exec update / custom).';
COMMENT ON TABLE public.copilot_fill_audit IS
  'Per-field audit log for AI-assisted writes — append-only, regulator-grade traceability.';
