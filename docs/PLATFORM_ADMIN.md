# Platform administrator (module access)

Users with `profiles.is_platform_admin = true` can open **Platform — module access** at `/protected/platform/companies` (optional deep link: `?tab=companies`, `?tab=study-trackers`, `?tab=definitions`).

They can also open **Platform — business analytics** at `/protected/platform/analytics` (optional query: `?range=30` or `?range=90` days). That page is **platform admin only** (page guard, server action, and `platform_business_analytics` RPC all require `is_platform_admin`). It answers **product / tenant** questions: subscriptions, seats, module flags, custom tracker definitions, and `company_module_audit` trends—**not** clinical KPIs (enrollment, SDV, trip reports). For trial performance, use **Reports** at `/protected/reports` instead.

### Tabs

| Tab | Purpose |
|-----|--------|
| **Company access** | Toggle `companies.has_ctms_access`, `has_etmf_access`, `has_tracker_access` per company. Expand a row to manage **builder** definitions (`custom_tracker_definitions`) and per-definition licensing. |
| **Study trackers** | Reference table of built-in routes (keys in [`lib/nav/study-trackers.ts`](lib/nav/study-trackers.ts)). **Assignment matrix**: per company, toggle which keys are stored in `companies.enabled_study_tracker_keys`. Requires **Custom trackers** on for that company. Updates use RPC `set_company_study_tracker_keys`. |
| **Custom definitions** | Read-only registry of all `custom_tracker_definitions` rows (via `platform_list_custom_tracker_definitions`). |

Tenants only see built-in Study tracker links in **Custom → Study trackers** when their company’s `enabled_study_tracker_keys` includes that route’s **key** and they have `has_tracker_access` and CTMS access. **Note:** Disabling a route hides it from the nav; it does not block deep links to the URL (add page guards separately if required).

### Creating a custom tracker for a company

1. Turn on **Custom trackers** for the company (so `has_tracker_access` is true).
2. Expand the company row and choose **Add tracker**.
3. Enter **Name** and **Slug** (lowercase, e.g. `visit-log`). Optional: description, icon, entity type.

Inserts use RPC `platform_create_custom_tracker_definition`: only platform admins can call it; the target company must have tracker module access. New definitions are created as **active** with **platform licensing** (`platform_access_enabled`) enabled. An audit row is written to `company_module_audit`.

Changes are written via RPCs `set_company_module_access`, `set_company_study_tracker_keys`, `set_tracker_platform_access`, and `platform_create_custom_tracker_definition`, and append rows to `company_module_audit` where applicable.

## Bootstrap the first platform admin

Designated platform admin: **reggie.walton@trialetics.io**

Run in the Supabase SQL editor (or any session with sufficient privileges). The profile row must already exist (user has signed in at least once, or was invited and completed signup).

**Preferred** (works even when `profiles.email` is null or out of sync with `auth.users`):

```sql
UPDATE public.profiles p
SET is_platform_admin = true
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = lower('reggie.walton@trialetics.io');
```

**Alternate** (by profile email only):

```sql
UPDATE public.profiles
SET is_platform_admin = true
WHERE lower(trim(coalesce(email, ''))) = lower('reggie.walton@trialetics.io');
```

Confirm one row updated. Inspect current value:

```sql
SELECT p.id, p.email, p.user_id, p.is_platform_admin, u.email AS auth_email
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE lower(u.email) = lower('reggie.walton@trialetics.io');
```

To revoke:

```sql
UPDATE public.profiles
SET is_platform_admin = false
WHERE lower(trim(email)) = lower(trim('reggie.walton@trialetics.io'));
```

Normal authenticated users **cannot** set `is_platform_admin` on themselves; a trigger clears unauthorized changes unless `auth.jwt()->>'role' = 'service_role'`.

## Migrations

- `supabase/migrations/20260331000000_platform_module_access.sql` adds columns, tables, RLS, RPCs, and optional audit logging.
- `supabase/migrations/20260331200000_platform_create_custom_tracker_definition.sql` adds `platform_create_custom_tracker_definition` for cross-tenant tracker creation.
- `supabase/migrations/20260332000000_platform_list_custom_tracker_definitions.sql` adds `platform_list_custom_tracker_definitions` for the platform admin definitions table.
- `supabase/migrations/20260332100000_company_study_tracker_keys.sql` adds `companies.enabled_study_tracker_keys` and `set_company_study_tracker_keys`.
- `supabase/migrations/20260334200000_platform_documentation.sql` adds `public.platform_documentation` (RLS, platform-admin writes) for **Documentation editor** overlays and DB-only pages. If this migration is not applied, `/protected/docs` still serves markdown from the repo; the editor and DB overrides will not work until you run it (e.g. `supabase db push` or paste the SQL in the Supabase SQL editor).
- `supabase/migrations/20260334300000_documentation_screenshots_bucket.sql` adds the public Supabase Storage bucket **`documentation-screenshots`** (platform-admin upload only; public read for image URLs). Required for **Insert screenshot** in the documentation editor. Without it, uploads fail; you can still embed images by pasting markdown with any public `https://` image URL.

## Documentation editor (platform admin)

**Modules → Documentation editor** → `/protected/platform/docs`. Depends on the `platform_documentation` migration above.

- **Storage:** The editor is **WYSIWYG** for authoring; the database still stores **`body_markdown`** (Markdown string). Optional YAML frontmatter at the top of the body is preserved but not edited in the rich-text surface.
- **Repo vs database:** Docs listed in [`lib/docs/registry.ts`](../lib/docs/registry.ts) can include a **`filePath`** (Markdown on disk). For a given **slug**, if `platform_documentation.body_markdown` is **non-empty**, that **database content is shown** instead of the file until you remove the overlay or clear the body (see [`loadDocResolved`](../lib/docs/resolve-doc.ts)).
- **New page:** Open **Documentation editor** → **New page** (`/protected/platform/docs/new`). Enter title, description, optional **Module route**, and body content manually.
- **Start from repo manual (optional):** On **New page**, use the dropdown **Start from repo manual** to load allowlisted Markdown from the deployed repo (all `filePath` entries in [`lib/docs/registry.ts`](../lib/docs/registry.ts), plus a small extra list such as `SDV_TRACKER_USER_MANUAL.md` in [`lib/docs/repo-manual-templates.ts`](../lib/docs/repo-manual-templates.ts)). The server only reads paths on that allowlist. If you pick a file that backs a **built-in** doc, the form prefills from disk and shows a link to **Edit overlay** for that slug—you cannot **Create** a second page with the same reserved slug; use a new slug only if you intend a fork. Extra repo-only files (no registry slug) prefill title/body and sync a suggested slug from the title as usual.
- **List actions:** The docs list shows **Module route** and, when a row has a DB overlay or is DB-only, **Remove overlay** / **Delete** with the same semantics as on the edit screen.

### Screenshots in docs

- **Upload:** On the **Write** tab, use **Insert screenshot** or the toolbar **image** control (PNG, JPEG, WebP, GIF; max 5 MB). The app uploads to **`documentation-screenshots`** and inserts `![alt](public-url)` into the document. Apply the `documentation_screenshots_bucket` migration first.
- **External URLs:** No upload needed — add a link/image with a public `https://` image URL; **Preview** and published docs render it the same way.
- **Privacy:** Uploaded files use unguessable paths but are served from a **public** bucket; anyone with the URL can view the image.

## Troubleshooting: documentation screenshot upload shows “Bucket not found”

The editor uploads to the Storage bucket **`documentation-screenshots`**. If that bucket was never created on your Supabase project, uploads fail with an error like **Bucket not found**.

1. Apply [`supabase/migrations/20260334300000_documentation_screenshots_bucket.sql`](../supabase/migrations/20260334300000_documentation_screenshots_bucket.sql): e.g. `supabase db push`, or open **SQL** in the Supabase dashboard and run the file contents.
2. Confirm **Storage** shows a bucket named `documentation-screenshots` and that your user is a **platform admin** (`profiles.is_platform_admin`), or inserts will be denied by RLS.
3. **Workaround:** embed images with a public `https://` URL in markdown (no upload).

## Troubleshooting: “Company module access” missing from the menu

The avatar menu and **Modules → Company module access** only appear when the server loads `profiles.is_platform_admin === true` for your session.

1. Run the SQL above and confirm `is_platform_admin` is **true** for your user.
2. **Deploy the current app** to your hosting environment—the layout must select `is_platform_admin` and pass it to the navbar (older builds never show the item).
3. Hard-refresh or sign out and back in, then check **Modules** in the top bar or open `/protected/platform/companies` directly.

## Troubleshooting: analytics link or page

**Modules → Platform analytics** and `/protected/platform/analytics` use the same `is_platform_admin` check as company module access. If the RPC or action returns “not authorized,” confirm the migration for `platform_business_analytics` is applied on your Supabase project.
