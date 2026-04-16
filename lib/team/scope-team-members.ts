import type { TeamMemberWithStudies } from '@/lib/types/ctms';

/** Matches TeamDirectory filtering when `studyContextId` is set. */
export function scopeTeamMembersToStudy(
  rows: TeamMemberWithStudies[],
  studyId: string | undefined
): TeamMemberWithStudies[] {
  if (!studyId) return rows;
  return rows
    .map((m) => ({
      ...m,
      assignments: m.assignments.filter((a) => a.study_id === studyId),
    }))
    .filter((m) => m.assignments.length > 0);
}

export function countTeamMembersScopedToStudy(
  rows: TeamMemberWithStudies[],
  studyId: string
): number {
  return scopeTeamMembersToStudy(rows, studyId).length;
}
