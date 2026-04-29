import type { DirectoryContactRow } from '@/lib/types/directory';

export type ContactHealthStatus = 'healthy' | 'needs_update' | 'at_risk';

export function computeContactHealth(c: Pick<DirectoryContactRow, 'status' | 'email' | 'primary_directory_role_id'>): ContactHealthStatus {
  if (c.status === 'inactive') return 'at_risk';
  if (!c.email?.trim() || !c.primary_directory_role_id) return 'needs_update';
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
