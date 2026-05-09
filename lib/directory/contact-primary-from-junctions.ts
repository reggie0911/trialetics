import type { DirectoryRole, InstitutionRow } from '@/lib/types/directory';

function unwrapDirectoryRole(dr: unknown): Pick<DirectoryRole, 'id' | 'name'> | null {
  if (dr == null) return null;
  const one = Array.isArray(dr) ? dr[0] : dr;
  if (!one || typeof one !== 'object') return null;
  const o = one as { id?: string; name?: string };
  if (!o.id) return null;
  return { id: o.id, name: o.name ?? '' };
}

/** Same shape as list + detail primary org embeds. */
export type PrimaryInstitutionFromJunction = Pick<
  InstitutionRow,
  'id' | 'name' | 'organization_type'
>;

function unwrapInstitution(inst: unknown): PrimaryInstitutionFromJunction | null {
  if (inst == null) return null;
  const one = Array.isArray(inst) ? inst[0] : inst;
  if (!one || typeof one !== 'object') return null;
  const o = one as { id?: string; name?: string; organization_type?: InstitutionRow['organization_type'] };
  if (!o.id) return null;
  return {
    id: o.id,
    name: o.name ?? '',
    organization_type: o.organization_type ?? 'other',
  };
}

/**
 * Same rule as `getDirectoryContactById`: first study assignment with a directory role,
 * else first site assignment with a directory role.
 */
export function derivePrimaryRoleFromJunctionRows(
  studyRows: { directory_roles?: unknown }[],
  siteRows: { directory_roles?: unknown }[]
): Pick<DirectoryRole, 'id' | 'name'> | null {
  for (const study of studyRows) {
    const r = unwrapDirectoryRole(study.directory_roles);
    if (r) return r;
  }
  for (const site of siteRows) {
    const r = unwrapDirectoryRole(site.directory_roles);
    if (r) return r;
  }
  return null;
}

/** Primary organization from `directory_contact_institution` where `is_primary` is true. */
export function derivePrimaryInstitutionFromJunctionRows(
  institutionRows: { is_primary?: boolean; institutions?: unknown }[]
): PrimaryInstitutionFromJunction | null {
  const primary = institutionRows.find((i) => i.is_primary);
  return unwrapInstitution(primary?.institutions);
}
