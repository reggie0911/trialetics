# User Acceptance Test Script — Inventory Management

**Page:** `/protected/inventory-management`  
**Component:** `IpManagementPageClient`  
**Module:** Inventory management (inventory summary, site logs, ledger-backed audit trail)  
**Date prepared:** 2026-04-04

---

## Prerequisites

| # | Prerequisite | Details |
|---|--------------|---------|
| P1 | Authenticated user | Tester is logged in with valid credentials |
| P2 | Company association | User profile is linked to an active company |
| P3 | Study access | At least one study appears in the **Study** dropdown for the company |
| P4 | Sites on the study | The UAT study has **at least two** study sites (see Test Data) so **Transfer to another site** can be exercised |
| P5 | Subjects on the study | At least **one** enrolled subject for **Record dispense** scenarios |
| P6 | Browser | Modern browser (Chrome, Edge, Firefox, Safari); PDF download allowed |
| P7 | Printer (optional) | For **Print** control smoke test |

---

## Test data (dummy values)

Use a **non-production** or **test-type** study where possible so catalog and ledger changes do not affect real trials. Replace placeholders with the **actual** labels shown in your environment (study line format: `Protocol number — Study title`; site line: `Site number — Site name`).

### Study and sites

| # | Field | Dummy value | Notes |
|---|--------|-------------|--------|
| D1 | Protocol number | `IP-UAT-2026` | Map to a real study in your tenant |
| D2 | Study title | `Investigational Product UAT Study` | |
| D3 | Site A | `101 — Riverside Clinic` | Must exist on the study |
| D4 | Site B | `102 — Highland Medical Center` | Second site for transfers |
| D5 | Subject (screening / study number) | `SUB-UAT-001` | Use a subject that appears in **Record dispense** → **Select subject** |

### Add inventory (global receipt + new catalog item)

| Field | Value |
|--------|--------|
| Category | **Medical equipment** (or **Study supplies** if your process standardizes on one category) |
| Supplier name | MedSupply Demo LLC |
| Address | 400 Validation Way |
| City | Austin |
| State | TX |
| Zip code | 78701 |
| Country | United States |
| Contact name | Alex Tester |
| Email | alex.tester@example.com |
| Phone | +1 555 0100 |
| Equipment name | Portable temperature logger (UAT) |
| Unit | Each |
| Quantity | `10` |
| Lot number | `UAT-LOT-GLOBAL-01` |
| Serial number | *(optional)* `UAT-SERIAL-G-001` |
| Batch number | *(optional)* `BATCH-UAT-01` |
| Expiry date | *(optional)* a future date |
| Calibration due (days) | `180` |
| Packaging description | Sealed hard case with desiccant |
| Weight | `0.4` |
| Weight unit | kg |
| Part / material number | `PART-UAT-LOG-01` |

### Add site (association only)

After **Add inventory**, link **Site A** (`101 — Riverside Clinic`) to the new item via **Add site** if it is not already linked.

### Add order (site-level receipt path)

Use on an expanded **site row** for the dummy item at **Site A**:

| Field | Value |
|--------|--------|
| Serial number | `UAT-SN-SITE-101` |
| Lot number | `UAT-LOT-SITE-101` |
| Batch number | *(optional)* `BATCH-SITE-101` |
| Quantity | `2` |
| Order reference | `PO-UAT-9001` |

### Ship / receive (quantities)

| Step | Action | Expected (illustrative) |
|------|--------|-------------------------|
| S1 | Ship from global to Site A | Quantity ≤ **global In stock** for the lot/item |
| S2 | Receive at site | Quantity ≤ **in transit** for the selected shipment line |

Adjust numbers to match on-screen limits after **Add inventory** and any prior movements.

### Category filter check

| Scenario | Category filter | Expected |
|----------|-----------------|----------|
| C1 | **All categories** | All dummy items (if multiple categories exist) |
| C2 | **Medical equipment** | Only items in that category in summary, charts, and logs |

### Archive / restore labels

Operations use dialogs titled **Delete order**, **Restore order**, **Delete equipment**, **Restore equipment**, **Delete site**, **Restore site** (see UAT-12).

---

## Product note — Ship to site entry point

The user manual describes opening **Ship to site** from a **Ship lot** (or similar) control on an expanded site row. The application includes a **Ship to site** dialog (title **Ship to site**, primary button **Record shipment**). **If no control opens that dialog in your build,** mark UAT-07 steps that require shipping as **Blocked**, document the gap, and rely on **Add order** (UAT-06) plus other steps for site-level inventory behavior.

---

## UAT-01: Page load and header

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Navigate to `/protected/inventory-management` | Page loads without unhandled errors | | |
| 2 | Observe the main heading | Title reads **Inventory management** | | |
| 3 | Observe the subtitle | Text reads **Inventory summary, site logs, and audit trail (ledger-backed).** | | |
| 4 | Observe top-right controls | **Print** (printer icon) and **Download inventory log PDF** (download icon) are present | | |
| 5 | Before choosing a study, try **Download inventory log PDF** | Control is **disabled** when no study is selected or there are no log rows | | |

---

## UAT-02: Empty state (no study selected)

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Ensure **Study** is empty | **Study** shows placeholder **Select a study** | | |
| 2 | Observe the main content card | Message: **Select a study to view inventory and logs.** | | |
| 3 | Observe **Site** and **Category** | Dropdowns are disabled when no study is selected | | |
| 4 | Observe archived checkboxes | **Show archived equipment**, **Show archived sites**, **Show archived orders** are disabled when no study is selected | | |

---

## UAT-03: Study selection, loading, and tabs

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Open **Study** and pick the UAT study (D1/D2) | Value displays as `Protocol — Title` | | |
| 2 | While data loads | **Loading inventory data…** appears with spinner | | |
| 3 | After load | Tabs **Inventory summary** (default) and **Inventory logs** are visible | | |
| 4 | Observe **Site** | Placeholder **All sites**; list includes **All sites** plus `Site number — Name` for each study site | | |
| 5 | Observe **Category** | Placeholder **All categories**; includes **All categories**, **Investigational drug**, **Investigational device**, **Medical equipment**, **Study supplies** | | |

---

## UAT-04: Filters (site and category)

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | On **Inventory summary**, note visible items and chart data | Baseline for comparison | | |
| 2 | Set **Site** to **Site A** (D3) | Summary metrics, charts, and table reflect the narrowed site scope | | |
| 3 | Set **Site** back to **All sites** | Full study view returns | | |
| 4 | Set **Category** to **Medical equipment** (or the category used in Test Data) | Only matching catalog items appear; charts update | | |
| 5 | Switch to **Inventory logs** | Log rows respect the same **Site** and **Category** filters | | |
| 6 | Set **Category** to **All categories** | All categories shown again | | |

---

## UAT-05: Archived modes (summary and logs)

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | On **Inventory summary**, enable **Show archived equipment** | **Add inventory** is disabled; item row menus favor **Restore equipment** over add/edit/delete flows | | |
| 2 | Disable **Show archived equipment** | **Add inventory** enabled again (when **Show archived sites** is off) | | |
| 3 | Enable **Show archived sites** | Site-level delete/add-order patterns switch toward **Restore site** where applicable | | |
| 4 | Enable **Show archived equipment** OR **Show archived sites** | **Show archived orders** automatically turns **off** and its checkbox is **disabled** | | |
| 5 | Turn off archived equipment and archived sites | **Show archived orders** can be enabled | | |
| 6 | With **Show archived orders** on | Order rows show **Restore order**; **Edit order** / **Verify inventory** / **Delete order** are not offered in the default active mode | | |
| 7 | On **Inventory logs**, toggle **Show archived orders in logs** | Archived-order lines appear or hide accordingly (dimmed styling when shown) | | |

---

## UAT-06: Inventory summary — table, charts, and hierarchy

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Observe chart region | When no items: card **Inventory charts** with **No items to chart yet.** When items exist: **Point-in-time vs cumulative (by item)** and **Mix by category** | | |
| 2 | Observe summary table headers | **Item**, **Category**, **Unit**; **Global inventory** (In stock, Sent, Returns); **Site inventory** (In transit, Received, Returned, Used, Transfers, Destroyed, Onsite, Available) | | |
| 3 | With no catalog items | Empty state shows **No inventory catalog for this study yet** and explains using **Add inventory** and the **Inventory logs** tab | | |
| 4 | Expand an item row (chevron) | **Loading sites…** then site rows; item shows **Associated sites: N** | | |
| 5 | Expand a site row | **Loading orders…** then order lines or **No orders at this site yet.** | | |
| 6 | Site row with no links | **No sites linked to this item. Use "Add site" to associate one.** | | |

---

## UAT-07: Row menus — item, site, and order (summary tab)

Perform with **Show archived equipment**, **Show archived sites**, and **Show archived orders** all **off**, unless noted.

### Item row (level 1)

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Open row actions (⋯) on an item | **View transactions**, **Edit inventory**, **Expand sites** or **Collapse sites**, **Add site**, **Delete equipment** | | |
| 2 | Choose **View transactions** | PDF generation runs; toast **Transaction report downloaded** on success; on failure toast **Failed to generate report** with description | | |

### Site row (level 2)

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Open site actions (⋯) | **View transactions**; separator; **Add order**; **Delete site** | | |
| 2 | **View transactions** (site-scoped) | Same toast pattern as item-level report | | |

### Order row (level 3)

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | For an **Available** order with linked order | **Edit order**, **Delete order**; **Verify inventory** does **not** apply | | |
| 2 | For **Used** and **not** verified | **Verify inventory** appears; choosing it records verification and toast **Verification recorded** | | |
| 3 | When no actions apply | **No actions available** (disabled) | | |

---

## UAT-08: Add inventory

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Click **Add inventory** | Dialog **Add inventory** opens; description mentions central pool and audit ledger | | |
| 2 | Confirm columns | Supplier/contact fields, read-only **Protocol** showing current study, **Equipment name** required, quantity and identifiers, physical/supplier metadata | | |
| 3 | Leave **Equipment name** blank and submit | Client validation / disabled save or server error; if server returns message containing **Enter an equipment name**, toast **Add inventory failed** with that description | | |
| 4 | Fill **Add inventory** using the **Add inventory** table in Test Data | All fields accept values | | |
| 5 | Submit | Success toast **Inventory added**; dialog closes; new item appears in summary with updated **In stock** | | |
| 6 | If catalog saves but receipt fails | Toast **Item saved — stock receipt failed** with error description (refresh and reconcile data with admin if needed) | | |

---

## UAT-09: Add site and Add order

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | On the new item row, open actions → **Add site** | Dialog **Add site** opens | | |
| 2 | Submit without choosing a site | Toast **Select a site** / description **Choose a study site from the list.** | | |
| 3 | Pick **Site A** from the control (placeholder **Choose an option…**) and save | Toast **Site association saved**; **Associated sites** count increases | | |
| 4 | Expand the item and **Site A**; open site menu → **Add order** | Dialog **Add order** opens | | |
| 5 | Enter Test Data **Add order** values; submit | Toast **Order created** (or **Orders created** when applicable); site shows new order row; disposition badge (e.g. **Available**) and **Ref:** line as entered | | |

---

## UAT-10: Ship to site and Receive at site

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Prerequisite: global **In stock** &gt; 0 for a lot at **Site A** | | | |
| 2 | Open **Ship to site** per [Product note — Ship to site entry point](#product-note--ship-to-site-entry-point) | Dialog **Ship to site**; description mentions global pool and in-transit | | |
| 3 | Set **Destination site** (required), **Quantity** within limit; click **Record shipment** | Toast **Shipment recorded** with description **Receive at the site when the delivery arrives to move stock into site inventory.** | | |
| 4 | Observe **Receive at site** on the summary toolbar | Button is **enabled** when at least one in-transit line exists | | |
| 5 | Hover disabled **Receive at site** when no in-transit lines | Tooltip **No in-transit shipments to receive** (with study selected) | | |
| 6 | Click **Receive at site** | Dialog **Receive at site**; **Shipment line** placeholder **Select shipment**; quantity field | | |
| 7 | In **Receive inventory** (toolbar or row menu), observe **Serial number** | Field is editable when the line has in-transit or on-hand quantity; description mentions correcting the serial to match the physical unit | | |
| 8 | Change serial and optionally fill **Reason for change**; confirm checkbox; save or record receipt | Correction runs first when the value changed; toast **Serial number updated** (serial-only) or **Receipt recorded** (with receipt); audit ledger records the serial change | | |
| 9 | Enter quantity **greater than** in-transit for the line | Toast **Quantity too high** with description **At most {N} in transit for this line.** | | |
| 10 | Enter valid quantity; click **Record receipt** | Toast **Receipt recorded** | | |

---

## UAT-11: Inventory logs — layout, pagination, and filters

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Open **Inventory logs** | Section headers **Device status**, **Device disposition**, **Comments / actions** | | |
| 2 | When study is selected | **Protocol number:** and **Study name:** lines appear above the table | | |
| 3 | Empty cells | Table shows **`/`** for missing values (not an em dash) | | |
| 4 | With more than 25 rows | Pagination **Page X of Y** with previous/next controls | | |
| 5 | Footer | Left: category label for current filter; right: **Proprietary and Confidential** | | |
| 6 | When **Disposition summary** (UAT-12) filters to a disposition | Button **Clear filter: {Disposition label}** appears above tabs | | |

---

## UAT-12: Metrics, disposition summary, and reconciliation

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | On **Inventory logs**, locate charts | **Disposition quantities (site inventory)**; **Compliance rate** (may show **—** until dispense data exists) | | |
| 2 | Expand **Metrics and user roster** | **Disposition summary** card with clickable disposition counts and inline **Compliance:** percentage | | |
| 3 | Click a disposition count | Switches to **Inventory logs** tab and filters rows to that disposition | | |
| 4 | Click **Clear filter: …** | Disposition filter clears | | |
| 5 | **Recent ledger activity** | Lists performer, entry type, timestamp, optional subject | | |
| 6 | If reconciliation conditions exist | Amber **Reconciliation flags** card with messages for unverified used rows and/or quantity mismatch | | |

---

## UAT-13: Log row actions — kebab menu

Use a row with **Available** quantity &gt; 0 for movement tests where possible.

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Open row actions (**Row actions** / ⋯) | **View transactions**; **Shipping documents** when an order is linked; optionally **Verify inventory**, **Delete order**, **Restore order**; separator; **Record dispense**, **Return to global**, **Transfer to another site**, **Destroy quantity** when quantities allow | | |
| 2 | **Record dispense** | Dialog **Record dispense**; description mentions subject and ledger; **Quantity** (max hint from row); **Subject** with placeholder **Select subject**; items labeled **Subject {number}** | | |
| 3 | Complete dispense with valid subject and quantity; click **Save** | Toast **Dispense recorded** | | |
| 4 | Enter dispense quantity **greater than** on-hand | Toast **Quantity too high** with **At most {N} on hand at this site.** | | |
| 5 | **Return to global** | Dialog **Return to global**; **Confirm** → toast **Return recorded** | | |
| 6 | **Transfer to another site** | Dialog **Transfer to site**; **Destination site** with **Select destination site**; click **Transfer** → **Transfer recorded** | | |
| 7 | **Destroy quantity** | Dialog **Destroy quantity** (description **Permanent removal at the selected site.**); click **Destroy** → **Destruction recorded** | | |
| 8 | **Verify inventory** (Used, not verified) | Dialog **Verify inventory**; **Date of use**, **Comment** (placeholder **Optional**), checkbox **I confirm this verification is accurate and may be relied on for compliance review.** | | |
| 9 | Submit without checking the checkbox | **Yes, verify** remains disabled | | |
| 10 | Check the box and **Yes, verify** | Toast **Verification recorded** | | |
| 11 | **Shipping documents** (row with linked order) | Dialog **Shipping documents**; list area; **Add document** with **Type**, optional **Description**, **File**; **Upload** → toast **Document uploaded**; **View** opens a new tab | | |
| 12 | **Shipping documents** on an **archived** order line | Dialog shows existing files; **View** works; **Add document** / remove controls not shown | | |

---

## UAT-14: Reports — print and PDFs

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Click **Print** (printer icon) | Browser print dialog opens; print header includes **Inventory management report** and study line when a study is selected | | |
| 2 | With **Inventory logs** rows present, click **Download inventory log PDF** | Toast **PDF downloaded** on success; **PDF failed** on error | | |
| 3 | With zero log rows | Download control remains disabled | | |
| 4 | **View transactions** from summary or logs | **Transaction report downloaded** on success | | |

---

## UAT-15: Edit catalog and edit order (reference / status)

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | **Edit inventory** from item menu | Dialog **Edit inventory**; **Equipment name**, **Category**, **Unit**, **Part / material number**; save → **Inventory details saved** | | |
| 2 | Clear **Equipment name** and save | Toast **Name is required** (destructive) | | |
| 3 | **Edit order** from summary order row | Dialog **Edit order**; **Order reference**; **Save** → **Order updated** | | |
| 4 | **Shipping documents** from summary order row | Same dialog as UAT-13 step 11; upload a small PDF or image; **View** opens file | | |

---

## UAT-16: Delete / restore order, site, and equipment

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | **Delete order** when on-hand and available **not** both zero | Server error surfaced in toast (e.g. **Could not archive order**); message contains **Cannot archive this order while quantity remains on hand at the site** | | |
| 2 | After reducing on-hand/available to zero, **Delete order** | Dialog **Delete order**; confirm → **Order archived** | | |
| 3 | Enable **Show archived orders**; **Restore order** | Dialog **Restore order** → **Order restored** | | |
| 4 | **Delete site** | Dialog **Delete site** → **Site link removed from this equipment** | | |
| 5 | **Show archived sites** → **Restore site** | **Site link restored** | | |
| 6 | **Delete equipment** | Dialog **Delete equipment**; after success, item appears under archived equipment view | | |
| 7 | **Show archived equipment** → **Restore equipment** | Equipment returns to active summary | | |

---

## UAT-17: Error handling and load failure

| Step | Action | Expected result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Simulate failed load (e.g. network offline) and change filters | Toast **Could not load inventory management data** with error description (destructive) | | |
| 2 | Edit log row when no order is linked for reference dialog | Toasts such as **No order is linked for reference and status** when applicable | | |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Product owner | | | |
| QA lead | | | |
