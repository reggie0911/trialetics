-- Soft inactive flag: rows stay for audit and invoice allocation history; totals exclude inactive.
-- (Version bumped: 20260412000000 was already used by finance_invoice_log migration.)
ALTER TABLE public.site_budget_line_items
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_site_budget_line_items_budget_active
  ON public.site_budget_line_items (site_budget_id, is_active);
