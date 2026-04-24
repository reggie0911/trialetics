'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download,
  MoreHorizontal,
  Search,
  UserPlus,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useStudyHub } from '@/components/ctms/study-hub-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

import {
  TEAM_ROLE_LABEL,
  TEAM_ROLE_OPTIONS,
  type Study,
  type TeamMemberRole,
  type TeamMemberWithStudies,
  type TeamRole,
} from '@/lib/types/ctms';
import {
  getTeamDirectory,
  inviteUser,
  removeTeamMember,
  resendInvite,
  revokeInvite,
  updateTeamMember,
  type PendingInvitation,
} from '@/lib/actions/team';
import { scopeTeamMembersToStudy } from '@/lib/team/scope-team-members';
import {
  buildTeamRows,
  isExternalEmail,
  type TeamRow,
} from '@/lib/team/build-team-rows';

import {
  StudyTeamKpiCards,
  type TeamKpiMetrics,
} from '@/components/ctms/team/study-team-kpi-cards';
import { StudyTeamTable } from '@/components/ctms/team/study-team-table';
import { ManageMemberDrawer } from '@/components/ctms/team/manage-member-drawer';
import { StudyTeamRolesPermissions } from '@/components/ctms/team/study-team-roles-permissions';
import { StudyTeamAssignmentMatrix } from '@/components/ctms/team/study-team-assignment-matrix';

type AssignmentStatusFilter = 'all' | 'has_assignments' | 'no_assignments';
type AppRoleFilter = 'all' | 'admin' | 'user';

interface StudyTeamDashboardProps {
  studyId: string;
  teamDirectoryMembers: TeamMemberWithStudies[];
  studies: Study[];
  teamRoles: TeamRole[];
  pendingInvitations: PendingInvitation[];
  companyDomain: string | null;
  isAdmin: boolean;
}

export function StudyTeamDashboard({
  studyId,
  teamDirectoryMembers,
  studies,
  teamRoles,
  pendingInvitations,
  companyDomain,
  isAdmin,
}: StudyTeamDashboardProps) {
  const router = useRouter();
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;
  const [, startTransition] = useTransition();

  const [members, setMembers] = useState(() =>
    scopeTeamMembersToStudy(teamDirectoryMembers, studyId)
  );

  useEffect(() => {
    setMembers(scopeTeamMembersToStudy(teamDirectoryMembers, studyId));
  }, [teamDirectoryMembers, studyId]);

  const [search, setSearch] = useState('');
  const [studyRoleFilter, setStudyRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>('all');
  const [appRoleFilter, setAppRoleFilter] = useState<AppRoleFilter>('all');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'members' | 'pending' | 'roles' | 'matrix'
  >('members');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manageMember, setManageMember] = useState<TeamMemberWithStudies | null>(null);

  const refreshMembers = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getTeamDirectory();
        setMembers(scopeTeamMembersToStudy(data, studyId));
      } catch {
        toast.error('Failed to refresh team data');
      }
    });
  }, [studyId, startTransition]);

  const metrics: TeamKpiMetrics = useMemo(() => {
    const activeMembers = members.filter((m) =>
      m.assignments.some((a) => a.is_active)
    ).length;
    const assignedToStudy = members.filter((m) => m.assignments.length > 0).length;
    const studyCount = 1; // Always one in study scope, but kept for portability.
    const rolesInUse = new Set(
      members.flatMap((m) => m.assignments.map((a) => a.role))
    );
    const totalRoles = TEAM_ROLE_OPTIONS.filter((opt) => opt.value !== 'custom').length;
    const openRoles = Math.max(totalRoles - rolesInUse.size, 0);
    const admins = members.filter((m) => m.app_role === 'admin').length;
    const externalUsersAvailable = Boolean(companyDomain);
    const externalUsers = externalUsersAvailable
      ? members.filter((m) => isExternalEmail(m.email, companyDomain)).length
      : 0;

    return {
      activeMembers,
      pendingInvites: pendingInvitations.length,
      assignedToStudy,
      studyCount,
      openRoles,
      admins,
      externalUsers,
      externalUsersAvailable,
    };
  }, [members, pendingInvitations.length, companyDomain]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (search) {
        const name = [m.first_name, m.last_name].filter(Boolean).join(' ').toLowerCase();
        const email = (m.email ?? '').toLowerCase();
        const q = search.toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      if (studyRoleFilter !== 'all') {
        const hasRole = m.assignments.some((a) => a.role === studyRoleFilter);
        if (!hasRole) return false;
      }
      if (statusFilter === 'has_assignments' && m.assignments.length === 0) return false;
      if (statusFilter === 'no_assignments' && m.assignments.length > 0) return false;
      if (appRoleFilter !== 'all' && m.app_role !== appRoleFilter) return false;
      return true;
    });
  }, [members, search, studyRoleFilter, statusFilter, appRoleFilter]);

  const tableRows: TeamRow[] = useMemo(() => {
    return buildTeamRows(filteredMembers, pendingInvitations, {
      studyContextId: studyId,
      dedupeAgainstMembers: true,
    });
  }, [filteredMembers, pendingInvitations, studyId]);

  const filtersActive =
    Boolean(search.trim()) ||
    studyRoleFilter !== 'all' ||
    statusFilter !== 'all' ||
    appRoleFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStudyRoleFilter('all');
    setStatusFilter('all');
    setAppRoleFilter('all');
  };

  const subtitle = `${metrics.activeMembers} ${metrics.activeMembers === 1 ? 'active member' : 'active members'} · ${metrics.assignedToStudy} assigned to study · ${metrics.pendingInvites} ${metrics.pendingInvites === 1 ? 'pending invite' : 'pending invites'}`;

  const handleResendInvite = async (invitationId: string) => {
    setPendingActionId(invitationId);
    try {
      const { error } = await resendInvite(invitationId);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Invitation resent');
        router.refresh();
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    setPendingActionId(invitationId);
    try {
      const { error } = await revokeInvite(invitationId);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Invitation revoked');
        router.refresh();
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, studyIdValue: string) => {
    const { error } = await removeTeamMember(assignmentId, studyIdValue);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Assignment removed');
    refreshMembers();
  };

  const handleDeactivateMember = async (
    row: Extract<TeamRow, { kind: 'member' }>
  ) => {
    const target = row.member.assignments.find((a) => a.study_id === studyId);
    if (!target) return;
    const { error } = await updateTeamMember({
      id: target.id,
      study_id: studyId,
      is_active: !target.is_active,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(target.is_active ? 'Deactivated on study' : 'Reactivated on study');
    refreshMembers();
  };

  const exportCsv = () => {
    const rows: string[][] = [
      ['Name', 'Email', 'Platform Role', 'Study Role', 'Status', 'Last Active', 'Assignments'],
    ];
    filteredMembers.forEach((m) => {
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Unknown';
      const studyAssignment =
        m.assignments.find((a) => a.study_id === studyId && a.is_active) ??
        m.assignments.find((a) => a.study_id === studyId);
      rows.push([
        name,
        m.email ?? '',
        m.app_role === 'admin' ? 'Admin' : 'User',
        studyAssignment ? TEAM_ROLE_LABEL[studyAssignment.role] : '',
        m.assignments.some((a) => a.is_active) ? 'Active' : 'Inactive',
        m.last_sign_in_at ?? '',
        m.assignments.map((a) => a.study_title).join('; '),
      ]);
    });
    if (pendingInvitations.length > 0) {
      rows.push([]);
      rows.push(['Pending Invitations']);
      rows.push(['Email', 'Name', 'App Role', 'Invited At']);
      pendingInvitations.forEach((inv) => {
        const name = [inv.first_name, inv.last_name].filter(Boolean).join(' ') || '—';
        rows.push([
          inv.email,
          name,
          inv.role === 'admin' ? 'Admin' : 'User',
          new Date(inv.invited_at).toISOString(),
        ]);
      });
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'study-team.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Team</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      <StudyTeamKpiCards metrics={metrics} />

      <Tabs
        tabsId={`study-team-${studyId}`}
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 border-b border-border md:flex-row md:items-center md:justify-between">
          <TabsList className="h-auto border-0 p-0">
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="pending">
              Pending Invitations
              {pendingInvitations.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                  {pendingInvitations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="roles">Roles &amp; Permissions</TabsTrigger>
            <TabsTrigger value="matrix">Assignment Matrix</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 pb-2 md:pb-0">
            {isAdmin &&
              (readOnly ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    <Button size="sm" disabled aria-label="Invite user">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite User
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {STUDY_DEACTIVATED_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
              ))}
            {readOnly ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button size="sm" variant="outline" disabled aria-label="Export CSV">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {STUDY_DEACTIVATED_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled
                  onClick={() => toast.info('Bulk invite via CSV coming soon')}
                >
                  Bulk invite via CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab('roles')}>
                  Manage roles
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                >
                  Print directory
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="members" className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
              <div className="relative w-full md:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Search team"
                />
              </div>
              <Select value={studyRoleFilter} onValueChange={setStudyRoleFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue
                    placeholder="Study Role"
                    getDisplayLabel={(v) =>
                      v === 'all'
                        ? 'Study Role'
                        : TEAM_ROLE_OPTIONS.find((o) => o.value === v)?.label ?? v
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Study Roles</SelectItem>
                  {TEAM_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as AssignmentStatusFilter)}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue
                    placeholder="Member Status"
                    getDisplayLabel={(v) => {
                      if (v === 'all') return 'Member Status';
                      if (v === 'has_assignments') return 'Has Assignments';
                      return 'No Assignments';
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="has_assignments">Has Assignments</SelectItem>
                  <SelectItem value="no_assignments">No Assignments</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={appRoleFilter}
                onValueChange={(v) => setAppRoleFilter(v as AppRoleFilter)}
              >
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue
                    placeholder="App Role"
                    getDisplayLabel={(v) =>
                      v === 'all' ? 'App Role' : v === 'admin' ? 'Admin' : 'User'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All App Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start text-xs font-medium text-primary hover:underline md:self-auto"
              >
                Clear filters
              </button>
            )}
          </div>

          <StudyTeamTable
            rows={tableRows}
            totalRowsBeforeFilter={members.length + pendingInvitations.length}
            studyContextId={studyId}
            companyDomain={companyDomain}
            readOnly={readOnly}
            pendingActionId={pendingActionId}
            filtersActive={filtersActive}
            onManage={(row) => setManageMember(row.member)}
            onResendInvite={handleResendInvite}
            onRevokeInvite={handleRevokeInvite}
            onRemoveAssignment={handleRemoveAssignment}
            onDeactivateMember={handleDeactivateMember}
            resetKey={[search, studyRoleFilter, statusFilter, appRoleFilter]}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
          <PendingInvitesPanel
            pendingInvitations={pendingInvitations}
            companyDomain={companyDomain}
            readOnly={readOnly}
            pendingActionId={pendingActionId}
            onResendInvite={handleResendInvite}
            onRevokeInvite={handleRevokeInvite}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="roles">
          <StudyTeamRolesPermissions />
        </TabsContent>

        <TabsContent value="matrix">
          <StudyTeamAssignmentMatrix members={members} studyContextId={studyId} />
        </TabsContent>
      </Tabs>

      {manageMember && (
        <ManageMemberDrawer
          member={manageMember}
          open={!!manageMember}
          onOpenChange={(o) => {
            if (!o) setManageMember(null);
          }}
          onSuccess={() => {
            refreshMembers();
          }}
          studies={studies}
          teamRoles={teamRoles}
          studyContextId={studyId}
          readOnly={readOnly}
        />
      )}

      <StudyInviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => {
          setInviteOpen(false);
          refreshMembers();
          router.refresh();
        }}
        studies={studies}
        defaultStudyId={studyId}
      />
    </div>
  );
}

interface PendingInvitesPanelProps {
  pendingInvitations: PendingInvitation[];
  companyDomain: string | null;
  readOnly: boolean;
  pendingActionId: string | null;
  onResendInvite: (id: string) => void;
  onRevokeInvite: (id: string) => void;
  isAdmin: boolean;
}

function PendingInvitesPanel({
  pendingInvitations,
  companyDomain,
  readOnly,
  pendingActionId,
  onResendInvite,
  onRevokeInvite,
  isAdmin,
}: PendingInvitesPanelProps) {
  const rows: TeamRow[] = useMemo(
    () => buildTeamRows([], pendingInvitations),
    [pendingInvitations]
  );

  if (pendingInvitations.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50/50 p-8 text-center dark:border-amber-500/30 dark:bg-amber-500/5">
        <p className="text-sm font-medium text-foreground">No pending invitations</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isAdmin
            ? 'Use Invite User to send invitations to new team members.'
            : 'There are no pending invitations to show.'}
        </p>
      </div>
    );
  }

  return (
    <StudyTeamTable
      rows={rows}
      totalRowsBeforeFilter={pendingInvitations.length}
      studyContextId=""
      companyDomain={companyDomain}
      readOnly={readOnly}
      pendingActionId={pendingActionId}
      filtersActive={false}
      onManage={() => {}}
      onResendInvite={onResendInvite}
      onRevokeInvite={onRevokeInvite}
      onRemoveAssignment={() => {}}
      onDeactivateMember={() => {}}
    />
  );
}

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(['admin', 'user']),
  study_id: z.string().min(1, 'Study is required'),
  study_role: z.string().min(1, 'Study role is required'),
});

type InviteValues = z.infer<typeof inviteSchema>;

function StudyInviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
  studies,
  defaultStudyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  studies: Study[];
  defaultStudyId: string;
}) {
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      study_id: defaultStudyId,
      study_role: 'clinical_research_associate',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        email: '',
        first_name: '',
        last_name: '',
        role: 'user',
        study_id: defaultStudyId,
        study_role: 'clinical_research_associate',
      });
    }
  }, [open, defaultStudyId, form]);

  const onSubmit = async (values: InviteValues) => {
    const { error } = await inviteUser({
      email: values.email,
      first_name: values.first_name || undefined,
      last_name: values.last_name || undefined,
      role: values.role,
      study_id: values.study_id,
      study_role: values.study_role as TeamMemberRole,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Invitation sent');
    onSuccess();
  };

  const hasStudies = studies.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member. They will receive an email
            with a link to join your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="colleague@example.com"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name (optional)</Label>
              <Input {...form.register('first_name')} />
            </div>
            <div className="space-y-2">
              <Label>Last Name (optional)</Label>
              <Input {...form.register('last_name')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>App Role</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(val) => form.setValue('role', val as 'admin' | 'user')}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select role"
                  getDisplayLabel={(v) => (v === 'admin' ? 'Admin' : 'User')}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Study</Label>
            <Select
              value={form.watch('study_id')}
              onValueChange={(val) => form.setValue('study_id', val)}
              disabled={!hasStudies}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select study"
                  getDisplayLabel={(v) => {
                    const s = studies.find((st) => st.id === v);
                    if (!s) return 'Select study';
                    return s.study_name?.trim() || s.protocol_number;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.study_name?.trim() || s.protocol_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Study Role</Label>
            <Select
              value={form.watch('study_role')}
              onValueChange={(val) => form.setValue('study_role', val)}
              disabled={!hasStudies}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select role"
                  getDisplayLabel={(v) =>
                    TEAM_ROLE_OPTIONS.find((o) => o.value === v)?.label ?? String(v)
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLE_OPTIONS.filter((o) => o.value !== 'custom').map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !hasStudies}>
              {form.formState.isSubmitting ? 'Sending…' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
