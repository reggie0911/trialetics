import { parseStudyIdFromPathname } from '@/lib/nav/ctms-study-paths';

export function brandForgeBasePath(studyId: string | null | undefined): string {
  return studyId ? `/protected/studies/${studyId}/brand-forge` : '/protected/brand-forge';
}

export function brandForgePath(studyId: string | null | undefined, ...segments: string[]): string {
  const base = brandForgeBasePath(studyId);
  const rest = segments.filter(Boolean).join('/');
  return rest ? `${base}/${rest}` : base;
}

export function brandForgeStudyIdFromPathname(pathname: string): string | null {
  return parseStudyIdFromPathname(pathname);
}
