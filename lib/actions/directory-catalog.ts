'use server';

import { createClient } from '@/lib/server';
import type { DirectoryRole, DirectoryRoleCategory } from '@/lib/types/directory';

/**
 * Loads the global directory role catalog (`directory_role_categories` + `directory_roles`).
 * Seeds/RLS: `supabase/migrations/20260502000000_directory_role_catalog_ensure_seeds.sql`,
 * `20260501000000_directory_role_catalog_rls_authenticated.sql`.
 * To add a role, ship a migration that `INSERT`s into `directory_roles` with `category_id`
 * from `directory_role_categories.code`; to rename or remove, check FKs (e.g. `primary_directory_role_id`).
 * Ops verification: `supabase/scripts/verify_directory_role_catalog.sql`.
 */
export async function getDirectoryRoleCatalog(): Promise<{
  categories: (DirectoryRoleCategory & { roles: DirectoryRole[] })[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: categories, error: cErr } = await supabase
    .from('directory_role_categories')
    .select('*')
    .order('sort_order');

  if (cErr) return { categories: [], error: cErr.message };

  const { data: roles, error: rErr } = await supabase
    .from('directory_roles')
    .select('*')
    .order('sort_order');

  if (rErr) return { categories: [], error: rErr.message };

  const byCat = new Map<string, DirectoryRole[]>();
  for (const r of roles ?? []) {
    const list = byCat.get(r.category_id) ?? [];
    list.push(r as DirectoryRole);
    byCat.set(r.category_id, list);
  }

  const out = (categories ?? []).map((c) => ({
    ...(c as DirectoryRoleCategory),
    roles: byCat.get(c.id) ?? [],
  }));

  return { categories: out, error: null };
}
