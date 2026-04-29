# Directory role catalog (ops)

The primary-role picker reads **`directory_role_categories`** and **`directory_roles`** via [`getDirectoryRoleCatalog`](../../lib/actions/directory-catalog.ts).

In the signed-in app, empty-catalog alerts link to **`/protected/directory`** ([Directory setup page](../../app/protected/directory/page.tsx)) with migration paths and `supabase db push` — use that instead of a dead redirect.

## Empty catalog or “Role catalog is empty”

1. Apply migrations (including [`supabase/migrations/20260502000000_directory_role_catalog_ensure_seeds.sql`](../../supabase/migrations/20260502000000_directory_role_catalog_ensure_seeds.sql) and [`supabase/migrations/20260501000000_directory_role_catalog_rls_authenticated.sql`](../../supabase/migrations/20260501000000_directory_role_catalog_rls_authenticated.sql)).
2. Run [`supabase/scripts/verify_directory_role_catalog.sql`](../../supabase/scripts/verify_directory_role_catalog.sql) against the database.
3. Confirm the signed-in user can `SELECT` from both tables under current RLS policies.

## “Role catalog failed to load” (destructive alert)

The server returned an error from Supabase (network, RLS denial, etc.). Check the message, auth session, and Supabase logs for the failing query.

## Adding or renaming roles

Ship a **forward** migration that inserts or updates rows in `directory_roles` (and categories in `directory_role_categories` if needed). Do not rewrite historical migration files that have already been applied in deployed environments.
