/**
 * CTMS URLs scoped under a study (Option 2: company → study → module).
 * Directory and company-wide financial templates stay at top-level `/protected/...`.
 */
export function ctmsStudyRoot(studyId: string): string {
  return `/protected/studies/${studyId}`;
}

export function ctmsStudyPath(studyId: string, ...segments: string[]): string {
  const rest = segments.filter(Boolean).join('/');
  return rest ? `${ctmsStudyRoot(studyId)}/${rest}` : ctmsStudyRoot(studyId);
}

/** Match a study UUID in `/protected/studies/<uuid>/...` (case-insensitive). */
export function parseStudyIdFromPathname(pathname: string): string | null {
  const m = pathname.match(/^\/protected\/studies\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}
