'use server';

import { createClient } from '@/lib/server';
import { canEditDirectory, canImportDirectoryCsv, getDirectoryPermissionContext } from '@/lib/directory-permissions';

export async function getDirectoryAccess(): Promise<
  | { ok: false; reason: 'unauthenticated' | 'no_company' }
  | { ok: true; canEdit: boolean; canImportCsv: boolean; companyId: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'unauthenticated' };
  const ctx = await getDirectoryPermissionContext(supabase, user.id);
  if (!ctx) return { ok: false, reason: 'no_company' };
  const [canEdit, canImportCsv] = await Promise.all([
    canEditDirectory(supabase, ctx),
    canImportDirectoryCsv(supabase, ctx),
  ]);
  return { ok: true, canEdit, canImportCsv, companyId: ctx.companyId };
}
