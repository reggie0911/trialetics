-- ============================================================================
-- Clinical Payments Gap Analysis Implementation
-- Covers: Invoices, Approval Workflow, Multi-Currency, Budget Templates,
--         Accruals, Site Budgets, Notifications, Expanded Audit Trail,
--         Duplicate Prevention, VAT Rollups, Payment Status Updates
-- ============================================================================

-- ============================================================================
-- 1. Update payment_records status to support approval workflow (GAP P2)
-- ============================================================================

ALTER TABLE public.payment_records
  DROP CONSTRAINT IF EXISTS payment_records_status_check;

ALTER TABLE public.payment_records
  ADD CONSTRAINT payment_records_status_check
  CHECK (status IN ('to_be_processed', 'pending_approval', 'approved', 'rejected', 'in_progress', 'processed'));

-- ============================================================================
-- 2. Exchange Rates (GAP P3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate DECIMAL(18,8) NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, source_currency, target_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_company ON public.exchange_rates(company_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON public.exchange_rates(source_currency, target_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_effective ON public.exchange_rates(effective_date DESC);

DROP TRIGGER IF EXISTS update_exchange_rates_updated_at ON public.exchange_rates;
CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON public.exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exchange rates in their company"
  ON public.exchange_rates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert exchange rates in their company"
  ON public.exchange_rates FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update exchange rates in their company"
  ON public.exchange_rates FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete exchange rates in their company"
  ON public.exchange_rates FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.exchange_rates IS 'Currency exchange rates for multi-currency payment support';

-- ============================================================================
-- 3. Invoices (GAP P1)
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE DEFAULT 'INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0'),
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.site_contracts(id) ON DELETE SET NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid_in_part', 'paid_in_full', 'cancelled', 'overdue')),
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  payment_terms TEXT,
  notes TEXT,
  sent_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_site ON public.invoices(site_id);
CREATE INDEX IF NOT EXISTS idx_invoices_protocol ON public.invoices(protocol_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices in their company"
  ON public.invoices FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert invoices in their company"
  ON public.invoices FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update invoices in their company"
  ON public.invoices FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete invoices in their company"
  ON public.invoices FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.invoices IS 'Invoice generation and tracking for investigator site payments';

-- ============================================================================
-- 4. Invoice Line Items (GAP P1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_record_id UUID REFERENCES public.payment_records(id) ON DELETE SET NULL,
  payment_activity_id UUID REFERENCES public.payment_activities(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_payment_record ON public.invoice_line_items(payment_record_id);

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice line items via invoice"
  ON public.invoice_line_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage invoice line items via invoice"
  ON public.invoice_line_items FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.invoice_line_items IS 'Individual line items on an invoice, linked to payment records or activities';

-- ============================================================================
-- 5. Invoice Payments (reconciliation) (GAP P1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_amount DECIMAL(15,2) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice payments via invoice"
  ON public.invoice_payments FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage invoice payments via invoice"
  ON public.invoice_payments FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.invoice_payments IS 'Received payments reconciled against invoices';

-- ============================================================================
-- 6. Payment Approval Configs (GAP P2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('interim', 'final', 'unplanned', 'all')),
  auto_approve BOOLEAN DEFAULT false,
  auto_approve_threshold DECIMAL(15,2),
  required_approvers INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_approval_configs_company ON public.payment_approval_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_approval_configs_protocol ON public.payment_approval_configs(protocol_id);

DROP TRIGGER IF EXISTS update_payment_approval_configs_updated_at ON public.payment_approval_configs;
CREATE TRIGGER update_payment_approval_configs_updated_at
  BEFORE UPDATE ON public.payment_approval_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_approval_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment approval configs in their company"
  ON public.payment_approval_configs FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payment approval configs in their company"
  ON public.payment_approval_configs FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payment approval configs in their company"
  ON public.payment_approval_configs FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete payment approval configs in their company"
  ON public.payment_approval_configs FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.payment_approval_configs IS 'Protocol-level payment approval rules and thresholds';

-- ============================================================================
-- 7. Payment Approval Config Approvers (GAP P2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_approval_config_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.payment_approval_configs(id) ON DELETE CASCADE,
  approver_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(config_id, approver_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_pac_approvers_config ON public.payment_approval_config_approvers(config_id);
CREATE INDEX IF NOT EXISTS idx_pac_approvers_profile ON public.payment_approval_config_approvers(approver_profile_id);

ALTER TABLE public.payment_approval_config_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approval config approvers via config"
  ON public.payment_approval_config_approvers FOR SELECT
  USING (
    config_id IN (
      SELECT id FROM public.payment_approval_configs
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage approval config approvers via config"
  ON public.payment_approval_config_approvers FOR ALL
  USING (
    config_id IN (
      SELECT id FROM public.payment_approval_configs
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    config_id IN (
      SELECT id FROM public.payment_approval_configs
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.payment_approval_config_approvers IS 'Designated approvers for each approval config with level ordering';

-- ============================================================================
-- 8. Payment Approvals (GAP P2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_record_id UUID NOT NULL REFERENCES public.payment_records(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL DEFAULT 1,
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_approvals_company ON public.payment_approvals(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_payment_record ON public.payment_approvals(payment_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_approver ON public.payment_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_payment_approvals_decision ON public.payment_approvals(decision);

ALTER TABLE public.payment_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment approvals in their company"
  ON public.payment_approvals FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payment approvals in their company"
  ON public.payment_approvals FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payment approvals in their company"
  ON public.payment_approvals FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.payment_approvals IS 'Individual approval decisions for payment records';

-- ============================================================================
-- 9. Budget Templates (GAP P4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.budget_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID REFERENCES public.clinical_protocols(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_templates_company ON public.budget_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_templates_protocol ON public.budget_templates(protocol_id);

DROP TRIGGER IF EXISTS update_budget_templates_updated_at ON public.budget_templates;
CREATE TRIGGER update_budget_templates_updated_at
  BEFORE UPDATE ON public.budget_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.budget_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget templates in their company"
  ON public.budget_templates FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert budget templates in their company"
  ON public.budget_templates FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update budget templates in their company"
  ON public.budget_templates FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete budget templates in their company"
  ON public.budget_templates FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.budget_templates IS 'Reusable budget templates for protocol or site-level budgets';

-- ============================================================================
-- 10. Budget Template Items (GAP P4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.budget_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.budget_templates(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('site_costs', 'personnel', 'travel', 'vendor', 'other')),
  subcategory TEXT,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_template_items_template ON public.budget_template_items(template_id);

ALTER TABLE public.budget_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budget template items via template"
  ON public.budget_template_items FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.budget_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage budget template items via template"
  ON public.budget_template_items FOR ALL
  USING (
    template_id IN (
      SELECT id FROM public.budget_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM public.budget_templates
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.budget_template_items IS 'Individual line items within a budget template';

-- ============================================================================
-- 11. Site Budgets (GAP S1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.clinical_sites(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  budget_template_id UUID REFERENCES public.budget_templates(id) ON DELETE SET NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'negotiating', 'approved', 'active', 'closed')),
  total_budgeted DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  approved_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, protocol_id)
);

CREATE INDEX IF NOT EXISTS idx_site_budgets_company ON public.site_budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_site_budgets_site ON public.site_budgets(site_id);
CREATE INDEX IF NOT EXISTS idx_site_budgets_protocol ON public.site_budgets(protocol_id);
CREATE INDEX IF NOT EXISTS idx_site_budgets_status ON public.site_budgets(status);

DROP TRIGGER IF EXISTS update_site_budgets_updated_at ON public.site_budgets;
CREATE TRIGGER update_site_budgets_updated_at
  BEFORE UPDATE ON public.site_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site budgets in their company"
  ON public.site_budgets FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert site budgets in their company"
  ON public.site_budgets FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update site budgets in their company"
  ON public.site_budgets FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete site budgets in their company"
  ON public.site_budgets FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.site_budgets IS 'Site-specific budgets derived from budget templates with negotiation tracking';

-- ============================================================================
-- 12. Site Budget Items (GAP S1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.site_budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_budget_id UUID NOT NULL REFERENCES public.site_budgets(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES public.budget_template_items(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('site_costs', 'personnel', 'travel', 'vendor', 'other')),
  subcategory TEXT,
  description TEXT,
  budgeted_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_budget_items_budget ON public.site_budget_items(site_budget_id);

DROP TRIGGER IF EXISTS update_site_budget_items_updated_at ON public.site_budget_items;
CREATE TRIGGER update_site_budget_items_updated_at
  BEFORE UPDATE ON public.site_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view site budget items via budget"
  ON public.site_budget_items FOR SELECT
  USING (
    site_budget_id IN (
      SELECT id FROM public.site_budgets
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage site budget items via budget"
  ON public.site_budget_items FOR ALL
  USING (
    site_budget_id IN (
      SELECT id FROM public.site_budgets
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    site_budget_id IN (
      SELECT id FROM public.site_budgets
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.site_budget_items IS 'Individual line items in a site budget, optionally linked to template items';

-- ============================================================================
-- 13. Payment Accruals (GAP P6)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  protocol_id UUID NOT NULL REFERENCES public.clinical_protocols(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.clinical_sites(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  accrued_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  actual_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  variance DECIMAL(15,2) NOT NULL DEFAULT 0,
  category TEXT CHECK (category IN ('site_costs', 'personnel', 'travel', 'vendor', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'posted')),
  calculation_basis TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_accruals_company ON public.payment_accruals(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_accruals_protocol ON public.payment_accruals(protocol_id);
CREATE INDEX IF NOT EXISTS idx_payment_accruals_site ON public.payment_accruals(site_id);
CREATE INDEX IF NOT EXISTS idx_payment_accruals_period ON public.payment_accruals(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payment_accruals_status ON public.payment_accruals(status);

DROP TRIGGER IF EXISTS update_payment_accruals_updated_at ON public.payment_accruals;
CREATE TRIGGER update_payment_accruals_updated_at
  BEFORE UPDATE ON public.payment_accruals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_accruals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment accruals in their company"
  ON public.payment_accruals FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payment accruals in their company"
  ON public.payment_accruals FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payment accruals in their company"
  ON public.payment_accruals FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete payment accruals in their company"
  ON public.payment_accruals FOR DELETE
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.payment_accruals IS 'Period-based payment accrual calculations and tracking';

-- ============================================================================
-- 14. Payment Notifications (GAP P8)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'payment_generated', 'approval_required', 'approval_decision',
    'payment_processed', 'payment_overdue', 'batch_complete'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payment_record_id UUID REFERENCES public.payment_records(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_notifications_company ON public.payment_notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_recipient ON public.payment_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_is_read ON public.payment_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_payment_notifications_type ON public.payment_notifications(notification_type);

ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment notifications"
  ON public.payment_notifications FOR SELECT
  USING (recipient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert payment notifications in their company"
  ON public.payment_notifications FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own payment notifications"
  ON public.payment_notifications FOR UPDATE
  USING (recipient_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

COMMENT ON TABLE public.payment_notifications IS 'Payment-related notifications for approval workflow and status changes';

-- ============================================================================
-- 15. Add region-level currency to clinical_regions (GAP P3)
-- ============================================================================

ALTER TABLE public.clinical_regions
  ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS exchange_date DATE;

-- ============================================================================
-- 16. Add exchange_date to clinical_sites (GAP P3)
-- ============================================================================

ALTER TABLE public.clinical_sites
  ADD COLUMN IF NOT EXISTS exchange_date DATE;

-- ============================================================================
-- 17. Duplicate Payment Prevention (GAP S6)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_activities_unique_subject_activity
  ON public.payment_activities(subject_activity_id)
  WHERE subject_activity_id IS NOT NULL AND payment_record_id IS NOT NULL;

-- ============================================================================
-- 18. Expanded Audit Trail (GAP S4)
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'payment_activities', 'payment_exceptions', 'payment_splits',
    'budget_line_items', 'spend_actuals', 'invoices',
    'payment_accruals', 'site_budgets', 'exchange_rates',
    'payment_approval_configs', 'payment_approvals'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%I ON public.%I', t, t);
      EXECUTE format('
        CREATE TRIGGER audit_trigger_%I
          AFTER INSERT OR UPDATE OR DELETE ON public.%I
          FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger()
      ', t, t);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 19. Site Financial Summary View (GAP S2, P7)
-- ============================================================================

CREATE OR REPLACE VIEW public.site_financial_summary AS
SELECT
  pr.site_id,
  pr.company_id,
  cs.site_number,
  cp.id AS protocol_id,
  cp.protocol_number,
  COALESCE(SUM(pr.earned_amount), 0) AS earned_to_date,
  COALESCE(SUM(pr.check_amount), 0) AS paid_to_date,
  COALESCE(SUM(pr.earned_amount), 0) - COALESCE(SUM(pr.check_amount), 0) AS remaining_balance,
  COALESCE(SUM(pr.requested_amount), 0) AS requested_to_date,
  COALESCE(SUM(pr.vat_amount), 0) AS vat_to_date,
  COALESCE(SUM(CASE WHEN pr.earned_amount > 0 THEN
    pr.earned_amount - pr.requested_amount ELSE 0 END), 0) AS withholding_to_date,
  COUNT(CASE WHEN pr.status = 'to_be_processed' THEN 1 END) AS pending_records,
  COUNT(CASE WHEN pr.status = 'processed' THEN 1 END) AS processed_records,
  COUNT(pr.id) AS total_records
FROM public.payment_records pr
JOIN public.clinical_sites cs ON cs.id = pr.site_id
LEFT JOIN public.clinical_protocols cp ON cp.id = pr.protocol_id
GROUP BY pr.site_id, pr.company_id, cs.site_number, cp.id, cp.protocol_number;

COMMENT ON VIEW public.site_financial_summary IS 'Aggregated financial summary per site with earned/paid/VAT to date';
