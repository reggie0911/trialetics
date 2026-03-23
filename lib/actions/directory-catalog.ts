'use server';

import { createClient } from '@/lib/server';
import type { DirectoryRole, DirectoryRoleCategory } from '@/lib/types/directory';

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
