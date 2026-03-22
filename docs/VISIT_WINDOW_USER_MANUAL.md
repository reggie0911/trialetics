---
title: Visit Window Module — User Manual
description: Beginner-friendly guide for the Visit Window module
---

# Visit Window Module — User Manual

> **Canonical copy for in-app Documentation:** [`docs/user-manuals/visit-window.md`](user-manuals/visit-window.md) (registry slug `visit-window`). Edit that file first, then mirror changes here.

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

The **Visit Window** module helps you track **visit windows** and **compliance alerts** (GREEN, YELLOW, RED) for clinical trial subjects—so you can see which visits are on track, which need attention, and which need action.

> **Visit window:** The allowed date range for completing a visit (from **Window Start Date** through **Window End Date**).  
> **Alert status:** Computed by the system from event dates, window dates, and whether the visit has occurred—shown as **GREEN**, **YELLOW**, or **RED** in the table and chart.

### What It Helps You Do

- Upload visit-window CSV exports *(company administrators only for **Upload VW Data** and **Customize Headers**)*
- Switch uploads with **Upload History**
- Use the **Filters** card (collapsible) for Site Name, Subject ID, Event Name, Event Status, and Alert Status
- See **KPI** metrics; two cards narrow the **table** (not the KPI numbers themselves)
- Use the **Visit Window Alerts** bar chart; bar clicks filter the table by alert status
- Work in the **Visit Window Records** table (grouped headers, sort/filter on columns, client-side pagination)
- **Print** and **Download** CSV for the data that passes **all** current filters (full filtered set, not just one table page)
- Relabel table columns *(admins)*

### Who It Is For

- Coordinators, monitors, site and study managers tracking visit compliance  
- **Company admins** — **Upload VW Data**, **Customize Headers**, **Upload History**, **Print**, **Download**, filters, KPIs, chart, table  
- **Standard users** — same except no upload or customize; if there are no uploads, they need an admin to add data first

---

## 2. Getting Started

### Access and permissions

1. Your **company** must have **tracker access** enabled.  
2. **Visit Window** must be enabled under **Custom** → **Study trackers**.  
3. Open **Custom** → **Study trackers** → **Visit Window**, or go to **`/protected/vw`**.

**Page title:** **Visit Window**  
**Subtitle:** *Track subject visit windows and monitor compliance alerts*

### Toolbar (left to right)

| Control | Admin | Standard user |
|---------|--------|----------------|
| **Upload VW Data** | Yes | Not shown |
| **Customize Headers** | Yes | Not shown |
| **Upload History** (with count badge when uploads exist) | Yes | Yes |
| **Print** / **Download** | Yes, when data is loaded | Yes, when data is loaded |

### Layout (when data is loaded)

| Area | Purpose |
|------|---------|
| **Filters** | Collapsible card; **Reset All Filters** clears toolbar dropdowns **and** chart/KPI-driven filters on the table |
| **KPI cards** | Total Enrolled Subjects; Subjects with Active Follow-Up Requirements; Visit Alert Rate |
| **Visit Window Alerts** | Bar chart by GREEN / YELLOW / RED (counts follow the **same** filtered rows as the table—see below) |
| **Visit Window Records** | Table with multi-level column groups and pagination (**10** rows per page by default) |

### Important: what updates when you filter

- **Toolbar filters** (Site Name, Subject ID, Event Name, Event Status, Alert Status) narrow the dataset used for **KPI counts** (Total Subjects, Active Follow-Ups, Visit Alert **Rate**).  
- The **table**, **chart**, and **Download** use that same dataset **plus** any **KPI card** filter and **chart bar** selection (chart applies an **Alert Status** filter on the table).  
- So: **KPI numbers** do **not** change when you only click a KPI card or chart bar; those clicks mainly refine the **table** (and chart bars, since the chart is built from the table’s filtered rows).

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload visit window data (admin)

1. Click **Upload VW Data**.  
2. Dialog **Upload Visit Window CSV** — description explains visit/window fields.  
3. Drop a file or use **Drop CSV file here or click to browse** (`.csv` only).  
4. Wait for **Parsing CSV file…**; fix any error (empty file, missing columns, etc.).  
5. Review the preview table (first rows).  
6. Click **Upload Data**.  
7. A success notification appears; uploads reload and the new file is selected.

**CSV expectations**

- **Header row:** First row of the CSV should be column names. The parser uses **flexible** matching (spaces/case-insensitive) for required fields.  
- **Required columns** in the file (mapped to internal fields):  
  `SiteName`, `SubjectId`, `EventName`, `EventStatus`, `EventDate`, `PlannedDate`, `ProposedDate`, `WindowStartDate`, `WindowEndDate`  
- **Excluded rows:** Rows whose **Event Name** matches certain built-in labels (e.g. *Add Subject*, *Screening*, *Unscheduled Visit*, and others) are **dropped** on import.  
- **After upload:** The server adds **Procedure Date** and **Death Date** when it can match **Subject ID** + **Site Name** to **patient** records in the system, and it **computes** **Alert Status** from dates and event status. You do **not** upload Alert Status in the CSV.

---

### Workflow 2: Upload History

1. Click **Upload History** — sheet **VW Upload History**.  
2. Each row shows file name, visit record count, column count, date/time, and relative time.  
3. Click an upload to select it; the sheet closes.  
4. The selected upload shows a **Current** badge.

**Deleting an upload:** There is no trash/delete control in the history list in the current UI. To remove data, contact your **administrator** or **support**.

---

### Workflow 3: Toolbar filters

1. Open the **Filters** card (chevron on the header to collapse/expand).  
2. Each dropdown starts at **Choose an option…** for “no filter” on that field.  
3. Pick values for **Site Name**, **Subject ID**, **Event Name**, **Event Status**, **Alert Status** as needed.  
4. Footer shows **Viewing upload from [date and time]** when an upload is selected.  
5. Click **Reset All Filters** (with rotate icon) to clear **all** toolbar selections **and** clear chart + KPI table filters.

---

### Workflow 4: Visit Window Alerts chart

1. Chart title: **Visit Window Alerts**.  
2. Bars count rows in the **current table dataset** (after toolbar + KPI + any prior chart filter).  
3. Click a bar to filter the table to that **Alert Status**; click again to clear.  
4. When active, the header shows **Filtered by:** [status] and an **X** to clear.

---

### Workflow 5: KPI cards

| Card | Click behavior |
|------|----------------|
| **Total Enrolled Subjects** | Toggle: show all rows (for current toolbar filter) vs. no extra KPI filter |
| **Subjects with Active Follow-Up Requirements** | Toggle: table limited to rows where Alert Status is **YELLOW** or **RED** |
| **Visit Alert Rate** | **Not clickable** (display-only %) |

Selected KPI card is **highlighted**. Click again to turn off that KPI filter.

---

### Workflow 6: Alert badges and tooltips

In the table, **Alert Status** shows a colored badge. Hover for a tooltip, for example:

- **GREEN:** *On Track: Visit completed within window OR window opens ≥8 days from now*  
- **YELLOW:** *Attention Required: Window opens ≤7 days OR >50% of window duration elapsed (applies to upcoming visits only)*  
- **RED:** *Action Required: Visit was outside window OR window missed (overdue) OR ≤3 days remaining*

If the visit **occurred outside** the window, the tooltip can add how many days **early** or **late**.

---

### Workflow 7: Table, sort, and column filters

- Headers use groups: **Patient Info**, **Visit Details**, **Dates & Baseline**, **Dates & Windows** (and Alert Status under Visit Details in the default layout).  
- Use header controls to **sort** or set **column filters** where provided; these work together with the Filters card, chart, and KPI filters.  
- **Pagination:** Default **10** rows per page; controls for first / previous / next / last page and “Showing X to Y of Z results”.

---

### Workflow 8: Print and Download

- **Print:** Uses the browser print dialog (what you see on screen may depend on the browser).  
- **Download:** Saves **`visit_window_YYYY-MM-DD.csv`** with **custom header labels** where you configured them. Includes **every row** that matches the **current combined filters** (toolbar + KPI + chart + column filters), **not** only the visible page.

---

### Workflow 9: Customize Headers (admin)

1. Click **Customize Headers**.  
2. Dialog **Customize Column Headers**.  
3. Edit labels; **Save Changes**, **Reset to Default**, or **Cancel**.

---

## 4. Feature Reference

### Upload VW Data (admin)

Dialog **Upload Visit Window CSV**; **Upload Data** / **Cancel**; preview and validation messages as described above.

### Customize Headers (admin)

Company-level display labels for the standard VW columns (including Procedure Date, Death Date, Alert Status, etc.).

### Upload History

**VW Upload History** — select upload; **Current** badge; optional upload count on the button.

### Filters

Collapsible **Filters** card; five dropdowns; **Reset All Filters**; upload timestamp line.

### KPI cards

Metrics derived from **toolbar-filtered** data only. **Visit Alert Rate** = percentage of **visits** (rows) that are YELLOW or RED under that toolbar slice.

### Visit Window Alerts chart

Recharts bar chart; colors for GREEN, YELLOW, RED; click to toggle **Alert Status** table filter.

### Visit Window Records

**Card title:** Visit Window Records. Date columns display as **dd-Mon-yyyy** where applicable.

---

## 5. Common Mistakes & Tips

1. **Missing columns** — Import needs the eight core visit/window fields; fix the CSV header names.  
2. **Fewer rows than expected** — Check whether events were filtered out as excluded event types.  
3. **KPI vs table mismatch** — Remember KPIs ignore chart/KPI table filters; the table and chart reflect those extra filters.  
4. **Reset everything** — Use **Reset All Filters** on the Filters card, not only clearing one dropdown.  
5. **Download scope** — You get the full filtered dataset, not one page of the table.

---

## 6. Troubleshooting

### “Upload a CSV file to get started” / “Select an upload from the history to view data”

- Upload as admin, or open **Upload History** and select an upload. Link: **Learn how to get started** → in-app docs (`/protected/docs/visit-window`).

### Parsing / “No matching columns found”

- Ensure required columns exist (flexible name matching). Check for a real header row and data rows.

### Print / Download disabled

- No rows loaded (`data.length === 0`). Select an upload with records.

### Cannot delete an upload from the UI

- Contact administrator or support.

### When to contact support

- Upload or insert errors, KPIs/chart clearly wrong vs. source data, or access issues.

**Include:** screenshots, error text, file name, upload date.

---

*Suggestions welcome through your administrator.*
