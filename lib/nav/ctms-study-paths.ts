/**
 * CTMS URLs scoped under a study (Option 2: company → study → module).
 * Directory and company-wide financial templates stay at top-level `/protected/...`.
 */

/** Org-wide study list — canonical target when no study is selected (picker / hub links). */
export const CTMS_STUDIES_CATALOG_HREF = '/protected/studies/catalog' as const;

export function ctmsStudyRoot(studyId: string): string {
  return `/protected/studies/${studyId}`;
}

export function ctmsStudyPath(studyId: string, ...segments: string[]): string {
  const rest = segments.filter(Boolean).join('/');
  return rest ? `${ctmsStudyRoot(studyId)}/${rest}` : ctmsStudyRoot(studyId);
}

/**
 * True on top-level CTMS hubs without a study UUID in the path: personal dashboard,
 * studies catalog, or admin-only system overview (`/protected/studies`).
 */
export function isOnDashboardHub(pathname: string): boolean {
  return (
    pathname === '/protected' ||
    pathname === CTMS_STUDIES_CATALOG_HREF ||
    pathname === '/protected/studies'
  );
}

/** Match a study UUID in `/protected/studies/<uuid>/...` (case-insensitive). */
export function parseStudyIdFromPathname(pathname: string): string | null {
  const m = pathname.match(/^\/protected\/studies\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}
