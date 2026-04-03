-- ============================================================
-- Financial & Invoice Data Reset
-- Deletes all rows from financial/invoice tables in dependency
-- order (children first, parents last). Tables are preserved.
-- ============================================================

-- Phase 5 / Phase 2 — procedure grid & visit definitions
DELETE FROM public.study_procedure_visit_costs;
DELETE FROM public.study_visit_definitions;

-- Phase 4 — invoice budget allocations
DELETE FROM public.invoice_budget_allocations;

-- Phase 3 — budget templates
DELETE FROM public.study_budget_templates;

-- Phase 1 — study budget sections (cascade clears section_id on budget_line_items)
DELETE FROM public.study_budget_sections;

-- Invoice workflow
DELETE FROM public.finance_transaction_log;
DELETE FROM public.finance_invoice_decisions;
DELETE FROM public.finance_invoices;
DELETE FROM public.finance_approval_templates;

-- Payment allocations -> payments
DELETE FROM public.finance_payment_allocations;
DELETE FROM public.finance_payments;

-- Site budget line items -> site budgets
DELETE FROM public.site_budget_line_items;
DELETE FROM public.site_budgets;

-- Study budget line items -> study budgets
DELETE FROM public.budget_line_items;
DELETE FROM public.study_budgets;

-- Financial contracts
DELETE FROM public.financial_contracts;

-- Site payment schedules -> site payments
DELETE FROM public.payment_schedules;
DELETE FROM public.site_payments;

-- ============================================================
-- Done. All financial data removed; table structure preserved.
-- ============================================================