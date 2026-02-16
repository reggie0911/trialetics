---
title: MRace Performance Tracker Module — User Manual
description: Beginner-friendly guide for the MRace Performance Tracker module
---

# MRace Performance Tracker Module — User Manual

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

The **MRace Performance Tracker** is a tool for uploading, viewing, and managing **patient data** from clinical trials. It helps you store patient records, filter and search them, and edit individual records when needed.

> **Patient Data:** Information about subjects in a clinical trial, such as demographics, visit dates, clinical measurements (e.g., heart function), and adverse events.  
> **Header Mapping:** A separate CSV file that tells the system how to label and group columns from your patient data export. This makes the table easier to read and organize.

### What It Helps You Do

- Upload patient data from CSV files exported from your clinical trial system
- Load a header mapping file to customize column labels and group columns by visit
- View all patient records in a sortable, filterable table with multi-level headers
- Filter by Patient ID, Site Name, or Ref#
- Search across all columns
- Show or hide columns to focus on what you need
- Edit individual patient records by double-clicking a row
- Print or download filtered data

### Who It Is For

- Clinical trial coordinators and data managers
- Monitors and site coordinators
- Study managers who need to review and update patient data
- Anyone who needs to track patient information across visits and measurements

---

## 2. Getting Started

### How to Access the Module

1. Log in to the application.
2. In the top navigation, open the **Trackers** menu.
3. Click **MRace Tracker - View**.
4. You will see the MRace Performance Tracker page with the title **MRace Performance Tracker** and the subtitle *"Upload and manage patient data for your company."*

### Overview of the Layout

The page is organized into these areas:

| Area | Location | Purpose |
|------|----------|---------|
| **Top toolbar** | Top of the page | Upload Patient Data, Load Header Map, Columns, Upload History, Print, Download |
| **Filters** | Below the toolbar | Patient ID, Site Name, Ref#, Search Table |
| **Patient data table** | Main area | Table with columns grouped by visit (e.g., Patient Info, Screening, Baseline) |
| **Pagination** | Below the table | First, Previous, page numbers, Next, Last |

### Key Areas of the Screen

- **Top toolbar:** Buttons for **Upload Patient Data**, **Load Header Map** (or "Loaded (X)" when a mapping is active), **Columns**, **Upload History**, **Print**, and **Download**.
- **Filters:** Dropdowns for Patient ID, Site Name, and Ref#, plus a Search box and Search button. Use **Clear Filters** to reset.
- **Patient data table:** Multi-level headers (visit groups and column names). Double-click a row to edit. Rows with empty Ref# are not shown.
- **Pagination:** Shows "Showing X to Y of Z patients" and navigation buttons.

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload Your First Patient Data File

**Goal:** Import patient data from a CSV file so you can view and manage it.

**Steps:**

1. Click the **Upload Patient Data** button in the top toolbar.
2. A dialog opens for uploading a CSV file.
3. Either:
   - **Drag and drop** your CSV file onto the dashed area, or
   - **Click** the dashed area to browse and select a file.
4. Wait while the file is parsed. You will see a preview of the first 5 rows.
5. If you see an error message (e.g., "CSV file has insufficient rows"), fix your file and try again.
6. If the preview looks correct, click **Upload Data**.
7. A success message appears. The new upload becomes the active dataset, and the table refreshes with your data.

**Note:** The system skips the first row of your CSV (often a human-readable title row) and uses the second row as column headers.

**Example scenario:** Sarah exports a patient data report from her clinical trial system as a CSV. She opens the MRace Performance Tracker, clicks **Upload Patient Data**, drops the file, reviews the preview, and clicks **Upload Data**. Within seconds, she sees the table populated with her patient records.

---

### Workflow 2: Load a Header Mapping File (Optional but Recommended)

**Goal:** Use a header mapping CSV to customize column labels and group columns by visit.

**Steps:**

1. Click the **Load Header Map** button (or the button that shows "Loaded (X)" if you already have a mapping).
2. A dialog opens. Drag and drop your header mapping CSV, or click to browse.
3. The header mapping CSV must have **4 rows**:
   - **Row 1:** Table Order (1, 2, 3, ...)
   - **Row 2:** Visit Group (e.g., "Patient Info", "Screening", "Baseline")
   - **Row 3:** Original Header (column names from your data export)
   - **Row 4:** Customized Header (labels you want to show in the table)
4. If you already have a mapping, you may see an override warning. Confirm to replace it.
5. When processing completes, the table updates with the new labels and column groups.

**Example scenario:** Tom has a header mapping file from his data team. He clicks **Header Mapping**, uploads the file, and the table columns are reorganized into visit groups (Patient Info, Screening, Procedure, etc.) with clearer labels.

---

### Workflow 3: Switch Between Different Uploads

**Goal:** View data from a different upload (e.g., a newer export or a different study).

**Steps:**

1. Click the **Upload History** button in the top toolbar.
2. A panel opens on the right showing all your previous uploads.
3. Each upload shows the file name, number of patients, and upload date.
4. Click the upload you want to view.
5. The panel closes and the page loads that upload's data.

**Example scenario:** Mike has uploaded data from last month and from today. He clicks **Upload History**, selects today's file, and the page updates to show the latest data.

---

### Workflow 4: Filter by Patient ID, Site Name, or Ref#

**Goal:** Narrow down the table to a specific patient, site, or Ref#.

**Steps:**

1. Make sure you have data loaded.
2. In the **Filters** area, use the dropdowns:
   - **Patient ID** — Choose a patient or "All Patients"
   - **Site Name** — Choose a site or "All Sites"
   - **Ref#** — Choose a Ref# or "All Ref#"
3. The Patient ID and Site Name filters are linked: if you select a site first, Patient ID shows only patients at that site, and vice versa.
4. The table updates automatically.
5. To clear all filters, click **Clear Filters**.

**Example scenario:** Lisa wants to see only data for "Site 101". She selects "Site 101" in the Site Name dropdown. The table shows only patients from that site.

---

### Workflow 5: Search Across the Table

**Goal:** Find rows that contain a specific word or number.

**Steps:**

1. In the **Filters** area, find the **Search Table** box.
2. Type your search term (e.g., a patient ID, a value, or part of a value).
3. Click the **Search** button (or press Enter).
4. The table shows only rows where any cell contains your search term (case-insensitive).
5. To clear the search, click the **X** in the search box or clear the text and search again.

**Example scenario:** Rachel needs to find all records mentioning "Aspirin". She types "Aspirin" in the Search Table box, clicks Search, and the table filters to matching rows.

---

### Workflow 6: Show or Hide Columns

**Goal:** Focus on the columns you need by hiding others.

**Steps:**

1. Click the **Columns** button in the top toolbar.
2. A dialog opens showing all columns, grouped by visit group (if you have a header mapping) or by category (Demographics, Visit Information, Clinical Measurements, Adverse Events, Other).
3. Use the checkboxes to show or hide individual columns.
4. You can also show or hide entire groups (e.g., all "Screening" columns).
5. The dialog shows "X/Y" (visible/total columns). Click **Show All** or **Hide All** for quick changes.
6. Close the dialog. The table updates with your column choices.

**Example scenario:** David only needs Patient ID, Site, and key measurements. He opens **Columns**, hides the groups he doesn't need, and keeps only the relevant columns visible.

---

### Workflow 7: Edit a Patient Record

**Goal:** Update data for a specific patient.

**Steps:**

1. Find the patient row in the table.
2. **Double-click** the row.
3. An edit modal opens with the patient's data, grouped by visit or category.
4. Edit the fields you need to change.
5. Click **Save** to apply your changes.
6. The table refreshes with the updated data.

**Example scenario:** Emma notices a typo in a patient's weight. She double-clicks the row, corrects the weight in the edit modal, and clicks Save.

---

### Workflow 8: Print or Download Data

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
3. A CSV file downloads with a name like `patient_data_2025-02-13.csv`.
4. The file includes visit group headers and customized column labels.
5. Open the file in Excel or another spreadsheet tool.

**Example scenario:** Before a meeting, James filters to "Site 102", then clicks **Download** to share a CSV with the site team.

---

### Workflow 9: Navigate Through Pages of Data

**Goal:** Move through the table when you have many patients.

**Steps:**

1. Below the table, you will see: *"Showing X to Y of Z patients"*.
2. Use the pagination buttons:
   - **First** — Go to the first page
   - **Previous** — Go to the previous page
   - **Page numbers** — Click a number to jump to that page
   - **Next** — Go to the next page
   - **Last** — Go to the last page
3. The default page size is 10 rows per page.

**Example scenario:** With 200 patients and 10 per page, Paul uses the Next button to move from page 1 to page 2 and beyond.

---

### Workflow 10: Change Column Labels (Inline Editing)

**Goal:** Rename a column header directly in the table.

**Steps:**

1. In the patient data table, find the column header you want to change.
2. **Click** the column header to enter edit mode.
3. Type the new label.
4. Press **Enter** to save, or **Escape** to cancel.
5. The new label is saved and shown in the table.

**Example scenario:** The column shows "E01_V1[1].SCR_01.VS[1].HEIGHT_VSORRES". Jane clicks it, types "Height (cm)", and presses Enter. The column now displays "Height (cm)".

---

## 4. Feature Reference

### Upload Patient Data

- **What it does:** Opens a dialog to upload a CSV file with patient data.
- **When to use it:** When you have a new export from your clinical trial system.
- **Note:** The first row of the CSV is skipped (treated as a title row). The second row is used as column headers.

---

### Load Header Map / Header Mapping

- **What it does:** Loads a CSV file that maps original column names to customized labels and visit groups. The button shows "Load Header Map" when no mapping is loaded, and "Loaded (X)" (where X is the number of mapped columns) when a mapping is active.
- **When to use it:** When you have a header mapping file from your data team, or when you want to organize columns by visit and use friendly labels.
- **Format:** 4 rows — Table Order, Visit Group, Original Header, Customized Header. The first column can be row labels; data starts in the second column.

---

### Columns

- **What it does:** Opens a dialog to show or hide columns. When a header mapping is loaded, columns are grouped by visit group.
- **When to use it:** When you want to focus on specific columns or reduce clutter.

---

### Upload History

- **What it does:** Opens a panel listing all your previous uploads. Click one to switch the active dataset.
- **When to use it:** When you want to compare or switch between different exports or time periods.
- **Badge:** Shows the number of uploads next to the button.

---

### Print

- **What it does:** Opens the browser print dialog to print the current view.
- **When to use it:** For meetings or paper records.

---

### Download

- **What it does:** Downloads the currently filtered data as a CSV file, with visit group headers and customized column labels.
- **When to use it:** To share data with colleagues or analyze it in Excel.

---

### Filters (Patient ID, Site Name, Ref#)

- **What they do:** Narrow the data to specific patients, sites, or Ref# values.
- **Cascading:** Patient ID and Site Name options update based on each other (e.g., selecting a site limits Patient ID choices to patients at that site).
- **Ref#:** Rows with empty or "-" Ref# are never shown in the table, but you can filter among rows that have a Ref#.

---

### Search Table

- **What it does:** Searches across all columns for the text you enter.
- **When to use it:** When you need to find rows containing a specific value and don't know which column it's in.

---

### Clear Filters

- **What it does:** Removes all filter selections (Patient ID, Site Name, Ref#, and Search).
- **When to use it:** When you want to see the full dataset again.

---

### Patient Data Table

- **What it does:** Displays patient records with multi-level headers (visit groups and column names).
- **Double-click:** Opens the edit modal for that row.
- **Excluded rows:** Rows with empty or "-" Ref# are not shown.

---

### Pagination

- **Default:** 10 rows per page.
- **Navigation:** First, Previous, page numbers, Next, Last.

---

## 5. Common Mistakes & Tips

### Beginner Mistakes

1. **Uploading the wrong file format** — Only CSV files are accepted. Save Excel files as CSV first.
2. **Expecting the first row to be headers** — The system skips the first row. Ensure your second row contains the actual column names.
3. **Missing header mapping** — Without a header mapping, column names may look technical (e.g., "E01_V1[1].SCR_01.VS[1].HEIGHT_VSORRES"). Load a header mapping for clearer labels.
4. **Wrong header mapping format** — The header mapping CSV must have exactly 4 rows in the transposed format. Check with your data team for the correct template.
5. **Rows not appearing** — Rows with empty or "-" Ref# are excluded. If you expect to see a patient, ensure they have a valid Ref#.

### Helpful Reminders

- **Header mapping is optional** — You can upload data without it, but the table may be harder to read.
- **Filters and search work together** — You can combine Patient ID, Site Name, Ref#, and Search.
- **Download** includes only the currently filtered data and visible columns.
- **Column visibility** is saved per upload.

### Best Practices

1. **Load header mapping before or right after first upload** — This organizes columns from the start.
2. **Use Search for quick lookups** — When you don't know the column, Search scans all columns.
3. **Filter by Site first when reviewing site-specific data** — Then narrow by Patient ID if needed.
4. **Double-check before editing** — Ensure you have the correct row before saving changes.

---

## 6. Troubleshooting

### "No data to download" or "Please upload data first"

- **Cause:** No upload is selected or the table is empty.
- **Fix:** Upload a CSV file or select an upload from Upload History.

---

### "CSV file has insufficient rows"

- **Cause:** The CSV has fewer than 2 rows (the system needs at least a title row and a header row).
- **Fix:** Ensure your CSV has at least 2 rows. The first is skipped; the second is used as headers.

---

### "CSV file is empty"

- **Cause:** The CSV has no data rows after the header.
- **Fix:** Add at least one data row to your CSV.

---

### "No valid header mappings found in CSV"

- **Cause:** The header mapping CSV does not have the expected format (4 rows: Table Order, Visit Group, Original Header, Customized Header).
- **Fix:** Ensure your header mapping CSV has exactly 4 rows. The first column can be labels; the mapping data starts in the second column. Contact your data team for a template.

---

### Some patients are missing from the table

- **Cause:** Rows with empty Ref# or "-" in the Ref# column are excluded.
- **Fix:** Ensure your data has a valid Ref# for each patient you want to see. If Ref# is optional for your study, contact your administrator.

---

### Column names look technical or confusing

- **Cause:** No header mapping is loaded, or the mapping doesn't cover those columns.
- **Fix:** Load a header mapping CSV that maps those columns to friendly labels. You can also use inline editing to rename individual column headers.

---

### Table shows "No patient data found for this upload"

- **Cause:** The upload may have no rows with valid Ref#, or a filter may be too strict.
- **Fix:** Click **Clear Filters**. If it still shows nothing, check that your CSV has Ref# values and that the upload completed successfully.

---

### Edit modal does not open when double-clicking

- **Cause:** Double-click may not have registered, or the row might not be clickable.
- **Fix:** Double-click directly on the row (not on the header). Ensure you have an upload selected and data loaded.

---

### Print or Download buttons are disabled

- **Cause:** No data is loaded.
- **Fix:** Upload a CSV file or select an upload from Upload History.

---

### When to Contact Support

- You cannot log in or access the module.
- Uploads fail repeatedly with the same file.
- Header mapping upload fails with a valid file.
- Data in the table does not match your CSV file.
- You need to delete an upload and do not see the option.
- Ref# exclusion is not appropriate for your study.

**Tip:** When contacting support, include:
- A screenshot of the error or unexpected behavior
- The exact error message (if any)
- The names of the files you tried to upload
- A sample of your CSV structure (first few rows)
- What you were trying to do when the issue occurred

---

*This manual was written for first-time users of the MRace Performance Tracker module. If you have suggestions for improvements, please share them with your administrator.*
