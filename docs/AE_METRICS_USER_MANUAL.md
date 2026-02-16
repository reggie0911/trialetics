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

- Upload AE data from CSV files
- View AE records in a table
- Filter and search by site, patient, category, and other fields
- See summary metrics (total AEs, serious AEs, resolved, deaths)
- View AE categories in a chart
- Print or download filtered data
- Customize column labels to match your terminology

### Who It Is For

- Clinical trial staff
- Safety monitors
- Data managers
- Anyone who needs to review and analyze adverse event data

---

## 2. Getting Started

### How to Access the Module

1. Log in to the application.
2. In the top navigation, open the **Trackers** menu.
3. Click **AE Metrics**.
4. You will see the AE Metrics page with the title "AE Metrics" and the subtitle "Upload and manage adverse event data."

### Overview of the Layout

The page is organized into these areas:

| Area | Location | Purpose |
|------|----------|---------|
| **Top toolbar** | Top of the page | Upload, customize headers, view upload history, print, download |
| **Filters** | Below the toolbar | Filter data by site, patient, category, and more |
| **KPI cards** | Below filters | Summary numbers (Total AEs, SAEs, Resolved, Deaths, % Resolved) |
| **AE Categories chart** | Below KPI cards | Bar chart of AE categories |
| **Adverse Events table** | Bottom | Detailed list of AE records |

### Key Areas of the Screen

- **Top toolbar:** Buttons for Upload AE Data, Customize Headers, Upload History, Print, and Download.
- **Filters:** A collapsible card with dropdown filters. Click the up/down arrow to expand or collapse.
- **KPI cards:** Five cards showing Total AEs, Total SAEs, Total Resolved, Death, and % Resolved.
- **AE Categories chart:** Bar chart where each bar is an AE category (e.g., "Headache," "Nausea").
- **Adverse Events table:** Table with columns such as Site Name, Patient ID, dates, and AE details.

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload Your First AE Data File

**Goal:** Import AE data from a CSV file.

1. Click the **Upload AE Data** button (blue button with upload icon).
2. In the dialog:
   - **Option A:** Drag and drop your CSV file onto the dashed area.
   - **Option B:** Click the dashed area to browse and select a file.
3. Wait while the file is parsed. A preview table will appear.
4. Check the preview. If you see "Successfully parsed X rows," the file was read correctly.
5. Click **Upload Data**.
6. Wait for the "Upload Successful" message.
7. The new upload is selected automatically and the data appears on the page.

**Example:** You have `study_123_ae_data.csv`. Drag it onto the upload area, wait for the preview, then click **Upload Data**. The table and charts will update with the new data.

**Required CSV columns:** The file must include columns that match these names (spelling and spacing can vary slightly):

- SiteName, SubjectId, AESTDAT, RWOSDAT, AESER, AESERCAT1, AEEXP, AEDECOD, AEOUT, IM_AEREL, IS_AEREL, DS_AEREL, LT_AEREL, PR_AEREL

If your CSV uses different headers, the system tries to match them. If you see "No matching columns found," check that your file has these columns.

---

### Workflow 2: Switch Between Different Uploads

**Goal:** View data from a different upload.

1. Click **Upload History** (History icon).
2. A panel opens showing all past uploads.
3. Each upload shows:
   - File name
   - Number of AE records
   - Number of columns
   - Date and time of upload
4. Click the upload you want to view.
5. The panel closes and the page updates with that upload's data.

**Example:** You have uploads from January and February. Open Upload History, click the February upload, and the table and charts switch to that dataset.

---

### Workflow 3: Filter Data to Find Specific Records

**Goal:** Narrow down the table to specific sites, patients, or AE types.

1. Expand the **Filters** card if it is collapsed.
2. Use the dropdowns:
   - **Site Name:** Filter by study site.
   - **Patient ID:** Filter by subject/patient.
   - **Category:** Filter by AE category (e.g., "Headache").
   - **Deaths:** Filter by death-related category.
   - **SAE/AE Status:** Filter by serious vs non-serious.
   - **Study Procedure - Causality:** Filter by relationship to study procedure.
   - **Outcome:** Filter by outcome (e.g., "Resolved").
3. Choose one or more filters. The table and charts update automatically.
4. To clear all filters, click **Reset All Filters**.

**Example:** To see only serious AEs from Site A, set Site Name to "Site A" and SAE/AE Status to "Serious."

---

### Workflow 4: Use KPI Cards to Filter

**Goal:** Quickly focus on serious AEs, resolved AEs, or deaths.

1. Look at the five KPI cards.
2. Click one of these cards:
   - **Total AEs:** Shows all records (no extra filter).
   - **Total SAEs:** Shows only serious adverse events.
   - **Total Resolved:** Shows only resolved AEs.
   - **Death:** Shows only death-related AEs.
3. The selected card is highlighted (green border).
4. The table and chart update to match.
5. Click the same card again to turn off that filter.

**Example:** Click **Total SAEs** to see only serious adverse events. Click it again to return to all AEs.

---

### Workflow 5: Filter Using the AE Categories Chart

**Goal:** Filter by AE category from the chart.

1. Look at the **AE Categories** bar chart.
2. Click a bar (e.g., "Headache").
3. The table shows only records for that category.
4. The chart shows "Filtered by: [category name]."
5. Click the **X** next to the filter text, or click the same bar again, to clear the filter.

**Example:** Click the "Nausea" bar to see only nausea-related AEs.

---

### Workflow 6: Filter Within the Table

**Goal:** Filter by a specific value in a column.

1. In the table header, each column has a dropdown under the column name.
2. Click the dropdown (it may say "All").
3. Choose a value (e.g., a specific site or patient).
4. The table updates to show only rows with that value.
5. Choose "All" to remove that column's filter.

---

### Workflow 7: Sort the Table

**Goal:** Order rows by a column.

1. Click a column header (e.g., "SubjectId" or "AEDECOD").
2. First click: ascending (A→Z, 1→9).
3. Second click: descending (Z→A, 9→1).
4. An arrow (↑ or ↓) shows the current sort direction.

---

### Workflow 8: Navigate Pages in the Table

**Goal:** Move through large datasets.

1. At the bottom of the table, find the pagination controls.
2. Use:
   - **First page (<<):** Go to page 1.
   - **Previous (<):** Go to previous page.
   - **Next (>):** Go to next page.
   - **Last page (>>):** Go to last page.
3. The text shows "Showing X to Y of Z results" and "Page N of M."

---

### Workflow 9: Customize Column Headers

**Goal:** Change column labels to match your terminology.

1. Click **Customize Headers** (gear icon).
2. In the dialog, each row has:
   - **Original:** The system column name (e.g., "AEDECOD").
   - **Custom label:** A text field for your preferred label.
3. Type your labels (e.g., "AE Category" instead of "AEDECOD").
4. Click **Save Changes**.
5. The table and exports will use your labels for future uploads.

**Reset:** Click **Reset to Default** to restore original names, then **Save Changes**.

---

### Workflow 10: Print or Download Data

**Goal:** Print or export the current view.

**Print:**

1. Apply any filters you want.
2. Click **Print**.
3. Your browser's print dialog opens.
4. Choose printer or "Save as PDF" and print.

**Download as CSV:**

1. Apply any filters you want.
2. Click **Download**.
3. A CSV file downloads (e.g., `ae_metrics_2025-02-13.csv`).
4. The file includes only the currently filtered data.

---

## 4. Feature Reference

| Feature | What It Does | When to Use It |
|---------|--------------|----------------|
| **Upload AE Data** | Imports AE data from a CSV file | When you have new or updated AE data |
| **Customize Headers** | Changes column labels in the table and exports | When you want friendlier or company-specific labels |
| **Upload History** | Lists past uploads and lets you switch between them | When you need to compare or review different datasets |
| **Filters** | Dropdown filters for site, patient, category, etc. | When you need to focus on a subset of data |
| **Reset All Filters** | Clears all filters | When you want to see the full dataset again |
| **KPI cards** | Shows totals and lets you filter by SAE, resolved, death | When you need quick safety summaries |
| **AE Categories chart** | Bar chart of AE categories; clickable to filter | When you want to explore by AE type |
| **Table column filters** | Dropdowns in each column header | When you need column-specific filtering |
| **Table sorting** | Click column headers to sort | When you want to order rows by a column |
| **Pagination** | Navigate through pages of rows | When the table has many rows |
| **Print** | Opens the browser print dialog | When you need a paper or PDF report |
| **Download** | Exports filtered data as CSV | When you need to share or analyze data in Excel |

---

## 5. Common Mistakes & Tips

### Common Mistakes

1. **Uploading a non-CSV file**  
   Only `.csv` files are supported. Convert Excel files to CSV first (Save As → CSV).

2. **CSV missing required columns**  
   If you see "No matching columns found," check that your CSV has the required column names (e.g., SiteName, SubjectId, AEDECOD).

3. **Headers in row 2**  
   If your CSV has a title in row 1 and headers in row 2, the system will try to use row 2. If it fails, move headers to row 1.

4. **Expecting filters to combine with "OR"**  
   Filters work with "AND": each filter narrows the results further. Use fewer filters if you get no results.

5. **Forgetting which upload is active**  
   Check Upload History; the current upload has a "Current" badge.

### Tips

- Start with **Upload AE Data**, then use **Upload History** to switch between datasets.
- Use **Customize Headers** early so labels are consistent for all users.
- Use **Reset All Filters** if the table is empty and you think filters are applied.
- KPI cards and chart filters can be combined with the main Filters panel.
- Long text in cells is truncated; hover to see the full value in a tooltip.

---

## 6. Troubleshooting

### "Upload AE Data" is grayed out

- You must be logged in and have a valid company/profile.
- If it stays disabled, log out and back in, or contact support.

### "No matching columns found" when uploading

- Ensure your CSV has the required columns (e.g., SiteName, SubjectId, AEDECOD).
- Check spelling and spacing; the system is case-insensitive but expects similar names.
- If your export uses different names, consider renaming columns in the CSV to match.

### Table shows "No results found"

- One or more filters may be too strict. Click **Reset All Filters**.
- If a KPI card is selected, click it again to clear that filter.
- If the chart shows "Filtered by: …," click the X to clear it.
- Check table column filters and set them to "All" if needed.

### Data looks wrong or incomplete

- Confirm the correct upload is selected in Upload History.
- Verify the source CSV has the expected data.
- Check that required columns are present and correctly named.

### Print or Download shows no data

- Print and Download use the currently filtered data.
- If the table is empty, clear filters first.
- Ensure at least one upload exists and is selected.

### Page is slow or unresponsive

- Large uploads can take time to load.
- Wait for the loading overlay to finish.
- If it persists, try a different browser or contact support.

### When to Contact Support

- Repeated upload failures.
- Data that should appear but does not.
- Errors that persist after logging out and back in.
- Questions about required CSV format or column names.

**Tip:** When contacting support, include:

- What you were doing (e.g., "Uploading CSV").
- Any error messages.
- A screenshot if possible.
- File format and approximate size (e.g., "CSV, ~500 rows").

---

*This manual is based on the AE Metrics Module as implemented in the Trialetics application. If you notice differences in your version, ask your administrator for an updated guide.*
