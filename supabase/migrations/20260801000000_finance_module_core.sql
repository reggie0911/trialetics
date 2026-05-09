-- =====================================================
-- Finance Module: Phase 1 Foundation & Data Model
--
-- Brand-new study-scoped Finance Module schema. All tables use the
-- `fm_` prefix to keep them isolated from any prior finance modules,
-- mirroring the plan's "do not reuse" requirement.
--
-- Tables:
--   fm_workspaces, fm_budgets, fm_budget_versions, fm_budget_categories,
--   fm_budget_line_items, fm_vendors, fm_contracts, fm_purchase_orders,
--   fm_invoices, fm_invoice_line_items, fm_payments,
--   fm_site_payment_schedules, fm_change_orders, fm_approval_requests,
--   fm_audit_logs.
--
-- Conventions:
--   - Every record carries study_id (and a denormalized company_id)
--   - Strict FKs with ON DELETE RESTRICT to prevent orphan records
--   - RLS scoped to the caller's company (study acts as primary filter)
--   - Status values use plain TEXT with CHECK constraints (per existing repo style)
--   - finance_module_audit_logs is append-only via RLS
-- =====================================================

-- ----------------------------------------------------------------------
-- Helper: ensure trigger function exists (mirrors existing repo helper)
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fm_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------
-- Resolve current caller's company_id from profiles
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fm_current_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.fm_current_company_id() TO authenticated;

-- ----------------------------------------------------------------------
-- fm_workspaces — one finance workspace per study
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL UNIQUE REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  base_currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(base_currency) = 3),
  fiscal_period_start DATE,
  fiscal_period_end DATE,
  finance_owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_workspaces_company ON public.fm_workspaces(company_id);

CREATE TRIGGER fm_workspaces_set_updated_at
  BEFORE UPDATE ON public.fm_workspaces
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_budgets — top-level budget container for a study
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'active', 'archived')
  ),
  active_version_id UUID,
  base_currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(base_currency) = 3),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_budgets_study_status ON public.fm_budgets(study_id, status);

CREATE TRIGGER fm_budgets_set_updated_at
  BEFORE UPDATE ON public.fm_budgets
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_budget_categories — clinical-trial categories per workspace
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.fm_workspaces(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fm_budget_categories_study ON public.fm_budget_categories(study_id);

CREATE TRIGGER fm_budget_categories_set_updated_at
  BEFORE UPDATE ON public.fm_budget_categories
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_budget_versions — immutable approved snapshots, draftable
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_budget_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  budget_id UUID NOT NULL REFERENCES public.fm_budgets(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'active', 'superseded', 'rejected')
  ),
  notes TEXT,
  base_currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(base_currency) = 3),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  superseded_at TIMESTAMPTZ,
  superseded_by_version_id UUID REFERENCES public.fm_budget_versions(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_fm_budget_versions_study_status
  ON public.fm_budget_versions(study_id, status);
CREATE INDEX IF NOT EXISTS idx_fm_budget_versions_budget
  ON public.fm_budget_versions(budget_id, version_number);

CREATE TRIGGER fm_budget_versions_set_updated_at
  BEFORE UPDATE ON public.fm_budget_versions
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- Backfill the FK from fm_budgets.active_version_id once fm_budget_versions exists.
ALTER TABLE public.fm_budgets
  ADD CONSTRAINT fm_budgets_active_version_id_fkey
  FOREIGN KEY (active_version_id)
  REFERENCES public.fm_budget_versions(id)
  ON DELETE SET NULL;

-- ----------------------------------------------------------------------
-- fm_budget_line_items — per-version, per-category planned line items
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_budget_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  budget_version_id UUID NOT NULL REFERENCES public.fm_budget_versions(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES public.fm_budget_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  unit_basis TEXT NOT NULL DEFAULT 'fixed' CHECK (
    unit_basis IN ('fixed', 'per_subject', 'per_visit', 'per_site', 'per_month', 'per_milestone', 'percent_of_total')
  ),
  quantity NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_cost NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  planned_start_date DATE,
  planned_end_date DATE,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  vendor_id UUID,
  contract_id UUID,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_budget_line_items_version
  ON public.fm_budget_line_items(study_id, budget_version_id, category_id);
CREATE INDEX IF NOT EXISTS idx_fm_budget_line_items_category
  ON public.fm_budget_line_items(category_id);

CREATE TRIGGER fm_budget_line_items_set_updated_at
  BEFORE UPDATE ON public.fm_budget_line_items
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_vendors — study-scoped vendors
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  service_category TEXT NOT NULL DEFAULT 'other' CHECK (
    service_category IN (
      'cro', 'data_management', 'central_lab', 'imaging', 'monitoring',
      'etmf_ctms', 'clinical_supplies', 'logistics', 'irb_ethics',
      'regulatory', 'patient_recruitment', 'translation', 'other'
    )
  ),
  health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (
    health_status IN ('healthy', 'at_risk', 'critical')
  ),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (
    risk_level IN ('low', 'medium', 'high')
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'inactive', 'archived')
  ),
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (study_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fm_vendors_study_status
  ON public.fm_vendors(study_id, status, service_category);

CREATE TRIGGER fm_vendors_set_updated_at
  BEFORE UPDATE ON public.fm_vendors
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- Now that fm_vendors exists, retro-add FK on fm_budget_line_items.vendor_id
ALTER TABLE public.fm_budget_line_items
  ADD CONSTRAINT fm_budget_line_items_vendor_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.fm_vendors(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------
-- fm_contracts — vendor contracts within a study
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES public.fm_vendors(id) ON DELETE RESTRICT,
  contract_number TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_signature', 'active', 'amended', 'expired', 'terminated', 'archived')
  ),
  total_value NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  start_date DATE,
  end_date DATE,
  payment_terms TEXT,
  notes TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_contracts_study_vendor
  ON public.fm_contracts(study_id, vendor_id, status);

CREATE TRIGGER fm_contracts_set_updated_at
  BEFORE UPDATE ON public.fm_contracts
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- Retro-add FK on fm_budget_line_items.contract_id
ALTER TABLE public.fm_budget_line_items
  ADD CONSTRAINT fm_budget_line_items_contract_fkey
  FOREIGN KEY (contract_id) REFERENCES public.fm_contracts(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------
-- fm_purchase_orders — committed spend
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES public.fm_vendors(id) ON DELETE RESTRICT,
  contract_id UUID REFERENCES public.fm_contracts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.fm_budget_categories(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  po_value NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (po_value >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  study_area TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (study_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_fm_purchase_orders_study_status
  ON public.fm_purchase_orders(study_id, status, vendor_id);
CREATE INDEX IF NOT EXISTS idx_fm_purchase_orders_expiration
  ON public.fm_purchase_orders(study_id, expiration_date);

CREATE TRIGGER fm_purchase_orders_set_updated_at
  BEFORE UPDATE ON public.fm_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_invoices — vendor / site invoices submitted to the study
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  vendor_id UUID REFERENCES public.fm_vendors(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.fm_purchase_orders(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.fm_contracts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.fm_budget_categories(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  total_amount NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    approval_status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'disputed')
  ),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'overdue', 'disputed', 'partial')
  ),
  storage_path TEXT,
  ai_extracted_metadata JSONB,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (study_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_fm_invoices_study_status
  ON public.fm_invoices(study_id, approval_status, payment_status);
CREATE INDEX IF NOT EXISTS idx_fm_invoices_due
  ON public.fm_invoices(study_id, due_date);
CREATE INDEX IF NOT EXISTS idx_fm_invoices_vendor
  ON public.fm_invoices(study_id, vendor_id);

CREATE TRIGGER fm_invoices_set_updated_at
  BEFORE UPDATE ON public.fm_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_invoice_line_items — detail rows mapped to budget categories
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL REFERENCES public.fm_invoices(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.fm_budget_categories(id) ON DELETE SET NULL,
  budget_line_item_id UUID REFERENCES public.fm_budget_line_items(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES public.fm_purchase_orders(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(14,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit_amount NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (unit_amount >= 0),
  total_amount NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_invoice_line_items_invoice
  ON public.fm_invoice_line_items(invoice_id);

CREATE TRIGGER fm_invoice_line_items_set_updated_at
  BEFORE UPDATE ON public.fm_invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_payments — actual disbursements
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.fm_invoices(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.fm_vendors(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.study_sites(id) ON DELETE SET NULL,
  payment_number TEXT,
  amount NUMERIC(14,4) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (
    status IN ('recorded', 'cleared', 'failed', 'voided', 'on_hold')
  ),
  payment_method TEXT,
  reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_payments_study_date
  ON public.fm_payments(study_id, payment_date, status);
CREATE INDEX IF NOT EXISTS idx_fm_payments_invoice
  ON public.fm_payments(invoice_id);

CREATE TRIGGER fm_payments_set_updated_at
  BEFORE UPDATE ON public.fm_payments
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_site_payment_schedules — clinical-trial site payment plans
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_site_payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  site_id UUID NOT NULL REFERENCES public.study_sites(id) ON DELETE RESTRICT,
  milestone_type TEXT NOT NULL CHECK (
    milestone_type IN ('startup', 'visit', 'milestone', 'enrollment', 'closeout', 'holdback', 'other')
  ),
  milestone_label TEXT NOT NULL,
  trigger_event TEXT,
  amount NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  per_subject_amount NUMERIC(14,4),
  holdback_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (holdback_pct >= 0 AND holdback_pct <= 100),
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'earned', 'approved', 'paid', 'partial', 'on_hold', 'cancelled')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_site_payment_schedules_study_site
  ON public.fm_site_payment_schedules(study_id, site_id, status);

CREATE TRIGGER fm_site_payment_schedules_set_updated_at
  BEFORE UPDATE ON public.fm_site_payment_schedules
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_change_orders — amendments to budgets/contracts/POs/site schedules
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  change_number TEXT,
  title TEXT NOT NULL,
  reason TEXT,
  target_object_type TEXT NOT NULL CHECK (
    target_object_type IN ('budget_version', 'contract', 'purchase_order', 'site_payment_schedule')
  ),
  target_object_id UUID NOT NULL,
  delta_amount NUMERIC(14,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'rejected', 'applied', 'cancelled')
  ),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_change_orders_study_status
  ON public.fm_change_orders(study_id, status);
CREATE INDEX IF NOT EXISTS idx_fm_change_orders_target
  ON public.fm_change_orders(study_id, target_object_type, target_object_id);

CREATE TRIGGER fm_change_orders_set_updated_at
  BEFORE UPDATE ON public.fm_change_orders
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_approval_requests — generic approval envelope
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  object_type TEXT NOT NULL CHECK (
    object_type IN (
      'budget_version', 'invoice', 'purchase_order', 'change_order',
      'site_payment_schedule', 'payment'
    )
  ),
  object_id UUID NOT NULL,
  title TEXT,
  amount NUMERIC(14,4),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'approved', 'rejected', 'overdue', 'escalated', 'completed')
  ),
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 1,
  due_date DATE,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workflow_snapshot JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_approval_requests_study_status
  ON public.fm_approval_requests(study_id, status);
CREATE INDEX IF NOT EXISTS idx_fm_approval_requests_object
  ON public.fm_approval_requests(study_id, object_type, object_id);

CREATE TRIGGER fm_approval_requests_set_updated_at
  BEFORE UPDATE ON public.fm_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.fm_set_updated_at();

-- ----------------------------------------------------------------------
-- fm_audit_logs — append-only finance audit trail
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fm_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES public.studies(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_state JSONB,
  to_state JSONB,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_audit_logs_study_entity
  ON public.fm_audit_logs(study_id, entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fm_audit_logs_study_created
  ON public.fm_audit_logs(study_id, created_at DESC);

-- =====================================================
-- Row Level Security
-- All Finance Module tables are scoped to the caller's company.
-- Server-side actions add additional study-write guards (closed studies, role checks).
-- =====================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'fm_workspaces',
    'fm_budgets',
    'fm_budget_categories',
    'fm_budget_versions',
    'fm_budget_line_items',
    'fm_vendors',
    'fm_contracts',
    'fm_purchase_orders',
    'fm_invoices',
    'fm_invoice_line_items',
    'fm_payments',
    'fm_site_payment_schedules',
    'fm_change_orders',
    'fm_approval_requests'
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

-- Audit logs: append-only. Reads scoped to company; writes restricted to current company; no UPDATE/DELETE.
ALTER TABLE public.fm_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY fm_audit_logs_select ON public.fm_audit_logs
  FOR SELECT USING (company_id = public.fm_current_company_id());
CREATE POLICY fm_audit_logs_insert ON public.fm_audit_logs
  FOR INSERT WITH CHECK (company_id = public.fm_current_company_id());

-- Trigger to block update / delete on audit logs (defense in depth alongside RLS).
CREATE OR REPLACE FUNCTION public.fm_audit_logs_block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Finance Module audit logs are append-only.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fm_audit_logs_no_update
  BEFORE UPDATE ON public.fm_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fm_audit_logs_block_mutation();

CREATE TRIGGER fm_audit_logs_no_delete
  BEFORE DELETE ON public.fm_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fm_audit_logs_block_mutation();

-- =====================================================
-- Phase 7 hardening: immutable approved/active budget versions and their line items
-- =====================================================

CREATE OR REPLACE FUNCTION public.fm_budget_versions_protect_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('approved', 'active', 'superseded') THEN
      RAISE EXCEPTION 'Approved, active, or superseded budget versions cannot be deleted.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('approved', 'active', 'superseded') THEN
    -- Allow only documented status transitions: approved -> active, approved/active -> superseded.
    IF NEW.status = OLD.status THEN
      -- Allow non-status fields like superseded_by_version_id / superseded_at / activated_at to be set
      -- only when the value was previously NULL.
      IF (OLD.superseded_by_version_id IS NOT NULL AND NEW.superseded_by_version_id IS DISTINCT FROM OLD.superseded_by_version_id) THEN
        RAISE EXCEPTION 'Approved/active budget versions are immutable.';
      END IF;
    ELSIF NOT (
      (OLD.status = 'approved' AND NEW.status IN ('active', 'superseded')) OR
      (OLD.status = 'active' AND NEW.status = 'superseded')
    ) THEN
      RAISE EXCEPTION 'Disallowed status transition for approved/active budget versions.';
    END IF;

    -- Disallow edits to monetary or structural fields.
    IF NEW.budget_id IS DISTINCT FROM OLD.budget_id
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.base_currency IS DISTINCT FROM OLD.base_currency
       OR NEW.label IS DISTINCT FROM OLD.label
       OR NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Approved/active budget versions are immutable.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fm_budget_versions_immutable_update
  BEFORE UPDATE ON public.fm_budget_versions
  FOR EACH ROW EXECUTE FUNCTION public.fm_budget_versions_protect_immutable();
CREATE TRIGGER fm_budget_versions_immutable_delete
  BEFORE DELETE ON public.fm_budget_versions
  FOR EACH ROW EXECUTE FUNCTION public.fm_budget_versions_protect_immutable();

CREATE OR REPLACE FUNCTION public.fm_budget_line_items_protect_immutable()
RETURNS TRIGGER AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM public.fm_budget_versions WHERE id = OLD.budget_version_id;
    IF v_status IN ('approved', 'active', 'superseded') THEN
      RAISE EXCEPTION 'Cannot delete line items from approved/active/superseded budget versions.';
    END IF;
    RETURN OLD;
  END IF;

  SELECT status INTO v_status FROM public.fm_budget_versions WHERE id = NEW.budget_version_id;
  IF v_status IN ('approved', 'active', 'superseded') AND TG_OP = 'UPDATE' THEN
    -- Only is_archived is allowed to flip on approved versions for housekeeping.
    IF NEW.budget_version_id IS DISTINCT FROM OLD.budget_version_id
       OR NEW.category_id IS DISTINCT FROM OLD.category_id
       OR NEW.name IS DISTINCT FROM OLD.name
       OR NEW.unit_basis IS DISTINCT FROM OLD.unit_basis
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.unit_cost IS DISTINCT FROM OLD.unit_cost
       OR NEW.currency IS DISTINCT FROM OLD.currency THEN
      RAISE EXCEPTION 'Line items on approved/active budget versions are immutable.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fm_budget_line_items_immutable_update
  BEFORE UPDATE ON public.fm_budget_line_items
  FOR EACH ROW EXECUTE FUNCTION public.fm_budget_line_items_protect_immutable();
CREATE TRIGGER fm_budget_line_items_immutable_delete
  BEFORE DELETE ON public.fm_budget_line_items
  FOR EACH ROW EXECUTE FUNCTION public.fm_budget_line_items_protect_immutable();
