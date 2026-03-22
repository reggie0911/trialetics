---
title: AE Metrics Module — User Manual
description: Beginner-friendly guide for the AE Metrics module
---

# AE Metrics Module — User Manual

## Table of Contents

- [1. Introduction](#1-introduction)
- [2. Getting Started](#2-getting-started)
- [3. Step-by-Step Workflows](#3-step-by-step-workflows)
- [4. Feature Reference](#4-feature-reference)
- [5. Common Mistakes & Tips](#5-common-mistakes--tips)
- [6. Troubleshooting](#6-troubleshooting)

---

## 1. Introduction

### What This Module Is

The **AE Metrics Module** is a tool for uploading, viewing, and analyzing **Adverse Event (AE)** data from clinical trials. It helps you manage safety data in one place.

> **Adverse Event (AE):** Any unwanted or harmful medical event that happens during a clinical trial, whether or not it is related to the study treatment.

### What It Helps You Do

- Upload AE data from CSV files *(company administrators only)*
- View AE records in a table, with filters, KPIs, and a category chart
- Filter and search by site, patient, category, and other fields
- See summary metrics (total AEs, serious AEs, resolved, deaths, % resolved)
- Print or download the current table view
- Customize column labels to match your terminology *(company administrators only)*

### Who It Is For

- Clinical trial staff, safety monitors, and data managers
- **Company administrators** — can upload CSVs, relabel columns, and use the full toolbar
- **Standard users** — can open **Upload History**, apply filters, use KPI/chart/table tools, **Print**, and **Download** when data exists (they do not see **Upload AE Data** or **Customize Headers**)

---

## 2. Getting Started

### Access and permissions

1. Your **company** must have **Custom trackers** (study tracker) access enabled.
2. **AE Metrics** must be turned on for your company in the **Study trackers** matrix (your administrator configures this).
3. Log in, then in the top bar open **Custom** → under **Study trackers** choose **AE Metrics** (label may match your tenant). You can also open **`/protected/ae`** if you have a bookmark or link.

You will see the heading **AE Metrics** and the subtitle **Upload and manage adverse event data.**

### Who can upload and customize headers?

| Action | Company admin | Standard user |
|--------|---------------|---------------|
| **Upload AE Data** | Yes | Not shown |
| **Customize Headers** | Yes | Not shown |
| **Upload History** | Yes | Yes |
| **Print** / **Download** | Yes (when data loaded) | Yes (when data loaded) |
| Filters, KPIs, chart, table | Yes | Yes |

### Overview of the Layout

After at least one upload has data loaded, the page shows:

| Area | Location | Purpose |
|------|----------|---------|
| **Toolbar** | Top row | Left: upload / headers / history (per role). Right: **Print**, **Download** |
| **Filters** | Collapsible card | Dropdown filters + **Reset All Filters** + line showing which upload date you are viewing |
| **KPI cards** | Below filters | Totals; four cards are clickable filters; **% Resolved** is read-only |
| **AE Categories chart** | Below KPIs | Horizontal bar chart by **AEDECOD**; click a bar to filter |
| **Adverse Events** | Bottom | Table with sortable columns and per-column filters |

### Key Areas of the Screen

- **Toolbar:** **Upload AE Data** and **Customize Headers** appear only for **company administrators**. **Upload History** opens a side panel listing uploads (file name, row/column counts, date/time; the active upload shows a **Current** badge).
- **Filters:** Expand or collapse with the chevron on the card header. Dropdowns use **Choose an option...** for “no filter” on that field. The footer shows **Viewing upload from [date and time]** when an upload is selected.
- **KPI cards:** **Total AEs**, **Total SAEs**, **Total Resolved**, and **Death** can be clicked to narrow the table (toggle off by clicking again). **% Resolved** shows a percentage only — it does **not** apply a filter.
- **AE Categories chart:** Bars reflect **AEDECOD** counts for the data currently feeding the chart (after toolbar filters). A **Filtered by:** chip appears when a category is selected; use **X** or click the bar again to clear.
- **Adverse Events table:** Column headers support sort and a value dropdown under each header.

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload Your First AE Data File

**Who:** Company administrator.

**Goal:** Import AE data from a CSV file.

1. Click **Upload AE Data**.
2. In the dialog:
   - **Option A:** Drag and drop your CSV onto the dashed area.
   - **Option B:** Click the area to browse and select a file.
3. Wait while the file is parsed. A preview table appears when parsing succeeds.
4. Click **Upload Data**.
5. A success toast appears; the new upload is selected and the page loads that dataset.

**Required CSV columns** (headers are matched case-insensitively; spacing must match):

`SiteName`, `SubjectId`, `AESTDAT`, `RWOSDAT`, `AESER`, `AESERCAT1`, `AEEXP`, `AEDECOD`, `AEOUT`, `IM_AEREL`, `IS_AEREL`, `DS_AEREL`, `LT_AEREL`, `PR_AEREL`

If mapping fails, you will see an error such as **No matching columns found** — align your export to these names.

---

### Workflow 2: Switch Between Different Uploads

**Goal:** View a different upload.

1. Click **Upload History**.
2. In the panel, each row shows file name, **AE records** count, **columns** count, and upload date/time.
3. Click an upload to select it. The panel closes and the page reloads that dataset (toolbar filters reset when switching uploads).

---

### Workflow 3: Filter Data (Filters card)

**Goal:** Narrow rows using the main filter dropdowns.

1. Open **Filters** if collapsed.
2. Use any combination of:
   - **Site Name** — `SiteName`
   - **Patient ID** — `SubjectId`
   - **Category** — `AEDECOD` (verbatim term / preferred term)
   - **Deaths** — `AESERCAT1` values from the file
   - **SAE/ AE Status** — `AESER` values
   - **Study Procedure - Causality** — `AEEXP` values
   - **Outcome** — `AEOUT` values
3. Pick **Choose an option...** on a field to clear only that field.
4. Click **Reset All Filters** to clear **every** filter in this card **and** KPI selection, chart category filter, and table header dropdown filters.

**Note:** Filters combine with **AND** (each choice narrows the result further).

---

### Workflow 4: Use KPI Cards to Filter

**Goal:** Quickly focus on serious, resolved, or death-related rows.

1. Click **Total AEs** — shows all rows in the current filter context (no extra KPI filter).
2. Click **Total SAEs** — keeps rows whose **AESER** contains “SERIOUS” (case-insensitive).
3. Click **Total Resolved** — keeps rows whose **AEOUT** contains “RESOLVED”.
4. Click **Death** — keeps rows whose **AESERCAT1** contains “DEATH”.
5. Click the same card again to clear that KPI filter.
6. **% Resolved** — informational only; clicking does nothing.

The active KPI card is shown with a **primary-colored ring** highlight.

---

### Workflow 5: Filter Using the AE Categories Chart

**Goal:** Filter by **AEDECOD** from the chart.

1. Click a bar for the category you want.
2. The table limits to that category; a **Filtered by:** label appears on the chart.
3. Clear with the **X** on the chip or by clicking the same bar again.

---

### Workflow 6: Filter Within the Table

**Goal:** Filter by a single value in a column.

1. Under the column name, open the dropdown (starts as **All** or similar).
2. Choose a value; only matching rows remain.
3. Choose the “all” option again to remove that column’s filter.

---

### Workflow 7: Sort the Table

**Goal:** Order rows by a column.

1. Click the column header.
2. First click: ascending. Second click: descending.
3. A sort indicator shows the active column and direction.

---

### Workflow 8: Pagination

**Goal:** Move through large datasets.

1. Use the controls at the bottom (**first / previous / next / last**).
2. Text shows the current range and page numbers.

---

### Workflow 9: Customize Column Headers

**Who:** Company administrator.

**Goal:** Change display labels for exports and the table.

1. Click **Customize Headers**.
2. For each row, edit **Custom label** next to **Original** (system column name).
3. Click **Save Changes**. Labels apply company-wide for AE Metrics display and CSV download headers.
4. **Reset to Default** restores built-in names; save to apply.

---

### Workflow 10: Print or Download

**Goal:** Print or export the **current filtered** table.

1. **Print** — enabled when data is loaded. Opens the browser print dialog (current view).
2. **Download** — exports a CSV named like `ae_metrics_YYYY-MM-DD.csv` with the **standard** column order and **custom labels** in the header row. Only rows that pass all active filters are included.

---

## 4. Feature Reference

| Feature | What It Does | When to Use It |
|---------|--------------|----------------|
| **Upload AE Data** | Imports a CSV into a new upload | New or replacement dataset *(admins)* |
| **Customize Headers** | Maps system column names to display labels | Align wording with your SOP *(admins)* |
| **Upload History** | Lists uploads; select to switch dataset | Compare time periods or files |
| **Filters** | Seven dropdown dimensions + reset + upload timestamp | Subset the table |
| **Reset All Filters** | Clears Filters card, KPI filter, chart filter, table column filters | Return to full current upload view |
| **KPI cards** | Counts + click filter on four cards | Quick safety slices |
| **% Resolved** | Percentage only | Read-only summary |
| **AE Categories chart** | Counts by **AEDECOD**; click to filter | Explore category mix |
| **Table** | Sort, paginate, per-column filters | Detailed review |
| **Print** / **Download** | Current filtered rows | Reports and Excel |

---

## 5. Common Mistakes & Tips

### Common Mistakes

1. **Non-CSV files** — Only `.csv` is accepted; save Excel as CSV first.
2. **Wrong or missing columns** — Use the exact required header names.
3. **Expecting OR logic** — All active filters narrow together (**AND**).
4. **% Resolved looks “broken”** — It is not a filter control.
5. **Empty page as a standard user** — An admin must upload first; use **Upload History** after uploads exist.

### Tips

- After switching uploads, confirm the **Viewing upload from …** line in **Filters**.
- Use **Reset All Filters** if the table is unexpectedly empty.
- Long cell text may truncate; hover for a tooltip where supported.
- The empty state includes a link to this guide under **Learn how to get started**.

---

## 6. Troubleshooting

### I do not see Upload AE Data or Customize Headers

- Only **company administrators** (`admin` role in your organization) see these actions. Ask an admin to upload or change labels.

### “No matching columns found” (upload)

- Compare your file headers to the required list in [Workflow 1](#workflow-1-upload-your-first-ae-data-file).

### Table shows no rows

- Use **Reset All Filters**; clear KPI by clicking the active card again; clear chart filter via **X**.
- Confirm **Upload History** has the correct **Current** upload.

### Print or Download is disabled

- **Print** and **Download** require loaded rows (`data.length > 0`). Select an upload with records.

### Page redirects to home

- Your company may not have **tracker** access or **AE Metrics** enabled in study trackers. Contact your administrator.

### When to Contact Support

- Repeated failed uploads, missing data after success, or persistent errors after re-login.

**Include:** what you did, exact error text, approximate file size/row count, and role (admin vs user).

---

*This manual matches the AE Metrics implementation in Trialetics (`/protected/ae`). In-app help: [/protected/docs/ae-metrics](/protected/docs/ae-metrics). Duplicate for editors: [`docs/AE_METRICS_USER_MANUAL.md`](../AE_METRICS_USER_MANUAL.md) — keep both files in sync.*
