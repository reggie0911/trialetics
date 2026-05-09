# Faux data — Create New Study form

Fictional values for manual entry on **`/protected/studies/new`** ([`StudyForm`](../components/ctms/studies/study-form.tsx)). Use only in dev/demo; not a real protocol.

**Dates:** Start/end use the date picker or type ISO `yyyy-MM-dd` (the field displays like `15-Sep-2026`). Placeholder in the UI: `e.g. 15-Jan-2026`.

**Fill with Copilot:** The Copilot control on the first card applies **top-level study fields only** (not the structured “Study overview” grid). Paste overview fields manually or fill them after Copilot runs.

**Phase / status:** Must match app enums — phase exactly as written; status is the **dropdown label** (stored value in parentheses).

---

## Study Information (first card)

| UI label | Value to enter |
| --- | --- |
| Study name * | `TRI-NX-401` |
| Study title | `A Phase II, Open-Label, Multicenter Study of NX-401 in Participants With Heart Failure With Reduced Ejection Fraction` |
| Protocol Number | `TRI-HF-2026-401` |
| Phase | `Phase II` |
| Status | **Draft** (`draft`) |
| Therapeutic Area | `Cardiology` |
| Indication | `Heart failure with reduced ejection fraction (HFrEF), NYHA class II–III` |
| Sponsor (display name) | `Trialetics Demo Sponsor LLC` *(or leave company default if pre-filled)* |
| Start Date | `2026-06-01` *(or pick June 1, 2026 in calendar)* |
| End Date | `2027-12-15` |

**Description** (if shown on same page / next block — long text):

> NX-401 is a fictional once-daily oral modulator of myocardial energetics. This demo study evaluates change in NT-proBNP from baseline to week 24 and safety through week 52. Multicenter, open-label, single-arm design for UI testing only.

---

## Study overview (second card)

| UI label | Value |
| --- | --- |
| Study type | `Interventional` |
| Design | `Multicenter, open-label, single-arm` |
| Estimated enrollment | `180` |
| Study duration (months) | `18` |
| Population | `Adults ≥40 years with chronic HFrEF (LVEF ≤40%), stable guideline-directed medical therapy ≥30 days, NT-proBNP elevated per protocol thresholds.` |
| Primary objective | `To evaluate the change from baseline in NT-proBNP at week 24 with NX-401.` |
| Secondary objectives | Paste as separate lines in the multi-line control:<br>`Change from baseline in 6-minute walk distance at week 24.`<br>`Proportion of participants with ≥1 grade improvement in NYHA class at week 24.`<br>`Incidence and severity of adverse events through week 52.` |
| Regions | Select e.g. **US**, **CA**, **GB** *(match your country picker codes)* |
| Site count summary | `~18 sites: 12 US, 4 Canada, 2 UK (fictional).` |
| Site types | `Academic hospitals, community cardiology networks.` |
| Trip report — submission (days) | `5` |
| Trip report — approval (days) | `3` |
| Trip report days basis | **Calendar** *(or **Business** to test that option)* |

---

## Alternative set (dermatology — same form)

Use if you want a second demo study without colliding with the first.

| UI label | Value |
| --- | --- |
| Study name * | `AURIN-N211` |
| Study title | `A Randomized, Double-Blind, Placebo-Controlled Phase 2 Study of AUR-211 in Adult Participants With Moderate Atopic Dermatitis` |
| Protocol Number | `AUR-AD-2026-211` |
| Phase | `Phase II` |
| Status | **Draft** |
| Therapeutic Area | `Dermatology` |
| Indication | `Moderate atopic dermatitis (IGA 3) in adults 18–65 years` |
| Sponsor (display name) | `Aetheris BioPharma, Inc.` |
| Start Date | `2026-09-15` |
| End Date | `2028-03-31` |

---

## After the study exists

For sites, countries, and staff-style dummy rows, see [dummy-study-sites-staff.md](./dummy-study-sites-staff.md).

---

*All names, drugs, sponsors, and protocol IDs are fabrications for local testing.*
