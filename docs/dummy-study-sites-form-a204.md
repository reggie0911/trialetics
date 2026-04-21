# Dummy data — Add Site form (3 sites) for AUR-204

Fictitious demo data only. Use when manually entering sites via **Study → Sites → Add Site** (`/protected/studies/[id]/sites/new`). Field names match [`components/ctms/sites/site-form.tsx`](../components/ctms/sites/site-form.tsx).

---

## Form fields (reference)

| Form section | Field | Required | Notes |
|--------------|--------|----------|--------|
| Site Information | Site number | Yes | e.g. `SITE-001` |
| Site Information | Site name | Yes | |
| Site Information | Country | If study has countries | Maps to `study_country_id` (UUID of a row on the **Countries** tab). |
| Site Information | Status | Optional (default Identified) | `identified` \| `selected` \| `initiated` \| `activated` \| `enrolling` \| `closed` |
| Location | Address, City, State/Province, Postal code | Optional | |
| Principal Investigator | PI Name, PI Email | Optional | |
| Principal Investigator | Principal investigator (directory) | Optional | Use **Not linked** for dummy entry. |
| Enrollment & Timeline | Target enrollment | Optional | Non-negative integer (form allows0). |
| Enrollment & Timeline | Activation date | Optional | HTML `type="date"` → **`YYYY-MM-DD`**. |

**Country picker:** After you have **Countries (3)** on the study, open the **Country** dropdown and pick the row that matches the **Study country** column below (label shows `Country name (XX)`). The stored value is the internal `study_countries.id`, not the code.

---

## Study context (matches your AUR-204 example)

| | |
|--|--|
| **Protocol** | AUR-204 |
| **Display title** | A randomized, double-blind, placebo-controlled Phase II study of AUR-204 in adults with moderate chronic inflammatory disease |

Assume the three study countries are **United States (US)**, **Germany (DE)**, and **United Kingdom (GB)** — adjust the **Country** dropdown if your three rows differ.

---

## Site 1 — US academic center

| Field | Value |
|--------|--------|
| **Site number** | `AUR-204-101` |
| **Site name** | Riverside University Medical Center — Clinical Research Unit |
| **Country** | United States (US) |
| **Status** | Selected |
| **Address** | 2100 Clinical Trials Way, Building C |
| **City** | Philadelphia |
| **State / Province** | PA |
| **Postal code** | 19104 |
| **PI name** | Dr. Amanda Chen |
| **PI email** | amanda.chen@demo-rumc.example |
| **Principal investigator (directory)** | Not linked |
| **Target enrollment** | 18 |
| **Activation date** | *(leave empty)* or `2026-05-01` if you want a sample date |

---

## Site 2 — Germany hospital

| Field | Value |
|--------|--------|
| **Site number** | `AUR-204-201` |
| **Site name** | Klinikum Nordwest — Studienzentrum Immunologie |
| **Country** | Germany (DE) |
| **Status** | Initiated |
| **Address** | Haus12, Forschungsallee8 |
| **City** | Frankfurt am Main |
| **State / Province** | Hessen |
| **Postal code** | 60431 |
| **PI name** | Prof. Dr. Klaus Weber |
| **PI email** | klaus.weber@demo-knwest.example |
| **Principal investigator (directory)** | Not linked |
| **Target enrollment** | 14 |
| **Activation date** | *(leave empty)* or `2026-06-15` |

---

## Site 3 — UK NHS trust

| Field | Value |
|--------|--------|
| **Site number** | `AUR-204-301` |
| **Site name** | Meridian NHS Foundation Trust — Phase II Unit |
| **Country** | United Kingdom (GB) |
| **Status** | Identified |
| **Address** | Jenner Wing, 90 Hospital Road |
| **City** | Manchester |
| **State / Province** | England |
| **Postal code** | M13 9WL |
| **PI name** | Dr. Sarah Okonkwo |
| **PI email** | sarah.okonkwo@demo-meridian-nhs.example |
| **Principal investigator (directory)** | Not linked |
| **Target enrollment** | 12 |
| **Activation date** | *(leave empty)* |

---

## Quick copy blocks (status values for automation / notes)

If you script inserts instead of the form, status must be one of:

`identified`, `selected`, `initiated`, `activated`, `enrolling`, `closed`

Suggested progression across the three rows above: **selected** → **initiated** → **identified** to show mixed pipeline states on the Sites tab.

---

## Copilot note

The create form exposes **Fill with Copilot** (`schemaId: ctms.site-activation`). These tables are still valid manual QA data; Copilot is optional.
