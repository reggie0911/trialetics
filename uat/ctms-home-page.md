# User Acceptance Test Script — CTMS Home Page

**Page:** `/protected/clinical-trials`
**Component:** `CTMSHomePage`
**Module:** Clinical Trial Management System (CTMS)
**Date Prepared:** 2026-03-04

---

## Prerequisites

| # | Prerequisite | Details |
|---|---|---|
| P1 | Authenticated user | Tester is logged in with valid credentials |
| P2 | Company association | User profile is linked to an active company |
| P3 | Existing data | At least one clinical project (protocol) exists for the company |
| P4 | Test project | At least one project with `type = 'test'` exists |
| P5 | Browser | Modern browser (Chrome, Edge, Firefox, Safari) |

---

## Test Data

### Seed Projects (should exist before testing)

| # | Protocol Name | Protocol Number | Phase | Status | Type | Countries | Sites |
|---|---|---|---|---|---|---|---|
| D1 | Cardio Wellness Study | CWS-2026-001 | Phase III | In Progress | standard | 3 (United States, Germany, Japan) | 5 |
| D2 | Respiratory Efficacy Trial | RET-2026-042 | Phase II | Planned | standard | 2 (United Kingdom, Canada) | 3 |
| D3 | Oncology Biomarker Program | OBP-2025-118 | Phase I | On Hold | standard | 1 (United States) | 1 |
| D4 | Neuro Pilot Assessment | NPA-2026-TEST | Pilot Stage | Planning | test | 1 (Australia) | 0 |

### Expected Statistics (based on seed data)

| Card | Primary Value | Secondary Value |
|---|---|---|
| Total Projects | 4 | 1 active |
| Total Countries | 7 | — |
| Total Sites | 9 | (count of enrolling sites) |
| Project Groups | (count of programs) | — |

### Search Test Values

| Scenario | Input | Expected Matches |
|---|---|---|
| Exact protocol number | `CWS-2026-001` | Cardio Wellness Study |
| Partial name | `Resp` | Respiratory Efficacy Trial |
| Cross-field match | `OBP` | Oncology Biomarker Program |
| No match | `ZZZZNOTFOUND` | No projects found (empty state) |

### New Project — Happy Path

| Field | Value |
|---|---|
| Protocol Name | Dermatology Safety Extension |
| Protocol Number | DSE-2026-077 |
| Trial Phase | Phase IV |
| Protocol Status | Planning |
| Protocol Description | Open-label safety extension study evaluating long-term dermatologic outcomes in adult patients. |

### New Project — Country 1

| Field | Value |
|---|---|
| Country Name | United States |
| Region | North America |
| Planned Sites | 8 |
| Planned Subjects | 120 |
| Start Date | 2026-06-01 |
| End Date | 2028-05-31 |

### New Project — Country 2

| Field | Value |
|---|---|
| Country Name | Germany |
| Region | Europe |
| Planned Sites | 4 |
| Planned Subjects | 60 |
| Start Date | 2026-09-01 |
| End Date | 2028-08-31 |

### New Project — Country 3 (for removal test)

| Field | Value |
|---|---|
| Country Name | Brazil |
| Region | Latin America |
| Planned Sites | 2 |
| Planned Subjects | 30 |
| Start Date | 2027-01-01 |
| End Date | 2028-12-31 |

### New Project — Validation Failure

| Field | Value |
|---|---|
| Protocol Name | *(leave blank)* |
| Protocol Number | VAL-FAIL-001 |
| Trial Phase | Phase I |
| Protocol Status | Approved |

---

## UAT-01: Page Load & Header

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Navigate to `/protected/clinical-trials` | Page loads without errors | | |
| 2 | Observe the page header | Title reads **"Clinical Trial Management"** | | |
| 3 | Observe the subtitle | Subtitle reads **"Manage projects, countries, sites, and enrollment across your clinical trials"** | | |
| 4 | Observe the Module Navbar | Navigation bar with **Dashboard**, **CTMS**, **Trackers**, and **Analytics** dropdowns is visible in the header area | | |

---

## UAT-02: Statistics Cards

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Observe the stats row (4 cards) | Four stat cards are displayed in a horizontal grid | | |
| 2 | Verify **Total Projects** card | Shows **4** with secondary text **"1 active"** (only CWS-2026-001 is In Progress) | | |
| 3 | Verify **Total Countries** card | Shows **7** (US, Germany, Japan, UK, Canada, US duplicate collapsed, Australia) | | |
| 4 | Verify **Total Sites** card | Shows **9** with secondary text showing enrolling count (e.g., **"X enrolling"**) | | |
| 5 | Verify **Project Groups** card | Shows the total number of clinical programs configured for the company | | |
| 6 | Verify stat accuracy | Cross-reference displayed stats against the Expected Statistics table in Test Data | | |
| 7 | Resize window to tablet width (~768px) | Cards reflow to a 2-column grid | | |
| 8 | Resize window to mobile width (~375px) | Cards stack vertically in a single column | | |

---

## UAT-03: Search Functionality

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Locate the search input | A search input with placeholder **"Search projects..."** and a search icon is visible | | |
| 2 | Type `CWS-2026-001` into the search field | Only **Cardio Wellness Study** is shown in the table | | |
| 3 | Clear the field, then type `Resp` | Only **Respiratory Efficacy Trial** is shown | | |
| 4 | Clear the field, then type `OBP` | Only **Oncology Biomarker Program** is shown | | |
| 5 | Clear the field, then type `ZZZZNOTFOUND` | Empty state with folder icon and **"No projects found"** message | | |
| 6 | Clear the search field entirely | All projects (D1, D2, D3 on My Projects tab) are displayed again | | |
| 7 | Type `Neuro`, then switch to **My Test Projects** tab | Search persists; **Neuro Pilot Assessment** (D4, test type) is shown | | |

---

## UAT-04: New Project Button & Create Project Dialog

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Locate the **"New Project"** button | Button is visible in the top-right area with a **+** icon | | |
| 2 | Click **"New Project"** | A dialog/modal opens with the title **"Create Project"** | | |
| 3 | Verify form fields | The following fields are present: **Protocol Name** (required, marked with \*), **Protocol Number**, **Trial Phase** (dropdown), **Protocol Status** (dropdown defaulted to "Planning"), **Protocol Description** (textarea) | | |
| 4 | Verify Trial Phase dropdown options | Options include: Phase I, Phase II, Phase III, Phase IV, Pilot Stage, Pivotal, Post Market, Early Feasibility Study, First In-Human | | |
| 5 | Verify Protocol Status dropdown options | Options include: Planning, Approved, Closed | | |
| 6 | Verify Participating Countries section | A section labeled **"Participating Countries"** with an **"Add Country"** button is visible; one empty country entry row (labeled "Country 1") is shown by default | | |
| 7 | **Validation test:** Leave Protocol Name blank, enter Protocol Number `VAL-FAIL-001`, select Trial Phase **Phase I**, select Status **Approved** | The **Save** button remains disabled | | |
| 8 | Close the dialog (press Escape) and reopen it | All fields are blank/reset to defaults; Protocol Status is back to "Planning" | | |
| 9 | Enter Protocol Name: `Dermatology Safety Extension` | Save button becomes enabled | | |
| 10 | Enter Protocol Number: `DSE-2026-077` | Field accepts the value | | |
| 11 | Select Trial Phase: **Phase IV** | Dropdown shows "Phase IV" | | |
| 12 | Select Protocol Status: **Planning** | Dropdown shows "Planning" | | |
| 13 | Enter Protocol Description: `Open-label safety extension study evaluating long-term dermatologic outcomes in adult patients.` | Textarea accepts the multiline text | | |
| 14 | In Country 1: select Country Name **United States** | Region auto-populates to **North America** | | |
| 15 | Enter Planned Sites: `8`, Planned Subjects: `120`, Start Date: `2026-06-01`, End Date: `2028-05-31` | All fields accept values | | |
| 16 | Click **"Add Country"** | A second country entry row (labeled "Country 2") appears | | |
| 17 | In Country 2: select Country Name **Germany** | Region auto-populates to **Europe** | | |
| 18 | Enter Planned Sites: `4`, Planned Subjects: `60`, Start Date: `2026-09-01`, End Date: `2028-08-31` | All fields accept values | | |
| 19 | Click **"Add Country"** again | A third country entry row (labeled "Country 3") appears | | |
| 20 | In Country 3: select Country Name **Brazil**, verify Region auto-populates to **Latin America**, enter Planned Sites: `2`, Planned Subjects: `30`, Start Date: `2027-01-01`, End Date: `2028-12-31` | All fields accept values | | |
| 21 | Click the trash icon on Country 3 | Country 3 (Brazil) is removed; only Country 1 (US) and Country 2 (Germany) remain | | |
| 22 | Verify trash icon visibility | Country 1 and Country 2 both show a trash icon (since count > 1) | | |
| 23 | Click **Save** | A loading spinner with **"Saving..."** text appears; on success, toast shows **"Project created successfully!"** with description **"Dermatology Safety Extension has been added to your projects."**; the dialog closes | | |
| 24 | Verify the new project appears in the table | **DSE-2026-077** / **Dermatology Safety Extension** appears in the My Projects table with Phase **Phase IV**, Status **Planning**, Countries **2**, Sites **0** (no sites created yet, just planned) | | |
| 25 | Close the dialog without saving (click outside or press Escape) | The dialog closes and no project is created; form fields are reset | | |
| 26 | Reopen the dialog after closing | All form fields are blank/reset to defaults; one empty country row is shown | | |

---

## UAT-05: Tabs — My Projects

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Observe the tab bar | Four tabs are displayed: **My Projects**, **My Test Projects**, **Recent** (with clock icon), **Favorites** (with star icon) | | |
| 2 | Verify **My Projects** is the default active tab | The "My Projects" tab is selected/highlighted on page load | | |
| 3 | Observe the projects table | A table with columns **Project Number**, **Title**, **Phase**, **Status**, **Countries**, **Sites** is displayed | | |
| 4 | Verify table contains seed projects D1–D3 | Three rows visible: **CWS-2026-001** / Cardio Wellness Study, **RET-2026-042** / Respiratory Efficacy Trial, **OBP-2025-118** / Oncology Biomarker Program | | |
| 5 | Verify D4 is NOT shown | **NPA-2026-TEST** (Neuro Pilot Assessment, type=test) does not appear on this tab | | |
| 6 | Verify Phase badges | CWS-2026-001 shows **Phase III** (outline badge), RET-2026-042 shows **Phase II**, OBP-2025-118 shows **Phase I** | | |
| 7 | Verify Status badges | CWS-2026-001 shows **In Progress** (primary/default badge), RET-2026-042 shows **Planned** (secondary badge), OBP-2025-118 shows **On Hold** (secondary badge) | | |
| 8 | Verify Countries column | CWS-2026-001 shows **3**, RET-2026-042 shows **2**, OBP-2025-118 shows **1** (centered) | | |
| 9 | Verify Sites column | CWS-2026-001 shows **5**, RET-2026-042 shows **3**, OBP-2025-118 shows **1** (centered) | | |

---

## UAT-06: Tabs — My Test Projects

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Click the **My Test Projects** tab | Tab becomes active/highlighted | | |
| 2 | Observe the projects table | Only **NPA-2026-TEST** / **Neuro Pilot Assessment** (seed project D4, type=test) is displayed | | |
| 3 | Verify row details | Phase shows **Pilot Stage** (outline badge), Status shows **Planning** (secondary badge), Countries shows **1**, Sites shows **0** | | |
| 4 | Verify D1–D3 are NOT shown | Standard projects (CWS, RET, OBP) do not appear on this tab | | |

---

## UAT-07: Tabs — Recent

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Click the **Recent** tab | Tab becomes active/highlighted | | |
| 2 | Observe the content area | Recently accessed projects are displayed (or empty state if none) | | |

---

## UAT-08: Tabs — Favorites

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Click the **Favorites** tab | Tab becomes active/highlighted | | |
| 2 | Observe the content area | Favorited projects are displayed (or empty state if none) | | |

---

## UAT-09: Project Row Navigation

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Hover over the **Cardio Wellness Study** row | The row highlights with a hover effect and the cursor changes to a pointer | | |
| 2 | Click on the **Cardio Wellness Study** row | The user is navigated to `/protected/clinical-trials/project/{CWS-project-id}` | | |
| 3 | Verify context is set | The CTMS context shows project name **"Cardio Wellness Study"**, protocol number **"CWS-2026-001"**, status **"in_progress"** | | |
| 4 | Navigate back to the CTMS home page | The projects table is displayed again with all data intact; all 3 standard projects are visible on the My Projects tab | | |

---

## UAT-10: Loading State

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Refresh the page (or throttle network in DevTools) | While data is loading, a centered **"Loading projects..."** message is displayed in place of the table | | |
| 2 | After data loads | The loading message is replaced with the projects table or empty state | | |

---

## UAT-11: Empty State

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Ensure no projects exist for the active tab (e.g., use a search term that returns nothing) | An empty state with a folder icon and **"No projects found"** text is displayed | | |
| 2 | Verify the empty state is centered | The icon and text are vertically and horizontally centered in the content area | | |

---

## UAT-12: Module Navbar (Header Navigation)

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Click **Dashboard** in the module navbar | User navigates to `/protected/dashboard` | | |
| 2 | Click **CTMS** dropdown | A grouped dropdown appears with sections: **Home**, **Project**, **Finance**, **Administration**, **Other Tools** | | |
| 3 | Expand/collapse groups in the CTMS dropdown | Groups toggle between expanded and collapsed; **Home** and **Project** are expanded by default | | |
| 4 | Click **CTMS Home** in the dropdown | User navigates back to `/protected/clinical-trials` | | |
| 5 | Click **Trackers** dropdown | A dropdown with tracker links appears (MRace Tracker, AE Metrics, eCRF Query Tracker, SDV Tracker, Visit Window, Med Compliance) | | |
| 6 | Click **Analytics** dropdown | A dropdown with analytics links appears (Enrollment Forecasting, Financial Forecasting, KRI Monitor, Ad-Hoc Reports, Portfolio Overview, Resource Management) | | |
| 7 | Verify active state highlighting | The current page's nav item is highlighted with primary styling | | |

---

## UAT-13: Responsive Layout

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | View page at full desktop width (1400px+) | Content is centered with max-width of 1400px; stats cards in 4-column grid; all table columns visible | | |
| 2 | Resize to tablet width (~768px) | Stats cards reflow to 2 columns; table remains scrollable; layout adapts gracefully | | |
| 3 | Resize to mobile width (~375px) | Stats cards stack vertically; search input and New Project button stack; tabs remain accessible | | |
| 4 | Verify no horizontal overflow | No unexpected horizontal scrollbars at any viewport width | | |

---

## UAT-14: Error Handling

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Simulate a network failure (disconnect/throttle network in DevTools) and refresh the page | The page handles the error gracefully; no unhandled JavaScript errors in the console | | |
| 2 | Open the Create Project dialog, enter Protocol Name `Duplicate Test`, and attempt to create a project that triggers a server error | An error message is displayed in a red banner inside the dialog; a toast notification shows **"Failed to create project"** with a description of the error | | |
| 3 | After the error, verify the dialog remains open | The dialog stays open with all entered data preserved so the user can correct and retry | | |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Product Owner | | | |
| QA Lead | | | |
