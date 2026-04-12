# BrandForge — Brand Brief Wizard dummy data

Sample values for the **Brand Brief Wizard** (`BrandBriefWizard`): **Study Basics**, **Medical Context**, **Communication**, **Brand Direction**, and **Review & Submit**.  
Field names and option IDs match [`lib/types/brand-forge.ts`](../lib/types/brand-forge.ts) (`BrandBriefFormValues` / `brandBriefSchema`).

**Scenario:** Cardiovascular study focused on **microvascular obstruction (MVO)** in **ST-segment elevation myocardial infarction (STEMI)** patients, with patient- and site-facing materials.

---

## 1. Study Basics

| Field | Sample value |
|--------|----------------|
| Study name | MICRO-PATH — Microvascular obstruction after primary PCI in STEMI |
| Protocol number | CVRC-MVO-STEMI-301 |
| Tagline (optional) | Clear pathways for heart recovery after STEMI |
| Sponsor | Cordell Vascular Sciences AG |
| CRO | Baltic Heart Research Network |
| Phase | `phase-3` (Phase III) |
| Trial type | `interventional` |

---

## 2. Medical Context

| Field | Sample value |
|--------|----------------|
| Therapeutic area | `Cardiology` (must match a value from `THERAPEUTIC_AREAS`) |
| Indication | Microvascular obstruction (MVO) complicating STEMI despite successful primary percutaneous coronary intervention (PPCI) |
| Patient population | Adults ≥18 with anterior or large STEMI within 12 hours of symptom onset, post-PPCI, with imaging or biomarker criteria for MVO per protocol |
| Device or drug | `drug` |
| Severity | `severe` |
| Countries / regions (free-text tags) | `United States`, `Germany`, `Spain`, `Poland` |

---

## 3. Communication (Communication Goals step)

| Field | Sample value |
|--------|----------------|
| Target audience (IDs) | `patients`, `sites`, `investigators`, `internal-teams` |
| Communication goals (IDs) | `patient-recruitment`, `site-engagement`, `investigator-alignment`, `internal-branding` |
| Patient-facing branding | `true` (on) |

---

## 4. Brand Direction

| Field | Sample value |
|--------|----------------|
| Brand direction (IDs, 1–4) | `clinical`, `minimal`, `human-centered`, `premium` |
| Visual preference | `scientific-motif` |
| Keywords | `recovery`, `circulation`, `trust`, `timely care`, `evidence` |
| Preferred colors (hex, up to 6) | `#1B4965`, `#62B6CB`, `#BEE9E8`, `#FFFFFF`, `#0A192F` |

---

## 5. Review & Submit

No extra fields: confirm the summary matches sections 1–4, then submit.

---

## `BrandBriefFormValues` JSON (copy-paste)

```json
{
  "study_name": "MICRO-PATH — Microvascular obstruction after primary PCI in STEMI",
  "protocol_number": "CVRC-MVO-STEMI-301",
  "sponsor": "Cordell Vascular Sciences AG",
  "cro": "Baltic Heart Research Network",
  "phase": "phase-3",
  "trial_type": "interventional",
  "therapeutic_area": "Cardiology",
  "indication": "Microvascular obstruction (MVO) complicating STEMI despite successful primary percutaneous coronary intervention (PPCI)",
  "patient_population": "Adults ≥18 with anterior or large STEMI within 12 hours of symptom onset, post-PPCI, with imaging or biomarker criteria for MVO per protocol",
  "device_or_drug": "drug",
  "severity": "severe",
  "countries": ["United States", "Germany", "Spain", "Poland"],
  "communication_goals": ["patient-recruitment", "site-engagement", "investigator-alignment", "internal-branding"],
  "target_audience": ["patients", "sites", "investigators", "internal-teams"],
  "is_patient_facing": true,
  "brand_direction": ["clinical", "minimal", "human-centered", "premium"],
  "visual_preference": "scientific-motif",
  "preferred_colors": ["#1B4965", "#62B6CB", "#BEE9E8", "#FFFFFF", "#0A192F"],
  "keywords": ["recovery", "circulation", "trust", "timely care", "evidence"],
  "tagline": "Clear pathways for heart recovery after STEMI"
}
```

---

## Notes

- Indication copy stays **descriptive** (pathophysiology and setting), not promotional; align final public text with medical/regulatory review.
- If this study were **investigator-only** (no patient-facing assets), set `is_patient_facing` to `false` and trim `target_audience` / `communication_goals` accordingly.
