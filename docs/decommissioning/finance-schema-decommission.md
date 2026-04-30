# Finance & Clinical Payments — Database Decommission (Ops)

The **Finance Tracker**, **study/site financials UI**, and **Clinical Payments** product surfaces have been removed from the Next.js application. **Database objects are intentionally left in place** until product/legal confirms retention, archival export, and cutover timing.

> **Do not** drop tables or storage buckets from historical migrations in the repo alone — production needs a **forward migration** (or DBA-run script) after backup.

## 1. Preconditions

1. Export / archive company-scoped data where required (contracts, audits).
2. Confirm whether **`finance_transaction_log`** must be retained for **time & expenses** or other modules (triggers may insert from non-finance flows — verify in `supabase/migrations` before dropping).
3. Revoke app roles from deprecated tables after the app no longer references them.

## 2. Candidate tables (verify FK order before `DROP`)

| Area | Tables (examples) |
|------|-------------------|
| Study budgets | `study_budgets`, `budget_line_items`, `study_budget_sections`, `study_budget_templates` |
| Site budgets | `site_budgets`, `site_budget_line_items` |
| Invoices & approvals | `finance_invoices`, `finance_invoice_decisions`, `finance_approval_templates`, `invoice_budget_allocations` |
| Payments | `finance_payments`, `finance_payment_allocations`, `site_payments` |
| Procurement | `finance_purchase_orders` |
| Audit | `finance_transaction_log` (shared — **validate**) |

Use `information_schema.table_constraints` / Supabase dashboard to list **incoming FKs** (e.g. from `studies`, `study_sites`, storage metadata) and drop dependents first.

## 3. Storage & RLS

- Search migrations for **`finance`** storage buckets, signed URL policies, and **RLS policies** named `finance_*` / `site_payments_*` / `study_budgets_*`.
- Remove Edge functions or webhooks that reference finance paths.

## 4. Application cleanup (already done or parallel)

- Routes under `/protected/financials`, `/protected/clinical-payments`, and study `/financials` trees removed.
- Server actions in `lib/actions/financials*.ts`, `finance-*.ts`, `demo-clinical-payments.ts` removed.
- Optional: delete **`supabase/reset_financial_data.sql`** / **`.mjs`** after DBA confirms they are unused, or rewrite them to target archive schemas only.

## 5. Suggested forward migration shape

1. `CREATE SCHEMA IF NOT EXISTS finance_archive;`
2. `CREATE TABLE finance_archive.<table> AS TABLE public.<table> WITH NO DATA;` then `INSERT … SELECT` per tenant or full copy.
3. Drop **policies & triggers** on `public` copies, then `DROP TABLE … CASCADE` in dependency order **or** rename `public.*` → `finance_archive.*` and revoke `SELECT` from application roles.

## 6. Sign-off checklist

- [ ] Legal / finance sign-off on retention period  
- [ ] Backup verified  
- [ ] No remaining application references (`grep` CI job)  
- [ ] Post-drop smoke test on staging (studies, sites, T&E, eTMF)
