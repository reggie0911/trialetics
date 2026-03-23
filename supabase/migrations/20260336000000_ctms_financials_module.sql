-- =====================================================
-- CTMS Financials: invoices, payments, approvals, audit,
-- site budgets, budget versioning, storage bucket, roles
-- =====================================================

-- ---------- Study team + join links: finance approval roles ----------
ALTER TABLE public.company_join_links DROP CONSTRAINT IF EXISTS company_join_links_study_role_check;
ALTER TABLE public.company_join_links ADD CONSTRAINT company_join_links_study_role_check CHECK (
  study_role IS NULL OR study_role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'finance_director', 'finance_reviewer',
    'inventory_specialist', 'medical_writer', 'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist', 'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

ALTER TABLE public.study_team_members DROP CONSTRAINT IF EXISTS study_team_members_role_check;
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_study_role_check;

ALTER TABLE public.study_team_members ADD CONSTRAINT study_team_members_role_check CHECK (
  role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'finance_director', 'finance_reviewer',
    'inventory_specialist', 'medical_writer', 'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist', 'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

ALTER TABLE public.invitations ADD CONSTRAINT invitations_study_role_check CHECK (
  study_role IS NULL OR study_role IN (
    'accounts_payable_specialist', 'biostatistician', 'clinical_contracts_specialist',
    'clinical_data_manager', 'clinical_project_manager', 'clinical_research_associate',
    'clinical_trial_assistant', 'contracts_manager', 'cra_manager', 'executive_director',
    'finance_director', 'finance_reviewer',
    'inventory_specialist', 'medical_writer', 'regulatory_specialist', 'safety_specialist',
    'site_budget_specialist', 'study_startup_specialist', 'vendor_manager', 'custom'
  )
);

-- ---------- Budget versioning (study_budgets) ----------
ALTER TABLE public.study_budgets
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_budget_id UUID REFERENCES public.study_budgets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_study_budgets_supersedes ON public.study_budgets(supersedes_budget_id);

-- ---------- Site budgets (negotiation / per-site) ----------
CREATE TABLE IF NOT EXISTS public.site_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE CASCADE,
  study_budget_id UUID REFERENCES public.study_budgets(id) ON DELETE SET NULL,
  proposed_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_amount NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  negotiation_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (negotiation_status IN ('draft', 'in_review', 'approved', 'rejected')),
  payment_terms_type TEXT NOT NULL DEFAULT 'invoice'
    CHECK (payment_terms_type IN ('per_visit', 'milestone', 'invoice')),
  terms JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (study_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_site_budgets_study ON public.site_budgets(study_id);
CREATE INDEX IF NOT EXISTS idx_site_budgets_site ON public.site_budgets(site_id);

CREATE TRIGGER update_site_budgets_updated_at
  BEFORE UPDATE ON public.site_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_budgets_select" ON public.site_budgets FOR SELECT USING (
  study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "site_budgets_insert" ON public.site_budgets FOR INSERT WITH CHECK (
  study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "site_budgets_update" ON public.site_budgets FOR UPDATE USING (
  study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "site_budgets_delete" ON public.site_budgets FOR DELETE USING (
  study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- ---------- Financial contracts (metadata + optional storage path) ----------
CREATE TABLE IF NOT EXISTS public.financial_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL DEFAULT 'other' CHECK (contract_type IN ('cta', 'vendor', 'other')),
  title TEXT NOT NULL,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  effective_date DATE,
  storage_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_contracts_study ON public.financial_contracts(study_id);

CREATE TRIGGER update_financial_contracts_updated_at
  BEFORE UPDATE ON public.financial_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_contracts_select" ON public.financial_contracts FOR SELECT USING (
  study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "financial_contracts_insert" ON public.financial_contracts FOR INSERT WITH CHECK (
  study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "financial_contracts_update" ON public.financial_contracts FOR UPDATE USING (
  study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "financial_contracts_delete" ON public.financial_contracts FOR DELETE USING (
  study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- ---------- Approval templates (JSON steps per company) ----------
CREATE TABLE IF NOT EXISTS public.finance_approval_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN NOT NULL DEFAULT false,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_threshold_cents BIGINT NOT NULL DEFAULT 5000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_approval_templates_one_default
  ON public.finance_approval_templates(company_id) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_finance_approval_templates_company ON public.finance_approval_templates(company_id);

CREATE TRIGGER update_finance_approval_templates_updated_at
  BEFORE UPDATE ON public.finance_approval_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_approval_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_approval_templates_select" ON public.finance_approval_templates FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_approval_templates_insert" ON public.finance_approval_templates FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_approval_templates_update" ON public.finance_approval_templates FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_approval_templates_delete" ON public.finance_approval_templates FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

-- ---------- Finance invoices ----------
CREATE TABLE IF NOT EXISTS public.finance_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('site', 'vendor', 'irb')),
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  external_invoice_id TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_at DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid'
  )),
  approval_step INTEGER NOT NULL DEFAULT 0,
  template_id UUID REFERENCES public.finance_approval_templates(id) ON DELETE SET NULL,
  legacy_site_payment_id UUID UNIQUE REFERENCES public.site_payments(id) ON DELETE SET NULL,
  notes TEXT,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_invoices_study ON public.finance_invoices(study_id);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_company ON public.finance_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_status ON public.finance_invoices(status);
CREATE INDEX IF NOT EXISTS idx_finance_invoices_site ON public.finance_invoices(site_id);

CREATE TRIGGER update_finance_invoices_updated_at
  BEFORE UPDATE ON public.finance_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_invoices_select" ON public.finance_invoices FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_invoices_insert" ON public.finance_invoices FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND study_id IN (SELECT id FROM public.studies WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "finance_invoices_update" ON public.finance_invoices FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_invoices_delete" ON public.finance_invoices FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

-- ---------- Per-step approval decisions ----------
CREATE TABLE IF NOT EXISTS public.finance_invoice_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_invoice_decisions_invoice ON public.finance_invoice_decisions(invoice_id);

ALTER TABLE public.finance_invoice_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_invoice_decisions_select" ON public.finance_invoice_decisions FOR SELECT USING (
  invoice_id IN (SELECT id FROM public.finance_invoices WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "finance_invoice_decisions_insert" ON public.finance_invoice_decisions FOR INSERT WITH CHECK (
  invoice_id IN (SELECT id FROM public.finance_invoices WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  AND profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- ---------- Payments & allocations ----------
CREATE TABLE IF NOT EXISTS public.finance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL DEFAULT 'ach' CHECK (method IN ('ach', 'wire', 'check')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'paid', 'failed')),
  paid_at TIMESTAMPTZ,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_payments_study ON public.finance_payments(study_id);
CREATE INDEX IF NOT EXISTS idx_finance_payments_company ON public.finance_payments(company_id);

CREATE TRIGGER update_finance_payments_updated_at
  BEFORE UPDATE ON public.finance_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_payments_select" ON public.finance_payments FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_payments_insert" ON public.finance_payments FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_payments_update" ON public.finance_payments FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_payments_delete" ON public.finance_payments FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.finance_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.finance_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_finance_payment_allocations_invoice ON public.finance_payment_allocations(invoice_id);

ALTER TABLE public.finance_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_payment_allocations_select" ON public.finance_payment_allocations FOR SELECT USING (
  payment_id IN (SELECT id FROM public.finance_payments WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "finance_payment_allocations_insert" ON public.finance_payment_allocations FOR INSERT WITH CHECK (
  payment_id IN (SELECT id FROM public.finance_payments WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
  AND invoice_id IN (SELECT id FROM public.finance_invoices WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "finance_payment_allocations_update" ON public.finance_payment_allocations FOR UPDATE USING (
  payment_id IN (SELECT id FROM public.finance_payments WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "finance_payment_allocations_delete" ON public.finance_payment_allocations FOR DELETE USING (
  payment_id IN (SELECT id FROM public.finance_payments WHERE company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()))
);

-- ---------- Append-only finance transaction log ----------
CREATE TABLE IF NOT EXISTS public.finance_transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  from_state TEXT,
  to_state TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transaction_log_company ON public.finance_transaction_log(company_id);
CREATE INDEX IF NOT EXISTS idx_finance_transaction_log_entity ON public.finance_transaction_log(entity_type, entity_id);

ALTER TABLE public.finance_transaction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_transaction_log_select" ON public.finance_transaction_log FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "finance_transaction_log_insert" ON public.finance_transaction_log FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  AND actor_profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- ---------- Default approval template per existing company ----------
INSERT INTO public.finance_approval_templates (company_id, name, is_default, steps, escalation_threshold_cents)
SELECT c.id, 'Default workflow', true,
  '[
    {"order":0,"label":"Operational review","study_roles_any":["clinical_research_associate","clinical_project_manager","clinical_trial_assistant","cra_manager"]},
    {"order":1,"label":"Financial review","study_roles_any":["accounts_payable_specialist","site_budget_specialist","finance_reviewer","vendor_manager"]},
    {"order":2,"label":"Final approval","study_roles_any":["executive_director","contracts_manager","finance_director","clinical_contracts_specialist"]}
  ]'::jsonb,
  5000000
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.finance_approval_templates t WHERE t.company_id = c.id AND t.is_default = true
);

-- ---------- Backfill finance_invoices from site_payments (one-time) ----------
INSERT INTO public.finance_invoices (
  study_id, company_id, entity_type, site_id, external_invoice_id, amount, currency,
  received_at, due_at, status, approval_step, legacy_site_payment_id, notes
)
SELECT
  sp.study_id,
  st.company_id,
  'site'::text,
  sp.site_id,
  COALESCE(NULLIF(trim(sp.invoice_number), ''), 'LEGACY-' || sp.id::text),
  sp.amount,
  sp.currency,
  COALESCE(sp.invoice_date::timestamptz, sp.created_at),
  NULL::date,
  CASE sp.status
    WHEN 'paid' THEN 'paid'::text
    WHEN 'approved' THEN 'approved'::text
    ELSE 'under_review'::text
  END,
  CASE sp.status WHEN 'paid' THEN 3 WHEN 'approved' THEN 3 ELSE 0 END,
  sp.id,
  sp.notes
FROM public.site_payments sp
JOIN public.studies st ON st.id = sp.study_id
WHERE NOT EXISTS (SELECT 1 FROM public.finance_invoices fi WHERE fi.legacy_site_payment_id = sp.id);

-- ---------- Backfill finance_payments + allocations for paid legacy invoices ----------
INSERT INTO public.finance_payments (study_id, company_id, amount, currency, method, status, paid_at, reference, notes)
SELECT
  fi.study_id,
  fi.company_id,
  fi.amount,
  fi.currency,
  'ach',
  'paid',
  COALESCE(
    (SELECT sp.payment_date::timestamptz FROM public.site_payments sp WHERE sp.id = fi.legacy_site_payment_id),
    fi.created_at
  ),
  'legacy-pay-' || fi.legacy_site_payment_id::text,
  fi.notes
FROM public.finance_invoices fi
WHERE fi.legacy_site_payment_id IS NOT NULL
  AND fi.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.finance_payments fp
    WHERE fp.reference = 'legacy-pay-' || fi.legacy_site_payment_id::text
  );

INSERT INTO public.finance_payment_allocations (payment_id, invoice_id, amount)
SELECT fp.id, fi.id, fi.amount
FROM public.finance_invoices fi
JOIN public.finance_payments fp ON fp.reference = 'legacy-pay-' || fi.legacy_site_payment_id::text
WHERE fi.legacy_site_payment_id IS NOT NULL
  AND fi.status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.finance_payment_allocations x WHERE x.invoice_id = fi.id);

-- ---------- Storage: finance documents ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'finance-documents',
  'finance-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[];

-- Object path convention: {company_id}/...
DROP POLICY IF EXISTS "finance_documents_select" ON storage.objects;
CREATE POLICY "finance_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'finance-documents'
    AND split_part(name, '/', 1) = (SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "finance_documents_insert" ON storage.objects;
CREATE POLICY "finance_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'finance-documents'
    AND split_part(name, '/', 1) = (SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "finance_documents_update" ON storage.objects;
CREATE POLICY "finance_documents_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'finance-documents'
    AND split_part(name, '/', 1) = (SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "finance_documents_delete" ON storage.objects;
CREATE POLICY "finance_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'finance-documents'
    AND split_part(name, '/', 1) = (SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid())
  );

-- ---------- New companies: default finance approval template ----------
CREATE OR REPLACE FUNCTION public.ensure_finance_approval_template_for_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.finance_approval_templates (company_id, name, is_default, steps, escalation_threshold_cents)
  SELECT
    NEW.id,
    'Default workflow',
    true,
    '[
      {"order":0,"label":"Operational review","study_roles_any":["clinical_research_associate","clinical_project_manager","clinical_trial_assistant","cra_manager"]},
      {"order":1,"label":"Financial review","study_roles_any":["accounts_payable_specialist","site_budget_specialist","finance_reviewer","vendor_manager"]},
      {"order":2,"label":"Final approval","study_roles_any":["executive_director","contracts_manager","finance_director","clinical_contracts_specialist"]}
    ]'::jsonb,
    5000000
  WHERE NOT EXISTS (
    SELECT 1 FROM public.finance_approval_templates t WHERE t.company_id = NEW.id AND t.is_default = true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_finance_approval_template ON public.companies;
CREATE TRIGGER trg_companies_finance_approval_template
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_finance_approval_template_for_company();

-- ---------- RPC: record invoice approval decision (authoritative step advance) ----------
CREATE OR REPLACE FUNCTION public.finance_invoice_record_decision(
  p_invoice_id uuid,
  p_decision text,
  p_comment text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_company_id uuid;
  v_app_role text;
  v_invoice record;
  v_template record;
  v_steps jsonb;
  v_step jsonb;
  v_allowed jsonb;
  v_role text;
  v_ok boolean := false;
  v_amount_cents bigint;
  v_escalation bigint;
  v_next_step int;
  v_new_status text;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_decision');
  END IF;

  SELECT id, company_id, role INTO v_profile_id, v_company_id, v_app_role
  FROM public.profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invoice FROM public.finance_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invoice_not_found');
  END IF;
  IF v_invoice.company_id IS DISTINCT FROM v_company_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_decision = 'rejected' THEN
    UPDATE public.finance_invoices SET status = 'rejected', updated_at = NOW() WHERE id = p_invoice_id;
    INSERT INTO public.finance_invoice_decisions (invoice_id, step_index, profile_id, decision, comment)
    VALUES (p_invoice_id, v_invoice.approval_step, v_profile_id, 'rejected', NULLIF(trim(p_comment), ''));
    INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
    VALUES (v_company_id, v_invoice.study_id, 'finance_invoice', p_invoice_id, 'reject', v_profile_id, v_invoice.status, 'rejected',
      jsonb_build_object('step', v_invoice.approval_step));
    RETURN jsonb_build_object('ok', true, 'status', 'rejected');
  END IF;

  IF v_invoice.status NOT IN ('submitted', 'under_review') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invoice_not_in_review');
  END IF;

  SELECT * INTO v_template FROM public.finance_approval_templates
  WHERE id = COALESCE(v_invoice.template_id, (
    SELECT id FROM public.finance_approval_templates t
    WHERE t.company_id = v_invoice.company_id AND t.is_default = true LIMIT 1
  ));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_template');
  END IF;

  v_steps := v_template.steps;
  IF jsonb_typeof(v_steps) <> 'array' OR jsonb_array_length(v_steps) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_template');
  END IF;

  IF v_invoice.approval_step >= jsonb_array_length(v_steps) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_pending_step');
  END IF;

  v_step := v_steps -> v_invoice.approval_step;
  v_allowed := v_step -> 'study_roles_any';

  IF v_app_role = 'admin' THEN
    v_ok := true;
  ELSE
    FOR v_role IN
      SELECT stm.role::text FROM public.study_team_members stm
      WHERE stm.study_id = v_invoice.study_id AND stm.profile_id = v_profile_id AND stm.is_active = true
    LOOP
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_allowed) AS ar(val) WHERE ar.val = v_role
      ) THEN
        v_ok := true;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized_for_step');
  END IF;

  INSERT INTO public.finance_invoice_decisions (invoice_id, step_index, profile_id, decision, comment)
  VALUES (p_invoice_id, v_invoice.approval_step, v_profile_id, 'approved', NULLIF(trim(p_comment), ''));

  v_next_step := v_invoice.approval_step + 1;
  IF v_next_step >= jsonb_array_length(v_steps) THEN
    v_new_status := 'approved';
    UPDATE public.finance_invoices
    SET status = 'approved', approval_step = v_next_step, updated_at = NOW()
    WHERE id = p_invoice_id;
  ELSE
    v_new_status := 'under_review';
    UPDATE public.finance_invoices
    SET status = 'under_review', approval_step = v_next_step, updated_at = NOW()
    WHERE id = p_invoice_id;
  END IF;

  INSERT INTO public.finance_transaction_log (company_id, study_id, entity_type, entity_id, action, actor_profile_id, from_state, to_state, payload)
  VALUES (
    v_company_id,
    v_invoice.study_id,
    'finance_invoice',
    p_invoice_id,
    'approve_step',
    v_profile_id,
    v_invoice.status,
    v_new_status,
    jsonb_build_object('step_completed', v_invoice.approval_step, 'next_step', v_next_step)
  );

  RETURN jsonb_build_object('ok', true, 'status', v_new_status, 'approval_step', v_next_step);
END;
$$;

REVOKE ALL ON FUNCTION public.finance_invoice_record_decision(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_invoice_record_decision(uuid, text, text) TO authenticated;
