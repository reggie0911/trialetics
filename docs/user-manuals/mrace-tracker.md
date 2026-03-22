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

- **Company administrators:** Upload patient data, load header mappings, and change which columns are visible (after confirming your password once per browser session).
- **All users with access:** Open **Upload History**, filter and search the table, edit rows, print, and download (when data is loaded).
- View patient records in a sortable, filterable table (with multi-level headers when a header mapping is loaded).
- Filter by Patient ID, Site Name, or Ref#.
- Search across table columns.
- Show or hide columns (admin only, after unlock).
- Edit a patient record by double-clicking a row.
- Print or download the current filtered view.

### Who It Is For

- Clinical trial coordinators and data managers
- Monitors and site coordinators
- Study managers who need to review and update patient data
- Anyone who needs to track patient information across visits and measurements

---

## 2. Getting Started

### How to Access the Module

1. Log in to Trialetics.
2. In the top navigation, open **Custom**.
3. Under **Study trackers**, click **MRace Tracker**.
4. You will see the page title **MRace Performance Tracker** and the subtitle *Upload and manage patient data for your company*.

> **Note:** Your company must have this tracker enabled. If you do not see **MRace Tracker** under **Study trackers**, contact your administrator.

### Who Can Upload and Change Columns

- **Company admins** see an **Unlock tools** control until they enter their **Trialetics login password**. After verification (for this browser session), they can use **Upload Patient Data**, **Load Header Map** / **Loaded (N)**, and **Columns**.
- **Standard (non-admin) users** do not see those controls. They can still use **Upload History**, **Print**, **Download**, filters, search, and row editing when data is available.

### Overview of the Layout

The page is organized into these areas:

| Area | Location | Purpose |
|------|----------|---------|
| **Top toolbar** | Top of the content | **Admins (unlocked):** Upload Patient Data, Load Header Map / Loaded (N), Columns. **Everyone:** Upload History, Print, Download |
| **Table card header** | Above the table | **Viewing upload from:** date and time of the selected upload |
| **Filters** | Top of the card | Patient ID, Site Name, Ref#, Search Table |
| **Patient data table** | Main area | Data grid; double-click a row to edit |
| **Pagination** | Below the table | First, Previous, page numbers, Next, Last |

### Key Areas of the Screen

- **Top toolbar:** **Upload History** shows a badge with the number of saved uploads when there is at least one. **Print** and **Download** are disabled when there is no data loaded.
- **Viewing upload from:** Confirms which monthly upload you are looking at (matches the selection in **Upload History**).
- **Filters:** Dropdowns for **Patient ID**, **Site Name**, and **Ref#**, plus **Search Table** (type a term, then click **Search** or press Enter). **Clear Filters** appears when any filter or search is active.
- **Patient data table:** With a header mapping loaded, headers are grouped by visit. Without a mapping, columns are grouped in the **Columns** dialog by category. Rows with no usable Ref# are hidden (see [Patient Data Table](#patient-data-table)).
- **Pagination:** Shows *Showing X to Y of Z patients* and, when filters narrow the list, *(filtered from N total)*. Default page size is **10** rows.

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload Your First Patient Data File (Admins)

**Goal:** Import patient data from a CSV file so you can view and manage it.

**Steps:**

1. Click **Unlock tools** and enter your **Trialetics login password** if prompted.
2. Click **Upload Patient Data**.
3. The dialog **Upload Patient Data CSV** opens. The description explains that the upload is a monthly export and **replaces the current dataset** for the company.
4. Either **drag and drop** your CSV onto the dashed area or **click** to browse (**.csv** only).
5. Wait while the file is parsed. You will see *Successfully parsed N rows (showing preview)* and a preview of the first columns.
6. If you see an error (e.g. *CSV file has insufficient rows*), fix the file and try again.
7. Click **Upload Data** when the preview looks correct.
8. A success message appears. The new upload becomes the active dataset, and the table refreshes.

**Note:** The parser **skips the first row** of your CSV (often a title row) and uses the **second row** as column headers.

**Example scenario:** Sarah exports a patient data report as CSV. She unlocks admin tools, clicks **Upload Patient Data**, drops the file, reviews the preview, and clicks **Upload Data**. The table fills with her patient records.

---

### Workflow 2: Load a Header Mapping File (Admins, Optional but Recommended)

**Goal:** Use a header mapping CSV to customize column labels and group columns by visit.

**Steps:**

1. Ensure admin tools are unlocked (see Workflow 1).
2. Click **Load Header Map**, or **Loaded (N)** if a mapping is already active (green styling).
3. If the system asks **Confirm your identity**, enter your **Trialetics login password** (same session storage as **Unlock tools**).
4. The dialog **Upload Header Mapping CSV** opens. Use **Drag and drop** or **Browse Files**.
5. The header mapping CSV must have **4 rows**:
   - **Row 1:** Table Order (1, 2, 3, …)
   - **Row 2:** Visit Group (e.g. "Patient Info", "Screening", "Baseline")
   - **Row 3:** Original Header (column names from your data export)
   - **Row 4:** Customized Header (labels shown in the table)
6. If a mapping already exists, you may see **Override Existing Mapping?** — choose **Yes, Override** or **Cancel**.
7. When processing finishes, the table updates with new labels and visit groups.

**Example scenario:** Tom has a Polares header mapping from his data team. He clicks **Load Header Map**, uploads the file, and columns reorganize into visit groups with clearer labels.

---

### Workflow 3: Switch Between Different Uploads

**Goal:** View data from a different upload (e.g. a newer export).

**Steps:**

1. Click **Upload History** (sheet opens from the right).
2. Each row shows the **file name**, **N patients**, **N columns**, upload **date and time**, and a relative time (e.g. "2 hours ago"). The active upload has a **Current** badge.
3. Click the upload you want. The sheet **closes** and the page loads that upload’s data.

**Example scenario:** Mike selects today’s file in **Upload History**; **Viewing upload from:** updates to today’s date and time.

---

### Workflow 4: Filter by Patient ID, Site Name, or Ref#

**Goal:** Narrow the table to a specific patient, site, or Ref#.

**Steps:**

1. Ensure data is loaded.
2. Use the dropdowns:
   - **Patient ID** — **All Patients** or a specific ID (label may show *(at Site …)* when a site is selected).
   - **Site Name** — **All Sites** or a site (label may show *(for Patient …)* when a patient is selected).
   - **Ref#** — **All Ref#** or one value.
3. **Patient ID** and **Site Name** cascade: options depend on the other when one is set.
4. Click **Clear Filters** when it appears to reset Patient ID, Site Name, Ref#, and the active search.

**Example scenario:** Lisa chooses **Site 101** under **Site Name**; the table shows only patients from that site.

---

### Workflow 5: Search Across the Table

**Goal:** Find rows that contain a specific word or number.

**Steps:**

1. In **Search Table**, type your term.
2. Click **Search** or press **Enter**.
3. Matching is **case-insensitive** across cells.
4. Use the **X** in the field to clear the text and applied search.

**Example scenario:** Rachel searches for `Aspirin` to see all rows mentioning it.

---

### Workflow 6: Show or Hide Columns (Admins)

**Goal:** Focus on the columns you need.

**Steps:**

1. Unlock admin tools if needed.
2. Click **Columns**:
   - **With a header mapping loaded:** The button shows **Columns** and a small badge **visible/total** (e.g. `112/113`). The dialog title is **Column Visibility (Grouped by Visit)**. Expand or collapse visit groups with the chevron. Use the **group checkbox** to show or hide an entire visit group, or toggle individual columns inside a group.
   - **Without a header mapping:** The button shows **Columns (visible/total)** in one label. The dialog title is **Column Visibility**, with **Show All** and **Hide All** at the top, then categories (e.g. Demographics, Visit Information) with per-category controls.
3. Close the dialog; the table updates immediately.

**Example scenario:** David hides visit groups he does not need for his review.

---

### Workflow 7: Edit a Patient Record

**Goal:** Update data for a specific patient.

**Steps:**

1. Find the row in the table.
2. **Double-click** the row (not the header).
3. In the edit dialog, change the fields you need.
4. Click **Save**. The table refreshes.

**Example scenario:** Emma corrects a typo in a measurement and saves.

---

### Workflow 8: Print or Download Data

**Goal:** Print or export the **currently filtered** rows.

**Steps:**

**Print**

1. Set filters and search as needed.
2. Click **Print**. Your browser’s print dialog opens.

**Download**

1. Set filters and search as needed.
2. Click **Download**.
3. A CSV file is saved (name like `patient_data_YYYY-MM-DD.csv`). The toast confirms how many **patient records** were exported and mentions visit groups.

**Example scenario:** James filters to one site, then **Download** to share a CSV.

---

### Workflow 9: Navigate Pages

**Goal:** Move through many patients.

**Steps:**

1. Read *Showing X to Y of Z patients* (and *(filtered from N total)* if applicable).
2. Use **First**, **Previous**, numbered pages, **Next**, and **Last**.
3. Page size is **10** rows.

---

### Workflow 10: Change Column Labels (Inline)

**Goal:** Rename a column header in the grid.

**Steps:**

1. **Click** the column header.
2. Type the new label.
3. Press **Enter** to save or **Escape** to cancel.

**Example scenario:** Jane renames a long technical field to a short display name.

---

## 4. Feature Reference

### Unlock tools (admins only)

- **What it does:** Replaces upload / mapping / column controls with a single **Unlock tools** button until you enter your **Trialetics login password**. Verification is stored for the **browser session** (session storage).
- **Dialog:** Title **Header mapping & columns**; description explains password is required for upload, header mapping, and column tools.

---

### Upload Patient Data

- **What it does:** Opens **Upload Patient Data CSV**; data **replaces** the current dataset.
- **When to use it:** New monthly (or periodic) export from your trial system.
- **Parsing:** First row skipped; second row = headers.

---

### Load Header Map / Loaded (N)

- **What it does:** Loads a transposed mapping CSV. Button shows **Load Header Map** or **Loaded (N)** when active.
- **Dialog:** **Upload Header Mapping CSV**; description references organizing columns by visit (and existing mapping count when replacing).
- **Override:** **Override Existing Mapping?** with **Yes, Override** / **Cancel**.

---

### Columns

- **With mapping:** Trigger **Columns** + badge `visible/total`; dialog **Column Visibility (Grouped by Visit)**.
- **Without mapping:** Trigger **Columns (visible/total)**; dialog **Column Visibility** with **Show All** / **Hide All** and category groupings.

---

### Upload History

- **What it does:** Opens a **sheet** listing uploads; selecting one loads it and **closes** the sheet.
- **Badge:** Count on the trigger when there is at least one upload.
- **Row details:** File name, patient count, column count, timestamps, **Current** for the active upload.
- **Deleting uploads:** There is no delete control in the current UI; contact your administrator if an upload must be removed.

---

### Print / Download

- **Disabled** when there are no patient rows loaded in the table.
- **Download** respects the current filters and produces a CSV with visit-related structure as implemented by the app.

---

### Filters (Patient ID, Site Name, Ref#)

- **Cascading:** Patient ID ↔ Site Name options narrow each other.
- **Ref# exclusion:** Rows with empty, `-`, or `—` in the Ref# field (`Ref#` or `E01_V1[1].SCR_05.SE[1].SE_REFID`) are **dropped** before the table; they never appear and cannot be filtered in.

---

### Search Table

- **What it does:** Filters rows where **any cell** contains the search text (case-insensitive). Requires clicking **Search** or pressing **Enter** (not live on every keystroke).

---

### Patient Data Table

- **Double-click row:** Opens the edit dialog.
- **Sortable:** Use column headers as implemented in the grid.

---

### Pagination

- **Default:** 10 rows per page.
- **Text:** *Showing X to Y of Z patients* plus optional *(filtered from N total)*.

---

## 5. Common Mistakes & Tips

### Beginner Mistakes

1. **Forgetting to unlock (admins)** — You must use **Unlock tools** before **Upload Patient Data**, **Load Header Map**, or **Columns** appear.
2. **Expecting upload as a non-admin** — Only **company admins** see upload and column tools.
3. **Wrong file format** — Only **.csv** is accepted for patient data and header mapping.
4. **Expecting row 1 to be headers** — Row 1 is skipped; row 2 must be the real header row.
5. **Missing header mapping** — Without it, names stay technical; load a mapping for visit groups and friendly labels.
6. **Rows “missing”** — Empty / `-` / `—` Ref# rows are excluded by design.

### Helpful Reminders

- **Upload History** is available to all users with tracker access (not behind **Unlock tools**).
- Combine dropdown filters with **Search Table** for precise views.
- **Download** reflects **filtered** rows (and the app’s export format).
- Column visibility preferences are tied to the upload/configuration in the app’s data model (per upload behavior as implemented).

### Best Practices

1. Load or update **header mapping** when your export schema changes.
2. Confirm **Viewing upload from:** matches the month or file you intend to review.
3. Use **Clear Filters** when results look unexpectedly empty.

---

## 6. Troubleshooting

### "No data to download" or upload errors

- **Cause:** No data loaded, or CSV parsing failed.
- **Fix:** Select an upload in **Upload History** or upload a valid CSV.

---

### "CSV file has insufficient rows"

- **Cause:** Fewer than two rows (need a skipped title row plus a header row at minimum).
- **Fix:** Add rows so row 2 contains headers.

---

### "CSV file is empty"

- **Cause:** No data rows after the header row.
- **Fix:** Include at least one data row.

---

### "No valid header mappings found in CSV"

- **Cause:** Mapping file does not match the expected 4-row transposed format.
- **Fix:** Use the template from your data team.

---

### Some patients are missing

- **Cause:** Ref# blank, `-`, or `—`.
- **Fix:** Fix the source data or discuss with your administrator if Ref# should not gate visibility.

---

### I do not see Upload Patient Data or Columns

- **Cause:** Your account is not a **company admin**, or you have not clicked **Unlock tools** yet.
- **Fix:** Ask an admin to grant the role or unlock tools with your password.

---

### Table shows no patient data for this upload

- **Cause:** No rows with valid Ref#, or filters/search are too narrow.
- **Fix:** Click **Clear Filters**; verify the CSV and Ref# column.

---

### Edit modal does not open

- **Cause:** Click was on the header, or no data loaded.
- **Fix:** Double-click the **row** body.

---

### Print or Download disabled

- **Cause:** No patient rows are loaded in the table.
- **Fix:** Upload or select an upload with data.

---

### When to Contact Support

- You cannot access **Custom → Study trackers → MRace Tracker**.
- Uploads or mapping uploads fail with valid files.
- Exported or on-screen data does not match expectations after filters are cleared.
- Ref# filtering is not appropriate for your protocol.

**Tip:** When contacting support, include a screenshot, exact error text, file names, a redacted sample of the first rows of the CSV, and what you were trying to do.

---

*This manual is for users of the MRace Performance Tracker. Suggestions welcome through your administrator.*
