# Finance module — work instructions

This guide describes how to complete study finance workflows and forms in Trialetics. It matches the **Finance Module** area under a study:  

**Path:** `Studies → [study] → Finance Module`  

**URL pattern:** `/protected/studies/{studyId}/finance-module` and sub-routes listed below.

**Audience:** Study finance coordinators, CTMS users with finance write access (mutations run through server actions and study-scoped permissions).

### What each part of this document is for

| Section | What it is supposed to do |
|---------|---------------------------|
| **1 — Navigation** | Names every Finance Module tab and explains **why it exists** in the product (what problem each area solves), so you know where to click before reading procedures. |
| **2 — First-time setup** | Covers **prerequisites**: turning finance “on” for the study (workspace), categories, and the minimum records needed before other workflows make sense. |
| **3 — End-to-end workflow order** | Gives a **recommended sequence** across tabs—optional but helpful when standing up a study from scratch or training someone. |
| **4 — Tab-by-tab instructions** | The **operational core**: concrete steps and forms for Dashboard through Reports (subsections match the UI tabs). |
| **5 — Cross-cutting behavior** | Explains **how the module behaves everywhere** (permissions, refresh, labels, banners)—things that affect multiple tabs. |
| **6 — Quick troubleshooting** | Short **symptom → fix** lookup when something blocks you mid-task. |
| **7 — Related code** | Points engineers or admins to **source files** when behavior or labels need to change in code—not needed for day-to-day finance work. |

---

## 1. Navigation (section tabs)

This section maps the horizontal nav to **product intent**: each tab is a dedicated surface for one slice of study finance (planning, execution, oversight, or exports).

Use the horizontal nav under the page title. Sections appear in this order:

| Tab | Purpose |
|-----|--------|
| **Dashboard** | Overview KPIs, charts, activity, optional **data setup checklist** (after workspace exists). |
| **Budget** | Budget versions, draft line items, variance charts, version lifecycle (submit / approve / reject / activate). |
| **Change Orders** | Create amendments, tie to a budget version / contract / PO / site payment; submit → approve → apply. |
| **Site Payments** | Site-level milestones (startup, visits, holdback, etc.), status updates. |
| **Vendors** | Vendor master data and contracts; ties to spend and POs. |
| **Invoices** | Intake, selection by invoice, full workflow (lines, submit, approve / reject, payment). |
| **Purchase Orders** | Create POs, monitor utilization, **close** completed POs. |
| **Forecasting** | Assumptions from workspace settings + read-time charts (no separate “recompute” job). |
| **Approvals** | Queue across object types; approve / reject / escalate with notes. |
| **Reports** | Report library plus **CSV exports** (budget / invoices / vendors). |
| **Settings** | Workspace, categories, finance owner; initialize workspace if missing. |

---

## 2. First-time setup (workspace)

This section is supposed to ensure the study has a **finance workspace** and **reference data** (categories, later budget/vendor skeleton) so forms elsewhere do not fail or show empty pickers.

**If finance workspace is not initialized**

- A **banner** may appear on finance pages linking to **Dashboard** or **Settings**.
- Open **Settings** (or use the **Initialize** card on **Dashboard** when shown).
- Complete workspace initialization (base currency, optional fiscal period).
- After initialization, use **Settings** to:
  - Adjust **base currency**, **fiscal period**, optional **finance owner** (user UUID).
  - Add **budget categories** (code, name, description). Edit or **archive** categories as needed.

**Recommended before heavy data entry**

1. Initialize workspace (**Settings** or **Dashboard**).
2. Create at least one **budget category** (**Settings**).
3. Create a **study budget** and a **draft budget version** (**Budget**).
4. Add **vendors** (and **contracts** where applicable) (**Vendors**).

The **Dashboard** checklist (when the workspace exists) links you to Budget, Settings, and Vendors until budget, categories, and an active vendor are in place.

---

## 3. End-to-end workflow order (recommended)

This section is a **single narrative path** from empty study to routine operations. Use it for onboarding or audits; skip steps your SOP handles differently.

Follow this sequence for a clean study setup; adjust if your process differs.

1. **Settings** — Workspace + categories (+ finance owner if used).
2. **Budget** — Create budget → draft version → add line items by category.
3. **Budget** — Submit version → approvals → approve → **activate** active version (use **Budget** lifecycle controls).
4. **Vendors** — Add vendors; add contracts; edit/archive vendors as needed.
5. **Purchase Orders** — Create POs (vendor required; contract/category optional); **close** when done.
6. **Invoices** — Intake invoices; allocate lines; submit → approve/reject → record payment when approved.
7. **Site Payments** — Add schedules per site; update milestone **status** from the table.
8. **Change Orders** — When budgets or spend objects change formally, create → submit → approve → **apply**.
9. **Approvals** — Work the unified queue; filter by type (invoices, budgets, POs, change orders, site payments).
10. **Forecasting** — Tune assumptions (via workspace/settings-driven fields used in forecast); review charts.
11. **Reports** — Download CSV snapshots when needed.

---

## 4. Tab-by-tab instructions

This section is the **step-by-step manual**: each subsection matches a Finance Module tab and tells you which controls to use and in what order.

### 4.1 Dashboard

**Purpose:** One place to see study finance health at a glance and to **catch setup gaps** (workspace not initialized, missing budget/categories/vendors) via KPIs, charts, and the checklist.

- Review KPIs and charts (budget vs actual, spend by category).
- If you see **Initialize workspace**, complete it before relying on other tabs.
- Use the **data setup checklist** links to fix missing budget, categories, or vendors.

### 4.2 Settings

**Purpose:** Configure the **finance workspace** (currency, fiscal window, optional finance owner) and maintain the **budget category** catalog that budget lines and reporting rely on.

| Action | Steps |
|--------|--------|
| Initialize workspace | Use the initialize flow when no workspace exists; set currency (and fiscal dates if required). |
| Update workspace | Save base currency, fiscal start/end, optional finance owner UUID. |
| Add category | Enter code, name, optional description → **Add category**. |
| Edit category | **Edit** on a category row → adjust fields → **Save**. |
| Archive category | **Archive** (soft-remove from active lists; existing references depend on product rules). |

**Note:** Approval **policy** copy on Settings may describe defaults; configurable routing may be company-level outside this screen.

### 4.3 Budget

**Purpose:** Hold the **authoritative plan** for the study: versioned budgets, line-level detail by category, approval/activation, and links to formal **change orders** when the plan shifts.

| Action | Steps |
|--------|--------|
| Select version | Use **Budget version** dropdown (shows version number, label, status). URL may include `?version={uuid}` for deep links. |
| New draft | **New draft version** (when versions exist) or create first version from empty state. |
| Add line items | Only on **draft** versions. Choose **category**, line name, **unit basis**, quantity, unit cost, currency, optional dates. Submit **Add** / form submit per UI. |
| Remove draft line | Use archive/remove control on the line row where provided. |
| Lifecycle | Use **Budget version lifecycle**: **Submit** (draft → submitted), **Approve** / **Reject** (submitted), **Activate** (approved → active). |
| Change orders | Use **Open change orders** (or **Change Orders** tab) for formal amendments. |

### 4.4 Change Orders

**Purpose:** Record **controlled amendments** to budget versions or spend objects (contracts, POs, site payments) with an auditable submit → approve → **apply** path instead of editing history informally.

| Action | Steps |
|--------|--------|
| Create | Title, optional change #, **target type** (budget version, contract, PO, site payment), **target** record, delta amount, currency, optional reason → **Create draft**. |
| Workflow | **Submit** → **Approve** → **Apply** (buttons per row, status-dependent). |

Ensure the selected **target** matches a real row (picker shows human-readable labels).

### 4.5 Vendors

**Purpose:** Maintain **who you pay** (vendor master) and **commitments under contract**, which downstream POs, invoices, and spend views reference.

| Action | Steps |
|--------|--------|
| New vendor | Name, service category, notes → **Add vendor**. |
| New contract | Vendor, title, contract #, total value, currency → **Create contract**. |
| Edit vendor | **Edit vendor** column: pick vendor, adjust name/category/status/notes → **Save changes**. |

Archived vendors appear marked in the picker; you can set status back to **Active** when appropriate.

### 4.6 Purchase Orders

**Purpose:** Track **committed spend** against vendors (optionally contracts/categories), open vs closed POs, and utilization—so actuals and approvals align with encumbrances.

| Action | Steps |
|--------|--------|
| Create PO | Vendor (required), optional contract (filtered by vendor), optional category, PO number, dates, value, currency, description → **Create PO**. |
| Close PO | In the PO table, **Close PO** on open rows when the commitment is finished. |

### 4.7 Invoices

**Purpose:** Run the **accounts-payable style loop**: intake → allocate lines to categories/totals → approval → payment recording for vendor bills tied to the study.

| Action | Steps |
|--------|--------|
| Intake | **Invoice Intake**: invoice number, date, total, currency → creates draft invoice; list refreshes after success. |
| Select invoice | Click invoice number / row so the URL includes `?invoice={uuid}` (or equivalent selection); the **workflow** panel applies to that invoice. |
| Line allocation | Description, quantity, unit amount must multiply to invoice total; optional **budget category**. **Save line items**. |
| Submit | **Submit for approval** when draft. |
| Approve / Reject | Use buttons when status allows; rejection may prompt for reason (dialog). |
| Payment | When **approved**, **Record payment** (amount, date, reference). |

### 4.8 Site Payments

**Purpose:** Plan and track **site-level economics** (startup, milestones, visits, holdbacks) per investigational site, independent of vendor invoices but parallel in status tracking.

| Action | Steps |
|--------|--------|
| Add milestone | Site, milestone **type**, label, amount, currency, optional holdback %, due date, optional per-subject amount, notes → **Add milestone**. |
| Update status | In the schedule table, change **Status** (scheduled, earned, approved, paid, partial, on hold, cancelled). |

Sites come from the study’s site list; if none load, fix study sites first.

### 4.9 Forecasting

**Purpose:** Visualize **forward-looking spend** driven by enrollment-style assumptions and workspace settings—used for planning and variance conversations, not as a separate stored “batch job.”

- Adjust drivers via **Forecast assumptions** / workspace-linked settings (as exposed on the Forecasting and Settings flows).
- Charts and scenarios are **derived when you load the page**; there is no separate persisted “scenario run” to trigger.

### 4.10 Approvals

**Purpose:** Central **inbox** for approvers: one queue for budgets, invoices, POs, change orders, and site-payment approvals, with actions that update both the request and the underlying record where applicable.

- Use filter chips (**All**, **Invoices**, **Budgets**, **Purchase Orders**, **Change Orders**, **Site Payments**) to narrow the queue.
- Open **Actions** on a row: approve / reject / escalate with optional notes. Domain rules may update both the approval row and the underlying invoice/budget/etc.
- Page refreshes after actions so lists stay current.

### 4.11 Reports

**Purpose:** **Read-only aggregation** of study finance data for review meetings plus **CSV exports** for spreadsheets, monitors, or archival outside the app.

- Browse the **report library** and tables for descriptions.
- Use **Data exports** for CSV: **Budget tracker**, **Invoice register**, **Vendor spend summary** (snapshots aligned to current study data).

---

## 5. Cross-cutting behavior

This section explains **rules that span multiple tabs**—so you are not surprised when permissions, refresh, or UI conventions behave the same everywhere in Finance.

| Topic | Behavior |
|-------|----------|
| **Permissions** | All writes go through server actions (study finance write context). No direct client DB writes. |
| **Refresh** | After mutations, the UI refreshes or revalidates so tables and RSC content update. If something looks stale, reload the page. |
| **Select fields** | Dropdowns show **labels** (not raw IDs) in the trigger where implemented; placeholders read “Select…”, “None”, etc. |
| **Workspace missing** | Banner points to Dashboard / Settings until initialization is done. |

---

## 6. Quick troubleshooting

This section is a **fast lookup** when a form button is disabled, a save fails, or a list is empty—without rereading the full tab instructions.

| Issue | What to check |
|-------|----------------|
| Cannot add budget lines | Version must be **draft**; categories must exist in **Settings**. |
| Cannot create PO | Vendor required; confirm vendor is **active**. |
| Invoice line save fails | Quantity × unit amount must equal invoice total (within tolerance). |
| Change order target empty | Pick **target type** first; ensure related records exist (e.g. budget versions). |
| No sites in site payment form | Study must have **study sites** configured. |
| Forecast looks unchanged | Assumption fields are read from workspace/settings; save settings then revisit **Forecasting**. |

---

## 7. Related code (for maintainers)

This section exists so **developers or technical operators** can jump from documented behavior to implementation (routes, shell, actions, schemas). End users can ignore it.

- Routes: `app/protected/studies/[id]/finance-module/**`
- Shell / nav: `components/ctms/finance-module/finance-module-shell.tsx`, `FINANCE_MODULE_TABS` in `lib/finance-module/types.ts`
- Server actions: `lib/actions/study-finance-module.ts`
- Validation: `lib/finance-module/schemas.ts`

---

*Document version: aligned with Finance Module workflows as implemented in the Trialetics codebase. Update this file when product behavior changes.*
