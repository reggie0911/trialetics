-- Track which budget line items have been invoiced and how much
CREATE TABLE IF NOT EXISTS public.invoice_budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.finance_invoices(id) ON DELETE CASCADE,
  site_budget_line_item_id UUID REFERENCES public.site_budget_line_items(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invoice_id, site_budget_line_item_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_budget_alloc_invoice ON public.invoice_budget_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_budget_alloc_line_item ON public.invoice_budget_allocations(site_budget_line_item_id);

ALTER TABLE public.invoice_budget_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_budget_allocations_select" ON public.invoice_budget_allocations
  FOR SELECT USING (
    invoice_id IN (
      SELECT fi.id FROM public.finance_invoices fi
      WHERE fi.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "invoice_budget_allocations_insert" ON public.invoice_budget_allocations
  FOR INSERT WITH CHECK (
    invoice_id IN (
      SELECT fi.id FROM public.finance_invoices fi
      WHERE fi.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "invoice_budget_allocations_update" ON public.invoice_budget_allocations
  FOR UPDATE USING (
    invoice_id IN (
      SELECT fi.id FROM public.finance_invoices fi
      WHERE fi.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "invoice_budget_allocations_delete" ON public.invoice_budget_allocations
  FOR DELETE USING (
    invoice_id IN (
      SELECT fi.id FROM public.finance_invoices fi
      WHERE fi.company_id = (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    )
  );
