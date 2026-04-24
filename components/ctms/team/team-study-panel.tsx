'use client';

import { StudyTeamDashboard } from '@/components/ctms/team/study-team-dashboard';
import type { TeamMemberWithStudies, TeamRole, Study } from '@/lib/types/ctms';
import type { PendingInvitation } from '@/lib/actions/team';

export interface TeamStudyPanelProps {
  studyId: string;
  teamDirectoryMembers: TeamMemberWithStudies[];
  studies: Study[];
  teamRoles: TeamRole[];
  pendingInvitations: PendingInvitation[];
  companyDomain: string | null;
  isAdmin: boolean;
}

export function TeamStudyPanel({
  studyId,
  teamDirectoryMembers,
  studies,
  teamRoles,
  pendingInvitations,
  companyDomain,
  isAdmin,
}: TeamStudyPanelProps) {
  return (
    <StudyTeamDashboard
      studyId={studyId}
      teamDirectoryMembers={teamDirectoryMembers}
      studies={studies}
      teamRoles={teamRoles}
      pendingInvitations={pendingInvitations}
      companyDomain={companyDomain}
      isAdmin={isAdmin}
    />
  );
}
