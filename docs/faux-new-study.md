# Faux data: Create New Study (`/protected/studies/new`)

Fictional values for **manual copy-paste** into the **StudyForm** (see [components/ctms/studies/study-form.tsx](components/ctms/studies/study-form.tsx)). Phases and status must match app enums. For sites, countries, and subjects after the study exists, use [dummy-study-sites-staff.md](dummy-study-sites-staff.md).

---

## Study information

| Field | Value |
| --- | --- |
| **Study name** | AURIN-N211 |
| **Study title** | A Randomized, Double-Blind, Placebo-Controlled Phase 2 Study of AUR-211 in Adult Participants With Moderate Atopic Dermatitis |
| **Protocol number** | AUR-AD-2026-211 |
| **Phase** | Phase II (must be one of: Phase I, Phase II, Phase III, Phase IV, Phase I/II, Phase II/III) |
| **Status** | draft |
| **Therapeutic area** | Dermatology — immunology |
| **Indication** | Moderate atopic dermatitis in adults 18–65 years (IGA 3) |
| **Sponsor** | *(Pre-filled from company when available, or:)* Aetheris BioPharma, Inc. |
| **Start date** | 2026-09-15 |
| **End date** | 2028-03-31 |

## Description (long text / protocol summary in UI)

AUR-211 is a small-molecule JAK1-selective inhibitor. This development program evaluates 12 weeks of induction therapy followed by a 40-week maintenance extension. Primary endpoint is the proportion of participants achieving IGA 0/1 at week 12. Blinded central review applies to all efficacy and safety image assessments. Fictional protocol; not for use in a real trial.

---

## Study overview (second section of the form)

| Field | Value |
| --- | --- |
| **Study type** | Interventional |
| **Design** | Randomized, double-blind, parallel-group, multicenter, placebo-controlled |
| **Estimated enrollment** | 240 |
| **Study duration (months)** | 24 |
| **Population** | Adults 18–65 with confirmed moderate atopic dermatitis (EASI 12–<21; IGA 3) for ≥6 months; inadequate response to emollients and topical corticosteroids. |
| **Primary objective** | To compare the proportion of participants achieving a validated response (IGA 0/1) at week 12 between AUR-211 and placebo. |
| **Secondary objectives** | One per line (paste in the “secondary objectives” box):<br>Change from baseline in EASI at week 12.<br>Proportion with ≥4-point NRS itch improvement at week 12.<br>Time to first moderate or severe AD flare in the extension.<br>Incidence of treatment-emergent adverse events and lab abnormalities through week 52. |
| **Regions (country codes)** | US, CA, DE, PL *(multi-select; use the same codes as the country picker in the app)* |
| **Site count summary** | ~24 sites: 10 US, 4 Canada, 6 Germany, 4 Poland (fictional allocation). |
| **Site types** | Academic medical centers, large dermatology private practices, dedicated phase II units. |
| **Trip report — submission (days)** | 7 |
| **Trip report — approval (days)** | 5 |
| **Trip report days basis** | calendar *(or `business` if you want to test that path)* |

---

## Quick one-block (plain text)

```
Study name: AURIN-N211
Title: A Randomized, Double-Blind, Placebo-Controlled Phase 2 Study of AUR-211 in Adult Participants With Moderate Atopic Dermatitis
Protocol: AUR-AD-2026-211
Phase: Phase II
Status: draft
Therapeutic area: Dermatology — immunology
Indication: Moderate atopic dermatitis in adults 18–65 years (IGA 3)
Sponsor: Aetheris BioPharma, Inc.
Start: 2026-09-15
End: 2028-03-31
```

---

*All product names, company names, and protocol identifiers are fabrications for local testing and demos.*
