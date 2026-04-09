---
title: Inventory Management — User Manual
description: Central and site inventory for drugs, devices, equipment, and supplies—ship, receive, dispense, verify, soft-archive orders, and audit with a ledger-backed trail and transaction-style logs.
---

# Inventory Management — User Manual

Last updated: April 9, 2026

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Who has access and what they can do](#2-who-has-access-and-what-they-can-do)
- [3. Open the module](#3-open-the-module)
- [4. Filters and views](#4-filters-and-views)
- [5. Inventory summary](#5-inventory-summary)
- [6. Toolbar actions](#6-toolbar-actions)
- [7. Site logistics](#7-site-logistics)
- [8. Inventory logs](#8-inventory-logs)
- [9. Analytics](#9-analytics)
- [10. Reconciliation and metrics](#10-reconciliation-and-metrics)
- [11. Reports](#11-reports)
- [12. Catalog maintenance](#12-catalog-maintenance)
- [13. Tips and troubleshooting](#13-tips-and-troubleshooting)

---

## 1. Introduction

### What this module is

**Inventory Management** gives you an **inventory summary**, **site-level logs**, **analytics**, and an **audit trail** backed by an immutable activity ledger. You can track:

- Investigational drug
- Investigational device
- Medical equipment
- Study supplies

Typical flow:

1. **Add inventory** — add or pick a **catalog item** and **receive into global pool** (every central receipt uses this dialog).
2. **Ship to site** — quantity leaves the global pool and is **in transit** to a study site.
3. **Receive at site** — when delivery arrives, confirm receipt so stock appears in **site inventory**.
4. On the **Inventory logs** tab, record **dispense** (with a subject), **verification**, **return to global**, **transfer** between sites, or **destruction**, as your process requires.

Everything important is recorded in the ledger with who acted and when.

### Disposition states

Every inventory line has one of five dispositions:

| Disposition | Meaning |
|-------------|---------|
| **Available** | In stock and ready for use or movement. |
| **Used** | Dispensed to a subject; awaiting or completed verification. |
| **Transferred** | Moved to another site. |
| **Returned** | Returned to global pool or manufacturer. |
| **Destroyed** | Quantity destroyed at site. |

### What you need first

- Access to the study in Trialetics (same company as your profile).
- The study should have **sites** set up before you ship or receive at site.
- To **record dispense**, the study needs **subjects** enrolled so you can pick a subject in the dialog.

---

## 2. Who has access and what they can do

Access is determined by your **profile role** and your **study team membership role**. Every user is resolved into one of three access tiers per study.

### Admin tier

**Who:** Company administrators (`admin` profile role) and Platform administrators (`is_platform_admin`).

**Access:** Full, unrestricted access to all inventory actions across all sites and all studies within the company. No site filtering is applied.

**Exclusive actions:** Delete/restore orders and catalog items, restore archived records, correct audit logs, reset line disposition to available, unverify used lots, change disposition via the admin dialog.

---

### Sponsor tier

**Who:** Study team members assigned any of the following roles:

| Role |
|------|
| Clinical Research Associate |
| Clinical Trial Assistant |
| Clinical Project Manager |
| CRA Manager |
| Executive Director |
| Clinical Data Manager |
| Regulatory Specialist |
| Safety Specialist |
| Medical Writer |
| Biostatistician |

**Access:** Company-wide visibility across all sites for the study. Can see global inventory columns, create and manage shipments, approve/verify used lots, unverify lots, edit records, and generate reports.

**Add inventory restriction:** Within the Sponsor tier, only **Clinical Project Managers** (and Admins) can submit new inventory (add catalog items and create the initial global receipt). All other sponsor roles can view but not add.

---

### Site tier

**Who:** Study team members assigned any of the following roles:

| Role |
|------|
| Study Coordinator |
| Principal Investigator (PI) |
| Inventory Specialist |

**Access:** Restricted to the specific site(s) assigned on their study team membership. The site selector is locked to their permitted sites. Global inventory columns are hidden.

**What site-tier users can do:** Receive inventory at their site, reverse a receipt, update disposition (return to global, transfer, destroy), record dispense and mark items as **Used**, generate reports.

**What they cannot do:** View global inventory pool, add inventory to the catalog, create shipments, verify or unverify used lots, edit orders or catalog records, delete or restore any records.

---

### Roles with no IP module access

Study team members assigned roles that are not in either the Sponsor or Site set (for example: Accounts Payable Specialist, Contracts Manager, Finance Director, Finance Reviewer, Site Budget Specialist, Study Startup Specialist, Vendor Manager, Custom) cannot access the Inventory Management module.

---

### Permission summary

| Action | Site | Sponsor | Admin |
|--------|:----:|:-------:|:-----:|
| View global inventory columns | | Yes | Yes |
| Add inventory (catalog + receipt) | | CPM only | Yes |
| Create / manage shipments | | Yes | Yes |
| Receive inventory at site | Yes | Yes | Yes |
| Reverse receipt (unreceive) | Yes | Yes | Yes |
| Update disposition (return, transfer, destroy) | Yes | Yes | Yes |
| Mark as Used (dispense) | Yes | Yes | Yes |
| Verify used lots | | Yes | Yes |
| Unverify used lots | | Yes | Yes |
| Edit orders and catalog records | | Yes | Yes |
| Generate reports | Yes | Yes | Yes |
| Delete / archive orders and items | | | Yes |
| Restore archived records | | | Yes |
| Change disposition (admin reset) | | | Yes |
| Correct audit logs | | | Yes |

---

## 3. Open the module

1. In the main navigation, open the product menu and choose **Inventory Management**.
2. Until you pick a **Study**, you will see: *"Select a study to view inventory and logs."*
3. If you are a site-tier user, your **Site** selector is automatically locked to your permitted sites; you cannot select other sites or "All sites."

This guide is also linked from **Documentation** in the sidebar (**Inventory Management**), for reading without leaving the documentation area.

---

## 4. Filters and views

After you select a study, the **Study**, **Site**, and **Category** controls narrow metrics, charts, the summary table, in-transit lines, and log rows.

| Control | Purpose |
|--------|---------|
| **Study** | Required. Chooses which trial's inventory and logs load. |
| **Site** | **All sites** or one site. Narrows metrics, logs, charts, and in-transit lines. Site-tier users see only their permitted sites. |
| **Category** | **All categories** or one type (drug, device, equipment, supplies). |

### Archived views (Inventory summary)

Below the filters, optional checkboxes change which rows appear in the **Inventory summary** hierarchy:

| Checkbox | Effect |
|----------|--------|
| **Show archived equipment** | Lists catalog items that were archived; item menus favor **Restore equipment** instead of edit/delete flows. |
| **Show archived sites** | Lists site links that were archived under each item; site menus favor **Restore site**. |
| **Show archived orders** | Lists order lines that were **soft-deleted (archived)** so you can **Restore order**. Disabled while archived equipment or archived sites view is on. |

Normal operations (add inventory, add order, edit order, delete order, verify from the summary row menu) apply only when you are **not** viewing archived equipment or sites, and when **Show archived orders** is off.

### Inventory logs: archived orders

On the **Inventory logs** tab, **Show archived orders in logs** includes lines whose linked order is archived (they appear slightly dimmed). When this is off, those lines are hidden by default so the log matches active workflow.

Changing any filter or archived toggle refreshes data.

---

## 5. Inventory summary

The **Inventory summary** tab combines charts and a detailed table.

### Charts

- **Point-in-time vs cumulative (by item)** — compares current stock with cumulative movements (for example, shipped from global, received at site).
- **Mix by category** — share of inventory by category.

### Summary table — three-level hierarchy

The inventory summary table is organized into **three collapsible levels**:

#### Level 1: Item row

Each top-level row is a **catalog item** showing aggregated metrics across all sites.

- **Global inventory** columns *(Sponsor and Admin only)*: In Stock, Sent, Returns.
- **Site inventory** columns: In Transit, Received, Returned, Used, Transfers, Destroyed, Onsite, Available.
- **Associated sites** count is shown beneath the item name.

**Item actions** (from the row menu, when not viewing archived equipment):

- **View transactions** — downloads a PDF report of all orders/lots for this item across all linked sites (see [Reports](#11-reports)).
- **Expand/Collapse sites** — same as the chevron.
- **Add site** — opens **Add site**: choose an **existing** study site (by site name) and **Save** to record an association between that site and this catalog item. New study sites are created on the **study record**, not in this dialog.
- **Edit inventory** — opens catalog details for the item (name, category, unit, identifiers; see [Catalog maintenance](#12-catalog-maintenance)). Sponsor and Admin only.
- **Delete equipment** — archives the catalog item (Admin only). Use **Show archived equipment** to restore later.

When **Show archived equipment** is on, the menu offers **Restore equipment** instead of add/edit/delete flows.

#### Level 2: Site row

Expand an item to see one row per **linked study site**, showing site-scoped metrics.

- **Associated orders** count is shown beneath the site label.
- Site columns (In Transit through Available) are scoped to that specific site.
- Global columns (In Stock, Sent, Returns) show "—" since they are not applicable at the site level.

**Site actions** (from the row menu):

- **View transactions** — downloads a PDF report scoped to this item at this specific site.
- **Add order** — opens **Add order** to create a new order record at this site (Sponsor and Admin only).
- **Delete site** — removes the item–site association (Admin only). Restore via **Show archived sites**.
- **Restore site** — appears when viewing archived sites.

#### Level 3: Order/Lot row

Expand a site to see individual **order records**, each linked to a lot.

- Displays **serial number**, **lot number**, **disposition** badge, **order reference**, and (when present) a short **inventory trace** identifier.
- **Onsite** and **Available** columns show per-lot quantities; other metric columns show "—".

**Order actions** (from the row menu — only in the default summary view, not while browsing archived equipment/sites/orders):

| Action | Who can use it | When it appears | What it does |
|--------|---------------|-----------------|--------------|
| **Edit order** | Sponsor, Admin | Always in active mode | Opens **Edit order** to change **order reference**. |
| **Shipping documents** | All tiers | Always | Opens **Shipping documents** for this order (upload and view packing slips and related files; upload disabled if the order is archived). |
| **Verify inventory** | Sponsor, Admin | Disposition is **Used** and the line is **not** yet verified | Records verification immediately (opens a confirmation dialog on the logs tab; the summary shows a lighter in-line trigger). |
| **Unverify inventory** | Sponsor, Admin | Disposition is **Used** and the line **is** verified | Opens **Unverify inventory** to remove the verification record. |
| **View history** | All tiers | Always | Opens the **Transaction history** dialog showing the full ledger timeline for this lot and site, including any notes stored on ledger entries. |
| **Receive inventory** | All tiers | In-transit quantity exists and disposition is not **Used** | Opens **Receive at site** for this specific line. |
| **Reverse receipt** | All tiers | Disposition is **Available** and no quantity is in transit | Opens **Unreceive** to reverse the site receipt. |
| **Return to global** | All tiers | On-hand quantity > 0, receive workflow complete | Returns stock to the global pool. |
| **Transfer to another site** | All tiers | On-hand quantity > 0, receive workflow complete | Transfers quantity to another linked site. |
| **Destroy quantity** | All tiers | On-hand quantity > 0, receive workflow complete | Records destruction of quantity at site. |
| **Change disposition** | Admin only | Admin only, receive workflow complete | Opens admin dialog to move the line between any disposition states or reset to available. |
| **Delete order** | Admin only | Active mode, disposition not **Used** | Opens **Delete order**: soft-archives the order. Only proceeds when **on-hand and available** quantities are zero. |
| **Restore order** | Admin only | **Show archived orders** is on and the row is archived | Opens **Restore order** to return the order to the active list. |
| **No actions available** | — | None of the above apply | Shown disabled. |

---

## 6. Toolbar actions

On **Inventory summary**, next to the tab:

| Button | Who can use it | When it works | What it does |
|--------|---------------|----------------|--------------|
| **Add inventory** | Admin; Sponsor (CPM only) | Study selected and you are **not** viewing archived equipment or sites | Opens **Add inventory**: a three-column form for **supplier and contact**, **protocol** (read-only for the current study), **equipment name** (creates a **new** catalog item), **quantity** and **unit**, optional **lot / serial / batch / expiry**, **calibration** and **packaging** notes, **physical specs**, and an optional **inventory image**. Saves **supplier and spec** details on the receipt's audit record. Each submit defines a new catalog row and records the global receipt in one step. |
| **Receive at site** | All tiers | Study selected, not viewing archived views, **and** at least one **in-transit** line exists | Opens **Receive at site**. Choose the **shipment line** and quantity (cannot exceed what is still in transit). If the button is unavailable, hover the disabled control for a short explanation (for example, no shipments in transit, or select a study first). |

---

## 7. Site logistics

Inventory moves from central to sites in **two steps**:

### Ship to site

Shipping from the global pool to a site happens when you **Add order** at a site (Sponsor and Admin only). The system checks global stock, creates a shipment entry in the ledger, and puts the quantity **in transit** until the site confirms receipt.

If a standalone **Ship to site** dialog is available (for example **Ship lot …** on an expanded site row), you can choose the **destination site** and **quantity** manually. This **reduces global on-hand** and writes a **shipment** to the audit trail.

### Receive at site

- Use **Receive at site** on the toolbar (when in-transit lines exist), or open **Receive inventory** from a row menu when a shipment is awaiting receipt.
- Select the correct **shipment line** (item, lot or serial, site, quantity in transit).
- **Serial number** is editable whenever the line has **in-transit** or **on-hand** quantity at that site. You can correct a wrong serial before you record receipt so it matches the physical unit. An optional **Reason for change** is stored with the audit trail.
- Enter **quantity to receive** — must not exceed the **in transit** amount for that line.

Serial corrections (and first-time serial entry when the lot had none) are written to the activity ledger as a reconcile entry that records the previous and new values, then receipt proceeds as usual.

After receipt, stock appears under that site in the summary and in **Inventory logs**.

### Reverse receipt (unreceive)

If a receipt was recorded in error, use **Reverse receipt** from the order row menu (all tiers). This reverses the site receipt: quantity returns to **in transit**, and a reversal entry is written to the audit ledger. You can only reverse when the line disposition is **Available** and no in-transit quantity already exists for the line.

### Shipping documents (packing slips)

For each **order** line at a site, you can attach PDFs or images (for example a **packing slip** or carrier paperwork):

- From **Inventory summary** (expanded site, order row menu) or **Inventory logs** (row menu, when an order is linked), choose **Shipping documents**.
- **View** opens a time-limited secure link in a new browser tab.
- **Add document** is available for **active** orders only; **archived** orders keep existing files view-only.
- Allowed types: **PDF**, **PNG**, **JPEG**, **WebP**; maximum **15 MB** per file.

---

## 8. Inventory logs

Switch to the **Inventory logs** tab for a **transaction-style** grid: each row is a **site inventory line** (lot + site) with ledger-backed names and dates. Use **Show archived orders in logs** to include or exclude lines whose **order** is soft-archived.

**Row meaning:** The table is built for operational traceability. When **quantity on hand** for a line is greater than **1**, a small **Qty** hint appears under the supply name so reviewers know the line may represent **multiple units** at that site—not only serialized single-unit rows.

### Study context

When a study is selected, the **protocol number** and **study name** print above the table (same context as the printable report header).

### Table layout (grouped columns)

| Section | Columns |
|---------|---------|
| **Device status** | **Supply name** (with category and optional qty hint); **Serial # / Lot #** (stacked); **Received by / Date of received** (stacked, from ledger). |
| **Device disposition** | **Item disposition** (status pill); **Subject study number**; **Dispensed by / Used date**; **Verified by / Verified date**. |
| **Comments / actions** | **Comments** (row notes; full text on hover when truncated); **Actions** (kebab menu). |

**Empty values** in this table use **`/`** instead of an em dash.

**Status pills** summarize disposition (for example **Available**, **Used**), verification, and whether the **order** is archived (muted styling).

### Pagination and footer

- **Pagination** — Previous and next controls with **Page X of Y** (client-side pages of 25 rows by default).
- **Footer** — Left: current **category** label from your filter (for example "Study supplies"). Right: **Proprietary and Confidential**.

### Row menu actions

#### Primary actions

| Action | Who | When it appears |
|--------|-----|----------------|
| **View transactions** | All tiers | Always (downloads the **Transaction report** PDF scoped to this item and site). |
| **Shipping documents** | All tiers | When the line is linked to an **order** — upload, list, and view packing slips and other shipping files. |
| **View history** | All tiers | Always — opens **Transaction history** showing the full ledger timeline for this lot, including notes on each event. |
| **Verify inventory** | Sponsor, Admin | **Used**, **not verified**, and the linked order is **not** archived. Opens **Verify inventory**: serial/lot summary, optional **Date of use**, **Comment**, required confirmation checkbox, then **Yes, verify**. |
| **Unverify inventory** | Sponsor, Admin | **Used**, **verified**, and the linked order is **not** archived. Opens **Unverify inventory** confirmation. |
| **Delete order** | Admin only | Linked order exists and is **not** archived. Archiving is only allowed when **on-hand and available** are zero. |
| **Restore order** | Admin only | Linked order is **archived**. Opens **Restore order** (**Yes, restore** after confirmation). |
| **No action available** | — | Disabled row when only view is available and nothing else applies. |

#### Movement actions (below a separator)

| Action | Who | Rule |
|--------|-----|------|
| **Record dispense** | All tiers | **Available** quantity > 0. Requires a **subject** and quantity within limits. Marks disposition as **Used**. |
| **Reverse receipt** | All tiers | Disposition is **Available**, receive workflow complete. Puts quantity back in transit. |
| **Return to global** | All tiers | **On-hand** quantity > 0, receive workflow complete. |
| **Transfer to another site** | All tiers | **On-hand** quantity > 0, receive workflow complete. |
| **Destroy quantity** | All tiers | **On-hand** quantity > 0, receive workflow complete. Confirm carefully; this removes quantity at the site per your process. |
| **Change disposition** | Admin only | Admin only, receive workflow complete. |

If a movement action is missing, the row has **no eligible quantity** for that operation.

### Return to global and destroy quantity

When you choose **Return to global** or **Destroy quantity**, a dialog records the movement on the ledger.

- **Investigational drug** lines require **container condition** (full, partial, or empty), consistent with other drug disposition flows.
- **Single unit on site:** If **quantity on hand** is **1**, the quantity is shown as **1** in a **read-only** field (you cannot change it). For larger on-hand amounts, enter the quantity in the number field (within the allowed maximum).
- **Comments:** An optional **Comments** box captures a note for the audit trail. Comments are stored on the **ledger entry** for that action (not only on the screen). Open **View history** from a log or summary row to see the timeline; ledger notes appear as **Notes:** under each event when present.
- **Destroy quantity** permanently removes the selected quantity at the site; confirm carefully before you submit.

### Change disposition (Admin only)

Admins can open **Change disposition** from any active row to move the inventory line to any disposition state — dispense, return, destroy, or reset to **Available** — outside the normal step-by-step workflow. This is intended for data corrections and reconciliation. All changes are written to the audit ledger.

---

## 9. Analytics

The **Analytics** tab provides high-level visibility into inventory health and team activity for the selected study, site, and category filters.

### Analytics filters

- **Search supply** — filter by catalog item name.
- **Disposition** — narrow to a specific disposition state.
- **Date range** — scope events by date.
- Additional switches on some views allow toggling between record sets.

### KPI cards

A summary row of key counts and rates, for example total received, total dispensed, total verified, compliance rate, and pending items.

### Charts

- **Disposition breakdown** — pie chart of quantity by disposition state.
- **Lifecycle bar chart** — stages from receipt through use/return/destroy.
- **Site bar chart** — inventory volume by site.

### Site analytics table

Sortable table per linked site with columns: Site, Total, Available, Used, Pending, Missing data, Verification %, Quality score.

### User activity table

Table and bar chart of team activity: User, Received, Dispensed, Verified, Total actions.

### Drilldown tabs

Tabbed paginated views to drill into specific record sets:

| Tab | What it shows |
|-----|---------------|
| **All records** | Full log matching current analytics filters. |
| **Exceptions** | Lines with data issues or inconsistencies. |
| **Pending verification** | **Used** lines not yet verified. |
| **Aging stock** | Lines with stock that has not moved recently. |

---

## 10. Reconciliation and metrics

### Reconciliation flags

If the study has inconsistencies the system can detect (for example, used items not yet verified, or quantity inconsistencies), a **Reconciliation flags** panel may appear on the **Inventory logs** tab with a short explanation.

### Disposition summary and filtering

Under **Metrics and user roster**, **Disposition summary** lists quantities by disposition. **Click a disposition** to:

- Switch to **Inventory logs** (if needed), and
- **Filter** the log table to that disposition only.

Use **Clear filter** (shown on the logs tab when a filter is active) to show all dispositions again.

### Recent ledger activity

Shows recent audit entries (who, what type of event, when, and subject if relevant).

### Compliance rate

The **Compliance rate** callout relates **verified** events to **dispensed** events for the current filters, shown as a percentage. It appears when the system can compute it (for example, after at least one dispense exists).

---

## 11. Reports

| Control | Purpose |
|--------|---------|
| **Print** (printer icon) | Uses the browser print dialog. Extra chrome may be hidden for a cleaner report. |
| **Download inventory log PDF** (download icon) | Builds a PDF of the **current** log rows. Requires a study selected **and** at least one row in the log table. |
| **View transactions** (item/site menu) | Downloads a **Transaction Report** PDF for the selected item (all sites) or a specific item-at-site. The report includes: study information, equipment details, site address, principal investigator, a summary row with totals, and numbered order/lot rows with inventory columns. |

---

## 12. Catalog maintenance

### Add inventory (catalog + central receipt)

**Add inventory** on the summary toolbar always creates a **new** catalog item and records a **global receipt** in one submit (there is no separate "New catalog item" button). **Edit catalog item** does not add stock—it only updates catalog metadata on an existing row.

Only **Admins** and **Clinical Project Managers** (Sponsor tier) can submit new inventory.

### Associate a catalog item with a study site

From **Inventory summary**, open **Add site** on an item row. Pick a study site that already exists for the protocol and save. This stores an operational link (it does not move inventory; use **Ship to site** and **Receive at site** for quantities).

### Add order at a site

From the **site row** (Level 2) in the summary table, choose **Add order** (Sponsor and Admin only). Enter optional **serial number**, **lot number**, **batch number**, a required **quantity**, and an optional **order reference**. On submit:

1. A lot is created (or matched to an existing lot with the same identifiers).
2. A site inventory record is created with the specified quantity.
3. An order record links the lot to the site with the reference and status.
4. A **received at site** ledger entry is recorded in the audit trail.

### Edit order

From an **order row** (Level 3) in the **Inventory summary**, **Edit order** updates the **order reference** (Sponsor and Admin only).

### Delete order (soft archive)

From an **order row** (Level 3) or the **logs** menu (Admin only), **Delete order** opens a confirmation dialog titled **Delete order**. The action **archives** the order: it leaves the **ledger** and inventory history intact and allows **restore** later. The app only proceeds when **on-hand and available** quantities for that order line are **zero**; otherwise adjust inventory first.

### Restore order

Turn on **Show archived orders** in the summary (or use **Restore order** from a log row when the line is archived). Confirm with **Yes, restore** to return the order to the active list (Admin only).

### Edit catalog item

From **Inventory summary**, open **Edit inventory** on an item row. You can change **name**, **category**, **unit**, and **part / material number** (Sponsor and Admin only).

### Delete catalog item (archive)

Admin only. **Delete** is only allowed when the item has **no lots** (no inventory history). If lots exist, the system will block deletion — remove or consume inventory through normal workflows first, or contact your administrator if you need a data correction.

### Lot history

From any row menu on the **Inventory summary** or **Inventory logs** tab, choose **View history** to open the **Transaction history** dialog. This shows the full chronological ledger for that lot at that site, including: event type, user, date, quantities, and any notes recorded on the ledger entry.

---

## 13. Tips and troubleshooting

| Issue | What to try |
|-------|-------------|
| Nothing loads | Choose a **Study** first. |
| **Add inventory** button is not visible | Only Admins and Clinical Project Managers can add inventory. Contact your sponsor or admin. |
| **Add inventory** or **Receive at site** is disabled | You may be viewing **archived equipment** or **archived sites**; turn those off. For receive, confirm there is **in-transit** quantity; ship from global first. |
| Site selector is locked | You have a **site-tier role** (Study Coordinator, PI, Inventory Specialist). Your access is restricted to your assigned site(s). |
| Global inventory columns are missing | Site-tier users do not have visibility into the global inventory pool. This is expected. |
| **Order** menu only shows **Edit** and **Delete** | **Verify inventory** appears only when disposition is **Used** and not yet verified. **Restore order** appears only when **Show archived orders** is on and the row is archived. |
| **Delete order** blocked | Reduce **on-hand** and **available** to **zero** for that line (returns, dispense, transfer, or destruction as appropriate), then archive again. |
| **Record dispense** missing or fails | Ensure the row has **available** quantity. Add **subjects** to the study if the subject list is empty. |
| "Quantity too high" | Enter a quantity **no greater** than on-hand or in-transit limits shown in the dialog. |
| PDF download stays inactive | Open **Inventory logs** and ensure at least **one row** appears for the current study/site/category filters. |
| Log row missing after archiving an order | Turn on **Show archived orders in logs** to see archived lines, or restore the order. |
| Cannot delete an item | Items with existing lots cannot be deleted; clear inventory through returns, dispense, transfer, or destruction as appropriate. |
| Toast says the catalog item was saved but receiving stock failed | The catalog row exists without the new quantity. Contact your administrator to complete the receipt or correct inventory. |
| Need to undo a verification | **Sponsor** and **Admin** roles can unverify from the row menu when a **Used** + **verified** line is selected. Site-tier users cannot unverify. |
| Need to correct a wrong disposition | Contact an **Admin** to use **Change disposition** on the affected line. |

If an error message appears in a red toast, read the **description** — it usually comes directly from the server validation (for example, not enough quantity, subject not on study).
