---
title: Financials & Invoice Approvals — User Manual
description: Step-by-step guide for managing study budgets, site budgets, invoice approvals, and payment inside Trialetics.
---

# Financials & Invoice Approvals — User Manual

Last updated: April 2, 2026

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Roles at a Glance](#2-roles-at-a-glance)
- [3. Admin Setup (Do First)](#3-admin-setup-do-first)
- [4. Study Budget Management](#4-study-budget-management)
  - [4a. Creating a Study Budget](#4a-creating-a-study-budget)
  - [4b. Budget Sections (Structured Format)](#4b-budget-sections-structured-format)
  - [4c. Visit Schedule & Procedure Cost Grid](#4c-visit-schedule--procedure-cost-grid)
  - [4d. CSV Import for Study Budget Lines](#4d-csv-import-for-study-budget-lines)
  - [4e. Budget Template Wizard](#4e-budget-template-wizard)
  - [4f. Budget Template Library (Admin)](#4f-budget-template-library-admin)
  - [4g. CTA Budget Export](#4g-cta-budget-export)
- [5. Study → Site Budget Propagation](#5-study--site-budget-propagation)
  - [5a. Generating a Site Budget from a Study Budget](#5a-generating-a-site-budget-from-a-study-budget)
  - [5b. Re-syncing a Site Budget](#5b-re-syncing-a-site-budget)
  - [5c. Budget Versioning](#5c-budget-versioning)
  - [5d. What "Linked" Means](#5d-what-linked-means)
- [6. Site Budget Management](#6-site-budget-management)
  - [6a. Creating a linked site budget (site Financials)](#6a-creating-a-linked-site-budget-site-financials)
  - [6b. Exporting and Printing Budget Line Items](#exporting-and-printing-budget-line-items)
  - [6c. Allocating Invoices to Site Budget Lines](#6b-allocating-invoices-to-site-budget-lines)
- [7. Submitter Workflow — Entering an Invoice](#7-submitter-workflow--entering-an-invoice)
- [8. Approver Workflow — Reviewing Invoices](#8-approver-workflow--reviewing-invoices)
- [9. Automated Invoice Validation](#9-automated-invoice-validation)
- [10. Recording Payment](#10-recording-payment)
- [11. Invoice Status Reference](#11-invoice-status-reference)
- [12. Reading Invoice Activity](#12-reading-invoice-activity)
- [13. Common Mistakes & Tips](#13-common-mistakes--tips)
- [14. Troubleshooting](#14-troubleshooting)

---

## 1. Introduction

The **Financials & Invoice Approvals** module manages the complete financial lifecycle of a clinical trial — from building a structured study budget through to approved invoices and recorded payments.

The end-to-end flow works like this:

1. An **admin** builds a **Study Budget** using the guided wizard or manual entry, organised into standard clinical trial sections.
2. Study budgets are **propagated** to individual sites, generating site-level budgets scaled by enrollment and optional regional modifiers.
3. A **submitter** logs an invoice, uploads the PDF (AI pre-fills the form), and submits it for approval.
4. An **approver** reviews the invoice against the approved budget and approves or rejects each step. Automated validation flags over-budget lines before approval.
5. Once approved, a finance user records the payment. Budget utilisation updates in real time.

Every decision and budget change is permanently logged with name, timestamp, and context, providing a full compliance audit trail.

---

## 2. Roles at a Glance

| Role | What they do | Where they work |
|------|-------------|-----------------|
| **Admin** | Creates studies, configures approval templates, manages budget templates | Study settings, Financials → Approval Templates |
| **Submitter** | Uploads invoice PDFs, creates drafts, submits for approval | Study → Financials tab |
| **Approver** | Reviews invoices, approves or rejects each step | Financials → Approval Queue |
| **Finance / Admin** | Manages budgets, records payments, propagates site budgets | Study → Financials tab, Site → Financials tab |

> A person can hold more than one role. The system enforces which actions each role can take based on the approval template configured by the admin.

---

## 3. Admin Setup (Do First)

Before anyone can submit or approve an invoice, an admin must complete these steps.

### Step 1 — Create a Study

1. Go to **Studies** in the main navigation.
2. Click **New study** and fill in the protocol number, title, phase, and other details.
3. Click **Save**.

### Step 2 — Add Sites to the Study

Invoices can be linked to a specific site. Sites must exist before an invoice can reference them.

1. Open the study you just created.
2. Go to the **Sites** tab and click **Add site**.
3. Fill in the site number, name, and location details.
4. Click **Save**.

### Step 3 — Assign Team Members and Roles

Approvals are role-based. Each person who will approve invoices must have the correct study role.

1. Open the study → **Team** tab.
2. Click **Add member**, select the user, and assign their role (e.g., *Study Manager*, *Finance Approver*).
3. Click **Save**.

> **Note:** The specific role names authorised to approve each step depend on your company's approval workflow configuration.

### Step 4 — Configure Company Invoice Approval Workflows (Company Admin)

Workflows are **per company**, not global. Only **company administrators** can create or edit them.

1. Sign in as a company admin.
2. Go to **Financials** → **Configure invoice approval workflows**.
3. You will see at least one workflow. You can:
   - **Add** workflows with multiple **steps**, each with a label and one or more **study roles** allowed to approve that step.
   - Mark one workflow as the **company default** (used when nothing more specific applies).
   - Set an **escalation amount (USD)**: if an invoice total exceeds this amount, the system adds one extra approval step requiring a **Finance Director** or **Executive Director** role.

### Step 5 — Optional: Study-Level Default Workflow (Company Admin)

1. Open the study → **Financials** tab.
2. Click the **Default approval workflow** button to open the workflow selector dialog.
3. Choose a workflow and click **Save**.
4. New invoice drafts that leave the workflow on *Automatic* will use this study default on submit, then fall back to the company default if none is set.

### Step 6 — How the Workflow is Chosen at Submit Time

When someone clicks **Submit** on a draft, the system assigns the workflow in this order:

1. **Draft override** — if the submitter picked a specific workflow in the New invoice draft dialog.
2. **Study default** — from Step 5.
3. **Company default** — the workflow marked default in Step 4.

---

## 4. Study Budget Management

Study budgets are the master financial plan for the trial. They are structured into industry-standard sections (A–F) and can be propagated automatically to individual sites.

**Where to go:** Study → **Financials** tab → **Budgets** section.

### 4a. Creating a Study Budget

1. Click **Add Budget** in the Budgets section header.
2. Enter a **name** (e.g., *Initial Budget V1*) and **total amount**.
3. Click **Save**. The budget card appears and is ready to populate with sections and line items.

> Alternatively, use the **Budget Wizard** (see Section 4e) to auto-generate a fully structured budget from guided inputs.

### 4b. Budget Sections (Structured Format)

Budgets support six standard clinical trial cost categories:

| Section Type | Description |
|---|---|
| **Invoiceable Items** (A) | Startup / pass-through costs: IRB, regulatory submissions, drug storage, equipment |
| **Study Procedures Per Patient** (B) | Visit-based procedure grid: procedures × visits with unit costs |
| **Staff / Effort-Based Costs** (C) | PI rate, coordinator, CRA, data manager, lab fees |
| **Per Visit Expenses** (D) | Lab supplies, medical supplies, per-visit costs |
| **Subject Travel & Stipends** (E) | Travel reimbursement and stipends per visit |
| **Enrollment Scaling** (F) | Subject count milestones with auto-calculated total costs |

**Adding a section to a budget:**

1. In the budget card header, click **Add section**.
2. Select the **section type** from the dropdown.
3. Enter a **name** for the section (pre-filled based on type, editable).
4. Optionally set an **indirect rate %** (e.g., enter `26` for 26%). The system calculates and displays an indirect cost row under each section's direct subtotal.
5. Click **Save**.

**Section totals:**

Each section displays:
- **Direct subtotal** — sum of all active line item costs in the section
- **Indirect amount** — `direct subtotal × indirect rate` (if a rate is set)
- **Section total** — direct + indirect

The **grand total** at the bottom sums all section totals.

**Upgrading a legacy (flat) budget:**

If you have an existing budget with line items but no sections, an admin can click **Upgrade to sections** in the budget card header. All existing lines are moved to an *Other* section. This is opt-in and never automatic.

**Editing the indirect rate on a section:**

Click the indirect rate value displayed in the section header to edit it inline. Press Enter or click away to save.

**Deleting a section:**

Click the delete icon next to the section name and confirm. Line items within the section become unsectioned rather than deleted.

### 4c. Visit Schedule & Procedure Cost Grid

For **Study Procedures Per Patient** sections, the system provides an interactive visit × procedure cost grid.

**Defining the visit schedule:**

1. Expand the **Study Procedures Per Patient** section.
2. Click **+ Add visit** to add a column (e.g., *Baseline*, *1 Week*, *3 Month*).
3. Optionally enter the number of days from enrollment for ordering purposes.

**Adding procedures (rows):**

1. Click **+ Add procedure** to add a row (e.g., *Informed Consent*, *MRI*, *Labs*).
2. Click any cell at the intersection of a procedure row and visit column to enter the unit cost.
3. Leave a cell empty (or zero) if the procedure is not performed at that visit.

**Auto-calculations (updated in real time):**

| Value | Calculation |
|---|---|
| Cost per visit | Sum of all procedure costs in that column |
| Cost per patient | Sum across all visit columns for one patient |
| Total procedure cost | Cost per patient × planned enrollment |

**Enrollment actuals:**

When subjects have been enrolled, the grid shows planned vs. actual counts with colour-coded variance:
- **Green** — on track
- **Amber** — within 10% deviation
- **Red** — more than 10% deviation

### 4d. CSV Import for Study Budget Lines

1. In a budget card header, click **CSV template** to download a template file.
2. Add your data in Excel or any spreadsheet app. Available columns:

| Column | Required | Notes |
|---|---|---|
| `section` | No | Section name — creates a new section if the name does not already exist |
| `category` | No | Category label for the line |
| `description` | Yes | Line item description |
| `unit_cost` | Yes | Cost per unit (numeric) |
| `quantity` | Yes | Number of units (numeric) |
| `cost_basis` | No | `one_time`, `per_visit`, `per_patient`, or `per_month` |
| `direct_cost` | No | Override the computed direct cost |
| `indirect_cost` | No | Override the computed indirect cost |

3. Click **Import CSV** in the budget card header and select your file.
4. The app validates every row. If any row has errors, you receive row-level messages and nothing is saved.
5. If you already have line items, a confirmation dialog asks whether to append before saving.

### 4e. Budget Template Wizard

The Budget Wizard generates a fully structured budget from guided inputs.

**Where to start:** Study → Financials tab → click **Create from wizard** next to the Add Budget button.

**Editing inputs after the budget exists**

Each budget card has **Edit wizard**, which reopens the same four steps with values restored from the last wizard save (or inferred from the study for older budgets without a saved snapshot). From the Review step you can:

- **Save inputs** — Updates the budget name, enrollment, duration, indirect rate, and stores the full wizard snapshot. Existing sections and line items are **not** changed.
- **Regenerate budget** — Confirms, then deletes all sections and line items for **that study budget** and rebuilds them from the current wizard values. Custom line edits and procedure grid cell values are lost. Site budgets **linked** to this study budget may need **Re-sync from study** (see §5b).

**Step 1 — Study Inputs**

| Field | Description |
|---|---|
| Planned enrollment | Total number of subjects for the study |
| Study duration | Length of study in months |
| Planned budget (optional) | Study-level target total in the budget currency; stored with the wizard snapshot and compared to the estimated total on Review. Does not auto-adjust generated line items. |
| Planned sites (optional) | Anticipated number of participating sites; stored in the wizard snapshot for planning only (v1). |
| Visit schedule | Add/remove visit timepoints (name + optional days from enrollment) |
| Procedure intensity | Low / Medium / High — influences the number of default procedure rows generated |

Optional **Planned budget** and **Planned sites** values are saved on the budget’s wizard snapshot; they do not change the template math in the current release.

**Step 2 — Financial Assumptions**

| Field | Description |
|---|---|
| Indirect rate % | Applied to all applicable sections (e.g., 26%) |
| Monitoring visits per year | Drives the CRA effort estimate |
| Benchmark cost per patient | Optional reference cost to validate generated totals |
| Include pass-through / startup costs | Toggles generation of the Invoiceable Items section |

**Step 3 — Cost Drivers**

| Field | Description |
|---|---|
| Staff roles required | Select roles to include (PI, Coordinator, CRA, Data Manager, Lab, etc.). Each generates monthly staff lines in Section C. |

**Step 4 — Review & Generate**

- A preview of generated budget sections with estimated totals appears.
- Enter a **budget name**.
- Toggle **Save as template** to make this structure available as a company-wide reusable template.
- Click **Generate Budget** to create the study budget, sections, line items, and visit schedule in a single operation. The wizard stores your inputs on the budget record for later **Edit wizard** sessions.

### 4f. Budget Template Library (Admin)

Company-wide budget templates are managed under **Financials → Budget Templates** (visible to admins).

The library lists all templates for your company, including name, number of sections, default indirect rate, version number, and last updated date.

**Actions available:**

| Action | Description |
|---|---|
| **Clone** | Creates a copy of the template as a new version (e.g., for regional variations) |
| **Download CSV** | Exports the template's default line items as a flat CSV |
| **Delete** | Removes the template; blocked if any study budget was generated from it |

Templates are versioned. Editing and saving creates a new version, preserving the old one for budgets already generated from it. The `study_budgets.template_id` FK points to the specific version used.

### 4g. CTA Budget Export

For budgets that have sections, a **CTA export** button appears in the budget card header. This produces a Clinical Trial Agreement–formatted budget in two formats:

- **HTML export** — a printable, styled page with all sections, direct costs, indirect costs, subtotals, and grand total. Open in a new tab and use Print → Save as PDF.
- **CSV export** — a flat file with `section`, `category`, `description`, `direct_cost`, `indirect_cost`, `total_cost` columns, compatible with Excel-based sponsor workflows.

---

## 5. Study → Site Budget Propagation

Once a study budget is approved, it can be pushed to individual sites automatically, scaling per-patient costs by each site's planned enrollment.

### 5a. Generating a Site Budget from a Study Budget

**Where to go:** Study → Financials tab → find an approved study budget → click **Propagate to sites**.

1. The **Propagate Budget** dialog opens.
2. Select one or more **sites** to generate budgets for.
3. Set a **default enrollment** (number of subjects for this site). You can override this per site individually.
4. Optionally set a **regional cost modifier** (e.g., `1.10` for +10% to account for regional cost differences).
5. Review the per-site summary.
6. Click **Generate site budgets**.

The system creates a site budget for each selected site, linked back to the study budget, scales per-patient costs by enrollment, applies any regional modifier, and writes a propagation entry to the finance audit log.

### 5b. Re-syncing a Site Budget

When the study budget changes after site budgets have already been generated, you can re-sync individual site budgets.

**Where to go:** Site → Financials tab → Site Budget card → click **Re-sync from study**.

1. The **Re-sync Preview** dialog opens.
2. Adjust **enrollment** and **regional modifier** if needed.
3. Toggle **Preserve site-level overrides** to keep any cost changes made directly on the site budget.
4. A **diff view** shows added, changed, and removed lines with old vs. new values before any changes are applied.
5. Click **Apply re-sync** to update the site budget.

> A "Generated from study budget: [name]" banner appears on any site budget created via propagation, showing which study template it is linked to.

### 5c. Budget Versioning

Site budgets follow a version history to support protocol amendments and iterative negotiation.

- Every site budget starts at **version 1**.
- When a budget needs to be renegotiated (e.g. after a protocol amendment), click **Create Amendment** in the Site Budget card header. This creates a new version (v2, v3, etc.) with all line items copied from the current version. The previous version becomes read-only.
- When a study budget is **propagated** to a site, a brand-new `site_budget` row is created (not an amendment of an existing one). If a site already has a budget and you propagate again, the system creates an additional row. The site page always shows the **most recent version** by default.
- For sites that already have a budget, **Re-sync** (Section 5b) is the preferred update path — it updates the existing rows in place rather than creating a duplicate.

### 5d. What "Linked" Means

A site budget is **linked** to a study budget when it was generated via propagation (from the study Financials tab or **Create from study budget** on the site). A blue **Linked** banner appears on the Site Budget card.

**What linking enables:**
- The **Re-sync from study** button is available — when the study master changes, you can preview and apply a diff update.
- The finance audit log records which study budget version was used to generate the site budget.

**What linking does not do automatically:**
- Study budget changes are **not** pushed to linked sites automatically. This is by design to protect site-level negotiations. You must explicitly choose **Re-sync from study** on each site after the study master is updated.

**Unlinked site budgets** (built manually or via CSV/AI upload) do not show the banner and cannot be re-synced from a study budget. They can be managed independently.

---

## 6. Site Budget Management

Each site can have a detailed budget with line items that match the clinical budget layout. **Linked** site budgets always start from an existing **study budget** (see [Section 5](#5-study--site-budget-propagation)): either **Propagate to sites** on the study Financials tab (batch) or **Create from study budget** on this site’s Financials tab when no site budget exists yet. After the linked budget exists, you can add **site-only line items** (for example local pass-through fees) and they stay in place when you **Re-sync** study lines — only rows that came from the study master are updated to match amendments there.

You can also build or extend budgets **manually** (CSV, AI upload, or line-by-line entry); budgets that are not linked to a study master cannot use **Re-sync from study** (see [Section 5d](#5d-what-linked-means)).

**Where to go:** Study → **Sites** tab → click a site → **Financials** tab.

### 6a. Creating a linked site budget (site Financials)

When this site does not have a budget yet, open **Financials** → **Budget line items**. If the study already has at least one study budget, click **Create from study budget**.

1. Choose which **study budget** to copy from (if there is more than one).
2. Enter **Enrollment at this site** — per-patient lines are scaled using this count.
3. Optionally set a **Regional cost multiplier** (use `1` for no adjustment).
4. Click **Create site budget**. The new budget is **linked** to that study budget ([Section 5d](#5d-what-linked-means)).

If there are **no study budgets** yet, use **Open study Financials** on this card, create the study master first ([Section 4e](#4e-budget-template-wizard)), then return here or use **Propagate to sites** ([Section 5a](#5a-generating-a-site-budget-from-a-study-budget)) to include this site in a batch.

### Setting Up a Site Budget

1. In the **Site Budget** card, enter the **Proposed budget** and optionally the **Approved budget**.
2. Set the **Negotiation status** (Draft, In Review, Approved, Rejected).
3. Set the **Default overhead %** — new line items you add use this when the line’s overhead field is left blank. To overwrite overhead on **all** existing lines, click **Apply to all line items** next to the field (confirm in the dialog); amounts in the budget table update to stay consistent.
4. Click **Save site budget**.

### Uploading a Budget Document

1. In the **Budget Line Items** card, click **Upload budget**.
2. Select an Excel (.xlsx), PDF, PNG, or JPEG file.
3. The file uploads; AI extracts all sections, line items, overhead rates, and payment information automatically.
4. Line items are saved to the budget table, grouped by section.

### Adding Line Items Manually

Click **Add item** to open the line item dialog. Fill in:

| Field | Description |
|---|---|
| **Section** | Group name (e.g., "IRB Fees", "Additional Fees") |
| **Description** | The specific cost item |
| **Cost basis** | How the cost is calculated (e.g., "Per day", "One-time") |
| **Unit cost** | Cost per unit |
| **Quantity** | Number of units |
| **Overhead %** | Overhead percentage (e.g., enter `39` for 39%) |
| **Paid to** | Who receives payment: Site, IRB, or Vendor |

### CSV Import

1. Save the site budget first.
2. Click **CSV template** to download a template with column headers and example rows.
3. Add your rows in Excel or any spreadsheet app and save as CSV.
4. Click **Import CSV** and select your file. Errors are shown per row; nothing is saved until all rows are valid.
5. Import **adds** new rows — it does not delete or replace existing ones. A confirmation dialog appears if existing line items are present.

### Reading the Budget Table

Each section shows its line items with:

- **Unit Cost × Qty = Total Cost**
- **Overhead %** and **Overhead Amount**
- **Proposed (with OH)** — the budgeted line total including overhead (what you planned for that row)
- **Actual (invoiced)** — amounts allocated from finance invoices to that line
- **Variance** — proposed minus actual (unspent budget when positive; color hints: green / yellow / red reflect how thin remaining headroom is, same as before for “remaining”)
- **Paid To** badge
- Section header **Subtotal** shows proposed, actual, and variance for that section.

When any line has invoice allocations, a summary strip above the tables shows **Proposed total**, **Actual (invoiced)**, and **Variance** for the site budget (active line math may differ slightly from invoice allocations that still point at inactive lines — use line-level columns for the exact split).

A **grand total** footer summarizes proposed, actual, and variance for **active** lines only.

### Exporting and Printing Budget Line Items

Two export actions are available in the **Budget Line Items** card header whenever at least one line item exists:

| Action | What it produces |
|---|---|
| **Printable report** | Opens a formatted HTML page in a new browser tab — landscape layout, Poppins font, one table per section with subtotals, a summary header, and a footer with study/site labels and print date. Use **Print → Save as PDF** in your browser to generate a PDF for sharing or filing. |
| **Line items CSV** | Downloads a CSV file (`site-budget-lines-{site}-{date}.csv`) with all columns: section, description, active status, cost basis, unit cost, quantity, overhead rate, line total, overhead amount, cost with overhead, actual invoiced, variance, paid to, invoice IDs, and line notes. A summary row at the end captures grand totals for active lines. The file uses UTF-8 encoding with a BOM so it opens correctly in Excel. |

Both actions are disabled (greyed out) when there are no line items. The **Printable report** opens in a new tab — the current page is not affected and no data is sent to a server.

> **Browser print tip:** In Chrome or Edge, choose **Print → More settings → Paper size: A4 Landscape** (or Letter Landscape). Margins are set to 1 cm by the report itself.

### Line Items Tab: Edit, Inactive, and Totals

- **Edit:** Click **Edit** on a row to open the line item dialog.
- **Mark inactive:** Use **Mark inactive** in the Edit dialog footer. Inactive lines stay for history but no longer count toward totals.
- **Reactivate:** Click **Reactivate** on an inactive row to include it in totals again.
- **From invoices:** The **From invoices** column lists which invoice numbers have amounts applied to each line (read-only).

### Payment Schedule

On the site Financials tab, open **Schedule** to manage milestone-based payments.

- Click **Add milestone** to enter a name, amount, optional due date, and currency.
- Use **Edit** to change details or update status to **Pending**, **Due**, or **Paid**.
- **Delete** removes the milestone row only; it does not affect invoices or recorded site payments.

### Payment Information

On the site **Financials** tab, open **Payment info**. Data is stored on the current site budget record.

The form is grouped like a typical site agreement:

- **Invoice submission and inquiries** — Primary **Email** and optional **Email cc** for invoice questions.
- **Payee for compensation** — **Payee to appear on check**, **Tax I.D. number**, and the bank wire block below.
- **Bank wire details** — three structured inputs for banking identity:
  - **Routing number** — ABA routing number (9 digits for US institutions)
  - **Account number** — bank account number
  - **SWIFT / BIC** — international bank identifier (8–11 characters)
- **Additional wire instructions** — a free-text area for any supplementary information (transfer codes, intermediary bank details, etc.) that does not fit the structured fields above. Existing records that only have this field populated continue to display correctly; all four fields are optional.
- **Or** — **Mail to the attention of**, plus **Institution**, **Department**, **Address**, and **City, State, Zip** when checks are mailed.

Click **Save payment info** to persist. If a routing number is entered but is not exactly 9 digits, the system saves successfully and shows a reminder toast — non-US routing codes of different lengths are accepted. AI budget upload can pre-fill all payment fields when the document includes them.

### Budget Amendments

When a budget changes (e.g., a protocol amendment), click **Create Amendment** in the Site Budget card header. This creates a new version (v2, v3, etc.) with all existing line items copied. The previous version is preserved for the audit trail.

### 6b. Allocating Invoices to Site Budget Lines

For **site** invoices, you can split the invoice total across site budget line items so **Remaining** on each line reflects what is left after invoicing.

**Where to go:** Site → Financials → Invoices tab (or Study → Financials). Open a site invoice that is not Rejected.

1. Click **Budget lines** in the Actions column.
2. The dialog loads the current site budget. Each row shows:
   - **Description** and section label
   - **Line max** — the approved cap for this line
   - **Other invoices** — amounts already applied by other invoices
   - **Remaining** — what is left
   - **This invoice** — the amount to apply from this invoice
3. If you used AI extract on the invoice PDF and the model returned line items with descriptions, the form may **suggest** amounts on matching lines (edit freely before saving).
4. **Section utilisation bars** appear above the table when the budget has sections, showing allocated vs. cap per section with colour thresholds:
   - Green — under 80% utilised
   - Amber ⚠ — 80–99% utilised
   - Red ⛔ — at or over 100% utilised
5. Each row shows an inline warning icon if your entered amount would push that line over its cap (⛔ = over cap, ⚠ = 80%+ of cap).
6. The sum across all **This invoice** fields cannot exceed the invoice total.
7. Click **Save allocation**. The Line items tab updates Remaining and From invoices after refresh.

> Vendor or IRB invoices without a site link cannot be allocated this way.

---

## 7. Submitter Workflow — Entering an Invoice

**Where to go:** Study → **Financials** tab → **Invoices** card.

You can do the same from a single site's page: Sites → choose a site → Financials tab → Invoices. Site-billed drafts are scoped to that site automatically.

### Step 1 — Open the New Invoice Dialog

Click **Submit invoice** in the top-right of the Invoices card. A dialog titled **New invoice draft** opens.

### Step 2 — Upload the Invoice Document (Recommended)

1. Click **Choose PDF, PNG, or JPEG** under *Invoice document*.
2. Select the file from your computer. Accepted formats: .pdf, .png, .jpg, .jpeg. Maximum size: 50 MB.
3. The file uploads immediately. A spinner shows while it processes.
4. The AI reads the document and pre-fills the form fields. A **✦ AI** badge appears next to any auto-filled field.

> You can skip the upload and fill in fields manually if no digital document is available.

### Step 3 — Verify and Complete the Form

| Field | What to enter |
|-------|---------------|
| **Approval workflow** | *Automatic* uses study then company default, or pick a specific workflow for this draft only |
| **Who is billing?** | Choose Site, Vendor, or IRB / ethics |
| **Site** | If billing type is *Site*, select the specific site from the dropdown |
| **Invoice number** | The number printed on the invoice from the vendor or site |
| **Amount** | Total amount due (numbers only, no currency symbol) |
| **Due date** | Optional — the payment due date on the invoice |
| **Notes** | Optional — internal notes for your team |

### Step 4 — Save as Draft

Click **Save draft**. The dialog closes and the invoice appears in the table with a **Draft** status badge.

### Step 5 — Submit for Approval

In the invoice table, find your draft. Click **Submit** in the Actions column. A confirmation dialog appears. Click **Submit** to confirm. The invoice status changes to **Under review**.

> **Tip:** Click anywhere on an invoice row (or **View Document**) to open the **Invoice Detail Panel** — a full-width side panel that shows the original PDF and all approval actions together without leaving the page. See [Invoice Detail Panel](#invoice-detail-panel) below.

> Once submitted, the invoice is locked. You cannot change the amount, invoice number, or document.

---

## 8. Approver Workflow — Reviewing Invoices

Approvers work from the **Approval Queue**, a centralised view of all invoices waiting for a decision.

**Where to go:** Main navigation → **Financials** → **Approval Queue**

### Step 1 — Open the Approval Queue

Navigate to **Financials → Approval Queue**. You will see all invoices with *Under review* status across all studies your account can access.

### Step 2 — Filter by Study (Optional)

Use the **study dropdown** in the top-right to focus on a specific study.

### Step 3 — Review the Invoice

For each invoice you will see Study, Invoice #, Amount, and Status. Click the 📎 icon or **Doc** button to open the original PDF. Click **History** to expand prior approver decisions.

**Validation badges:** Invoices that have been automatically validated against the site budget may show:
- **⛔ [n]** — hard blocks: the invoice would exceed the approved budget by more than the escalation threshold
- **⚠ [n]** — soft warnings: one or more line allocations exceed their individual line cap

Open **Budget lines** to see per-line detail before approving.

### Step 4 — Add an Optional Comment

Type any notes in the **Comment** column. Comments are shown in the confirmation dialog and stored permanently in the audit trail.

### Step 5 — Approve or Reject

**To approve:**
1. Click the green **Approve step** button.
2. Review the confirmation dialog.
3. Click **Approve** to confirm.

If this is the final required step, the status changes to **Approved**. If more steps remain, it stays *Under review* until all are complete.

**To reject:**
1. Click the red **Reject** button.
2. Review the confirmation dialog.
3. Click **Reject** to confirm.

The invoice status changes to **Rejected**. The rejection is permanently logged.

**After rejection — resubmitting:** On Study → Financials → Invoices, the invoice creator or a company admin can click **Resubmit** on a rejected row. The invoice returns to *Under review* at step 1 and all previous decisions remain visible.

> **Access error:** If you see *"You are not allowed to approve this step for this study,"* your study role does not match the required role for this step. Contact your administrator.

---

## 9. Automated Invoice Validation

When an invoice has budget line allocations, the system automatically validates those allocations against the approved site budget.

### Validation Tiers

| Tier | Condition | Display | Blocks submission? |
|---|---|---|---|
| **Hard block ⛔** | Invoice total exceeds remaining approved budget by more than the escalation threshold | Red banner with over-budget amount | No — shown as advisory; auto-routes to escalation step |
| **Soft warning ⚠** | Any individual line allocation exceeds that line's budget cap | Amber icon per line in the allocation dialog | No |
| **Info** | Any section utilisation is > 80% | Coloured progress bar highlight | No |

### Where Validation Results Appear

**On the invoice list (Study → Financials → Invoices):**

Each invoice row shows small coloured badges after the status badge:
- ⛔ [n] — number of hard blocks
- ⚠ [n] — number of soft warnings (shown only when no hard blocks)

**In the Budget Lines allocation dialog:**

- **Section utilisation bars** above the table show current allocation as a percentage of the section cap, colour-coded by threshold (green / amber / red).
- **Per-line warning icons** appear next to each amount input field:
  - ⛔ — this amount would push the line over its approved cap (input border turns red)
  - ⚠ — this amount would bring the line to ≥ 80% of its cap

### Auto-escalation

When a submitted invoice triggers a hard block, the system automatically routes it to the next higher approval step defined in the approval template. An **Automatically escalated** entry appears in the invoice activity log with the validation results in the payload.

---

## 10. Recording Payment

Once an invoice reaches **Approved** status, a team member with finance access records the actual payment.

**Where to go:** Study → **Financials** tab → **Invoices** card.

1. Find the invoice with **Approved** status.
2. Click **Mark paid** in the Actions column.
3. A confirmation dialog shows the amount and invoice number.
4. Click **Confirm Payment**.

The invoice status changes to **Paid** and a payment record is created and linked to the invoice.

---

## 11. Invoice Status Reference

| Status | Meaning | Next action |
|--------|---------|-------------|
| **Draft** | Saved but not yet submitted | Submitter clicks **Submit** |
| **Under review** | In the approval queue, awaiting decisions | Approver clicks **Approve step** or **Reject** |
| **Approved** | All approval steps completed | Finance clicks **Mark paid** |
| **Rejected** | Rejected at one or more steps | Creator or company admin: **Resubmit**; or create a new corrected draft |
| **Paid** | Payment recorded | No further action required |

---

## Invoice Detail Panel

Click any invoice row in the **Invoices** table — or click **View Document** in the Actions column — to open the Invoice Detail Panel: a full-width side panel that lets you review and action the invoice without navigating away from the page.

**What the panel shows:**

| Area | Content |
|---|---|
| **Document pane** (left) | Embedded preview of the attached PDF or image. Displays a fallback "Open in new tab" link for unsupported file types or when no document is attached. |
| **Details pane** (right) | Invoice number, status badge, payee, amount, due date, received date, billing type, and notes. |
| **Actions** | All approval actions relevant to the current status: **Submit for approval**, **Approve step**, **Reject**, **Resubmit for approval**, **Mark as paid**, and **Allocate to budget lines** (site invoices). |
| **Activity** | Live invoice activity timeline — same data as the in-row expand, automatically loaded when the panel opens. |
| **Navigation** | **‹** and **›** arrow buttons in the panel header step through invoices in the same order as the table. Use these to review multiple invoices quickly without closing and reopening the panel. |

**How to use:**

1. In the Invoices tab, click anywhere on an invoice row.
2. The panel slides in from the right. The PDF (if attached) fills the left side.
3. Use the actions in the right pane to submit, approve, reject, or record payment.
4. After each action, the activity timeline in the panel refreshes automatically and the invoice list in the background updates.
5. Use the **‹** / **›** arrows at the top of the panel to move to the previous or next invoice.
6. Close the panel with the **×** button or by clicking outside it.

> Approvers can open an invoice directly from the **Approval Queue** page the same way — the row click opens the document and approval buttons together.

---

## 12. Reading Invoice Activity

On **Study → Financials → Invoices**, expand the chevron on any invoice row. On **Financials → Approval Queue**, click **Activity**.

The combined chronological list shows:

- **Draft saved** — when the invoice draft was created
- **Submitted for approval** — when it moved from draft into the review workflow
- **Resubmitted for approval** — when a rejected invoice was sent back to the queue
- **Each approval step** — reviewer, step number, optional comment, and time (green Approved or red Rejected)
- **Automatically escalated** — when a hard budget block triggered escalation (includes validation payload)
- **Payment recorded** — when the invoice was marked paid after final approval

This audit trail cannot be edited or deleted and satisfies audit requirements.

**For administrators / reporting:** All lifecycle and payment events are stored in the finance transaction log (`entity_type = 'finance_invoice'`). Budget mutations — create budget, add/remove section, change indirect rate, CSV import, propagation, and re-sync — are logged using `entity_type = 'study_budget'` or `'site_budget'`, providing a compliance-ready version history of all budget changes.

---

## 13. Common Mistakes & Tips

### Tips for Submitters

- **Always upload the PDF** — it gives approvers the original document to verify amounts, and AI saves you from typing.
- **Check AI-extracted fields** — fields marked with a ✦ AI badge were auto-filled. Always verify the invoice number and amount before saving.
- **Save as draft first** — review the draft row in the table before clicking Submit. Once submitted, the invoice cannot be edited.
- **Allocate to budget lines promptly** — clicking **Budget lines** and mapping the invoice to site budget line items keeps your Remaining figures accurate and helps approvers validate the invoice faster.

### Tips for Approvers

- **Read the document before approving** — click the 📎 icon or **Doc** button to open the original invoice PDF.
- **Check validation badges** — a red ⛔ or amber ⚠ badge on the invoice row means validation found issues. Open **Budget lines** to see the detail before deciding.
- **Check the History** — for multi-step approvals, see what the previous approver noted before making your own decision.
- **Use the Comment field** — even a short note helps the team understand why an invoice was approved or rejected.
- **Filter by study** — use the study dropdown to focus on your specific study.

### Tips for Admins

- Ensure every team member who will approve has the correct **study role** before invoices are submitted. Approvals fail with an authorisation message if their role does not match the current step.
- Always keep exactly one **company default** workflow.
- Large invoices may require **Finance Director** or **Executive Director** on the study team for the escalation step — plan coverage accordingly.
- Use the **Budget Wizard** when starting a new study budget. It generates the correct section structure automatically and can save the result as a company-wide template for future studies.
- **Propagate** study budgets to sites early. Site budgets generated from a study template stay linked and can be re-synced as the study budget evolves.

---

## 14. Troubleshooting

### "You are not allowed to approve this step for this study"

Your user account does not have the required study role for this approval step. Ask your administrator to verify your team assignment under the study's **Team** tab.

### The AI did not extract data from my document

- Ensure the document is clearly legible (not a low-quality scan).
- Handwritten invoices may not extract reliably — fill in the fields manually.
- If extraction consistently fails, contact support with a sample document.

### I cannot find the invoice in the Approval Queue

- Verify the invoice status on the study's Financials tab. It must be **Under review** to appear in the queue.
- Check the study filter dropdown — it may be set to a different study.
- The invoice may still be in **Draft** status and has not been submitted yet.

### The "Submit" button is not visible

The Submit button only appears on invoices with **Draft** status. If the invoice is already Under review, Approved, or Paid, no Submit button is shown.

### I accidentally rejected an invoice

Approvers cannot un-reject a decision. The creator of the invoice (or a company admin) can click **Resubmit** on the rejected row in Study → Financials → Invoices. All past decisions remain visible under Invoice activity. Alternatively, create a new draft invoice if a separate record is required.

### The document link shows an error when I click it

Signed document links expire after 1 hour for security. Refresh the Financials page and click the document link again to get a fresh link.

### A site budget shows "Generated from study budget" but the amounts look wrong

The site budget was generated using an earlier enrollment count or cost modifier. Use **Re-sync from study** (Site → Financials → Site Budget card) to preview and apply updates from the current study budget. Review the diff carefully before confirming, and toggle **Preserve site-level overrides** if you have made manual adjustments you want to keep.

### The section utilisation bar shows 100% but I have not submitted the invoice yet

The utilisation bars in the Budget lines dialog include the amounts you are currently entering in the form. If those amounts — combined with other invoices already allocated — reach the section cap, the bar turns red. Reduce the allocation or contact your finance administrator to request a budget amendment.

---

*This manual describes the Financials and Invoice Approvals feature as implemented in Trialetics. Contact your administrator or support if your experience differs from what is described here.*
