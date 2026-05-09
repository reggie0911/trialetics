# Finance Module — tables audit

Condensed inventory for the **Finance Module Tables Audit** program. Source-of-truth UX gaps and phase breakdown live in `.cursor/plans/finance_module_tables_audit_c0a38265.plan.md` (repo-local).

## Pages → tables / surfaces

| Page | Primary tables / components | Gap summary |
|------|-----------------------------|-------------|
| Dashboard | Study financial health, obligations, recent activity | View-only; no deep-links into entities |
| Budget | Categories, version history | Version lifecycle partly server-only; row edit/delete parity |
| Change orders | Change orders panel | Missing draft edit, reject, cancel, delete draft |
| Site payments | Site payment schedule table | Status-only updates; missing full row edit / delete scheduled |
| Vendors | Spend rollup, master card, contracts | Archive vendor explicit action; contract CRUD parity |
| Invoices | Invoice table, workflow panel | Missing draft header edit, draft delete |
| Purchase orders | PO table | Missing edit, reopen, delete unused |
| Forecasting | Scenario / category tables | Persistence deferred (Phase 3) |
| Approvals | Pending / recent | Missing link-through to source record |
| Reports | Popular / scheduled / exports | Scheduled reports & export queue deferred (Phase 3) |
| Settings | Workspace, categories | Restore archived category |

## Existing mutators (`lib/actions/study-finance-module.ts`)

Workspace, budgets (versions, categories, line items), vendors (`updateStudyVendor`), contracts (`createContract`), POs (`create`, `close`), invoices (`create`, line items, submit/approve/reject, payment), site schedules (`create`, milestone status), change orders (`create`, submit/approve/apply), approvals (`resolveFinanceApprovalRequest`, etc.), CSV exports, dashboard/report loaders.

## Phase 1 additions

Row-level **update** actions with **optimistic locking** (`updated_at`): contracts, invoices, POs, site payment schedules, change orders (draft). **Archive** vendor. **Restore** budget category. **Delete** where safe (draft / unreferenced per master delete semantics). **Transitions**: reopen PO, reject/cancel change order, delete draft budget version.

## New helper tables (Phase 1 migration)

| Table | Role |
|-------|------|
| `fm_scheduled_report` | Phase 3 scheduled report runner |
| `fm_export_job` | Phase 3 async exports |
| `fm_forecast_scenario` | Phase 3 persisted scenarios |
| `fm_approval_delegation` | Phase 3 delegation |
| `fm_approval_policy` | Phase 3 policy editor |
| `fm_entity_comment` | Entity drawer comments tab |
| `fm_table_view` | Saved filters/columns per user + table key |

## Delete semantics (reference)

Hard-delete only for drafts / unreferenced rows; otherwise archive or workflow transitions. Rules are enforced in server actions, not the UI alone.
