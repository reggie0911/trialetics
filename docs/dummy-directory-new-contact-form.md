# Dummy data — New contact dialog (directory quick form)

Fictitious demo data only. Use when manually creating a person via **New contact** in the site contacts flow or equivalent directory quick-add (`QuickContactFormFields` inside [`components/ctms/directory/quick-contact-form-fields.tsx`](../components/ctms/directory/quick-contact-form-fields.tsx)). Submission is validated by [`directoryContactFormSchema`](../lib/validation/directory.ts) in [`site-contacts-panel`](../components/ctms/sites/site-contacts-panel.tsx) `onSubmitAdd`.

---

## Form fields (reference)

| UI section | Field / control | HTML `name` or mechanism | Required | Notes |
|------------|-----------------|--------------------------|----------|--------|
| Profile photo | Upload | — (upload sets `avatar_url` hidden) | No | Stored as `avatar_url`; must be **https** if set (Zod refine). |
| Identity | First name | `first_name` | **Yes** | |
| Identity | Last name | `last_name` | **Yes** | |
| Identity | Title | `title` | No | Free text; also used as fallback **site** role label if no primary role is chosen. |
| Contact | Email | `email` | No | If present, must look like an email. |
| Contact | Phone | `phone` (visible input + hidden) | No | Client formats via `formatPhoneNumber`; placeholder `+1 (555) 000-0000`. |
| Primary role (library) | Role category | React state `roleCategoryFilter` | No | Filters roles; empty = “All categories”. |
| Primary role (library) | Primary role | React state `primaryRoleId` | No | Maps to `primary_directory_role_id` (UUID or null). |
| Affiliation | Primary organization | `primary_institution_id` | No | Option value = institution UUID from your tenant. |
| Org details | Department | `department` | No | |
| Org details | Status | `status` | No (default **active**) | `active` \| `inactive`. |
| Location | Country | React state → `country_code` on submit | No | ISO alpha-2 (e.g. `US`, `DE`). |
| Location | Region / state | React state → `region` on submit | No | Dropdown when subdivisions exist; else free text. |
| Notes | Notes | `notes` | No | |
| Site panel only | Primary contact for this site | Checkbox (not in Zod) | No | Drives `is_primary` on `site_contacts` after directory row is created. |

**PI / “Add contact” intent (site panel):** Role category, primary role, and primary organization may be **prefilled and disabled**; country/region stay editable unless you add a separate lock.

**After submit:** Full name on the site row is `first_name` + `last_name`. Site `role` is derived from the selected directory role (PI normalized to `Principal Investigator`) or from **Title**, or the literal `Contact` if both are empty.

---

## How to use this doc

1. Open **New contact** on a study site (or directory flow using the same fields).
2. Pick **one persona** below and type values in; for **Primary organization**, choose the real institution row that matches the scenario (UUIDs are environment-specific — use the dropdown label).
3. For **Primary role**, pick the library row that matches the **Role (library)** column (name is stable; UUID is not).

---

## Persona A — US Principal Investigator (clinical site)

Use when testing the default PI workflow (clinical site category + PI role + site institution prefill if configured).

| Field | Value |
|--------|--------|
| First name | `Elena` |
| Last name | `Martinez` |
| Title | `MD, PhD` |
| Email | `elena.martinez.pi@example-clinical.org` |
| Phone | `+1 (555) 201-8844` |
| Role category | Clinical site |
| Primary role | Principal Investigator (PI) |
| Primary organization | *(select the site’s parent institution in the list, e.g. “Riverside University Medical Center”)* |
| Department | `Department of Medicine — Clinical Research` |
| Status | Active |
| Country | United States |
| Region / state | California |
| Notes | `Dummy PI for CTMS workflow testing. Not a real person.` |
| Primary contact for this site | Checked *(if shown)* |

---

## Persona B — Germany study coordinator (clinical site)

| Field | Value |
|--------|--------|
| First name | `Jonas` |
| Last name | `Weber` |
| Title | `Study Coordinator` |
| Email | `jonas.weber@example-klinikum.de` |
| Phone | `+49 30 55501234` |
| Role category | Clinical site |
| Primary role | Study Coordinator |
| Primary organization | *(match your German site / institution row)* |
| Department | `Klinische Forschung` |
| Status | Active |
| Country | Germany |
| Region / state | Bavaria |
| Notes | `Coordinator dummy record for multi-country site testing.` |

---

## Persona C — Sponsor CMO (minimal optional fields)

| Field | Value |
|--------|--------|
| First name | `Priya` |
| Last name | `Nair` |
| Title | *(leave empty or `Chief Medical Officer`)* |
| Email | `priya.nair@example-sponsor.com` |
| Phone | *(optional)* |
| Role category | Sponsor organization |
| Primary role | Chief Medical Officer (CMO) |
| Primary organization | *(sponsor-affiliated institution if listed)* |
| Department | `Global Development` |
| Status | Active |
| Country | United States |
| Region / state | *(optional)* |
| Notes | `Sponsor-side dummy contact.` |

---

## Persona D — Inactive vendor contact (edge case)

| Field | Value |
|--------|--------|
| First name | `Alex` |
| Last name | `Kim` |
| Title | `EDC Administrator` |
| Email | `alex.kim@example-vendor.io` |
| Phone | `+1 (555) 900-4411` |
| Role category | Technology & systems |
| Primary role | EDC Administrator |
| Primary organization | *(optional)* |
| Department | `Professional Services` |
| Status | **Inactive** |
| Country | *(optional)* |
| Region / state | *(optional)* |
| Notes | `Inactive dummy — use to test status + directory list filters.` |

---

## Validation reminders

- **First / last name** cannot be empty.
- **Email**, if filled, must be a simple valid shape (`local@domain.tld`).
- **Avatar URL** (after upload): must be `https://…` or omitted.
- **Primary role / institution IDs** must be valid UUIDs when set; pick from dropdowns only.

---

## File reference

| Artifact | Path |
|----------|------|
| Form UI | `components/ctms/directory/quick-contact-form-fields.tsx` |
| Site dialog submit | `components/ctms/sites/site-contacts-panel.tsx` |
| Zod schema | `lib/validation/directory.ts` |
