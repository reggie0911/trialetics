# Directory role assignment assessment (badges and CTAs)

This document implements the audit described in the Directory role assignment plan: three role layers, UI wiring, database checks, RLS/API notes, manual verification matrix, gaps, and conclusions.

## 1. Frozen scenario (template)

Use this template when reproducing “conflicting” badges on `/protected/directory/contacts/[id]`.

| Field | Where it appears in UI | DB column / join |
|--------|----------------------|------------------|
| Primary Role (Library) | Profile card — “Primary Role (Library)” | `directory_contacts.primary_directory_role_id` → `primary_role` |
| Your Role in Study | Study Context card; Study & Site Assignments — “Your Role in Study” | `directory_contact_study.directory_role_id` on the **picked primary study row** → `directory_roles` |
| Role per study row | Study Assignments table — “Role” column | Same junction table, **per row** |
| Site-level role | Site Assignments table / dialogs | `directory_contact_study_site.directory_role_id` |

**Primary study selection** (which `directory_contact_study` row drives Study Context): [`pickPrimaryStudyRow`](components/ctms/directory/directory-contact-detail-client.tsx) — `searchParams.from` study id if present and linked; else first row with `is_active`; else first row.

**Canonical “looks broken but is consistent” scenario**

1. User sets **Primary Role** to e.g. Sub-Investigator (library).
2. User links a study via **Link study** with **Role = None** (`StudyLinkDialog` allows `<option value="">None</option>`).
3. **Profile** shows Sub-Investigator; **Study Context** / **Study Assignments** show destructive **“No study role”** for that study row because `directory_contact_study.directory_role_id` is NULL (copy distinguishes study junction from library primary).

No live contact ID is recorded here; replace `CONTACT_UUID` / `COMPANY_UUID` in [`supabase/scripts/assess_directory_role_assignments.sql`](../supabase/scripts/assess_directory_role_assignments.sql) when validating a specific tenant.

## 2. Database verification

Run the script above after substituting UUIDs.

Expected alignment:

- Profile badge ↔ `primary_directory_role_id` + join name.
- Study surfaces ↔ each `directory_contact_study` row’s `directory_role_id` (independent of primary).

Aggregate queries in the script report:

- How many study links have `directory_role_id IS NULL`.
- How many contacts have a non-null library primary but at least one study link with null study role (expected if linking with “None” is allowed).

## 3. API / RLS

### Server read path

[`getDirectoryContactById`](lib/actions/directory-contacts.ts) selects:

- `primary_role:directory_roles!…`
- `directory_contact_study` with `directory_roles(id,name)`
- `directory_contact_study_site` with `directory_roles(id,name)`

PostgREST nested selects return related rows when FK and RLS allow it.

### RLS notes

- **`directory_roles`**: [`20260501000000_directory_role_catalog_rls_authenticated.sql`](../supabase/migrations/20260501000000_directory_role_catalog_rls_authenticated.sql) — `SELECT` for `authenticated` with `USING (true)`. Catalog reads used for joins and dropdowns should not be empty solely due to company scoping.
- **`directory_contact_study`**: Policies in [`20260335000000_ctms_directory.sql`](../supabase/migrations/20260335000000_ctms_directory.sql) scope rows by contact/study belonging to the user’s `profiles.company_id`. If junction rows are visible in the UI but `directory_roles` nested objects were null while `directory_role_id` is non-null in DB, investigate FK integrity or a rare policy mismatch — not observed in code review.

Conclusion for **RLS vs “missing role name”**: Empty nested `directory_roles` when `directory_role_id` is set would be abnormal; destructive badges with **null** `directory_role_id` match schema and UI.

## 4. Manual UI matrix (checklist)

Perform in a dev/staging session with `canEdit` true.

| Step | Expected |
|------|----------|
| Edit profile — set Primary Role (Library) | Profile shows role badge; completeness may show role done |
| **Link study** — dialog opens | Role dropdown **defaults to Primary Role (Library)** when set; helper text explains choosing **None** to link without a study role |
| Link study — choose a concrete **Role** (or keep default) | Study Assignments “Role” column and “Your Role in Study” show that role |
| Link study — choose **None** | Same columns show **“No study role”** — allowed by UI |
| **Assign / Edit study role** (Study Context, Study & Site Assignments, Study Assignments row pencil, Quick Actions when a primary study exists) | Opens **`StudyLinkRoleDialog`**, saves via `upsertContactStudyLink` **with** `id` (junction row update) |
| Fix study role after link exists without removing row | Use **Edit study role**, **Assign study role**, table **Edit study role** (pencil), or **Study role** quick action — no remove/re-link required |

## 5. Gap analysis (code) — superseded (2026)

The following described **pre-fix** behavior on the contact detail page. Current behavior:

- **[`StudyContextCard`](components/ctms/directory/directory-contact-detail-client.tsx)** / **[`AssignmentOverviewCard`](components/ctms/directory/directory-contact-detail-client.tsx):** Study empty states use **“No study role”**; **Assign study role** / **Edit study role** call **`StudyLinkRoleDialog`** (`openStudyRoleEdit`), not profile scroll.
- **[`StudyAssignmentsTable`](components/ctms/directory/directory-contact-detail-client.tsx):** Pencil opens the same dialog per junction row.
- **[`StudyLinkDialog`](components/ctms/directory/directory-contact-detail-client.tsx):** Insert-only link; accepts **`defaultDirectoryRoleId`** (contact’s `primary_directory_role_id`) to pre-fill the role `<select>`.
- **[`StudyLinkRoleDialog`](components/ctms/directory/directory-contact-detail-client.tsx):** Updates existing `directory_contact_study` via [`upsertContactStudyLink`](lib/actions/directory-contacts.ts) with **`input.id`**, preserving `start_date`, `end_date`, `is_active`, `notes`.

### Historical note (assign vs profile)

Previously, `hasRoleAssigned={!!contact.primary_directory_role_id}` hid the study Assign button when library primary was set but study role was null; **Assign Role** sometimes scrolled to profile edit. That wiring is removed in favor of study-junction dialogs.

## 6. Conclusion

| Question | Answer |
|----------|--------|
| Are badges “broken”? | Usually **no** — they reflect **different columns**: library primary vs per-study vs per-site junction roles. |
| Why Sub-Investigator + **No study role** together? | **Working as designed** when library primary is set but `directory_contact_study.directory_role_id` is null (e.g. linked with Role **None**, or not yet edited). |
| Is there a UX/product issue? | **Mitigated on this page**: study-specific copy; CTAs open **`StudyLinkRoleDialog`**; **Link study** defaults role from library primary. Site-level editing remains a separate pattern. |
| Follow-up (optional) | Site junction **edit-role** parity with study (same UX pattern as [`StudyLinkRoleDialog`](components/ctms/directory/directory-contact-detail-client.tsx)). |

## Matrix (role layer × storage × UI × gap)

| Layer | Storage | UI surfaces | Badge “bad” when | Gap |
|-------|---------|-------------|------------------|-----|
| Library primary | `directory_contacts.primary_directory_role_id` | Profile “Primary Role (Library)” | FK null | — |
| Study junction | `directory_contact_study.directory_role_id` | Study Context, Assignments overview, Study Assignments table | FK null | Site junction parity (optional) |
| Site junction | `directory_contact_study_site.directory_role_id` | Site Assignments table / dialogs | FK null | Edit flow parity with study (optional) |

---

*Assessment produced from static code and migration review; run SQL + manual checklist against your environment to confirm tenant-specific data.*
