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

The **eCRF Query Tracker** is a tool for uploading, viewing, and analyzing **electronic Case Report Form (eCRF) query data** from clinical trials. It helps you monitor how many queries exist, how long they take to resolve, and where they come from.

> **eCRF (electronic Case Report Form):** The digital form used to collect patient data during a clinical trial.  
> **Query:** A question or request for clarification about data entered in the eCRF. For example, "Please clarify the date of the last visit."

### What It Helps You Do

- Upload query data from CSV files exported from your eCRF system
- View all query records in a searchable, sortable table
- Filter by site, subject, event, form, query type, query state, and user role
- See summary metrics (total queries, open, closed, resolved, overdue)
- View charts showing query aging, distribution by site, type, state, and form
- Print or download filtered data
- Customize column labels to match your organization's terminology

### Who It Is For

- Clinical trial data managers
- Site monitors and coordinators
- Study managers who need to track query resolution
- Anyone who needs to review and analyze eCRF query data

---

## 2. Getting Started

### How to Access the Module

1. Log in to the application.
2. In the top navigation, open the **Trackers** menu.
3. Click **eCRF Query Tracker**.
4. You will see the eCRF Query Tracker page with the title **eCRF Query Tracker** and the subtitle *"Track and monitor eCRF query volume, status, aging, and resolution trends."*

### Overview of the Layout

The page is organized into these areas:

| Area | Location | Purpose |
|------|----------|---------|
| **Top toolbar** | Top of the page | Upload CSV, Customize Headers, Upload History, Print, Download |
| **Filters** | Below the toolbar | Filter data by site, subject, event, form, query type, state, and role |
| **KPI cards** | Below filters | Summary numbers (Total Queries, Open, Closed, Resolved, Overdue, etc.) |
| **Charts** | Below KPI cards | Bar and pie charts for aging, sites, types, states, forms |
| **Query Records table** | Bottom | Detailed list of query records with pagination |

### Key Areas of the Screen

- **Top toolbar:** Buttons for **Upload CSV**, **Customize Headers**, **Upload History**, **Print**, and **Download**.
- **Filters:** A card with dropdown filters. Use **Clear All** to remove all filters.
- **KPI cards:** Nine cards showing Total Queries, Open Queries, Closed Queries, Resolved Queries, Overdue (>30 days), Queries per Subject, Queries per Visit, Missing Data, and Avg Resolution Time.
- **Charts:** Six charts that you can click to filter the data.
- **Query Records table:** Table with an Alert column plus Site Name, Subject ID, Event Name, Event Date, Form Name, Query Type, Query Text, Query State, Query Resolution, User Name, Date/Time, User Role, and Query Raised By Role.

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload Your First Query Data File

**Goal:** Import query data from a CSV file so you can view and analyze it.

**Steps:**

1. Click the **Upload CSV** button in the top toolbar.
2. A dialog opens titled **Upload eCRF Query Tracker CSV**.
3. Either:
   - **Drag and drop** your CSV file onto the dashed area, or
   - **Click** the dashed area to browse and select a file.
4. Wait while the file is parsed. You will see a preview of the first 5 records.
5. If you see an error message (e.g., missing columns or invalid format), fix your CSV and try again.
6. If the preview looks correct, click **Upload Data**.
7. A success message appears. The new upload becomes the active dataset, and the page refreshes with your data.

**Example scenario:** Sarah exports a query report from her eCRF system as a CSV. She opens the eCRF Query Tracker, clicks **Upload CSV**, drops the file, reviews the preview, and clicks **Upload Data**. Within seconds, she sees the KPI cards, charts, and table populated with her query data.

---

### Workflow 2: Switch Between Different Uploads

**Goal:** View data from a different upload (e.g., a newer export or a different study).

**Steps:**

1. Click the **Upload History** button in the top toolbar.
2. A panel opens on the right showing all your previous uploads.
3. Each upload shows:
   - File name
   - When it was uploaded (e.g., "2 hours ago")
   - Number of records
4. Click the upload you want to view.
5. The panel closes and the page loads that upload's data.
6. The selected upload shows an **Active** badge.

**Example scenario:** Mike has uploaded data from last week and from today. He clicks **Upload History**, selects today's file, and the page updates to show the latest data.

---

### Workflow 3: Filter Data by Site, Subject, or Query State

**Goal:** Narrow down the data to a specific site, subject, or query state.

**Steps:**

1. Make sure you have data loaded (an upload selected).
2. In the **Filters** card, use the dropdowns:
   - **Site Name** — Choose a specific site or "All Sites"
   - **Subject ID** — Choose a subject or "All Subjects"
   - **Event Name** — Choose an event or "All Events"
   - **Form Name** — Choose a form or "All Forms"
   - **Query Type** — Choose a type or "All Types"
   - **Query State** — Choose a state (e.g., "Query Raised", "Query Resolved") or "All States"
   - **User Role** — Choose a role or "All User Roles"
   - **Query Raised By** — Choose who raised the query or "All Roles"
3. The KPI cards, charts, and table update automatically.
4. To remove all filters, click **Clear All** (appears when any filter is active).

**Example scenario:** Lisa wants to see only open queries at "Site 101". She selects "Site 101" in Site Name and "Query Raised" in Query State. The table and charts show only those records.

---

### Workflow 4: Use Charts to Filter Data

**Goal:** Click on a chart element to filter the data by that value.

**Steps:**

1. Make sure you have data loaded.
2. Look at the charts:
   - **Query Aging (Days Open)** — Bar chart of how long queries have been open
   - **Queries Raised by Role** — Bar chart of queries by role
   - **Queries per Site (Top 10)** — Horizontal bar chart
   - **Queries by State** — Pie chart (Query Raised, Resolved, etc.)
   - **Queries by Type** — Bar chart of query types
   - **Average Resolution Time by Site (Top 10)** — Horizontal bar chart
   - **Queries by Form (Top 10)** — Bar chart of forms
3. **Click a bar or pie slice** to filter by that value (e.g., click "Site 101" to filter by that site).
4. Click the same element again to remove that filter.

**Example scenario:** Tom clicks the "Query Raised" slice in the Queries by State pie chart. The table and other charts update to show only queries in the "Query Raised" state.

---

### Workflow 5: Understand the Alert Column

**Goal:** Know which queries need attention based on how long they have been open.

**Steps:**

1. In the **Query Records** table, look at the **Alert** column.
2. For queries in **Query Raised** state, the Alert column shows:
   - **Green** — 7 days or less (on track)
   - **Yellow** — 8–30 days (needs attention)
   - **Red** — More than 30 days (overdue)
3. For queries in other states (e.g., Resolved, Closed), the Alert column shows "—" (no alert).

**Example scenario:** Maria sorts or filters to "Query Raised" and scans the Alert column. She focuses on red badges first to prioritize overdue queries.

---

### Workflow 6: Print or Download Data

**Goal:** Create a printed report or a CSV file of the currently filtered data.

**Steps:**

**To print:**
1. Apply any filters you want (or leave them clear for all data).
2. Click the **Print** button in the top toolbar.
3. Your browser's print dialog opens. Choose your printer or "Save as PDF" if needed.
4. Print or save.

**To download:**
1. Apply any filters you want.
2. Click the **Download** button in the top toolbar.
3. A CSV file downloads with a name like `ecrf_query_tracker_2025-02-13.csv`.
4. Open the file in Excel or another spreadsheet tool.

**Example scenario:** Before a meeting, David filters to "Query Raised" and "Site 102", then clicks **Download** to share a CSV with the site team.

---

### Workflow 7: Customize Column Headers

**Goal:** Change the labels shown in the table to match your organization's terms.

**Steps:**

1. Click the **Customize Headers** button in the top toolbar.
2. A dialog opens with a list of columns and their current labels.
3. For each column, edit the text in the right-hand field (e.g., change "SubjectId" to "Patient ID").
4. Click **Save Changes** to apply.
5. Click **Reset to Defaults** to restore the original labels.
6. Click **Cancel** to close without saving.

**Example scenario:** The study uses "Participant ID" instead of "Subject ID". Jane opens **Customize Headers**, changes "Subject ID" to "Participant ID", and saves. The table now shows "Participant ID" as the column header.

---

### Workflow 8: Navigate Through Pages of Data

**Goal:** Move through large datasets using pagination.

**Steps:**

1. Below the table, you will see: *"Showing X to Y of Z records"*.
2. Use **Rows per page** to choose 25, 50, 100, 250, or 500 rows.
3. Use the pagination buttons:
   - **First page** (double chevron left)
   - **Previous page** (single chevron left)
   - **Next page** (single chevron right)
   - **Last page** (double chevron right)
4. The current page number is shown (e.g., "Page 2 of 5").

**Example scenario:** With 500 records and 50 rows per page, Paul uses the Next button to move from page 1 to page 2 and beyond.

---

## 4. Feature Reference

### Upload CSV

- **What it does:** Opens a dialog to upload a CSV file with eCRF query data.
- **When to use it:** When you have a new export from your eCRF system or want to add another dataset.
- **Requirements:** CSV must have at least 3 rows (2 header rows + data). Row 2 must contain technical column names such as SiteName, SubjectId, EventName, EventDate, FormName, QueryType, QueryText, QueryState, QueryResolution, UserName, DateTime, UserRole, QueryRaisedByRole.

---

### Customize Headers

- **What it does:** Lets you change the display labels for table columns.
- **When to use it:** When your organization uses different terms (e.g., "Participant" instead of "Subject").
- **Note:** Changes apply to the table only; the underlying data is unchanged.

---

### Upload History

- **What it does:** Opens a panel listing all your previous uploads. Click one to switch the active dataset.
- **When to use it:** When you want to compare or switch between different exports or time periods.
- **Badge:** Shows the number of uploads next to the button.

---

### Print

- **What it does:** Opens the browser print dialog to print the current view.
- **When to use it:** For meetings or paper records.
- **Tip:** Apply filters first so you print only the data you need.

---

### Download

- **What it does:** Downloads the currently filtered data as a CSV file.
- **When to use it:** To share data with colleagues or analyze it in Excel.
- **Tip:** Filters apply; only visible/filtered records are included.

---

### Filters (Site Name, Subject ID, etc.)

- **What they do:** Narrow the data to specific sites, subjects, events, forms, query types, states, or roles.
- **When to use them:** When you need to focus on a subset of queries.
- **Clear All:** Removes all filter selections.

---

### KPI Cards

- **Total Queries:** Total number of query records.
- **Open Queries:** Queries still open (e.g., Query Raised).
- **Closed Queries:** Queries that have been closed.
- **Resolved Queries:** Queries that have been resolved.
- **Overdue (>30 days):** Queries open more than 30 days (needs attention).
- **Queries per Subject:** Average queries per subject.
- **Queries per Visit:** Average queries per visit.
- **Missing Data:** Count of records with missing key data.
- **Avg Resolution Time:** Average days to resolve queries.

---

### Charts (Clickable)

- **Query Aging:** How long queries have been open (e.g., 0–7 days, 8–30 days, 31+ days).
- **Queries Raised by Role:** Who raised the queries.
- **Queries per Site:** Top 10 sites by query count.
- **Queries by State:** Distribution by state (e.g., Raised, Resolved).
- **Queries by Type:** Distribution by query type.
- **Average Resolution Time by Site:** Top 10 sites by average resolution time.
- **Queries by Form:** Top 10 forms by query count.

**Tip:** Clicking a bar or pie slice applies a filter. Click again to remove it.

---

### Alert Column (in Table)

- **What it does:** Shows how long a "Query Raised" query has been open.
- **Green:** 7 days or less.
- **Yellow:** 8–30 days.
- **Red:** More than 30 days.
- **"—"** for non–Query Raised states.

---

### Pagination

- **Rows per page:** 25, 50, 100, 250, or 500.
- **Navigation:** First, Previous, Next, Last page buttons.

---

## 5. Common Mistakes & Tips

### Beginner Mistakes

1. **Uploading the wrong file format** — Only CSV files are accepted. If you have an Excel file, save it as CSV first.
2. **CSV format issues** — The CSV must have at least 3 rows: Row 1 (human-readable headers), Row 2 (technical headers like SiteName, SubjectId), and Row 3+ (data). Missing Row 2 or wrong column names will cause errors.
3. **Expecting instant updates** — After changing filters, wait a moment for the data to reload, especially with large datasets.
4. **Forgetting filters** — If the table looks empty, check whether filters are applied. Click **Clear All** to reset.

### Helpful Reminders

- **Upload History** keeps all uploads; you can switch between them anytime.
- **Charts and filters work together** — A filter from a chart affects the table and other charts.
- **Download** includes only the currently filtered data, not the full dataset.
- **Customize Headers** affects only how labels are displayed, not the data itself.

### Best Practices

1. **Name your exports clearly** — Use descriptive file names (e.g., `Study_X_Queries_2025-02-13.csv`) so you can identify them in Upload History.
2. **Filter before printing or downloading** — Reduces paper and file size.
3. **Review the Alert column** — Prioritize red and yellow alerts for follow-up.
4. **Use Query State filters** — Focus on "Query Raised" when tracking open items.

---

## 6. Troubleshooting

### "No data to download" or "Please upload data first"

- **Cause:** No upload is selected or the table is empty.
- **Fix:** Upload a CSV file or select an upload from Upload History.

---

### "CSV missing required columns: SiteName, SubjectId"

- **Cause:** The CSV does not have the expected column names in Row 2.
- **Fix:** Ensure Row 2 of your CSV contains technical headers such as SiteName, SubjectId, EventName, EventDate, FormName, QueryType, QueryText, QueryState, QueryResolution, UserName, DateTime, UserRole, QueryRaisedByRole. Check spelling and capitalization.

---

### "CSV file must have at least 3 rows (2 header rows + data)"

- **Cause:** The CSV has only 1 or 2 rows.
- **Fix:** Add a header row (Row 2) with column names and at least one data row (Row 3).

---

### "No valid query records found in CSV"

- **Cause:** All rows were filtered out. Valid records must have SiteName, SubjectId, and a valid QueryState (e.g., Query Raised, Query Resolved, Query Closed).
- **Fix:** Check that your data has non-empty SiteName and SubjectId, and that QueryState values match the expected list.

---

### Table shows "No query records found"

- **Cause:** Filters may be too strict, or the selected upload has no data.
- **Fix:** Click **Clear All** in the Filters section. If it still shows nothing, try selecting a different upload from Upload History.

---

### Charts or KPI cards are empty

- **Cause:** No upload selected, or the upload has no data.
- **Fix:** Upload a CSV or select an upload from Upload History that contains data.

---

### Print or Download buttons are disabled

- **Cause:** No data is loaded.
- **Fix:** Upload a CSV file or select an upload from Upload History.

---

### When to Contact Support

- You cannot log in or access the module.
- Uploads succeed but data does not appear.
- Errors persist after following the fixes above.
- You need to delete an upload or correct data that was uploaded by mistake.
- You need help with CSV format or column mapping.

**Tip:** When contacting support, include:
- A screenshot of the error or unexpected behavior
- The exact error message (if any)
- The name of the file you tried to upload (if relevant)
- What you were trying to do when the issue occurred

---

*This manual was written for first-time users of the eCRF Query Tracker module. If you have suggestions for improvements, please share them with your administrator.*
