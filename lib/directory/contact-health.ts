import type { DirectoryContactRow } from '@/lib/types/directory';

export type ContactHealthStatus = 'healthy' | 'needs_update' | 'at_risk';

interface ContactWithAssignments {
  status: DirectoryContactRow['status'];
  email: DirectoryContactRow['email'];
  studies?: { directory_roles?: { id?: string } | null }[];
  sites?: { directory_roles?: { id?: string } | null }[];
}

/**
 * Computes health status from assignments rather than primary_directory_role_id.
 * A contact is healthy if active, has email, and has at least one assignment with a role.
 */
export function computeContactHealth(c: ContactWithAssignments): ContactHealthStatus {
  if (c.status === 'inactive') return 'at_risk';
  const hasEmail = Boolean(c.email?.trim());
  const studies = c.studies ?? [];
  const sites = c.sites ?? [];
  const hasAssignmentRole =
    studies.some((s) => s.directory_roles?.id) || sites.some((s) => s.directory_roles?.id);
  if (!hasEmail || !hasAssignmentRole) return 'needs_update';
  return 'healthy';
}

/** Heuristic: PI / CRC / Pharm from role name (directory role or site link). */
export function matchRoleHeuristic(roleName: string | null | undefined): { pi: boolean; crc: boolean; pharm: boolean } {
  const s = (roleName ?? '').toLowerCase();
  const pi = /principal|sub[-\s]?investigator|\bpi\b(?!\s*coordinator)/.test(s);
  const crc = /coordinator|\bcrc\b|clinical research coordinator/.test(s);
  const pharm = /pharm|pharmacy|drug safety/.test(s);
  return { pi, crc, pharm };
}

export function siteRoleCoverageFromRoleNames(roleNames: (string | null | undefined)[]): { percent: number; hasPi: boolean; hasCrc: boolean; hasPharm: boolean } {
  let hasPi = false;
  let hasCrc = false;
  let hasPharm = false;
  for (const n of roleNames) {
    const m = matchRoleHeuristic(n);
    if (m.pi) hasPi = true;
    if (m.crc) hasCrc = true;
    if (m.pharm) hasPharm = true;
  }
  const met = (hasPi ? 1 : 0) + (hasCrc ? 1 : 0);
  const required = 2;
  const percent = Math.min(100, Math.round((met / required) * 100));
  return { percent, hasPi, hasCrc, hasPharm };
}
