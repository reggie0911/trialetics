'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Plus, UserCheck, Pencil } from 'lucide-react';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { getTeamAssignments, getCompanyProfilesForTeam } from '@/lib/actions/team-assignments';
import { getProtocolContacts } from '@/lib/actions/protocol-contacts';
import type { ProtocolContactWithRelations } from '@/lib/actions/protocol-contacts';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { TeamAssignmentsTable } from './team-assignments-table';
import { TeamAssignmentDialog } from './team-assignment-dialog';
import type { ProtocolTeamWithRelations } from '@/lib/types/clinical-trials';
import { CONTACT_PROJECT_ROLE_LABELS } from '@/lib/types/contacts-organizations';

export type TeamMemberItem = ProtocolTeamWithRelations | ProtocolContactWithRelations;

function isProtocolContact(m: TeamMemberItem): m is ProtocolContactWithRelations {
  return 'contact_id' in m && 'contact' in m;
}

interface ProjectTeamPageProps {
  projectId: string;
  embedded?: boolean;
}

export function ProjectTeamPage({ projectId, embedded }: ProjectTeamPageProps) {
  const { companyId, profileId, email, setSelectedProject, selectedProject } = useCTMS();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; email: string }>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TeamMemberItem | null>(null);
  const [activeTab, setActiveTab] = useState('team-members');

  const membersByRole = useMemo(() => {
    const map: Record<string, TeamMemberItem[]> = {};
    for (const m of teamMembers) {
      const role = m.role || 'unknown';
      if (!map[role]) map[role] = [];
      map[role].push(m);
    }
    return map;
  }, [teamMembers]);

  const KEY_ROLES = ['sponsor_rep', 'cro_rep'] as const;

  const keyRoleMembers = useMemo(
    () => ({
      sponsor_rep: (membersByRole['sponsor_rep'] ?? []).filter(isProtocolContact),
      cro_rep: (membersByRole['cro_rep'] ?? []).filter(isProtocolContact),
    }),
    [membersByRole]
  );

  const getMemberDisplayName = (member: TeamMemberItem) => {
    if (isProtocolContact(member)) {
      const c = member.contact;
      if (!c) return 'Unknown Contact';
      if (c.first_name || c.last_name) return `${c.first_name || ''} ${c.last_name || ''}`.trim();
      return c.email ?? 'Unknown Contact';
    }
    const u = (member as ProtocolTeamWithRelations).user;
    if (!u) return 'Unknown User';
    if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`;
    return u.email;
  };

  const loadTeamData = useCallback(async () => {
    const [assignmentsResult, contactsResult] = await Promise.all([
      getTeamAssignments(companyId, { entity_type: 'protocol', entity_id: projectId }),
      getProtocolContacts(projectId),
    ]);
    const merged: TeamMemberItem[] = [];
    if (assignmentsResult.success && assignmentsResult.data) {
      merged.push(...(assignmentsResult.data.assignments as ProtocolTeamWithRelations[]));
    }
    if (contactsResult.success && contactsResult.data) {
      merged.push(...contactsResult.data);
    }
    setTeamMembers(merged);
  }, [companyId, projectId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolResult, usersResult] = await Promise.all([
        getClinicalProtocol(projectId),
        getCompanyProfilesForTeam(companyId),
      ]);

      if (protocolResult.success && protocolResult.data && !embedded) {
        const p = protocolResult.data;
        setSelectedProject({
          id: p.id,
          name: p.title,
          protocol_number: p.protocol_number,
          status: p.status,
        });
      }

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data);
      }

      await loadTeamData();
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId, setSelectedProject, loadTeamData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddMember = () => {
    setEditingAssignment(null);
    setDialogOpen(true);
  };

  const handleEditMember = (assignment: TeamMemberItem) => {
    setEditingAssignment(assignment);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading team...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!embedded && <CTMSPageHeader title="Project Team" />}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="team-members" className="text-xs">
            <Users className="h-3.5 w-3.5 mr-1" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="key-roles" className="text-xs">
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            Key Roles
          </TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="team-members" className="mt-0">
            <div className="rounded-md border bg-card">
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Project Team
                  {teamMembers.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {teamMembers.length}
                    </Badge>
                  )}
                </h3>
                <Button variant="outline" size="sm" onClick={handleAddMember}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Team Member
                </Button>
              </div>
              <div className="px-4 pb-4">
                <TeamAssignmentsTable
                  assignments={teamMembers}
                  entityType="protocol"
                  isLoading={false}
                  onEdit={(assignment) => handleEditMember(assignment as TeamMemberItem)}
                  onRefresh={loadTeamData}
                  companyId={companyId}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="key-roles" className="mt-0">
            <div className="rounded-md border bg-card">
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Key Roles
                </h3>
              </div>
              <div className="px-4 pb-4 space-y-6">
                {KEY_ROLES.every((r) => keyRoleMembers[r].length === 0) ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No sponsor or CRO contacts assigned.</p>
                  </div>
                ) : (
                  KEY_ROLES.map((role) => {
                    const members = keyRoleMembers[role];
                    if (members.length === 0) return null;
                    const label = CONTACT_PROJECT_ROLE_LABELS[role];
                    return (
                      <div key={role} className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                          {label}
                          <Badge variant="secondary" className="text-xs">
                            {members.length}
                          </Badge>
                        </h4>
                        <ul className="space-y-1.5">
                          {members.map((m) => (
                            <li
                              key={m.id}
                              className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
                            >
                              <div>
                                <span className="font-medium">{getMemberDisplayName(m)}</span>
                                {m.contact?.email && (
                                  <span className="text-muted-foreground ml-2 text-xs">{m.contact.email}</span>
                                )}
                                {m.organization?.name && (
                                  <span className="text-muted-foreground ml-2 text-xs">· {m.organization.name}</span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditMember(m)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <TeamAssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companyId={companyId}
        profileId={profileId}
        email={email}
        entityType="protocol"
        entityId={projectId}
        entityName={selectedProject?.name}
        assignment={editingAssignment}
        users={users}
        excludeContactIds={teamMembers.filter(isProtocolContact).map((m) => m.contact_id)}
        onSuccess={loadTeamData}
      />
    </div>
  );
}
