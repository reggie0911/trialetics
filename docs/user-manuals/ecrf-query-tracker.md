---
title: eCRF Query Tracker Module — User Manual
description: Beginner-friendly guide for the eCRF Query Tracker module
---

# eCRF Query Tracker Module — User Manual

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

The **eCRF Query Tracker** is a tool for uploading, viewing, and analyzing **electronic Case Report Form (eCRF) query data** from clinical trials. It helps you monitor query volume, status, aging, and resolution trends.

> **eCRF (electronic Case Report Form):** The digital form used to collect patient data during a clinical trial.  
> **Query:** A question or request for clarification about data entered in the eCRF (for example, “Please clarify the date of the last visit.”).

### What It Helps You Do

- Upload query data from CSV files *(company administrators only)*
- Switch between past uploads with **Upload History**
- Filter by site, subject, event, form, query type, query state, user role, and who raised the query
- See **KPI cards** (summary metrics for the data matching your filters)
- Use **charts**; most charts apply filters when you click a bar or pie slice
- Browse **Query Records** in a paginated table with an **Alert** column for open queries
- **Print** or **Download** CSV for the **current table page** (after your filters)
- Customize table column labels *(company administrators only)*

### Who It Is For

- Clinical trial data managers, monitors, and study managers
- **Company administrators** — see **Upload CSV** and **Customize Headers**; same filters, KPIs, charts, history, print, and download as other users when data is loaded
- **Standard users** — do **not** see **Upload CSV** or **Customize Headers**; they can use **Upload History**, filters, KPIs, charts, the table, **Print**, and **Download** when data is on the current page

---

## 2. Getting Started

### Access and permissions

1. Your **company** must have **tracker access** enabled (your administrator configures this).
2. **eCRF Query Tracker** must be turned on for your company in the **Study trackers** list under **Custom** (administrator configuration).
3. Log in, then open **Custom** → under **Study trackers** choose **eCRF Query Tracker**. You can also use the route **`/protected/ecrf-query-tracker`** if you have a bookmark or link.

You will see the title **eCRF Query Tracker** and the subtitle: *Track and monitor eCRF query volume, status, aging, and resolution trends.*

### Who can upload and customize headers?

| Action | Company admin | Standard user |
|--------|---------------|----------------|
| **Upload CSV** | Yes | Not shown |
| **Customize Headers** | Yes | Not shown |
| **Upload History** | Yes | Yes |
| **Print** / **Download** | Yes (when the current page has rows) | Yes (when the current page has rows) |
| Filters, KPIs, charts, table | Yes | Yes |

### Overview of the layout

When an upload is selected and the current page has data, the page shows:

| Area | Location | Purpose |
|------|----------|---------|
| **Toolbar** | Top row | Left: **Upload CSV** / **Customize Headers** (admins), **Upload History**. Right: **Print**, **Download** |
| **Filters** | Below toolbar | Dropdown filters, **Clear All**, and “Viewing upload from …” |
| **KPI cards** | Below filters | Nine summary metrics (read-only; not clickable) |
| **Charts** | Below KPIs | Visual breakdowns; all but **Query Aging** support click-to-filter |
| **Query Records** | Bottom | Paginated table with **Alert** plus data columns |

### Key areas of the screen

- **Toolbar:** Admins see **Upload CSV** and **Customize Headers**. **Upload History** opens a side sheet listing uploads (file name, relative time, record count). The selected upload shows an **Active** badge. The **Upload History** button can show a **count badge** for how many uploads exist.
- **Filters:** Labels include **Site Name**, **Subject ID**, **Event Name**, **Form Name**, **Query Type**, **Query State**, **User Role**, and **Query Raised By**. Values like **All Sites** mean no filter on that field. **Clear All** appears when any dropdown filter is set and clears those filters (and any internal column filter state the app may use).
- **Footer line:** *Viewing upload from [date and time]* for the selected upload, or *Select an upload to view data* if none is selected.
- **KPI cards:** Display-only. They update when you change filters (and reflect the filtered dataset loaded for metrics).
- **Charts:** See [Workflow 4](#workflow-4-use-charts-to-filter-data). **Query Aging (Days Open)** is for viewing only (not clickable).
- **Query Records:** Table title **Query Records**; columns follow your header mappings (defaults: Site Name, Subject ID, Event Name, Event Date, Form Name, Query Type, Query Text, Query State, Query Resolution, User Name, Date/Time, User Role, Query Raised By Role), plus **Alert**.

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload your first query data file

**Who:** Company administrator.

**Goal:** Import query data from a CSV file.

1. Click **Upload CSV**.
2. In the dialog **Upload eCRF Query Tracker CSV**, either drag and drop a `.csv` file onto the dashed area or click to browse.
3. Wait for parsing. On success you see a short preview (first **5** records) and the total parsed count.
4. Click **Upload Data**.
5. A success notification appears; the list reloads and the new upload is selected.

**CSV structure (required by the app):**

- **At least three rows:** Row **1** = human-readable headers (ignored for mapping). Row **2** = **technical** headers used to map columns. Row **3+** = data.
- Row **2** must allow the app to find at least **SiteName** and **SubjectId**. The full expected technical set is:  
  `SiteName`, `SubjectId`, `EventName`, `EventDate`, `FormName`, `QueryType`, `QueryText`, `QueryState`, `QueryResolution`, `UserName`, `DateTime`, `UserRole`, `QueryRaisedByRole`.
- Each data row must have non-empty **SiteName** and **SubjectId**, and a **QueryState** in this list (exact spelling):  
  **Query Approved**, **Query Closed**, **Query Resolved**, **Query Raised**, **Query Removed**, **Query Rejected**.  
  Rows that fail these rules are skipped during import.

---

### Workflow 2: Switch between uploads

**Goal:** View a different export or time point.

1. Click **Upload History**.
2. In **eCRF Query Upload History**, click an upload (file name, time ago, record count).
3. The sheet closes and that upload becomes **Active**; filters reset for the new selection.

---

### Workflow 3: Filter data

**Goal:** Narrow KPIs, charts, and the table.

1. Use the **Filters** card dropdowns (each can stay at “All …” for no filter).
2. KPIs and charts refresh for the filtered dataset (there is a short delay while data reloads).
3. The **Query Records** table loads **one page at a time** from the server using the same filter set.
4. Click **Clear All** (with the **X** icon) to reset every dropdown filter.

---

### Workflow 4: Use charts to filter data

**Goal:** Click chart elements to set filters (same as choosing values in the filter row, for supported fields).

1. **Query Aging (Days Open)** — histogram of how long records sit between **Event Date** and **Date/Time** (bucketed). **This chart is not clickable.**
2. **Queries Raised by Role** — click a bar to filter **Query Raised By** (toggle off by clicking the same bar again).
3. **Queries per Site (Top 10)** — click a bar to filter **Site Name** (toggle off by clicking again).
4. **Queries by State** — click a slice to filter **Query State** (toggle off by clicking again).
5. **Queries by Type** — click a bar to filter **Query Type** (toggle off by clicking again).
6. **Average Resolution Time by Site (Top 10)** — click a bar to filter **Site Name** (toggle off by clicking again).
7. **Queries by Form (Top 10)** — click a bar to filter **Form Name** (toggle off by clicking again).

Clicking a chart filter resets the table to **page 1**. Other series in the same chart may appear dimmed while a chart-driven filter is active.

---

### Workflow 5: Understand the Alert column

**Goal:** Spot **Query Raised** items that may need attention.

1. In **Query Records**, the **Alert** column only applies when **Query State** is **Query Raised**.
2. The app computes **days** as the difference between **Event Date** and **Date/Time** on that row (invalid or missing dates show no alert).
3. Badge rules: **green** = 0–7 days, **yellow** = 8–30 days, **red** = 31+ days.
4. For other states, the cell shows **—**.

> **Note:** The **Overdue (>30 days)** KPI uses a **different** rule: it counts **Query Raised** rows whose **Date/Time** is more than **30 days before today** (calendar aging from “now”), not the Event Date → Date/Time span. Use both **Alert** and **Overdue** for context.

---

### Workflow 6: Print or download

**Goal:** Capture what you see on the **current table page**.

**Print**

1. Optionally set filters (and go to the page you care about).
2. Click **Print**. Your browser print dialog opens (you can choose “Save as PDF”).

**Download**

1. Optionally set filters and navigate to the page you need.
2. Click **Download**.
3. A file named like **`ecrf_query_tracker_YYYY-MM-DD.csv`** downloads. Column headers in the file use your **Customize Headers** labels where configured.

**Important:** **Print** and **Download** operate on the **rows currently loaded in the table for this page** (after toolbar filters). They do **not** export every row in the upload across all pages. To share a large filtered set, repeat **Download** on each page or ask your administrator about other reporting options.

---

### Workflow 7: Customize column headers

**Who:** Company administrator.

1. Click **Customize Headers**.
2. Edit the display label for each technical column.
3. Click **Save Changes**, or **Reset to Defaults** to restore built-in labels, or **Cancel** to close without saving.

---

### Workflow 8: Paginate

1. Below the table: *Showing X to Y of Z records*.
2. **Rows per page:** the selector offers **25**, **50**, **100**, **250**, and **500**. The first load may use a smaller default until you change this.
3. Use **first / previous / next / last** page controls and the *Page N of M* label.

---

## 4. Feature Reference

### Upload CSV (admin)

Opens **Upload eCRF Query Tracker CSV**. Accepts `.csv` only. Validates structure, required columns, and **QueryState** values; shows errors such as missing **SiteName**/**SubjectId**, too few rows, or **No valid query records found in CSV**.

### Customize Headers (admin)

Per-company display labels for table columns; does not change stored query text.

### Upload History

Side sheet **eCRF Query Upload History** to pick an upload; **Active** marks the current one.

### Print / Download

Enabled when the current page has at least one row after loading. **Download** uses today’s date in the filename. Scope = **current page** only (see Workflow 6).

### Filters

Dropdowns map to server queries; **Clear All** clears them. Footer shows upload timestamp when available.

### KPI cards (read-only)

| Card | Meaning (typical) |
|------|-------------------|
| **Total Queries** | Count of records in the metrics dataset (respects filters where applied). |
| **Open Queries** | **Query State** = **Query Raised**. |
| **Closed Queries** | **Query State** = **Query Closed**. |
| **Resolved Queries** | **Query State** = **Query Resolved**. |
| **Overdue (>30 days)** | **Query Raised** rows whose **Date/Time** is more than 30 days ago (see Workflow 5). |
| **Queries per Subject** | Average queries per distinct subject in the filtered set. |
| **Queries per Visit** | Average queries per distinct event (visit) in the filtered set. |
| **Missing Data** | Rows whose **Query Type** is exactly **Missing data**. |
| **Avg Resolution Time** | For **Query Resolved** rows with valid dates: average days from **Event Date** to **Date/Time**. |

### Charts

- **Query Aging (Days Open):** Distribution of days from **Event Date** to **Date/Time** (buckets: 0–7, 8–14, 15–30, >30). Not clickable.
- **Queries Raised by Role:** Counts by **Query Raised By Role**; clickable.
- **Queries per Site (Top 10)** / **Average Resolution Time by Site (Top 10):** Top sites; bars clickable for **Site Name**.
- **Queries by State:** Pie; slices clickable for **Query State**.
- **Queries by Type:** Clickable for **Query Type**.
- **Queries by Form (Top 10):** Clickable for **Form Name**.

### Query Records table

Paginated server-side data with **Alert** plus the mapped data columns. Long text is truncated with a hover title when supported.

### Pagination

**Rows per page** options: 25, 50, 100, 250, 500; first-load default may differ until you change the selector.

---

## 5. Common Mistakes & Tips

### Beginner mistakes

1. **Wrong file type** — Only `.csv` is accepted; save Excel files as CSV first.
2. **Wrong header row** — Technical names must be on the **second** row of the file (row 2); the first row is for people only.
3. **Unexpected row counts** — Rows without **SiteName**, **SubjectId**, or with an unrecognized **QueryState** are dropped.
4. **Assuming Download is the full study** — It is only the **current page** of the table.
5. **Stale filters** — If results look wrong, use **Clear All** and reapply.

### Helpful reminders

- Chart filters and dropdown filters work together; chart clicks reset you to page **1**.
- **KPI** numbers are not buttons; use filters or charts to narrow data.
- **Upload History** keeps prior uploads; select one to switch the dataset.

### Best practices

1. Use clear export file names so history entries are easy to recognize.
2. For meetings, filter first, then print or download the relevant **pages**.
3. For open-query follow-up, combine **Query State** = **Query Raised** with the **Alert** column.

---

## 6. Troubleshooting

### “Upload a CSV file to get started” / empty page

- **Cause:** No uploads yet (or none selected).
- **Fix:** An admin uploads a CSV, or open **Upload History** and select an upload. You can also use **Learn how to get started** (links to in-app docs for this module).

### “Select an upload from the history to view data”

- **Cause:** Uploads exist but nothing is selected.
- **Fix:** Open **Upload History** and click an upload.

### “CSV missing required columns: SiteName, SubjectId”

- **Cause:** Row 2 does not contain those technical headers (spelling/case).
- **Fix:** Adjust row 2 to include **SiteName** and **SubjectId** among the expected columns.

### “CSV file must have at least 3 rows (2 header rows + data)”

- **Cause:** File is too short.
- **Fix:** Add a second header row and at least one data row.

### “No valid query records found in CSV”

- **Cause:** Every row failed validation (empty site/subject or bad **QueryState**).
- **Fix:** Check **QueryState** values match the allowed list exactly.

### Table shows “No query records found”

- **Cause:** Filters exclude everything, or the page is empty.
- **Fix:** Click **Clear All**; widen filters; try another page or upload.

### Charts or KPIs are empty

- **Cause:** No data for the selected upload, or filters exclude all rows.
- **Fix:** Select another upload or clear filters.

### Print or Download disabled

- **Cause:** No rows on the **current** page (`data` empty).
- **Fix:** Select an upload, clear filters, or move to a page that has rows.

### Removing a bad upload

- There is **no delete control** in the current **Upload History** UI. Contact your **company administrator** or support if data must be removed.

### When to contact support

- You cannot access the module after login.
- Uploads succeed but nothing appears.
- Errors persist after the steps above.

**Include:** screenshot, exact error text, file name you uploaded (if relevant), and what you were doing.

---

*This manual is written for first-time users of the eCRF Query Tracker. Suggestions welcome through your administrator.*
