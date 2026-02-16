---
title: Med Compliance Module — User Manual
description: Beginner-friendly guide for the Med Compliance module
---

# Med Compliance Module — User Manual

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

The **Med Compliance** module is a tool for uploading, viewing, and analyzing **medication compliance data** from clinical trials. It helps you track which medications subjects are taking, when they started and stopped, and identify records that need attention (e.g., missing dates or doses).

> **Medication Compliance:** Information about medications that subjects take during a clinical trial, including medication name, dose, frequency, start date, stop date, and ongoing status.  
> **Study Visit:** A specific visit in the trial (e.g., Screening, Baseline, 30-Day Visit) when medication data was collected.

### What It Helps You Do

- Upload medication compliance data from CSV files exported from your clinical trial system
- View all medication records in a sortable, filterable table
- Switch between **Standard View** (one row per medication record) and **Pivot View** (one row per patient + medication, with columns for each visit)
- Filter by site, patient, medication, indication, ongoing status, and frequency
- See summary metrics (total medications, missing dates, invalid entries, partial data)
- View a chart of medication records by study visit
- Print or download filtered data
- Customize column labels to match your organization's terminology

### Who It Is For

- Clinical trial data managers
- Monitors and site coordinators
- Study managers who need to review medication compliance
- Anyone who needs to ensure medication data is complete and accurate

---

## 2. Getting Started

### How to Access the Module

1. Log in to the application.
2. In the top navigation, open the **Trackers** menu.
3. Click **Med Compliance**.
4. You will see the Med Compliance page with the title **Med Compliance** and the subtitle *"Upload and manage medication compliance data."*

### Overview of the Layout

The page is organized into these areas:

| Area | Location | Purpose |
|------|----------|---------|
| **Top toolbar** | Top of the page | Upload MC Data, Customize Headers, Upload History, Print, Download |
| **Filters** | Below the toolbar | Filter by site, patient, medication, indication, ongoing status, frequency (and Change Status in Pivot View) |
| **KPI cards** | Below filters | Seven cards: Total Medications, Missing Start Date, Start Date Unknown, Missing Stop Date, Missing Dose or Unit, Invalid Frequency, Partial Data |
| **Study Visits chart** | Below KPI cards | Bar chart of medication records by study visit |
| **Medication Records table** | Bottom | Table with Standard View / Pivot View toggle |

### Key Areas of the Screen

- **Top toolbar:** Buttons for **Upload MC Data**, **Customize Headers**, **Upload History**, **Print**, and **Download**.
- **Filters:** A collapsible card with dropdown filters. Click the up/down arrow to expand or collapse. Use **Reset All Filters** to clear everything.
- **KPI cards:** Seven cards. Most are clickable to filter the table to records that need attention.
- **Study Visits chart:** Bar chart where you can click a bar to filter the table by that study visit.
- **Medication Records table:** Toggle between **Standard View** and **Pivot View** above the table. Includes pagination controls.

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload Your First Medication Compliance File

**Goal:** Import medication compliance data from a CSV file so you can view and analyze it.

**Steps:**

1. Click the **Upload MC Data** button in the top toolbar.
2. A dialog opens titled **Upload Medication Compliance CSV**.
3. Either:
   - **Drag and drop** your CSV file onto the dashed area, or
   - **Click** the dashed area (or "Drop CSV file here or click to browse") to select a file.
4. Wait while the file is parsed. You will see a preview of the first few rows.
5. If you see an error message (e.g., missing columns or invalid format), fix your CSV and try again.
6. If the preview looks correct, click **Upload Data**.
7. A success message appears. The new upload becomes the active dataset, and the page refreshes with your data.

**Example scenario:** Sarah exports a medication compliance report from her clinical trial system as a CSV. She opens the Med Compliance module, clicks **Upload MC Data**, drops the file, reviews the preview, and clicks **Upload Data**. Within seconds, she sees the KPI cards, chart, and table populated with her medication data.

---

### Workflow 2: Switch Between Different Uploads

**Goal:** View data from a different upload (e.g., a newer export or a different study).

**Steps:**

1. Click the **Upload History** button in the top toolbar.
2. A panel opens on the right showing all your previous uploads.
3. Each upload shows:
   - File name
   - Number of medication records and columns
   - Upload date and time
4. Click the upload you want to view.
5. The panel closes and the page loads that upload's data.
6. The selected upload shows a **Current** badge.

**Example scenario:** Mike has uploaded data from last week and from today. He clicks **Upload History**, selects today's file, and the page updates to show the latest data.

---

### Workflow 3: Filter Data by Site, Patient, or Medication

**Goal:** Narrow down the data to a specific site, patient, medication, or other field.

**Steps:**

1. Make sure you have data loaded (an upload selected).
2. In the **Filters** card, use the dropdowns:
   - **Site Name** — Choose a specific site or leave as "Choose an option..." for all
   - **Patient ID** — Choose a patient or leave blank for all
   - **Medication Name** — Choose a medication or leave blank for all
   - **Indication** — Choose an indication (why the medication is taken) or leave blank for all
   - **Ongoing Status** — Choose a status (e.g., "Ongoing", "Stopped") or leave blank for all
   - **Frequency** — Choose a frequency (e.g., "QD", "BID") or leave blank for all
3. The KPI cards, chart, and table update automatically.
4. To remove all filters, click **Reset All Filters**.

**Example scenario:** Lisa wants to see only "Aspirin" records at "Site 101". She selects "Site 101" in Site Name and "Aspirin" in Medication Name. The table and chart show only those records.

---

### Workflow 4: Use the Chart to Filter by Study Visit

**Goal:** Click on a chart bar to filter the table to that study visit.

**Steps:**

1. Make sure you have data loaded.
2. Look at the **Study Visits** chart. It shows bars for each study visit (e.g., Screening, Baseline, 30-Day Visit).
3. **Click a bar** to filter the table to that study visit.
4. When filtered, the chart header shows "Filtered by: [visit name]". Click the **X** next to it to clear the filter.
5. Click the same bar again to remove the filter.

**Example scenario:** Tom clicks the "Baseline" bar in the Study Visits chart. The table updates to show only medication records from the Baseline visit.

---

### Workflow 5: Use KPI Cards to Find Records That Need Attention

**Goal:** Click a KPI card to filter the table to records with data quality issues.

**Steps:**

1. Make sure you have data loaded.
2. Look at the seven KPI cards:
   - **Total Medications** — Click to show all records (or clear the filter)
   - **Missing Start Date** — Click to show records without a start date
   - **Start Date Unknown Flag** — Click to show records where start date is marked as unknown
   - **Missing Stop Date** — Click to show records that should have a stop date but don't (excluding "Ongoing")
   - **Missing Dose or Unit** — Click to show records missing dose or unit
   - **Invalid Frequency Entries** — Click to show records with frequency not in the expected list (QD, BID, TID, QID, PRN, 1x, Other)
   - **Med logs w/ Partial Data** — Click to show records with some but not all key fields filled
3. **Click** a card to apply or toggle that filter.
4. A selected card is highlighted. Click it again to clear the filter.

**Example scenario:** Rachel clicks "Missing Start Date" to find records that need a start date. The table shows only those records so she can follow up with sites.

---

### Workflow 6: Switch Between Standard View and Pivot View

**Goal:** Choose how you want to see the medication data.

**Steps:**

1. Above the **Medication Records** table, you will see two buttons: **Standard View** and **Pivot View**.
2. **Standard View** — One row per medication record. Each row shows site, patient, study visit, medication, dose, dates, status, etc.
3. **Pivot View** — One row per patient + procedure date. Columns are grouped by study visit (Screening, Baseline, 30-Day, etc.). Each visit has columns for Medication Name, Dose, Unit, Frequency, Start Date, Stop Date, Status, and **Change Status**.
4. Click **Standard View** or **Pivot View** to switch.
5. **Change Status** (Pivot View only): Shows whether medication data changed from the previous visit:
   - **Yes** (yellow) — Data changed; hover to see what changed
   - **No** (green) — No change from previous visit
   - **—** (gray) — First visit; no previous visit to compare

**Example scenario:** David wants to see how a patient's medications changed across visits. He switches to **Pivot View** and scans the Change Status column. Yellow "Yes" cells indicate changes; he hovers to see the details.

---

### Workflow 7: Filter by Change Status (Pivot View Only)

**Goal:** In Pivot View, filter to patients who have medication changes, no changes, or first visits only.

**Steps:**

1. Switch to **Pivot View**.
2. In the **Filters** card, you will see an additional dropdown: **Change Status**.
3. Choose:
   - **All** — Show all rows
   - **Has Changes (Yes)** — Only rows where at least one visit has "Yes" (medication data changed)
   - **No Changes (No)** — Only rows where visits have "No" (no change)
   - **First Visit (-)** — Only rows where at least one visit is the first visit
4. The table updates to show only matching rows.

**Example scenario:** Emma wants to review patients whose medications changed between visits. She selects "Has Changes (Yes)" in the Change Status filter.

---

### Workflow 8: Print or Download Data

**Goal:** Create a printed report or a CSV file of the currently filtered data.

**Steps:**

**To print:**
1. Apply any filters you want (or leave them clear for all data).
2. Choose **Standard View** or **Pivot View** (download format matches the current view).
3. Click the **Print** button in the top toolbar.
4. Your browser's print dialog opens. Choose your printer or "Save as PDF" if needed.
5. Print or save.

**To download:**
1. Apply any filters you want.
2. Choose **Standard View** or **Pivot View**.
3. Click the **Download** button in the top toolbar.
4. A CSV file downloads:
   - **Standard View:** `med_compliance_2025-02-13.csv` (one row per medication record)
   - **Pivot View:** `med_compliance_pivot_2025-02-13.csv` (one row per patient + procedure date, with visit columns)
5. Open the file in Excel or another spreadsheet tool.

**Example scenario:** Before a meeting, James filters to "Missing Start Date", then clicks **Download** to share a list of records that need follow-up.

---

### Workflow 9: Customize Column Headers

**Goal:** Change the labels shown in the table to match your organization's terms.

**Steps:**

1. Click the **Customize Headers** button in the top toolbar.
2. A dialog opens with a list of columns and their current labels.
3. For each column, edit the text in the right-hand field (e.g., change "PATIENT ID" to "Subject ID").
4. Click **Save Changes** to apply.
5. Click **Reset to Default** to restore the original labels.
6. Click **Cancel** to close without saving.

**Example scenario:** The study uses "Participant ID" instead of "Patient ID". Jane opens **Customize Headers**, changes "PATIENT ID" to "Participant ID", and saves. The table now shows "Participant ID" as the column header.

---

### Workflow 10: Navigate Through Pages of Data

**Goal:** Move through the table when you have many medication records.

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

## 4. Feature Reference

### Upload MC Data

- **What it does:** Opens a dialog to upload a CSV file with medication compliance data.
- **When to use it:** When you have a new export from your clinical trial system.
- **Requirements:** CSV must have columns such as SiteName, SubjectId, EventName, 1.CCSVT (study visit), 1.CCMED (medication name), 1.CCIND (indication), 1.CC1 (dose), 1.CCUNIT (unit), 1.CCFREQ (frequency), 1.CCSTDAT (start date), 1.CMSTDATUN1 (start date unknown), 1.CCSPDAT (stop date), 1.CCONGO1 (status). The system may use row 2 as headers if it matches better. Rows without a study visit value are excluded.

---

### Customize Headers

- **What it does:** Lets you change the display labels for table columns.
- **When to use it:** When your organization uses different terms.
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
- **Tip:** Apply filters first. The printed layout matches Standard or Pivot View.

---

### Download

- **What it does:** Downloads the currently filtered data as a CSV file.
- **When to use it:** To share data with colleagues or analyze it in Excel.
- **Standard vs. Pivot:** Download format matches the current view (Standard or Pivot).

---

### Filters

- **Site Name, Patient ID, Medication Name, Indication, Ongoing Status, Frequency:** Narrow the data to specific values.
- **Change Status** (Pivot View only): Filter by Has Changes (Yes), No Changes (No), or First Visit (-).
- **Reset All Filters:** Removes all filter selections.

---

### KPI Cards

- **Total Medications:** Total medication records. Click to show all.
- **Missing Start Date:** Records without a start date. Click to filter.
- **Start Date Unknown Flag:** Records where start date is marked unknown. Click to filter.
- **Missing Stop Date:** Records that should have a stop date but don't (excluding Ongoing). Click to filter.
- **Missing Dose or Unit:** Records missing dose or unit. Click to filter.
- **Invalid Frequency Entries:** Records with frequency not in QD, BID, TID, QID, PRN, 1x, Other. Click to filter.
- **Med logs w/ Partial Data:** Records with some but not all key fields. Click to filter.

---

### Study Visits Chart

- **What it does:** Shows a bar chart of medication records by study visit.
- **Clickable:** Click a bar to filter the table to that visit. Click again to clear.

---

### Standard View vs. Pivot View

- **Standard View:** One row per medication record. Best for reviewing individual records.
- **Pivot View:** One row per patient + procedure date. Columns grouped by visit. Best for comparing medication data across visits and spotting changes.

---

### Change Status (Pivot View)

- **Yes** (yellow): Medication data changed from the previous visit. Hover to see what changed.
- **No** (green): No change from previous visit.
- **—** (gray): First visit; no previous visit to compare.

---

### Pagination

- **Default:** 10 rows per page.
- **Navigation:** First, Previous, Next, Last page buttons.

---

## 5. Common Mistakes & Tips

### Beginner Mistakes

1. **Uploading the wrong file format** — Only CSV files are accepted. Save Excel files as CSV first.
2. **Missing or wrong column names** — Your CSV must have the required columns. The system matches names flexibly (spaces and case may vary). Row 2 may be used as headers if it matches better.
3. **Rows without study visit** — Rows without a value in the study visit column (1.CCSVT) are excluded. Ensure your export includes this field.
4. **Expecting instant updates** — After changing filters, the data updates immediately, but large tables may take a moment to re-render.
5. **Forgetting filters** — If the table looks empty, check whether filters are applied. Click **Reset All Filters** to clear.

### Helpful Reminders

- **Upload History** keeps all uploads; you can switch between them anytime.
- **Chart, KPI cards, and filters work together** — A filter from the chart affects the table and KPIs.
- **Download** format matches the current view (Standard or Pivot).
- **Pivot View** is best for tracking changes across visits; **Standard View** is best for record-level review.

### Best Practices

1. **Name your exports clearly** — Use descriptive file names (e.g., `Study_X_MedCompliance_2025-02-13.csv`) so you can identify them in Upload History.
2. **Use KPI cards to prioritize** — Start with Missing Start Date, Missing Stop Date, or Missing Dose or Unit to find records that need follow-up.
3. **Use Pivot View for change tracking** — When you need to see how medications changed across visits, switch to Pivot View and use the Change Status filter.
4. **Filter before printing or downloading** — Reduces paper and file size.

---

## 6. Troubleshooting

### "No data to download" or "Please upload data first"

- **Cause:** No upload is selected or the table is empty.
- **Fix:** Upload a CSV file or select an upload from Upload History.

---

### "No matching columns found. Please ensure the CSV contains the required columns."

- **Cause:** The CSV does not have the expected column names.
- **Fix:** Ensure your CSV has columns such as SiteName, SubjectId, 1.CCSVT, 1.CCMED, 1.CCIND, 1.CC1, 1.CCUNIT, 1.CCFREQ, 1.CCSTDAT, 1.CMSTDATUN1, 1.CCSPDAT, 1.CCONGO1. The system matches names flexibly. If your export uses different names (e.g., "Medication Name" instead of "1.CCMED"), the system may not recognize them—contact support for column mapping help.

---

### "CSV file is empty"

- **Cause:** The CSV has no data rows.
- **Fix:** Add at least one data row to your CSV. Ensure the file is not corrupted.

---

### Some rows are missing from the upload

- **Cause:** Rows without a study visit value (1.CCSVT) are excluded.
- **Fix:** Ensure your CSV has a study visit value for each row you want to include.

---

### Table shows "No results found"

- **Cause:** Filters may be too strict.
- **Fix:** Click **Reset All Filters**. If it still shows nothing, try selecting a different upload from Upload History.

---

### Pivot View looks different from Standard View

- **Cause:** Pivot View groups data by patient + procedure date and spreads visit data across columns. Rows represent patient + medication combinations, not individual records.
- **Fix:** This is expected. Use Standard View for record-level data; use Pivot View for cross-visit comparison.

---

### Print or Download buttons are disabled

- **Cause:** No data is loaded.
- **Fix:** Upload a CSV file or select an upload from Upload History.

---

### When to Contact Support

- You cannot log in or access the module.
- Uploads fail repeatedly with the same file.
- Data in the table does not match your CSV file.
- Your CSV has different column names and you need help mapping them.
- You need to delete an upload and do not see the option.

**Tip:** When contacting support, include:
- A screenshot of the error or unexpected behavior
- The exact error message (if any)
- The name of the file you tried to upload
- A sample of your CSV headers (first 2 rows)
- What you were trying to do when the issue occurred

---

*This manual was written for first-time users of the Med Compliance module. If you have suggestions for improvements, please share them with your administrator.*
