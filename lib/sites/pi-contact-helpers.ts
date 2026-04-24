import { isPrincipalInvestigatorSiteRoleLabel } from '@/lib/types/ctms';

export interface RoleCatalogCategory {
  roles: Array<{ id: string; name: string }>;
}

export interface PiContactCandidate {
  id: string;
  name: string | null;
  email: string | null;
  directory_contact_id: string | null;
  is_primary: boolean;
}

export function findPrincipalInvestigatorRoleId(
  catalog: readonly RoleCatalogCategory[]
): string | null {
  for (const category of catalog) {
    const role = category.roles.find((x) => isPrincipalInvestigatorSiteRoleLabel(x.name));
    if (role) return role.id;
  }
  return null;
}

export function shouldWarnOnPrincipalInvestigatorRoleChange(
  previousRole: string,
  nextRole: string
): boolean {
  return (
    isPrincipalInvestigatorSiteRoleLabel(previousRole) &&
    !isPrincipalInvestigatorSiteRoleLabel(nextRole)
  );
}

/**
 * Pick PI row deterministically: primary first, then lexicographically smallest id.
 */
export function pickPrincipalInvestigatorContact(
  rows: readonly PiContactCandidate[]
): PiContactCandidate | null {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}
