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

**Med Compliance** lets you upload, explore, and quality-check **medication compliance** rows from your trial (one row per patient–medication–study-visit line in **Standard View**, or a **Pivot View** with one row per patient + medication and columns per visit).

> **Medication compliance (in this module):** Fields such as site, patient, study visit, medication, indication, dose, unit, frequency, start/stop dates, ongoing status, and related flags.  
> **Study visit (chart & filter):** The value in the **study visit** column (`1.CCSVT` in the data); the **Study Visits** chart counts rows by this value.

### What It Helps You Do

- Upload MC CSV files *(company administrators: **Upload MC Data** and **Customize Headers**)*
- Use **Upload History** to switch snapshots; **Print** and **Download** when data is loaded
- Filter by **Site Name**, **Patient ID**, **Medication Name**, **Indication**, **Ongoing Status**, **Frequency**; in **Pivot View**, also **Change Status**
- Use **seven KPI cards** (all are clickable to narrow the table—toggle off by clicking again)
- Use the **Study Visits** horizontal bar chart; bar clicks filter the table by study visit
- Work in **Standard View** or **Pivot View** with sortable/filterable columns where the header provides controls

### Who It Is For

- Data managers, monitors, and study teams reviewing concomitant / compliance meds  
- **Company administrators** — full toolbar including upload and header customization  
- **Standard users** — history, filters, KPIs, chart, table, print, download; no upload or customize headers

---

## 2. Getting Started

### Access and permissions

1. Company **tracker access** enabled.  
2. **Med Compliance** enabled under **Custom** → **Study trackers**.  
3. Open **Custom** → **Study trackers** → **Med Compliance**, or **`/protected/mc`**.

**Title:** Med Compliance  
**Subtitle:** *Upload and manage medication compliance data*

### Toolbar

| Control | Admin | Standard user |
|---------|--------|----------------|
| **Upload MC Data** | Yes | Not shown |
| **Customize Headers** | Yes | Not shown |
| **Upload History** (+ count badge) | Yes | Yes |
| **Print** / **Download** | When `data` loaded | When `data` loaded |

### Layout (when data is loaded)

| Area | Purpose |
|------|---------|
| **Filters** | Collapsible card; **Reset All Filters** clears toolbar dropdowns, chart visit filter, KPI table filter, and **Change Status** (pivot) |
| **KPI cards** | Seven metrics (see below); all toggle a table filter |
| **Study Visits** | Horizontal bar chart by study visit; click bar to filter |
| **Medication Records** | **Standard View** / **Pivot View** toggle; table below |

### KPI vs chart vs table (important)

- **KPI numbers** are calculated from data after **toolbar filters only** (`topFilteredData`). They **do not** change when you only apply a **KPI card** filter, **chart** visit filter, or **column** filters.  
- The **Study Visits** chart is built from **`filteredData`** (toolbar + KPI + chart + column filters), so bar counts **do** change when you drill down.  
- The **table** always shows **`filteredData`**—the same rows **Download** uses (full filtered set, not just the current page).

---

## 3. Step-by-Step Workflows

### Workflow 1: Upload MC data (admin)

1. Click **Upload MC Data**.  
2. Dialog **Upload Medication Compliance CSV** — description notes that required headers may be on **row 2**.  
3. **Drop CSV file here or click to browse** (`.csv` only).  
4. Wait for **Parsing CSV file…**; fix errors if shown.  
5. Review preview table.  
6. Click **Upload Data**.  
7. Toast confirms; uploads refresh and the new upload is selected.

**Required columns** (headers matched flexibly—spaces/case ignored):

`SiteName`, `SubjectId`, `EventName`, `1.CCSVT`, `1.CCMED`, `1.CCIND`, `1.CC1`, `1.CCUNIT`, `1.CCFREQ`, `1.CCSTDAT`, `1.CMSTDATUN1`, `1.CCSPDAT`, `1.CCONGO1`

**Two header rows:** If **row 2** matches more required columns than row 1, the uploader uses **row 2 as headers** and **starts data at row 3** (row 1 treated as title).

**Row filter:** Rows with an empty **study visit** (`1.CCSVT`) are **dropped**.

After upload, the system may show additional columns (e.g. procedure date from protocol fields) in the app; exports use the fixed standard column set.

---

### Workflow 2: Upload History

1. **Upload History** opens **MC Upload History**.  
2. Rows show file name, **medication records** count, **columns** count, date/time, relative time.  
3. Click an upload to select it; sheet closes. **Current** badge on the active upload.

**Deleting uploads:** No delete control is shown in the list (confirm dialog exists in code without a trigger). Contact **administrator** or **support** to remove data.

---

### Workflow 3: Filters card

- **Labels:** Site Name, **Patient ID** (maps to `SubjectId`), Medication Name, Indication, **Ongoing Status**, Frequency. Placeholder **Choose an option…** means no filter on that field.  
- **Pivot View only — Change Status:** **All** | **Has Changes (Yes)** | **No Changes (No)** | **First Visit (-)** — keeps pivot rows where **any** visit cell has that change status.  
- Footer: **Viewing upload from …** or prompt to select an upload.  
- **Reset All Filters:** Clears all of the above plus chart visit filter and KPI table filter.

---

### Workflow 4: KPI cards (all seven clickable)

| Card | Table filter (toggle) |
|------|------------------------|
| **Total Medications** | No extra row filter (same as full toolbar-filtered set) |
| **Missing Start Date** | Empty **Start Date** (`1.CCSTDAT`) |
| **Start Date Unknown Flag** | **Start Date Unknown** is `Unknown` or `Y` |
| **Missing Stop Date** | Not **Ongoing** and **Stop Date** empty |
| **Missing Dose or Unit** | Missing **Dose** or **Unit** |
| **Invalid Frequency Entries** | **Frequency** present but does not contain any of: `QD`, `BID`, `TID`, `QID`, `PRN`, `1x`, `Other` (substring match) |
| **Med logs w/ Partial Data** | Some but not all of: Medication Name, Dose, Unit, Frequency, Start Date |

Selected card is **highlighted**; click again to clear that KPI filter.

---

### Workflow 5: Study Visits chart

- **Title:** Study Visits.  
- **Layout:** Horizontal bars, sorted by **count descending** (largest visit first). Long labels may be truncated on the axis.  
- **Click** a bar to filter the table to that study visit (column `1.CCSVT`); click again or use **Filtered by:** **X** to clear.  
- Other bars dim slightly while one visit is selected.

---

### Workflow 6: Standard View vs Pivot View

- Card title: **Medication Records**.  
- **Standard View** — one row per loaded medication record; multi-level column groups (e.g. Patient Info, Medication Details, Dates & Status).  
- **Pivot View** — one row per **site + patient + procedure date** combination (see transformer logic); dynamic columns per study visit with **Change Status** and other visit fields.  
- **Pagination:** **10** rows per page in both views.  
- **Download:**  
  - Standard: **`med_compliance_YYYY-MM-DD.csv`** with header row using **Customize Headers** labels.  
  - Pivot: **`med_compliance_pivot_YYYY-MM-DD.csv`** — two header rows (visit groups + field names); respects **Change Status** filter for which pivot rows are exported.

---

### Workflow 7: Print and Download

- **Print:** Browser print dialog.  
- **Download:** All rows matching **combined** filters (toolbar + KPI + chart + column filters); pivot export also applies **Change Status** when not **All**.

---

### Workflow 8: Customize Headers (admin)

- Button **Customize Headers** → **Customize Column Headers**.  
- **Save Changes**, **Reset to Default**, **Cancel**.

Default labels include uppercase styles (e.g. **SITE NAME**, **PATIENT ID**); you can relabel to your SOP.

---

## 4. Feature Reference

### Upload MC Data (admin)

**Upload Medication Compliance CSV**; **Upload Data** / **Cancel**; **Remove** file; parsing and validation messages.

### MC Upload History

Sheet title **MC Upload History**; **Current** badge; medication record counts.

### Filters

Collapsible **Filters**; six dropdowns in standard view; seventh **Change Status** in pivot; **Reset All Filters**.

### Study Visits chart

Recharts vertical-category bar chart; `Filtered by:` chip.

### Medication Records table

**Standard View** / **Pivot View**; client pagination; header sort/filter where implemented.

---

## 5. Common Mistakes & Tips

1. **“No matching columns”** — Align CSV headers with required names; try row 2 as technical header row.  
2. **Fewer rows than source file** — Rows without a study visit (`1.CCSVT`) are removed.  
3. **KPIs don’t move when I click the chart** — Expected: KPIs use toolbar filters only; chart and table use the tighter filter set.  
4. **Invalid frequency count** — Based on substring match to the allowed list above.  
5. **Change Status in Standard View** — The dropdown appears only in **Pivot View**.

---

## 6. Troubleshooting

### Empty state / “Select an upload from the history”

- Upload as admin or pick an upload in **Upload History**. Link: **Learn how to get started** → `/protected/docs/med-compliance`.

### Print / Download disabled

- No records loaded for the selected upload (`data.length === 0`).

### Cannot delete an upload in the UI

- Contact administrator or support.

### When to contact support

- Upload failures, obvious miscounts vs. source CSV, or access issues.

**Include:** screenshots, error text, file name, upload timestamp.

---

*Suggestions welcome through your administrator.*
