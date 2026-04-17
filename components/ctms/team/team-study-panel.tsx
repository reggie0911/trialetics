'use client';

import { TeamDirectory } from '@/components/ctms/team/team-directory';
import type { TeamMemberWithStudies, TeamRole, Study } from '@/lib/types/ctms';
import type { JoinLink, PendingInvitation } from '@/lib/actions/team';

export interface TeamStudyPanelProps {
  studyId: string;
  teamDirectoryMembers: TeamMemberWithStudies[];
  studies: Study[];
  teamRoles: TeamRole[];
  pendingInvitations: PendingInvitation[];
  joinLinks: JoinLink[];
  isAdmin: boolean;
}

export function TeamStudyPanel({
  studyId,
  teamDirectoryMembers,
  studies,
  teamRoles,
  pendingInvitations,
  joinLinks,
  isAdmin,
}: TeamStudyPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Members and study assignments for this trial (company directory filtered to this study).
        </p>
      </div>
      <TeamDirectory
        members={teamDirectoryMembers}
        studies={studies}
        teamRoles={teamRoles}
        pendingInvitations={pendingInvitations}
        joinLinks={joinLinks}
        isAdmin={isAdmin}
        studyContextId={studyId}
      />
    </div>
  );
}
