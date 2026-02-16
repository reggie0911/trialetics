---
title: Visit Window Module — User Manual
description: Beginner-friendly guide for the Visit Window module
---

# Visit Window Module — User Manual

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

The **Visit Window** module is a tool for tracking **visit windows** and **compliance alerts** for clinical trial subjects. It helps you see which visits are on track, which need attention, and which require immediate action.

> **Visit Window:** The allowed date range for a subject to complete a visit. For example, a "Month 3 Visit" might have a window from Day 85 to Day 95.  
> **Alert Status:** A color-coded indicator (GREEN, YELLOW, or RED) showing whether a visit is on track, needs attention, or requires action.

### What It Helps You Do

- Upload visit window data from CSV files exported from your clinical trial system
- View all visit records in a sortable, filterable table
- Filter by site, subject, event name, event status, and alert status
- See summary metrics (total subjects, subjects needing follow-up, visit alert rate)
- View a chart of visits by alert status (GREEN, YELLOW, RED)
- Print or download filtered data
- Customize column labels to match your organization's terminology

### Who It Is For

- Clinical trial coordinators and monitors
- Site managers
- Study managers who need to track visit compliance
- Anyone who needs to ensure subjects complete visits within the allowed windows

---

## 2. Getting Started

### How to Access the Module

1. Log in to the application.
2. In the top navigation, open the **Trackers** menu.
3. Click **Visit Window**.
4. You will see the Visit Window page with the title **Visit Window** and the subtitle *"Track subject visit windows and monitor compliance alerts."*

### Overview of the Layout

The page is organized into these areas:

| Area | Location | Purpose |
|------|----------|---------|
| **Top toolbar** | Top of the page | Upload VW Data, Customize Headers, Upload History, Print, Download |
| **Filters** | Below the toolbar | Filter data by site, subject, event, event status, alert status |
| **KPI cards** | Below filters | Total Enrolled Subjects, Subjects with Active Follow-Up Requirements, Visit Alert Rate |
| **Visit Window Alerts chart** | Below KPI cards | Bar chart of visits by alert status (GREEN, YELLOW, RED) |
| **Visit Window Records table** | Bottom | Detailed list of visit records with pagination |

### Key Areas of the Screen

- **Top toolbar:** Buttons for **Upload VW Data**, **Customize Headers**, **Upload History**, **Print**, and **Download**.
- **Filters:** A collapsible card with dropdown filters. Click the up/down arrow to expand or collapse. Use **Reset All Filters** to clear everything.
- **KPI cards:** Three cards. The first two are clickable to filter the table.
- **Visit Window Alerts chart:** Bar chart where you can click a bar to filter the table by that alert status.
- **Visit Window Records table:** Table with columns grouped by category (Patient Info, Visit Details, Dates & Baseline, Dates & Windows, Alert Status). Includes pagination controls.

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload Your First Visit Window Data File

**Goal:** Import visit window data from a CSV file so you can view and analyze it.

**Steps:**

1. Click the **Upload VW Data** button in the top toolbar.
2. A dialog opens titled **Upload Visit Window CSV**.
3. Either:
   - **Drag and drop** your CSV file onto the dashed area, or
   - **Click** the dashed area (or "Drop CSV file here or click to browse") to select a file.
4. Wait while the file is parsed. You will see a preview of the first few rows.
5. If you see an error message (e.g., missing columns or invalid format), fix your CSV and try again.
6. If the preview looks correct, click **Upload Data**.
7. A success message appears. The new upload becomes the active dataset, and the page refreshes with your data.

**Example scenario:** Sarah exports a visit window report from her clinical trial system as a CSV. She opens the Visit Window module, clicks **Upload VW Data**, drops the file, reviews the preview, and clicks **Upload Data**. Within seconds, she sees the KPI cards, chart, and table populated with her visit data.

---

### Workflow 2: Switch Between Different Uploads

**Goal:** View data from a different upload (e.g., a newer export or a different study).

**Steps:**

1. Click the **Upload History** button in the top toolbar.
2. A panel opens on the right showing all your previous uploads.
3. Each upload shows:
   - File name
   - Number of visit records and columns
   - Upload date and time
4. Click the upload you want to view.
5. The panel closes and the page loads that upload's data.
6. The selected upload shows a **Current** badge.

**Example scenario:** Mike has uploaded data from last week and from today. He clicks **Upload History**, selects today's file, and the page updates to show the latest data.

---

### Workflow 3: Filter Data by Site, Subject, or Alert Status

**Goal:** Narrow down the data to a specific site, subject, event, or alert status.

**Steps:**

1. Make sure you have data loaded (an upload selected).
2. In the **Filters** card, use the dropdowns:
   - **Site Name** — Choose a specific site or leave as "Choose an option..." for all
   - **Subject ID** — Choose a subject or leave blank for all
   - **Event Name** — Choose an event (e.g., "Month 3 Visit") or leave blank for all
   - **Event Status** — Choose a status or leave blank for all
   - **Alert Status** — Choose GREEN, YELLOW, or RED, or leave blank for all
3. The KPI cards, chart, and table update automatically.
4. To remove all filters, click **Reset All Filters**.

**Example scenario:** Lisa wants to see only RED (action required) visits at "Site 101". She selects "Site 101" in Site Name and "RED" in Alert Status. The table and chart show only those records.

---

### Workflow 4: Use the Chart to Filter by Alert Status

**Goal:** Click on a chart bar to filter the table by that alert status.

**Steps:**

1. Make sure you have data loaded.
2. Look at the **Visit Window Alerts** chart. It shows bars for GREEN, YELLOW, and RED.
3. **Click a bar** to filter the table to that alert status (e.g., click the RED bar to see only RED visits).
4. When filtered, the chart header shows "Filtered by: [status]". Click the **X** next to it to clear the filter.
5. Click the same bar again to remove the filter.

**Example scenario:** Tom clicks the YELLOW bar in the Visit Window Alerts chart. The table updates to show only visits with YELLOW (attention required) status.

---

### Workflow 5: Use KPI Cards to Filter the Table

**Goal:** Click a KPI card to focus on specific subjects.

**Steps:**

1. Make sure you have data loaded.
2. Look at the three KPI cards:
   - **Total Enrolled Subjects** — Click to show all subjects (or clear the filter)
   - **Subjects with Active Follow-Up Requirements** — Click to show only subjects who have at least one YELLOW or RED visit
   - **Visit Alert Rate** — Not clickable; shows the percentage of visits with YELLOW or RED
3. **Click** the first or second card to apply or toggle that filter.
4. A selected card is highlighted. Click it again to clear the filter.

**Example scenario:** Rachel clicks "Subjects with Active Follow-Up Requirements" to see only subjects who need follow-up. The table shows only those subjects' visits.

---

### Workflow 6: Understand the Alert Status

**Goal:** Know what GREEN, YELLOW, and RED mean so you can prioritize your work.

**Steps:**

1. In the **Visit Window Records** table, look at the **Alert Status** column.
2. Each status has a colored badge. Hover over it to see a tooltip with details.
3. **GREEN** — On track:
   - Visit completed within the window, OR
   - Window opens 8 or more days from now
4. **YELLOW** — Attention required:
   - Window opens in 7 days or less, OR
   - More than 50% of the window duration has elapsed (for upcoming visits)
5. **RED** — Action required:
   - Visit occurred outside the window (early or late), OR
   - Window was missed (overdue), OR
   - 3 days or less remaining in the window

**Example scenario:** Maria hovers over a RED badge. The tooltip says "This visit occurred 5 days late." She knows to contact the site to understand why and document the deviation.

---

### Workflow 7: Print or Download Data

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
3. A CSV file downloads with a name like `visit_window_2025-02-13.csv`.
4. Open the file in Excel or another spreadsheet tool.

**Example scenario:** Before a meeting, David filters to "RED" alert status, then clicks **Download** to share a list of action-required visits with the team.

---

### Workflow 8: Customize Column Headers

**Goal:** Change the labels shown in the table to match your organization's terms.

**Steps:**

1. Click the **Customize Headers** button in the top toolbar.
2. A dialog opens with a list of columns and their current labels.
3. For each column, edit the text in the right-hand field (e.g., change "SubjectId" to "Patient ID").
4. Click **Save Changes** to apply.
5. Click **Reset to Default** to restore the original labels.
6. Click **Cancel** to close without saving.

**Example scenario:** The study uses "Participant ID" instead of "Subject ID". Jane opens **Customize Headers**, changes "Subject ID" to "Participant ID", and saves. The table now shows "Participant ID" as the column header.

---

### Workflow 9: Navigate Through Pages of Data

**Goal:** Move through the table when you have many visit records.

**Steps:**

1. Below the table, you will see: *"Showing X to Y of Z results"*.
2. Use the pagination buttons:
   - **First page** (double chevron left)
   - **Previous page** (single chevron left)
   - **Next page** (single chevron right)
   - **Last page** (double chevron right)
3. The current page number is shown (e.g., "Page 2 of 5").

**Example scenario:** With 200 records and 10 per page, Paul uses the Next button to move from page 1 to page 2 and beyond.

---

### Workflow 10: Sort and Filter Within the Table

**Goal:** Sort by a column or filter using the table header dropdowns.

**Steps:**

1. In the **Visit Window Records** table, each column header may have a sort or filter control.
2. **Sort:** Click the column header or its sort icon to sort ascending or descending.
3. **Filter:** Some columns offer a filter dropdown in the header. Select a value to filter the table to rows with that value.
4. These filters work together with the top Filters card and the chart.

**Example scenario:** Emma clicks the Alert Status column header to sort by status, then uses the Site Name filter in the header to show only "Site 102".

---

## 4. Feature Reference

### Upload VW Data

- **What it does:** Opens a dialog to upload a CSV file with visit window data.
- **When to use it:** When you have a new export from your clinical trial system.
- **Requirements:** CSV must have columns such as SiteName, SubjectId, EventName, EventStatus, EventDate, PlannedDate, ProposedDate, WindowStartDate, WindowEndDate. Column names can have different spacing/casing; the system matches them flexibly.

---

### Customize Headers

- **What it does:** Lets you change the display labels for table columns.
- **When to use it:** When your organization uses different terms (e.g., "Participant" instead of "Subject").
- **Note:** Changes apply to the table display; the underlying data is unchanged.

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

- **What they do:** Narrow the data to specific sites, subjects, events, event statuses, or alert statuses.
- **When to use them:** When you need to focus on a subset of visits.
- **Reset All Filters:** Removes all filter selections (including chart and KPI filters).

---

### KPI Cards

- **Total Enrolled Subjects:** Number of unique subjects in the filtered data. Click to show all.
- **Subjects with Active Follow-Up Requirements:** Subjects who have at least one YELLOW or RED visit. Click to filter the table to these subjects.
- **Visit Alert Rate:** Percentage of visits with YELLOW or RED status. Not clickable.

---

### Visit Window Alerts Chart

- **What it does:** Shows a bar chart of visits by alert status (GREEN, YELLOW, RED).
- **Clickable:** Click a bar to filter the table to that status. Click again to clear.

---

### Alert Status (in Table)

- **GREEN:** On track. Visit within window or window opens ≥8 days away.
- **YELLOW:** Attention required. Window opens soon or >50% of window elapsed.
- **RED:** Action required. Visit outside window, window missed, or ≤3 days remaining.
- **Tooltip:** Hover over a badge to see details (e.g., "5 days late").

---

### Pagination

- **Default:** 10 rows per page.
- **Navigation:** First, Previous, Next, Last page buttons.

---

## 5. Common Mistakes & Tips

### Beginner Mistakes

1. **Uploading the wrong file format** — Only CSV files are accepted. Save Excel files as CSV first.
2. **Missing or wrong column names** — Your CSV must have the required columns. The system matches names flexibly (e.g., "Site Name" and "SiteName" both work), but spelling matters.
3. **Excluded events** — The system automatically excludes certain events (e.g., "Screening", "Procedure", "Add Subject"). If you expect to see these, they will not appear. This is by design.
4. **Expecting instant updates** — After changing filters, the data updates immediately, but large tables may take a moment to re-render.
5. **Forgetting filters** — If the table looks empty, check whether filters are applied. Click **Reset All Filters** to clear.

### Helpful Reminders

- **Upload History** keeps all uploads; you can switch between them anytime.
- **Chart, KPI cards, and filters work together** — A filter from the chart affects the table and KPIs.
- **Download** includes only the currently filtered data, not the full dataset.
- **Customize Headers** affects only how labels are displayed, not the data itself.

### Best Practices

1. **Name your exports clearly** — Use descriptive file names (e.g., `Study_X_VisitWindow_2025-02-13.csv`) so you can identify them in Upload History.
2. **Filter before printing or downloading** — Reduces paper and file size.
3. **Prioritize RED, then YELLOW** — Focus on action-required visits first, then attention-required.
4. **Use the KPI card** — Click "Subjects with Active Follow-Up Requirements" to quickly see who needs follow-up.

---

## 6. Troubleshooting

### "No data to download" or "Please upload data first"

- **Cause:** No upload is selected or the table is empty.
- **Fix:** Upload a CSV file or select an upload from Upload History.

---

### "No matching columns found. Please ensure the CSV contains the required columns."

- **Cause:** The CSV does not have the expected column names.
- **Fix:** Ensure your CSV has columns such as SiteName, SubjectId, EventName, EventStatus, EventDate, PlannedDate, ProposedDate, WindowStartDate, WindowEndDate. The system matches names flexibly (spaces and case may vary), but the words must match.

---

### "CSV file is empty"

- **Cause:** The CSV has no data rows.
- **Fix:** Add at least one data row to your CSV. Ensure the file is not corrupted.

---

### Table shows "No results found"

- **Cause:** Filters may be too strict.
- **Fix:** Click **Reset All Filters**. If it still shows nothing, try selecting a different upload from Upload History.

---

### Some visits are missing from the upload

- **Cause:** The system excludes certain event names (e.g., "Screening", "Procedure", "Add Subject", "Discharge / Day 7", "Year 5", "Additional Assessments", "Unscheduled Visit").
- **Fix:** This is intentional. If you need these events, contact your administrator to discuss.

---

### Alert status seems wrong

- **Cause:** Alert logic depends on Event Date, Window Start, and Window End. Missing or incorrect dates can affect the result.
- **Fix:** Check that your CSV has correct dates for EventDate, WindowStartDate, and WindowEndDate. Hover over the badge to see the tooltip explanation.

---

### Print or Download buttons are disabled

- **Cause:** No data is loaded.
- **Fix:** Upload a CSV file or select an upload from Upload History.

---

### When to Contact Support

- You cannot log in or access the module.
- Uploads fail repeatedly with the same file.
- Data in the table does not match your CSV file.
- You need to delete an upload and do not see the option.
- Alert status logic does not match your study's visit window rules.

**Tip:** When contacting support, include:
- A screenshot of the error or unexpected behavior
- The exact error message (if any)
- The name of the file you tried to upload
- What you were trying to do when the issue occurred

---

*This manual was written for first-time users of the Visit Window module. If you have suggestions for improvements, please share them with your administrator.*
