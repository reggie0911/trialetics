---
title: Source Data Verification Report Module — User Manual
description: Beginner-friendly guide for the Source Data Verification Report (SDV Tracker) module
---

# Source Data Verification Report Module — User Manual

> **Canonical copy for in-app Documentation:** [`docs/user-manuals/sdv-tracker.md`](docs/user-manuals/sdv-tracker.md) (registry slug `sdv-tracker`). Edit that file first, then mirror changes here.

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

The **Source Data Verification Report** (also called **SDV Tracker** in the navigation) is a tool for monitoring **Source Data Verification (SDV)** completion rates across clinical trials. It helps you see how much data has been verified, what still needs review, and where to focus.

> **Source Data Verification (SDV):** Checking that data entered in the electronic Case Report Form (eCRF) matches original source documents (e.g., medical records, lab reports).  
> **Site Data Entry:** Records of data entered into the eCRF (who entered it, when, and why).  
> **SDV Data:** Records of verification against source (who verified and when).

### What It Helps You Do

- Create and manage SDV reports *(company administrators only)*
- Upload two CSV files per report: **Site Data Entry** and **SDV Data**
- View **% SDV Complete**, totals, and verified counts on KPI cards
- Drill down in a hierarchical table: **Site → Subject → Event → Form → Item**
- Filter by **Site** and **Subject** (with cascading subject options when a site is selected)
- **Refresh** merged data from the server
- Use **Fix Report** if a draft seems stuck after uploads

### Who It Is For

- Clinical trial data managers, monitors, QA staff, and study teams tracking SDV progress
- **Company administrators** — create reports (**New** / **Create First Report**), upload files, fix drafts, full dashboard access
- **Standard users** — select existing reports, use filters, KPIs, table, and **Refresh**; if no reports exist they see **No reports available** (ask an admin to create one)

---

## 2. Getting Started

### Access and permissions

1. Your **company** must have **tracker access** enabled.
2. **SDV Tracker** must be enabled for your company under **Custom** → **Study trackers** (administrator configuration).
3. Open **Custom** → **Study trackers** → **SDV Tracker**, or go to **`/protected/sdv-tracker`**.

You will see:

- **Title:** Source Data Verification Report  
- **Subtitle:** *Monitor SDV completion rates across clinical trials with real-time percentage dashboards* (same wording as on the page; no “Beta” badge on this screen in the current app).

### Who can create reports?

| Action | Company admin | Standard user |
|--------|---------------|----------------|
| **Create First Report** / **New** | Yes | Not shown |
| Select a report from the dropdown | Yes | Yes |
| **Upload CSV Files** / **Fix Report** (on a draft) | Yes (when a draft is selected) | Yes (when a draft is selected) |
| KPIs, filters, table, **Refresh** | Yes (complete reports) | Yes (complete reports) |

### Overview of the layout

| Area | When it appears | Purpose |
|------|------------------|---------|
| **Report row** | Always | **Report:** label, dropdown, **New** (admins); **Created … ago** and optional description under the selection |
| **Empty state** | No reports | **No Reports Yet** / **Loading…** (admins: **Create First Report**; others: **No reports available**) |
| **Upload card** | Draft report selected | **Upload Data for: [name]**, instructions, **Fix Report**, **Upload CSV Files** |
| **KPI cards** | Complete report | **% SDV Complete**, **Total Items**, **Verified Items** |
| **Filters** | Complete report | **Site**, **Subject**, **Clear**, **Refresh** |
| **Active filters** | When any filter is set | Badges with **X** to remove one filter |
| **Hierarchical table** | Complete report (or empty placeholder) | Expandable site → … → item tree |

### Key areas of the screen

- **Report dropdown:** Lists reports **newest first** (typical). Each option shows the report **name** plus **Complete** (green) or **Draft** (yellow) badge.
- **Default name when creating:** The **New** dialog may prefill a name like **SDV Report - March 2026**; if that name already exists, the app may suggest **SDV Report - March 2026 (2)**, etc.
- **Create dialog:** **Create New SDV Report** — **Report Name** (required), **Description** (optional), **Cancel** / **Create Report**.
- **KPIs:** **% SDV Complete** shows rounded percent and a subtitle *“X of Y items verified”*. **Total Items** includes a line *“Across N sites, M subjects”*. Cards use green / yellow / red for the main % based on thresholds (80%+ / 50–79% / under 50%).

---

## 3. Step-by-Step Workflows

### Workflow 1: Create your first report (admin)

1. Click **Create First Report** (no reports yet) or **New** (when reports already exist).
2. In **Create New SDV Report**, enter a **Report Name** and optional **Description**.
3. Click **Create Report**.
4. The new report is selected and shows **Draft** until both CSVs are uploaded.

---

### Workflow 2: Upload Site Data Entry and SDV Data

**Goal:** Complete a draft report with two CSV files.

1. Select a **Draft** report.
2. Read the upload card description — it states whether you need **both** files, **Site Data** next, or **SDV Data** next (depends on what is already linked).
3. Click **Upload CSV Files**.
4. Dialog **Upload SDV Data** opens with steps **Site Data Entry** (1) and **SDV Data** (2).
5. **Step 1 — Site Data Entry** (or SDV first if the wizard opens on step 2 because Site Data already exists on the server):
   - Drag and drop a `.csv` file or click to browse.
   - The file is **parsed**, then **uploaded in batches** (e.g., 1,000 rows per batch) with a **progress** percentage.
   - Success: **Upload Complete** with record count.
6. **Step 2 — SDV Data:** repeat for the second file.
7. When both succeed, you see **All Files Uploaded** and **View Report**. Click it to close the dialog and refresh the page data.

**CSV format**

- **Format:** `.csv` only.
- **First row:** Treated as **human-readable** headers — the uploader **removes the first line** of the file, then uses the **next** row as the column header row for parsing (machine-readable names must match the lists below).
- **Site Data Entry columns:** `SiteName`, `SubjectId`, `EventName`, `FormName`, `ItemExportLabel`, `EditBy`, `EditDateTime`, `EditReason`
- **SDV Data columns:** `SiteName`, `SubjectId`, `EventName`, `FormName`, `ItemName`, `SdvBy`, `SdvDate`  
  (`ItemName` aligns with **ItemExportLabel** from Site Data for matching.)

**Order of the two files:** You can complete **Site Data Entry** first or **SDV Data** first; the wizard focuses on whichever step is still needed. The report becomes **Complete** when **both** are uploaded and processed.

**Auto-complete:** If a draft already has **both** upload IDs linked but still shows **Draft**, opening the report can trigger an automatic completion step in the app. If it stays stuck, use **Fix Report**.

---

### Workflow 3: Switch between reports

1. Use the **Report** dropdown.
2. Pick another report. **Filters reset** when you change reports.

---

### Workflow 4: Filter by site and subject

**Goal:** Narrow KPIs and the table.

1. Select a **Complete** report.
2. In the **Filters:** row:
   - **Site** — **All Sites** or a specific site  
   - **Subject** — **All Subjects** or a subject; when a **site** is selected, subject choices **cascade** to that site
3. KPIs and table data refresh for the selected filters.
4. **Active filters:** badges appear below; click **X** on a badge to clear that filter (dependent filters may clear too — e.g., clearing **Site** clears subject/event/form in state).
5. **Clear** (with X) removes **all** filters when any are active.

**Note:** The app’s filter state also supports **Event**, **Form**, and **Source** for future or internal use; the **current screen only shows Site and Subject dropdowns**. If you ever see extra badges, remove them with **X** or **Clear**.

---

### Workflow 5: Drill down in the hierarchical table

1. Below the filters, open rows by clicking the **row** or the **chevron** (**►** collapsed, **▼** expanded).
2. Levels: **Site** → **Subject** → **Event** → **Form** → **Item** (items do not expand further).
3. **Column headers:** **Name** *(Site → Subject → Event → Form → Item)*, **Site Data Entry**, **Data Verified**, **Needs Review**, **SDV %**.
4. Child rows load when you expand a parent (spinner on the chevron while loading).

---

### Workflow 6: Refresh data

1. Click **Refresh** (circular arrow) in the filters bar. It spins while loading.
2. Refreshes merged view and reloads KPIs and site summary for the current report and filters.

---

### Workflow 7: Fix a stuck draft

1. Select the **Draft** report.
2. Click **Fix Report** (wrench icon) in the upload card header.
3. Read the **green** success or **red** error message under the header.
4. On success, the report may move to **Complete** and the dashboard appears after refresh.

---

### Workflow 8: Delete a report

There is **no delete (trash) control** next to reports in the **Report** dropdown in the current UI (delete logic exists only in a confirmation dialog in code without a visible trigger). To remove a report, contact your **company administrator** or **support**.

---

## 4. Feature Reference

### Report selector

- **Report:** label + dropdown + **New** (admins).
- Shows **Created** *relative time* and optional **description** under the selection.

### Upload CSV Files

- Opens **Upload SDV Data** with **Step 1: Upload Site Data Entry** / **Step 2: Upload SDV Data**.
- States: **Parsing CSV…**, **Uploading Records…** with progress, **Upload Complete**, **Upload Failed** (+ **Retry**), final **All Files Uploaded** + **View Report**.

### Fix Report

- Runs a server action to repair linking / completion for the selected draft; shows inline result text.

### KPI cards (read-only)

| Card | Content |
|------|---------|
| **% SDV Complete** | Rounded %; subtitle *verified* of *total* items |
| **Total Items** | Count; subtitle *Across N sites, M subjects* |
| **Verified Items** | Count; subtitle *Items with SDV completed* |

### Filters

- **Site**, **Subject**, **Clear**, **Refresh** (right-aligned).
- **Active filters** row with per-badge **X**.

### Hierarchical table

- Five numeric/text columns as above; **SDV %** uses the same green/yellow/red bands as the main KPI (80% / 50% thresholds).
- Empty state: **No Data Available** with link **Learn how to get started** (in-app docs).

---

## 5. Common Mistakes & Tips

### Beginner mistakes

1. **Wrong CSV headers** — Machine-readable header row must include the exact column names (after the skipped first line).
2. **Only one file** — Both Site Data Entry and SDV Data are required for a **Complete** report and full dashboard.
3. **Assuming wrong order** — Either file can be uploaded first; follow the wizard step shown.
4. **Excel format** — Save as **CSV** before uploading.

### Helpful reminders

- **Draft** shows the upload card; **Complete** shows KPIs, filters, and table.
- Switching reports **resets** filters.
- Large files take time; wait for **100%** on the upload progress.

### Best practices

1. Use clear report names (study + month/year).
2. Filter by **Site** first when reviewing one location.
3. Use **Refresh** after someone else may have changed data.

---

## 6. Troubleshooting

### “No Reports Yet” / “Create your first SDV report”

- **Admins:** Click **Create First Report** and create a report.
- **Standard users:** You’ll see **No reports available** — ask an admin to create a report.

### “No reports available”

- **Cause:** Non-admin with zero reports.
- **Fix:** Administrator creates the first report.

### Upload errors: “CSV file is empty or has no valid data rows”

- **Fix:** Ensure there is a human-readable first row, a proper header row, and at least one data row.

### Draft with both files still not Complete

- Wait a moment for auto-complete, or click **Fix Report**.

### KPI shows “No data available. Upload CSV files to see metrics.”

- **Cause:** Incomplete report, missing aggregations, or no rows.
- **Fix:** Complete both uploads; select a **Complete** report; try **Refresh**.

### Table “No Data Available”

- **Cause:** No site summary rows (incomplete report or no matching data).
- **Fix:** Confirm both CSVs uploaded; use in-app **Learn how to get started** link if needed.

### Cannot delete a report from the UI

- **Fix:** Contact administrator or support.

### When to contact support

- Repeated upload failures, **Fix Report** errors, or numbers that don’t match your exports.

**Include:** screenshots, exact messages, file names, and report name.

---

*This manual is for the Source Data Verification Report module. Suggestions welcome through your administrator.*
