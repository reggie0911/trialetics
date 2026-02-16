---
title: Source Data Verification Report Module — User Manual
description: Beginner-friendly guide for the Source Data Verification Report (SDV Tracker) module
---

# Source Data Verification Report Module — User Manual

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

The **Source Data Verification Report** (also called **SDV Tracker**) is a tool for monitoring **Source Data Verification (SDV)** completion rates across clinical trials. It helps you see how much data has been verified, what still needs review, and where to focus your efforts.

> **Source Data Verification (SDV):** The process of checking that data entered in the electronic Case Report Form (eCRF) matches the original source documents (e.g., medical records, lab reports). This ensures data quality and regulatory compliance.  
> **Site Data Entry:** Records of data that was entered into the eCRF (who entered it, when, and why).  
> **SDV Data:** Records of data that has been verified against source documents (who verified it and when).

### What It Helps You Do

- Create and manage SDV reports for different studies or time periods
- Upload two CSV files: Site Data Entry (what was entered) and SDV Data (what was verified)
- View completion percentages and summary metrics at a glance
- Drill down from sites to subjects, events, forms, and individual data items
- Filter by site, subject, or data source to focus on specific areas
- See how many items need review and estimate the time to complete them

### Who It Is For

- Clinical trial data managers
- Monitors and site coordinators
- Quality assurance staff
- Anyone who needs to track SDV progress and identify gaps

---

## 2. Getting Started

### How to Access the Module

1. Log in to the application.
2. In the top navigation, open the **Trackers** menu.
3. Click **SDV Tracker**.
4. You will see the Source Data Verification Report page with the title **Source Data Verification Report** and the subtitle *"Monitor SDV completion rates across clinical trials with real-time percentage dashboards."*

### Overview of the Layout

The page is organized into these areas:

| Area | Location | Purpose |
|------|----------|---------|
| **Report selector** | Top of the page | Choose or create a report; shows report name and status |
| **Upload area** | Below selector (draft reports only) | Upload Site Data Entry and SDV Data CSV files |
| **KPI cards** | Below selector (complete reports) | Summary metrics: % SDV Complete, Total Items, Verified Items |
| **Filters** | Below KPI cards | Filter by site, subject, data source |
| **Active filters** | Below filters | Badges showing current filters; click X to remove |
| **Hierarchical table** | Bottom | Drill-down table: Site → Subject → Event → Form → Item |

### Key Areas of the Screen

- **Report selector:** A dropdown to select a report, plus a **New** button to create one. Each report shows a **Complete** (green) or **Draft** (yellow) badge.
- **Upload area:** For draft reports only. Shows **Upload CSV Files** and **Fix Report** buttons. Displays which file(s) are still needed.
- **KPI cards:** Three cards showing % SDV Complete, Total Items, and Verified Items.
- **Filters:** Dropdowns for Site, Subject, and Data Source, plus **Clear** and **Refresh** buttons.
- **Hierarchical table:** Expandable rows. Click the arrow (►) next to a site, subject, event, or form to see the next level of detail.

---

## 3. Step-by-Step Workflows

### Workflow 1: Create Your First Report

**Goal:** Create a new SDV report so you can upload data and view completion metrics.

**Steps:**

1. At the top of the page, look for the **Report:** label and dropdown.
2. If you have no reports yet, click **Create First Report**.
3. If you already have reports, click the **New** button.
4. A dialog opens titled **Create New SDV Report**.
5. Enter a **Report Name** (e.g., "January 2026 SDV Report").
6. Optionally add a **Description** (e.g., "Q1 data cut").
7. Click **Create Report**.
8. The new report is created and selected. It will show a **Draft** badge until both CSV files are uploaded.

**Example scenario:** Maria needs to track SDV for her study. She clicks **New**, enters "Study XYZ - February 2026", adds a short description, and clicks **Create Report**. The report appears in the selector with a Draft badge.

---

### Workflow 2: Upload Site Data Entry and SDV Data Files

**Goal:** Upload the two CSV files needed to generate the SDV report.

**Steps:**

1. Select a **Draft** report from the Report dropdown.
2. You will see an upload card titled **Upload Data for: [Report Name]**.
3. Click the **Upload CSV Files** button.
4. A dialog opens with two steps: **Step 1: Site Data Entry** and **Step 2: SDV Data**.
5. **Step 1 — Site Data Entry:**
   - Drag and drop your Site Data Entry CSV, or click to browse.
   - Wait for parsing and upload. A progress bar shows completion.
   - When done, you will see "Upload Complete" with the record count.
6. **Step 2 — SDV Data:**
   - The wizard moves to Step 2 automatically (or you may need to upload Site Data first).
   - Drag and drop your SDV Data CSV, or click to browse.
   - Wait for upload. When done, you will see "All Files Uploaded."
7. Click **View Report** to close the dialog and see the completed report.

**Example scenario:** Tom has exported Site Data Entry and SDV Data from his eCRF system. He selects his draft report, clicks **Upload CSV Files**, uploads the Site Data file first, then the SDV file. After both complete, he clicks **View Report** and sees the KPI cards and hierarchical table.

---

### Workflow 3: Switch Between Reports

**Goal:** View a different report (e.g., a different study or month).

**Steps:**

1. Click the **Report** dropdown at the top.
2. A list of all your reports appears. Each shows its name and status (Complete or Draft).
3. Click the report you want to view.
4. The page loads that report's data. Filters reset when you switch reports.

**Example scenario:** Lisa has reports for January and February. She selects "February 2026 SDV Report" from the dropdown to view the latest data.

---

### Workflow 4: Filter by Site, Subject, or Data Source

**Goal:** Narrow the view to a specific site, subject, or data source type.

**Steps:**

1. Make sure you have a **Complete** report selected.
2. In the **Filters** area, use the dropdowns:
   - **Site** — Choose a specific site or "All Sites"
   - **Subject** — Choose a subject or "All Subjects" (options may depend on the selected site)
   - **Data Source** — Choose "Site Data Only", "Both Files", or "All Sources"
3. The KPI cards and hierarchical table update automatically.
4. Active filters appear as badges below the filters. Click the **X** on a badge to remove that filter.
5. Click **Clear** to remove all filters at once.

**Example scenario:** David wants to see SDV progress for "Site 101" only. He selects "Site 101" in the Site dropdown. The table and KPIs update to show only that site's data.

---

### Workflow 5: Drill Down in the Hierarchical Table

**Goal:** Explore data from site level down to individual items.

**Steps:**

1. Make sure you have a **Complete** report selected.
2. Look at the **Hierarchical table** below the filters.
3. Each row has a **chevron** (►) on the left. Click it to expand and see the next level.
4. **Site** → expands to **Subjects** at that site
5. **Subject** → expands to **Events** for that subject
6. **Event** → expands to **Forms** for that event
7. **Form** → expands to **Items** (individual data fields)
8. Click the chevron again (▼) to collapse a row.

**Columns in the table:**
- **Name** — Site, Subject ID, Event, Form, or Item name
- **Site Data Entry** — Count of items with initial data entry
- **Data Verified** — Count of items that have been verified
- **Needs Review** — Items that still need SDV
- **SDV %** — Completion percentage (green = 80%+, yellow = 50–79%, red = below 50%)

**Example scenario:** Rachel expands "Site 102", then "Subject 001", then "Baseline Visit", then "Demographics". She sees which specific items are verified and which need review.

---

### Workflow 6: Refresh Data

**Goal:** Reload the report data (e.g., after a background process or to ensure you have the latest view).

**Steps:**

1. In the **Filters** area, click the **Refresh** button (circular arrow icon).
2. The button may show a spinning icon while data is loading.
3. When done, the KPI cards and table update with the latest data.

**Example scenario:** After a colleague uploads new data, James clicks **Refresh** to see the updated metrics.

---

### Workflow 7: Delete a Report

**Goal:** Remove a report and all its data permanently.

**Steps:**

1. In the Report dropdown, find the report you want to delete.
2. Click the **trash** (delete) icon next to that report (if visible in the selector).
3. A confirmation dialog appears: "Delete Report? This will permanently delete [report name] and all associated data (uploads, records). This action cannot be undone."
4. Click **Delete Report** to confirm, or **Cancel** to keep the report.

**Note:** The delete option may appear when hovering over or clicking a report in the selector. If you do not see it, contact your administrator.

---

### Workflow 8: Fix a Stuck Draft Report

**Goal:** Resolve a draft report that has both files uploaded but is still showing as Draft.

**Steps:**

1. Select the **Draft** report that has both Site Data and SDV Data uploaded.
2. In the upload card, click the **Fix Report** button (wrench icon).
3. Wait while the system processes. A message will appear (green for success, red for error).
4. If successful, the report status may change to **Complete** and the dashboard will load.

**Example scenario:** A report shows "Site Data uploaded. Now upload SDV Data" even though both files were uploaded. Karen clicks **Fix Report**. The system reconciles the data and the report becomes Complete.

---

## 4. Feature Reference

### Report Selector

- **What it does:** Lets you choose which SDV report to view or create a new one.
- **When to use it:** When you have multiple reports or need to start a new one.
- **Status badges:** **Complete** (green) = ready to view; **Draft** (yellow) = needs file uploads.

---

### Create Report / New

- **What it does:** Opens a dialog to create a new SDV report.
- **When to use it:** When you need a new report for a different study or time period.
- **Fields:** Report Name (required), Description (optional).

---

### Upload CSV Files

- **What it does:** Opens a two-step wizard to upload Site Data Entry and SDV Data CSV files.
- **When to use it:** When you have a Draft report and need to add or replace data.
- **Requirements:**
  - **Site Data Entry:** SiteName, SubjectId, EventName, FormName, ItemExportLabel, EditBy, EditDateTime, EditReason
  - **SDV Data:** SiteName, SubjectId, EventName, FormName, ItemName, SdvBy, SdvDate

---

### Fix Report

- **What it does:** Attempts to fix a report that has both uploads but is stuck in Draft.
- **When to use it:** When a report should be Complete but is still showing as Draft.

---

### KPI Cards

- **% SDV Complete:** Overall verification percentage. Green (80%+), yellow (50–79%), red (below 50%).
- **Total Items:** Total data items across all sites and subjects.
- **Verified Items:** Items that have been verified against source documents.

---

### Filters (Site, Subject, Data Source)

- **What they do:** Narrow the data shown in the KPIs and table.
- **Site:** Filter by clinical trial site.
- **Subject:** Filter by subject/patient ID (options may depend on Site).
- **Data Source:** "Site Data Only" = items only in Site Data file; "Both Files" = items in both files.

---

### Clear

- **What it does:** Removes all active filters.
- **When to use it:** When you want to see the full dataset again.

---

### Refresh

- **What it does:** Reloads the report data from the server.
- **When to use it:** After data updates or if the view seems outdated.

---

### Hierarchical Table

- **What it does:** Shows SDV progress in a drill-down structure: Site → Subject → Event → Form → Item.
- **Columns:** Name, Site Data Entry, Data Verified, Needs Review, SDV %.
- **Expand/Collapse:** Click the chevron (►/▼) to expand or collapse a row.

---

### Active Filters (Badges)

- **What they do:** Show which filters are currently applied.
- **Remove one:** Click the X on a badge.
- **Remove all:** Click **Clear** in the Filters area.

---

## 5. Common Mistakes & Tips

### Beginner Mistakes

1. **Uploading files in the wrong order** — Upload Site Data Entry first, then SDV Data. The wizard guides you through this.
2. **Wrong file format** — Only CSV files are accepted. Save Excel files as CSV first.
3. **Missing or wrong column names** — Your CSV must have the exact required column names. Check spelling and capitalization.
4. **Expecting instant completion** — Large files take time to upload. Wait for the progress bar to reach 100%.
5. **Forgetting to select a report** — Make sure a report is selected in the dropdown before trying to upload or view data.

### Helpful Reminders

- **Draft vs. Complete:** A report is Draft until both CSV files are uploaded and processed.
- **Filters apply to everything:** Site, Subject, and Data Source filters affect both the KPIs and the table.
- **Expand to load:** The table loads child rows only when you expand a row. This keeps the page fast.
- **Refresh after uploads:** If data seems stale, click **Refresh**.

### Best Practices

1. **Name reports clearly** — Use dates or study names (e.g., "Study ABC - March 2026").
2. **Export CSVs in the correct format** — Ensure your eCRF export includes all required columns.
3. **Start with Site filter** — When exploring, filter by site first to focus on one location.
4. **Use Data Source filter** — "Site Data Only" shows items not yet in the SDV file; "Both Files" shows matched data.

---

## 6. Troubleshooting

### "No Reports Yet" or "Create your first SDV report"

- **Cause:** You have no reports in the system.
- **Fix:** Click **Create First Report** or **New**, enter a name, and click **Create Report**.

---

### Upload area says "Upload Site Data Entry and SDV Data files"

- **Cause:** The selected report is a Draft and needs both CSV files.
- **Fix:** Click **Upload CSV Files** and upload both files. Upload Site Data Entry first, then SDV Data.

---

### "CSV file is empty or has no valid data rows"

- **Cause:** The CSV has no data rows, or the first row was skipped (human-readable headers).
- **Fix:** Ensure your CSV has a header row and at least one data row. The system skips the first row as human-readable headers.

---

### "Failed to create upload record" or "Failed to insert batch"

- **Cause:** Server error or invalid data in the CSV.
- **Fix:** Check that your CSV has the correct column names and valid data. Try a smaller file first. If it persists, contact support.

---

### Report stuck in Draft with both files uploaded

- **Cause:** The system may not have finished processing or linking the files.
- **Fix:** Click **Fix Report**. If that does not work, contact support.

---

### KPI cards show "No data available"

- **Cause:** No Complete report is selected, or the report has no data.
- **Fix:** Select a Complete report. If you have a Draft, upload both CSV files. If the report is Complete but empty, check that your CSV files contain matching data.

---

### Hierarchical table shows "No Data Available"

- **Cause:** No Complete report with data is selected.
- **Fix:** Select a Complete report and ensure both CSV files were uploaded successfully.

---

### Filters don't change the data

- **Cause:** Filters may not have been applied, or the data may be loading.
- **Fix:** Ensure you selected a value in the filter (not "All"). Click **Refresh** if the view seems wrong.

---

### Refresh button is disabled or spinning

- **Cause:** Data is currently loading.
- **Fix:** Wait for the refresh to complete. Do not click Refresh repeatedly.

---

### When to Contact Support

- You cannot log in or access the module.
- Uploads fail repeatedly with the same file.
- A report stays in Draft after both files are uploaded and Fix Report does not help.
- Data in the table does not match your CSV files.
- You need to delete a report and do not see the delete option.

**Tip:** When contacting support, include:
- A screenshot of the error or unexpected behavior
- The exact error message (if any)
- The names of the files you tried to upload
- What you were trying to do when the issue occurred

---

*This manual was written for first-time users of the Source Data Verification Report module. If you have suggestions for improvements, please share them with your administrator.*
