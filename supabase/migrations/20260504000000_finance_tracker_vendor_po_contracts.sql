-- Finance Tracker vendor, purchase order, and change-order persistence.

ALTER TABLE public.financial_contracts
  ADD COLUMN IF NOT EXISTS contract_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sow_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_order_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason_for_change TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS budget_impact_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS related_invoice_id UUID REFERENCES public.finance_invoices(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.finance_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  study_id UUID REFERENCES public.studies(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.financial_contracts(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  budget_category TEXT,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_invoiced NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'open', 'partially_invoiced', 'fully_invoiced', 'closed', 'cancelled')
  ),
  starts_on DATE,
  ends_on DATE,
  attachment_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_finance_purchase_orders_company ON public.finance_purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_finance_purchase_orders_study ON public.finance_purchase_orders(study_id);
CREATE INDEX IF NOT EXISTS idx_finance_purchase_orders_institution ON public.finance_purchase_orders(institution_id);
CREATE INDEX IF NOT EXISTS idx_finance_purchase_orders_status ON public.finance_purchase_orders(status);

CREATE TRIGGER update_finance_purchase_orders_updated_at
  BEFORE UPDATE ON public.finance_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_purchase_orders_select" ON public.finance_purchase_orders FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "finance_purchase_orders_insert" ON public.finance_purchase_orders FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "finance_purchase_orders_update" ON public.finance_purchase_orders FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "finance_purchase_orders_delete" ON public.finance_purchase_orders FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

ALTER TABLE public.finance_invoices
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.finance_purchase_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_finance_invoices_purchase_order ON public.finance_invoices(purchase_order_id);
