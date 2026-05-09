import type {
  DirectoryContactWithRelations,
  DirectoryRole,
  InstitutionRow,
} from '@/lib/types/directory';

type StudyAssignment = DirectoryContactWithRelations['studies'][number];
type SiteAssignment = DirectoryContactWithRelations['sites'][number];
type InstitutionLink = DirectoryContactWithRelations['institutions'][number];

/**
 * Derives the "primary" role from a contact's assignments.
 * Checks study assignments first, then site assignments.
 * Returns the first non-null directory_roles found.
 */
export function getDerivedRole(
  contact: Pick<DirectoryContactWithRelations, 'studies' | 'sites'>
): Pick<DirectoryRole, 'id' | 'name'> | null {
  for (const study of contact.studies) {
    if (study.directory_roles?.id) {
      return study.directory_roles;
    }
  }
  for (const site of contact.sites) {
    if (site.directory_roles?.id) {
      return site.directory_roles;
    }
  }
  return null;
}

/**
 * Returns true if the contact has at least one assignment (study, site) with a role.
 * Used for health and completeness checks.
 */
export function hasAnyAssignmentRole(
  contact: Pick<DirectoryContactWithRelations, 'studies' | 'sites'>
): boolean {
  return (
    contact.studies.some((s) => s.directory_roles?.id) ||
    contact.sites.some((s) => s.directory_roles?.id)
  );
}

/**
 * Collects all unique role names from a contact's assignments.
 * Useful for heuristic checks (PI, CRC, Pharm coverage).
 */
export function getAllAssignmentRoleNames(
  contact: Pick<DirectoryContactWithRelations, 'studies' | 'sites'>
): string[] {
  const names = new Set<string>();
  for (const study of contact.studies) {
    if (study.directory_roles?.name) {
      names.add(study.directory_roles.name);
    }
  }
  for (const site of contact.sites) {
    if (site.directory_roles?.name) {
      names.add(site.directory_roles.name);
    }
  }
  return Array.from(names);
}

/**
 * Derives the primary institution from a contact's institution links.
 * Returns the institution where is_primary = true.
 */
export function getDerivedPrimaryInstitution(
  contact: Pick<DirectoryContactWithRelations, 'institutions'>
): Pick<InstitutionRow, 'id' | 'name' | 'organization_type'> | null {
  const primaryLink = contact.institutions.find((i) => i.is_primary);
  return primaryLink?.institutions ?? null;
}

/**
 * Returns true if the contact has at least one institution link marked as primary.
 * Used for completeness checks.
 */
export function hasPrimaryInstitution(
  contact: Pick<DirectoryContactWithRelations, 'institutions'>
): boolean {
  return contact.institutions.some((i) => i.is_primary);
}

/**
 * Simplified type for list-context contacts that may have partial relations loaded.
 */
export interface ContactWithPartialRelations {
  studies?: { directory_roles?: { id?: string; name?: string } | null }[];
  sites?: { directory_roles?: { id?: string; name?: string } | null }[];
  institutions?: { is_primary?: boolean; institutions?: { id: string; name: string } | null }[];
}

/**
 * Safe version of hasAnyAssignmentRole for list items that may not have full relations.
 */
export function hasAnyAssignmentRoleSafe(contact: ContactWithPartialRelations): boolean {
  const studies = contact.studies ?? [];
  const sites = contact.sites ?? [];
  return (
    studies.some((s) => s.directory_roles?.id) || sites.some((s) => s.directory_roles?.id)
  );
}

/**
 * Safe version of hasPrimaryInstitution for list items that may not have full relations.
 */
export function hasPrimaryInstitutionSafe(contact: ContactWithPartialRelations): boolean {
  const institutions = contact.institutions ?? [];
  return institutions.some((i) => i.is_primary);
}
