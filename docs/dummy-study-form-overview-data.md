# Dummy data — Study form (Study overview card)

Values below match the **Study** create/edit form in `components/ctms/studies/study-form.tsx`: the **Study overview** card (“Protocol summary for the study detail page…”) plus the **General** fields on the same form so you can enter one complete fictitious study.

**Countries:** The multi-select stores **English country names** exactly as in the picker (same strings as `allIsoCountriesForSelectList()` / i18n-iso-countries).

**Trip report timing:** `Day count` must be **`calendar`** or **`business`** (UI labels: Calendar days, Business days).

---

## General study fields (first cards on the same form)

Use these if you are filling the whole form, not only Study overview.

| Form label | Value |
|------------|--------|
| Protocol number | `TRI-DEMO-204` |
| Study title | `AUR-204: A randomized, double-blind, placebo-controlled Phase II study of AUR-204 in adults with moderate chronic inflammatory disease` |
| Phase | `Phase II` |
| Therapeutic area | `Immunology` |
| Indication | `Moderate chronic inflammatory disease (demo indication)` |
| Status | `active` |
| Sponsor | `Demo Therapeutics Ltd.` |
| Sponsor institution | *(optional; link in UI if you have a directory org)* — leave **Not linked** unless seeded |
| Start date | `2026-01-15` |
| End date | `2028-06-30` |

**Description** (separate card at bottom of form):

```text
Demo-only protocol. Multicenter study evaluating maintenance therapy with AUR-204 versus placebo. Includes standard safety monitoring, central lab, and pharmacokinetic substudy at selected sites. All data are fictitious.
```

---

## Study overview card — field-by-field

| Form label | Value to enter |
|------------|----------------|
| **Study type** | `Interventional (Randomized, Double-blind, Placebo-controlled)` |
| **Design** | `Multicenter, Global, Parallel-group` |
| **Estimated enrollment** | `720` |
| **Study duration (months)** | `30` |
| **Population** | `Adults aged 18–75 years with moderate disease activity per demo criteria, stable background therapy for ≥8 weeks, and no recent biologic within prohibited window.` |
| **Primary objective** | `To compare the proportion of participants achieving demo-defined clinical response at Week 24 between AUR-204 and placebo.` |
| **Key secondary objectives** | Use one line per objective in the textarea (see block below). |
| **Countries** | Select: **United States**, **Germany**, **Brazil** |
| **Number of sites** | `9` |
| **Site type** | `Academic and community investigative sites; rheumatology / immunology clinics` |
| **Amount of days for report submission** | `14` |
| **Amount of days for report approval** | `7` |
| **Day count** | `calendar` *(Calendar days)* |

### Key secondary objectives (paste into textarea, one per line)

```text
Compare change from baseline in demo disease activity score at Week 24.
Evaluate safety and tolerability through end of study.
Characterize AUR-204 PK in a subset of participants at selected sites.
```

---

## Saved JSON shape (`overview` column) — reference only

If you are seeding or inspecting API/DB JSON, the app persists overview roughly like this (after save normalization):

```json
{
  "study_type": "Interventional (Randomized, Double-blind, Placebo-controlled)",
  "design": "Multicenter, Global, Parallel-group",
  "estimated_enrollment": 720,
  "study_duration_months": 30,
  "population": "Adults aged 18–75 years with moderate disease activity per demo criteria, stable background therapy for ≥8 weeks, and no recent biologic within prohibited window.",
  "primary_objective": "To compare the proportion of participants achieving demo-defined clinical response at Week 24 between AUR-204 and placebo.",
  "secondary_objectives": [
    "Compare change from baseline in demo disease activity score at Week 24.",
    "Evaluate safety and tolerability through end of study.",
    "Characterize AUR-204 PK in a subset of participants at selected sites."
  ],
  "study_sites": {
    "regions": ["United States", "Germany", "Brazil"],
    "site_count_summary": "9",
    "site_types": "Academic and community investigative sites; rheumatology / immunology clinics"
  },
  "trip_report_timing": {
    "report_submission_days": 14,
    "report_approval_days": 7,
    "days_basis": "calendar"
  }
}
```

> **Note:** The Study overview UI does **not** include separate inputs for `monitoring` (monitoring type, SDV, visit types); those exist on the `StudyOverview` schema in `lib/validation/study-overview.ts` for JSON/API use only unless added elsewhere.

---

## Cross-reference

Site- and staff-level dummy rows for a3-country × 3-site layout are in [dummy-study-multi-country-sites-staff.md](./dummy-study-multi-country-sites-staff.md) under the same protocol id `TRI-DEMO-204` for consistency.
