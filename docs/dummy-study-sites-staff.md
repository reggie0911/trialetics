# Dummy data: studies, sites, site staff, subjects, and eCRF

Use this for demos, copy-paste when filling **New Study** (`/protected/studies/new`), **Add/Edit site**, and **Add Subject** in the app, and when building the **eCRF Builder** (visits, CRFs, questions) on a study. All names and addresses are fictional.

Field names below match the UI in `components/ctms/studies/study-form.tsx` (StudyForm), `components/ctms/countries/country-form-dialog.tsx` (Add/Edit **Country** on a study), `components/ctms/countries/submission-form-dialog.tsx` (**Add Submission** / regulatory submission for a `study_country_id`), `components/ctms/sites/site-form.tsx` (SiteForm), `components/ctms/subjects/subject-form-dialog.tsx` (**Add Subject** / **Edit Subject** on the **Subjects** tab), and `components/ctms/study-forms/ecrf-dialogs.tsx` (**Add Visit**, **Create CRF**, **Add Question**).

---

## How this maps to the app

| Area | App location | Form fields (high level) |
| ---- | ------------ | ------------------------ |
| New study | **Study information** + **Study overview** + **Description** | `study_name`, `title`, `protocol_number`, `phase`, `status`, `therapeutic_area`, `indication`, `sponsor`, `start_date`, `end_date` + `overview.*` + `description` |
| Add country | Study detail → **Countries** → **Add Country** | `country` (select from `lib/data/countries` by ISO name), **Participation status** (`status`), **Regulatory status** (`regulatory_status`). The server stores `country_name` + `country_code` from the list (you do not type the name by hand on add). |
| Add regulatory submission | Study detail → **Countries** → per-country row → **Add Submission** | `submission_type`, `status` (required); `submission_date`, `approval_date`, `expiry_date` (HTML `date` inputs, optional); `reference_number`, `notes` (optional). Tied to that country’s `study_country_id` (and `study_id` on the server). |
| New site (per study) | Add site for that study | `site_number`, `name`, country (`study_country_id` — pick after **Add Country** rows exist), `address`, `city`, `state`, `postal_code`, `pi_name`, `pi_email`, `status`, `activation_date`, `target_enrollment` |
| New subject (per study) | Study detail → **Subjects** tab → **Add Subject** | `subject_number`, `site_id` (select shows `{site_number} — {name}`), optional `screening_number` / `randomization_number`, `status` (`SubjectStatus` enum; create default **Pre-Screening**), optional `screening_date` / `randomization_date` (HTML `date`, stored as `YYYY-MM-DD`). Server action: `createSubject` in `lib/actions/subjects.ts`. Zod: `components/ctms/subjects/subject-form-dialog.tsx` (`subjectSchema`). |
| eCRF: visit, CRF, questions | Study detail → **eCRF Builder** tab (company **admin** only) | **Visit:** `visit_name` (required), `timepoint_label` (optional), `timepoint_days` (optional, integer). `createStudyVisitDefinition` in `lib/actions/study-visit-definitions.ts`. **CRF:** `name` (required), `description` (optional), `visit_definition_id` (required — must match the visit you just created). `createStudyCrf` in `lib/actions/study-crfs.ts`. **Question:** `label`, `question_type` (`text` \| `textarea` \| `number` \| `date` \| `single_select` \| `multi_select` \| `yes_no`), `options` (required for select types), `required` checkbox. `createCrfQuestion` in `lib/actions/study-crfs.ts`. Zod: `ecrf-dialogs.tsx` (`visitSchema`, `crfSchema`, `questionSchema`). |

**Note:** The site form only has **PI name** and **PI email**. Sub-Investigator and **Coordinator** are **not** separate fields in `SiteForm`; they are included below for **directory/seed** scenarios (e.g. if you add contacts elsewhere).

**Required for create study (Zod):** `protocol_number`, `study_name` (max 500), `title`, `phase` (one of the Phase options).

**Required for create site (Zod):** `site_number`, `name`.

**Required for Add / Edit subject (Zod, `subjectSchema`):** `subject_number` (min length 1), `site_id` (min length 1 — must pick a site that exists on the study), `status` (min length 1). **Screening number**, **Randomization number**, and both dates are optional. On **Add Subject**, the form defaults `status` to `pre_screening` and `site_id` to empty until you select a site.

**Subject enrollment workflow (UI):**

1. Open the study (e.g. LUMINA-201 or CREST-45) from the studies list.
2. Go to the **Subjects** tab (`#study-detail-...-content-subjects` in the study hub).
3. Click **Add Subject** (toolbar next to **Import with Copilot** and **Bulk upload CSV** when the study is writable).
4. Fill **Subject Number** and **Site** (required). Optionally add screening/randomization numbers, change **Status**, and set **Screening Date** / **Randomization Date** (native date pickers → ISO in DB).
5. **Save** runs `createSubject`; success toast: “Subject enrolled”. The list and enrollment funnel refresh.
6. **Edit** on a row uses the same form with `updateSubject` (pencil in the subject row, when not read-only).

**Required for Add Country (Zod, `addSchema`):** `country_code` (a selected country from the list), `status`, `regulatory_status` (all three are required; defaults on open are typically **Planned** + **Not Started**).

**Required for Add Submission (Zod, `submissionSchema`):** `submission_type`, `status` (defaults to **Pending** for status on a new form). All date and text fields are optional. Dialog title: **Add Regulatory Submission**.

**Roll-up behavior:** after submissions are added/edited/deleted, country **Regulatory Status** is derived from child submission statuses:

- no submissions -> `not_started`
- any `rejected` -> `rejected`
- else any `pending` or `submitted` -> `in_progress`
- else all `approved` -> `approved`

---

## eCRF Builder (admin): workflow

The **eCRF Builder** tab is on the study detail page (`/protected/studies/{studyId}?tab=ecrf`). It is shown only to company **admin** users. Data is scoped to an **eCRF template version** (`study_ecrf_template_versions`). Visits, CRFs, and questions can only be added or edited when the **selected version’s status is `draft`**. If the study only has a **`live`** version, use **Versions** in the builder toolbar to **clone** to a new draft, then select that draft before **Add Visit** (see `components/ctms/study-forms/ecrf-tree.tsx` — `canEdit` requires `activeVersion.status === 'draft'`).

1. Open a study (e.g. LUMINA-201 or CREST-45) → **eCRF Builder** tab.
2. In the top bar, confirm the **template version** dropdown is a **draft** (or create/clone one). If **Add Visit** is disabled, the message explains that non-draft versions are read-only.
3. Click **Add Visit** (toolbar or empty-state **Add Visit** in the table). The **Add Visit** dialog (`VisitFormDialog`) saves via `createStudyVisitDefinition` with the current version id.
4. Expand the new visit row → **Add CRF** (or use the visit’s actions). The **Create CRF** dialog (`CrfFormDialog`) requires **CRF name** and **Visit** (the visit you created). Optional **Description**.
5. Expand the CRF row → **Add Question** (`QuestionFormDialog`). Pick the **CRF**, set **type**, **Required** if needed, and for **single_select** / **multi_select** add at least one **option** line each.
6. **Save** actions show toasts (“Visit added”, “CRF” created, “Question added”) and the tree refreshes.

**List label in the UI:** a visit’s row label uses `visitDisplayLabel` in `ecrf-dialogs.tsx`: build an array of `timepoint_label` (if any) and `Day {timepoint_days}` (if a number), join with ` · `, and if that array is non-empty show `{visit_name} - {joined}`. Example: **Visit name** `Screening`, **Timepoint label** `5 Year`, no **Timepoint (Days)** → **Screening - 5 Year**. With both label and days: **Screening - 5 Year · Day 1825**.

---

## eCRF demo — “Screening — 5 Year” (one visit, one CRF, four questions)

Use on **any** study where you have a **draft** eCRF template version (same study as the rest of this doc, or a scratch study). Create the **visit** first, then the **CRF** linked to it, then the **questions** on that CRF.

### 1) Visit (`Add Visit`)

| Field (UI) | Suggested value | Notes |
| ---------- | --------------- | ----- |
| Visit Name | `Screening` | Required. |
| Timepoint Label | `5 Year` | Optional; with no **Timepoint (Days)**, the row title shows **Screening - 5 Year**. |
| Timepoint (Days) | *(leave blank)* | Optional. For a “calendar day” anchor you could use e.g. `1825` (~5×365); omit for a clean **Screening - 5 Year** label only. |

### 2) CRF (`Add CRF` on that visit)

| Field (UI) | Suggested value |
| ---------- | --------------- |
| CRF name | `5-Year LTFU — Health & Malignancy` |
| Visit | `Screening - 5 Year` (select — matches the visit above) |
| Description | `Long-term follow-up: vital status, new primary malignancy, and survival updates at the 5-year timepoint.` |

### 3) Questions (`Add Question` on that CRF)

Add in order (types must match `QUESTION_TYPE_OPTIONS` / `questionSchema` in `ecrf-dialogs.tsx`).

| # | Question label | Type | Required | Options / notes |
| - | -------------- | ---- | -------- | ----------------- |
| 1 | `Is the participant known to be alive?` | Yes / No | Yes | — |
| 2 | `Date of last contact (if alive or lost to follow-up)` | Date | No | — |
| 3 | `New primary malignancy since last study contact?` | Single select | Yes | Options (one per line in the UI): `No` · `Yes` · `Unknown` |
| 4 | `Additional notes (hospitalization, SAE narrative, or loss to follow-up detail)` | Long text (`textarea`) | No | — |

> **Tip:** If **Add Visit** or **Create CRF** returns an error about the template version, switch to a **draft** version or clone the live version to a new draft, then retry.

---

## Study 1 — LUMINA-201

1. **New Study** (values below) → open the study.  
2. **Add Country** (Countries section) for each row in the table (before sites).  
3. (Optional) Per country, **Add Submission** to record IRB/EC/etc. (table below).  
4. If you use **Edit study** to set the overview **Countries** multiselect, add those countries first so the labels match.  
5. Add the three **sites** (U.S. only in this demo).  
6. On the **Subjects** tab, use **Add Subject** to enter the three demo subjects (table in **Subjects (3)** below).

### Study information (card)

| Field (UI) | Suggested value |
| ---------- | --------------- |
| Study name | LUMINA-201 |
| Study title | A Phase II, multicenter, open-label study of LUM-9 in relapsed or refractory indolent B-cell lymphoma. |
| Protocol number | LUM-201 |
| Phase | Phase II |
| Status | active |
| Therapeutic area | Oncology (Hematology) |
| Indication | Relapsed or refractory indolent B-cell lymphoma |
| Sponsor (display name) | *Your company / demo sponsor name* (create flow may prefill from org) |
| Start date (ISO) | 2025-01-15 |
| End date (ISO) | 2027-12-31 (optional) |

### Study overview (card)

| Field (UI) | Suggested value |
| ---------- | --------------- |
| Study type | Interventional, multicenter, open-label, Phase II |
| Design | Global, non-randomized, parallel assignment |
| Estimated enrollment | 120 |
| Study duration (months) | 30 |
| Population | Adults 18+ with relapsed or refractory indolent B-cell lymphoma, ECOG 0–1, life expectancy ≥ 12 weeks. |
| Primary objective | To assess overall response rate (ORR) per Lugano 2014. |
| Key secondary objectives (one per line) | To assess duration of response<br>To evaluate safety and tolerability |
| Countries (overview multiselect) | **United States**, **Canada** (add study countries in **Add Country** first; table is after **Description** below) |
| Number of sites | 3 (demo) |
| Site type | Community and academic medical centers. |
| Amount of days for report submission | 10 |
| Amount of days for report approval | 5 |
| Day count | calendar |

### Description (card)

Short paragraph for the **Description** field:

> LUMINA-201 evaluates the anti-lymphoma agent LUM-9 in patients with relapsed or refractory indolent B-cell lymphoma who have received at least one prior therapy. The study includes safety, efficacy, and pharmacokinetic objectives.

### Add Country (per row — `CountryFormDialog` add mode)

| Country (dropdown label) | `country_code` (ISO) | Participation status (value → UI) | Regulatory status (value → UI) |
| ------------------------- | ---------------------- | --------------------------------- | ------------------------------ |
| United States | US | `enrolling` → **Enrolling** | `approved` → **Approved** |
| Canada | CA | `planned` → **Planned** | `in_progress` → **In Progress** |

> Initial country regulatory status can be set at add time; after submission activity, the UI/API keeps it in sync using the roll-up rules above.

#### Add regulatory submission (per `study_country` — `SubmissionFormDialog`)

Open **Add Submission** on the row for the country. Use one row from the table for each **Add Submission** you add (you can add multiple per country; this guide shows one per country for demo).

| For country | Submission type (value → UI) | Status (value → UI) | Submission date | Approval date | Expiry date | Reference # | Notes |
| ----------- | ---------------------------- | -------------------- | --------------- | ------------- | ----------- | ----------- | ----- |
| **United States** | `IRB` → **IRB** | `approved` → **Approved** | 2025-01-22 | 2025-02-10 | 2026-02-10 | LUM-201-CENTRAL-IRB-1042 | Main protocol IRB; all U.S. demo sites. |
| **Canada** | `EC` → **Ethics Committee** | `submitted` → **Submitted** | 2025-04-15 | (leave blank) | 2026-04-15 (optional) | HREBA 2025-LUM-044 | Awaiting REB full approval. |

### Sites (3) — `SiteForm` values + PI

After **Add Country**, add each site. The site form’s **country** field is the study country row: pick **United States** so `study_country_id` matches the US `study_countries` row.

| Site # | Name | Country (pick) | Address | City | State | ZIP | Status | Target enrollment | PI name | PI email | Activation date (if activated) |
| ------ | ---- | -------------- | ------- | ---- | ----- | --- | ------ | ----------------- | ------- | -------- | ------------------------------- |
| 101 | Northeast Clinical Research | United States | 400 Longwood Ave | Boston | MA | 02215 | enrolling | 20 | Dr. Sarah Chen | sarah.chen@northeastcr.org | 2025-03-01 |
| 102 | Great Lakes Medical Center | United States | 200 E Superior St | Chicago | IL | 60611 | enrolling | 20 | Dr. Robert Okonkwo | r.okonkwo@glmed.org | 2025-03-15 |
| 103 | Pacific West Oncology | United States | 500 Broadway | Seattle | WA | 98122 | enrolling | 20 | Dr. David Nakamura | d.nakamura@pwo.com | 2025-04-01 |

#### Extended site contacts (not in `SiteForm` — demo / directory / seed)

| Site # | Sub-Investigator | Email | Study Coordinator | Email |
| ------ | ---------------- | ----- | ----------------- | ----- |
| 101 | Dr. Michael Torres | m.torres@northeastcr.org | Jamie Patel | jpatel@northeastcr.org |
| 102 | Dr. Emily Voss | e.voss@glmed.org | Alex Rivera | arivera@glmed.org |
| 103 | Dr. Lisa Park | l.park@pwo.com | Morgan Lee | mlee@pwo.com |

### Subjects (3) — `SubjectFormDialog` (LUMINA-201)

Add these after the three sites exist. In **Add Subject**, pick **Site** using the same **Site #** as in the sites table (dropdown label: `{site_number} — {name}`).

| Subject number | Site (pick in UI) | Screening # | Randomization # | Status (`value` → UI) | Screening date (ISO) | Randomization date (ISO) |
| -------------- | ----------------- | ----------- | --------------- | --------------------- | --------------------- | -------------------------- |
| LUM-S-001 | 101 — Northeast Clinical Research | (blank) | (blank) | `pre_screening` → **Pre-Screening** | (blank) | (blank) |
| LUM-S-002 | 102 — Great Lakes Medical Center | SCR-LUM-002 | (blank) | `screening` → **Screening** | 2025-04-10 | (blank) |
| LUM-S-003 | 103 — Pacific West Oncology | SCR-LUM-003 | RND-LUM-003 | `randomized` → **Randomized** | 2025-05-01 | 2025-05-15 |

---

## Study 2 — CREST-45

Same order as LUMINA-201: create study → **Add Country** (below) → (optional) **Add Submission** per country → (optional) overview countries → U.S. sites → **Subjects** (two demo subjects in **Subjects (2)** below).

### Study information (card)

| Field (UI) | Suggested value |
| ---------- | --------------- |
| Study name | CREST-45 |
| Study title | A Phase III, randomized, double-blind, placebo-controlled study of CREST-MAB in combination with standard of care in metastatic colorectal adenocarcinoma. |
| Protocol number | CRS-45 |
| Phase | Phase III |
| Status | active |
| Therapeutic area | Oncology |
| Indication | Metastatic colorectal adenocarcinoma |
| Sponsor (display name) | *Your company / demo sponsor name* |
| Start date (ISO) | 2025-06-01 |
| End date (ISO) | 2029-05-31 (optional) |

### Study overview (card)

| Field (UI) | Suggested value |
| ---------- | --------------- |
| Study type | Interventional, randomized, double-blind, placebo-controlled, Phase III |
| Design | Multicenter, global, parallel-group |
| Estimated enrollment | 850 |
| Study duration (months) | 36 |
| Population | Adults 18+ with histologically confirmed mCRC, measurable disease, ECOG 0–1, prior no more than 2 prior lines in metastatic setting (per protocol). |
| Primary objective | To compare overall survival (OS) between CREST-MAB + SoC and placebo + SoC. |
| Key secondary objectives (one per line) | PFS (investigator-assessed)<br>ORR and DOR per RECIST 1.1 |
| Countries (overview multiselect) | **United States**, **United Kingdom**, **Germany** (add via **Add Country** first; see section below) |
| Number of sites | 3 (demo) |
| Site type | NCI-designated and community cancer centers. |
| Amount of days for report submission | 14 |
| Amount of days for report approval | 7 |
| Day count | business |

### Description (card)

> CREST-45 is a registrational Phase III program evaluating the monoclonal antibody CREST-MAB with standard of care in patients with metastatic colorectal adenocarcinoma. The trial includes a global footprint with centralized imaging review and a defined trip-report timing policy for monitoring visits.

### Add Country (per row — `CountryFormDialog` add mode)

| Country (dropdown label) | `country_code` (ISO) | Participation status (value → UI) | Regulatory status (value → UI) |
| ------------------------- | ---------------------- | --------------------------------- | ------------------------------ |
| United States | US | `enrolling` → **Enrolling** | `approved` → **Approved** |
| United Kingdom | GB | `regulatory_submitted` → **Regulatory Submitted** | `in_progress` → **In Progress** |
| Germany | DE | `approved` → **Approved** | `approved` → **Approved** |

> After any submission changes, these country regulatory values are recomputed from submission statuses.

Use **United States** for the three demo U.S. sites; **United Kingdom** and **Germany** back the global footprint in the study overview. Set the overview **Countries** multiselect to all three, or a subset, to match what you want on the study detail.

#### Add regulatory submission (per `study_country` — `SubmissionFormDialog`)

| For country | Submission type (value → UI) | Status (value → UI) | Submission date | Approval date | Expiry date | Reference # | Notes |
| ----------- | ---------------------------- | -------------------- | --------------- | ------------- | ----------- | ----------- | ----- |
| **United States** | `IRB` → **IRB** | `approved` → **Approved** | 2025-06-10 | 2025-07-01 | 2026-07-01 | CRS-45-IRB-DART-201 | Central IRB, annual renewal. |
| **United Kingdom** | `regulatory_approval` → **Regulatory Approval** | `submitted` → **Submitted** | 2025-08-20 | (blank) | (blank) | MHRA 28473/0001 | CTA under assessment. |
| **Germany** | `EC` → **Ethics Committee** | `approved` → **Approved** | 2025-09-01 | 2025-09-20 | 2026-09-20 | 25/887 Kölner LEK | Favorable opinion; national trial. |
| (optional) **United States** | `import_license` → **Import License** | `pending` → **Pending** | (blank) | (blank) | (blank) | *TBD* | Second row, same `study_country`: multiple submissions per country. |

The last row is **optional** — it only documents that the UI allows more than one submission for the same country; skip it for a minimal demo.

### Sites (3) — `SiteForm` values + PI

All three sites use the **United States** study country from **Add Country** (`study_country_id` → that row).

| Site # | Name | Country (pick) | Address | City | State | ZIP | Status | Target enrollment | PI name | PI email | Activation date (if activated) |
| ------ | ---- | -------------- | ------- | ---- | ----- | --- | ------ | ----------------- | ------- | -------- | ------------------------------- |
| 201 | Heartland University Hospital | United States | 1800 Inwood Rd | Dallas | TX | 75390 | enrolling | 35 | Dr. Patricia Nguyen | p.nguyen@huh-tx.org | 2025-08-01 |
| 202 | River Valley Cancer Institute | United States | 3501 Civic Center Blvd | Philadelphia | PA | 19104 | enrolling | 30 | Dr. Angela Moretti | a.moretti@rvci.org | 2025-08-20 |
| 203 | Mountain View Health System | United States | 1400 N Ogden St | Denver | CO | 80218 | enrolling | 30 | Dr. Victor Hassan | v.hassan@mvhsp.org | 2025-09-10 |

#### Extended site contacts (not in `SiteForm` — demo / directory / seed)

| Site # | Sub-Investigator | Email | Study Coordinator | Email |
| ------ | ---------------- | ----- | ----------------- | ----- |
| 201 | Dr. James O'Brien | j.obrien@huh-tx.org | Sam Williams | swilliams@huh-tx.org |
| 202 | Dr. Kevin Brown | k.brown@rvci.org | Rina Shah | rshah@rvci.org |
| 203 | Dr. Nina Kowalski | n.kowalski@mvhsp.org | Chris Ortiz | cortiz@mvhsp.org |

### Subjects (2) — `SubjectFormDialog` (CREST-45)

| Subject number | Site (pick in UI) | Screening # | Randomization # | Status (`value` → UI) | Screening date (ISO) | Randomization date (ISO) |
| -------------- | ----------------- | ----------- | --------------- | --------------------- | --------------------- | -------------------------- |
| CRS-S-001 | 201 — Heartland University Hospital | SCR-CRS-001 | RND-CRS-001 | `active` → **Active** | 2025-10-01 | 2025-10-22 |
| CRS-S-002 | 202 — River Valley Cancer Institute | SCR-CRS-002 | (blank) | `pre_screening` → **Pre-Screening** | (blank) | (blank) |

---

## Quick summary

| Study     | Protocol (example) | Add Country rows (demo) | Phases in form | Sites | Subjects (demo) | eCRF demo (optional) | Site form PI fields | Extra staff rows |
| --------- | ------------------ | ----------------------- | -------------- | ----- | --------------- | -------------------- | ------------------- | ---------------- |
| LUMINA-201 | LUM-201           | 2 (US, Canada)         | Phase II      | 3     | 3               | Screening — 5 Y + 1 CRF + 4 Q (draft version) | 1 per site         | 2 (Sub-I, Coord) per site (see tables) |
| CREST-45  | CRS-45             | 3 (US, UK, DE)         | Phase III     | 3     | 2               | same eCRF block, any draft study        | 1 per site         | 2 (Sub-I, Coord) per site (see tables) |

**Total:** 2 studies, 5 `study_countries` rows in this guide (2 + 3), **5** example regulatory `submission` rows in the main tables (2 for LUMINA-201, 3 for CREST-45) plus 1 optional extra U.S. import-license row, 6 site records, **5** example subject records (3 + 2), 6 PIs in site forms, 12 extended contact rows (Sub-I + Coordinator) for non–site-form use. **eCRF:** 1 example visit, 1 CRF, 4 questions documented above (reusable on either study with a **draft** template).

---

## Zod / enum reference (from code)

- **Phase:** `Phase I` | `Phase II` | `Phase III` | `Phase IV` | `Phase I/II` | `Phase II/III`
- **Study status:** `draft` | `active` | `completed` | `closed` | `on_hold`
- **Site status:** `identified` | `selected` | `initiated` | `activated` | `enrolling` | `closed` (form defaults to `identified`)
- **Trip report day count:** `calendar` | `business` (`overview.trip_report_days_basis`)
- **Study country — participation status:** `planned` | `regulatory_submitted` | `approved` | `enrolling` | `closed` (UI: Planned, Regulatory Submitted, Approved, Enrolling, Closed)
- **Study country — regulatory status:** `not_started` | `in_progress` | `approved` | `rejected` (UI: Not Started, In Progress, Approved, Rejected)
- **Regulatory submission — type:** `IRB` | `EC` | `import_license` | `regulatory_approval` (UI: IRB, Ethics Committee, Import License, Regulatory Approval)
- **Regulatory submission — status:** `pending` | `submitted` | `approved` | `rejected` (UI: Pending, Submitted, Approved, Rejected)
- **Subject — status** (`SubjectStatus`, `SUBJECT_STATUS_OPTIONS` in `lib/types/ctms.ts`): `pre_screening` | `screening` | `screen_failed` | `randomized` | `active` | `completed` | `withdrawn` | `discontinued` (UI: Pre-Screening, Screening, Screen Failed, Randomized, Active, Completed, Withdrawn, Discontinued)
- **eCRF question type** (`QuestionType` / `QUESTION_TYPE_OPTIONS` in `lib/types/ctms.ts`): `text` | `textarea` | `number` | `date` | `single_select` | `multi_select` | `yes_no` (UI matches labels in **Add Question**)
