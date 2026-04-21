'use client';

import { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Search,
  UserCircle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Download,
  Trash2,
  Building2,
  UserPlus,
  Mail,
  RefreshCw,
  Link2,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useStudyHub } from '@/components/ctms/study-hub-context';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';
import { useClientPagination } from '@/lib/hooks/use-client-pagination';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';

import type {
  TeamMemberWithStudies,
  TeamMemberRole,
  TeamRole,
  Study,
} from '@/lib/types/ctms';
import {
  TEAM_ROLE_LABEL,
  TEAM_ROLE_OPTIONS,
} from '@/lib/types/ctms';
import {
  updateProfile,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  getTeamDirectory,
  inviteUser,
  resendInvite,
  revokeInvite,
  createJoinLink,
  getJoinLinks,
  revokeJoinLink,
  type PendingInvitation,
  type JoinLink,
} from '@/lib/actions/team';
import { scopeTeamMembersToStudy } from '@/lib/team/scope-team-members';

/**
 * Compact identifier for a study used in select triggers and option rows.
 * Falls back from `study_name` (e.g. "Aurora IV") to the always-present
 * `protocol_number` (e.g. "TRI-DEMO-204") so the trigger never has to render
 * the full multi-line `title`.
 */
function studyShortLabel(s: Pick<Study, 'study_name' | 'protocol_number'>): string {
  return s.study_name?.trim() || s.protocol_number;
}

function studySelectDisplayLabel(studies: Study[], studyId: string | null | undefined, placeholder: string): string {
  if (!studyId?.trim()) return placeholder;
  const s = studies.find((s) => s.id === studyId);
  if (!s) return placeholder;
  return studyShortLabel(s);
}

interface TeamDirectoryProps {
  members: TeamMemberWithStudies[];
  studies: Study[];
  teamRoles: TeamRole[];
  pendingInvitations?: PendingInvitation[];
  joinLinks?: JoinLink[];
  isAdmin?: boolean;
  /** When set, only members with assignments on this study are shown (assignments filtered to this study). */
  studyContextId?: string;
}

type AssignmentStatusFilter = 'all' | 'has_assignments' | 'no_assignments';
type AppRoleFilter = 'all' | 'admin' | 'user';

export function TeamDirectory({
  members: initialMembers,
  studies,
  teamRoles,
  pendingInvitations = [],
  joinLinks: initialJoinLinks = [],
  isAdmin,
  studyContextId,
}: TeamDirectoryProps) {
  const [members, setMembers] = useState(() => scopeTeamMembersToStudy(initialMembers, studyContextId));

  useEffect(() => {
    setMembers(scopeTeamMembersToStudy(initialMembers, studyContextId));
  }, [initialMembers, studyContextId]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>('all');
  const [appRoleFilter, setAppRoleFilter] = useState<AppRoleFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingMember, setEditingMember] = useState<TeamMemberWithStudies | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<{ member: TeamMemberWithStudies; assignment: TeamMemberWithStudies['assignments'][number] } | null>(null);
  const [addingAssignmentFor, setAddingAssignmentFor] = useState<TeamMemberWithStudies | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [joinLinkDialogOpen, setJoinLinkDialogOpen] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'pending'>('members');
  const [, startTransition] = useTransition();
  const router = useRouter();
  const readOnly = useStudyHub()?.isStudyReadOnly ?? false;

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

  const refreshMembers = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getTeamDirectory();
        setMembers(scopeTeamMembersToStudy(data, studyContextId));
      } catch {
        toast.error('Failed to refresh team data');
      }
    });
  }, [startTransition, studyContextId]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (search) {
        const name = [m.first_name, m.last_name].filter(Boolean).join(' ').toLowerCase();
        const email = (m.email ?? '').toLowerCase();
        const s = search.toLowerCase();
        if (!name.includes(s) && !email.includes(s)) return false;
      }
      if (roleFilter !== 'all') {
        const hasRole = m.assignments.some((a) => a.role === roleFilter);
        if (!hasRole) return false;
      }
      if (statusFilter === 'has_assignments' && m.assignments.length === 0) return false;
      if (statusFilter === 'no_assignments' && m.assignments.length > 0) return false;
      if (appRoleFilter !== 'all' && m.app_role !== appRoleFilter) return false;
      return true;
    });
  }, [members, search, roleFilter, statusFilter, appRoleFilter]);

  const membersFiltersActive =
    Boolean(search.trim()) ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    appRoleFilter !== 'all';

  const membersPagination = useClientPagination({
    totalItems: filteredMembers.length,
    initialPageSize: 10,
    resetKey: [search, roleFilter, statusFilter, appRoleFilter],
  });
  const paginatedMembers = membersPagination.paginate(filteredMembers);

  const [pendingSearch, setPendingSearch] = useState('');

  const filteredInvitations = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    if (!q) return pendingInvitations;
    return pendingInvitations.filter((inv) => {
      const haystack = [
        inv.email,
        [inv.first_name, inv.last_name].filter(Boolean).join(' '),
        inv.invited_by_name ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [pendingInvitations, pendingSearch]);

  const invitationsPagination = useClientPagination({
    totalItems: filteredInvitations.length,
    initialPageSize: 10,
    resetKey: [pendingSearch],
  });
  const paginatedInvitations = invitationsPagination.paginate(filteredInvitations);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeRolesCount = useMemo(() => {
    const roles = new Set<string>();
    members.forEach((m) =>
      m.assignments
        .filter((a) => a.is_active)
        .forEach((a) => roles.add(a.role === 'custom' && a.custom_role_name ? a.custom_role_name : a.role))
    );
    return roles.size;
  }, [members]);

  const handleDeleteAssignment = async (assignmentId: string, studyId: string) => {
    const { error } = await removeTeamMember(assignmentId, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Assignment removed');
    refreshMembers();
  };

  const exportCsv = () => {
    const rows: string[][] = [['Name', 'Email', 'App Role', 'Assignments', 'Studies']];
    filteredMembers.forEach((m) => {
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Unknown';
      const studyTitles = m.assignments.map((a) => a.study_title).join('; ');
      rows.push([name, m.email ?? '', m.app_role, String(m.assignments.length), studyTitles]);
    });
    if (pendingInvitations.length > 0) {
      rows.push([]);
      rows.push(['Pending Invitations']);
      rows.push(['Email', 'Name', 'Role', 'Invited By', 'Invited Date']);
      pendingInvitations.forEach((inv) => {
        const name = [inv.first_name, inv.last_name].filter(Boolean).join(' ') || '—';
        rows.push([
          inv.email,
          name,
          inv.role === 'admin' ? 'Admin' : 'User',
          inv.invited_by_name ?? '—',
          new Date(inv.invited_at).toLocaleDateString(),
        ]);
      });
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team-directory.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" suppressHydrationWarning>
      {/* Summary bar */}
      <Card className="rounded-lg">
        <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
          {[
            { label: 'Total Members', value: members.length, markerColor: null as string | null },
            { label: 'With Assignments', value: members.filter((m) => m.assignments.length > 0).length, markerColor: 'bg-emerald-500' },
            { label: 'Total Assignments', value: members.reduce((sum, m) => sum + m.assignments.length, 0), markerColor: 'bg-blue-500' },
            { label: 'Active Roles', value: activeRolesCount, markerColor: 'bg-violet-500' },
            ...(pendingInvitations.length > 0
              ? [{ label: 'Pending Invites', value: pendingInvitations.length, markerColor: 'bg-amber-500' as string }]
              : []),
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              {item.markerColor && (
                <span className={`h-2 w-4 shrink-0 rounded-full ${item.markerColor}`} aria-hidden />
              )}
              <span>
                {item.label} ({item.value})
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Tabs tabsId="team-directory" defaultValue="members" className="space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-border">
          <TabsList className="h-auto border-0 p-0">
            <TabsTrigger value="members">Team Members</TabsTrigger>
            <TabsTrigger value="pending">
              Pending Invitations {pendingInvitations.length > 0 && `(${pendingInvitations.length})`}
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                {readOnly ? (
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Button variant="outline" size="sm" disabled aria-label="Join links">
                        <Link2 className="mr-2 h-4 w-4" />
                        Join Links
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {STUDY_DEACTIVATED_TOOLTIP}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setJoinLinkDialogOpen(true)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Join Links
                  </Button>
                )}
                {readOnly ? (
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Button variant="default" size="sm" disabled aria-label="Invite user">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite User
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {STUDY_DEACTIVATED_TOOLTIP}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button variant="default" size="sm" onClick={() => setInviteDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite User
                  </Button>
                )}
              </>
            )}
            {readOnly ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button variant="outline" size="sm" disabled aria-label="Export CSV">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {STUDY_DEACTIVATED_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="members" className="mt-4 space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles">
                  {roleFilter === 'all' ? 'All Roles' : TEAM_ROLE_OPTIONS.find((o) => o.value === roleFilter)?.label ?? roleFilter}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {TEAM_ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AssignmentStatusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue
                  placeholder="All Members"
                  getDisplayLabel={(v) => {
                    if (v === 'all') return 'All Members';
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
            <Select value={appRoleFilter} onValueChange={(v) => setAppRoleFilter(v as AppRoleFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All App Roles">
                  {appRoleFilter === 'all' ? 'All App Roles' : appRoleFilter === 'admin' ? 'Admin' : 'User'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All App Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Team Members Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[30px]" />
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">App Role</TableHead>
                  <TableHead className="text-xs">Assignments</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-10 text-center text-xs"
                    >
                      <UserCircle className="mx-auto mb-2 h-8 w-8 opacity-60" />
                      {membersFiltersActive
                        ? 'No members match your filters.'
                        : 'No team members found. Adjust filters or invite team members to your company.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMembers.map((member) => {
                    const name = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Unknown';
                    const initials = ((member.first_name?.[0] ?? '') + (member.last_name?.[0] ?? '')).toUpperCase() || '?';
                    const isExpanded = expandedIds.has(member.profile_id);
                    const activeCount = member.assignments.filter((a) => a.is_active).length;

                    return (
                      <MemberRows
                        key={member.profile_id}
                        member={member}
                        name={name}
                        initials={initials}
                        isExpanded={isExpanded}
                        activeCount={activeCount}
                        readOnly={readOnly}
                        onToggleExpand={() => toggleExpanded(member.profile_id)}
                        onEditMember={() => setEditingMember(member)}
                        onEditAssignment={(assignment) => setEditingAssignment({ member, assignment })}
                        onAddAssignment={() => setAddingAssignmentFor(member)}
                        onDeleteAssignment={handleDeleteAssignment}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="border-t px-3 py-2">
              <TablePaginationFooter
                pagination={membersPagination}
                totalItems={filteredMembers.length}
                itemNoun="member"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingInvitations.length === 0 ? (
            <Card className="rounded-lg border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Mail className="h-10 w-10 text-amber-600 dark:text-amber-500 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No pending invitations.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use Invite User to send invitations to new team members.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-lg border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="py-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Mail className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    <span>Pending Invitations</span>
                  </div>
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
                    <Input
                      value={pendingSearch}
                      onChange={(event) => setPendingSearch(event.target.value)}
                      placeholder="Search invitations..."
                      aria-label="Search pending invitations"
                      className="h-8 pl-7 text-xs"
                    />
                  </div>
                </div>
                <div className="rounded-md border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Role</TableHead>
                        <TableHead className="text-xs">Invited By</TableHead>
                        <TableHead className="text-xs">Invited Date</TableHead>
                        {isAdmin && (
                          <TableHead className="text-xs w-[100px]">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedInvitations.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={isAdmin ? 6 : 5}
                            className="text-muted-foreground py-8 text-center text-xs"
                          >
                            No invitations match your search.
                          </TableCell>
                        </TableRow>
                      ) : (
                      paginatedInvitations.map((inv) => {
                        const name = [inv.first_name, inv.last_name].filter(Boolean).join(' ') || '—';
                        const invitedDate = new Date(inv.invited_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                        const isActioning = pendingActionId === inv.id;
                        return (
                          <TableRow key={inv.id} className="h-[40px]">
                            <TableCell className="text-xs font-medium">{inv.email}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">
                                {inv.role === 'admin' ? 'Admin' : 'User'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {inv.invited_by_name ?? '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{invitedDate}</TableCell>
                            {isAdmin && (
                              <TableCell className="whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  {readOnly ? (
                                    <Tooltip>
                                      <TooltipTrigger render={<span className="inline-flex" />}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          disabled
                                          aria-label="Resend invite"
                                        >
                                          <RefreshCw className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-xs text-xs">
                                        {STUDY_DEACTIVATED_TOOLTIP}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => handleResendInvite(inv.id)}
                                      disabled={isActioning}
                                      title="Resend invite"
                                    >
                                      <RefreshCw className={`h-3.5 w-3.5 ${isActioning ? 'animate-spin' : ''}`} />
                                    </Button>
                                  )}
                                  {readOnly ? (
                                    <Tooltip>
                                      <TooltipTrigger render={<span className="inline-flex" />}>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          disabled
                                          aria-label="Revoke invite"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-xs text-xs">
                                        {STUDY_DEACTIVATED_TOOLTIP}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <AlertDialog>
                                      <AlertDialogTrigger
                                        render={
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            disabled={isActioning}
                                            title="Revoke invite"
                                          >
                                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                          </Button>
                                        }
                                      />
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Revoke the invitation for {inv.email}? They will no longer be able to join using the invite link.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleRevokeInvite(inv.id)}>
                                            Revoke
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                      )}
                    </TableBody>
                  </Table>
                  <div className="border-t px-3 py-2">
                    <TablePaginationFooter
                      pagination={invitationsPagination}
                      totalItems={filteredInvitations.length}
                      itemNoun="invitation"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Member Dialog */}
      {editingMember && (
        <EditMemberDialog
          member={editingMember}
          open={!!editingMember}
          onOpenChange={(open) => { if (!open) setEditingMember(null); }}
          onSuccess={() => { setEditingMember(null); refreshMembers(); }}
        />
      )}

      {/* Edit Assignment Dialog */}
      {editingAssignment && (
        <EditAssignmentDialog
          assignment={editingAssignment.assignment}
          studyId={editingAssignment.assignment.study_id}
          teamRoles={teamRoles}
          open={!!editingAssignment}
          onOpenChange={(open) => { if (!open) setEditingAssignment(null); }}
          onSuccess={() => { setEditingAssignment(null); refreshMembers(); }}
        />
      )}

      {/* Add Assignment Dialog */}
      {addingAssignmentFor && (
        <AddAssignmentDialog
          member={addingAssignmentFor}
          studies={studies}
          teamRoles={teamRoles}
          open={!!addingAssignmentFor}
          onOpenChange={(open) => { if (!open) setAddingAssignmentFor(null); }}
          onSuccess={() => { setAddingAssignmentFor(null); refreshMembers(); }}
        />
      )}

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={() => { setInviteDialogOpen(false); refreshMembers(); router.refresh(); }}
        studies={studies}
      />

      {/* Join Link Manager Dialog */}
      {isAdmin && (
        <JoinLinkManagerDialog
          open={joinLinkDialogOpen}
          onOpenChange={setJoinLinkDialogOpen}
          initialLinks={initialJoinLinks}
          studies={studies}
          onSuccess={() => { router.refresh(); }}
        />
      )}
    </div>
  );
}

// =====================================================
// Member Rows (main row + expanded sub-rows)
// =====================================================

function MemberRows({
  member,
  name,
  initials,
  isExpanded,
  activeCount,
  readOnly,
  onToggleExpand,
  onEditMember,
  onEditAssignment,
  onAddAssignment,
  onDeleteAssignment,
}: {
  member: TeamMemberWithStudies;
  name: string;
  initials: string;
  isExpanded: boolean;
  activeCount: number;
  readOnly: boolean;
  onToggleExpand: () => void;
  onEditMember: () => void;
  onEditAssignment: (a: TeamMemberWithStudies['assignments'][number]) => void;
  onAddAssignment: () => void;
  onDeleteAssignment: (id: string, studyId: string) => void;
}) {
  return (
    <>
      <TableRow className="h-[40px] cursor-pointer" onClick={onToggleExpand}>
        <TableCell className="p-2 whitespace-nowrap border-r border-border w-[30px]">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell className="p-2 whitespace-nowrap border-r border-border">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{name}</span>
          </div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap border-r border-border">
          {member.email ?? '—'}
        </TableCell>
        <TableCell className="whitespace-nowrap border-r border-border">
          <Badge variant={member.app_role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
            {member.app_role === 'admin' ? 'Admin' : 'User'}
          </Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap border-r border-border">
          <Badge variant="outline" className="text-[10px]">
            {member.assignments.length} {member.assignments.length === 1 ? 'study' : 'studies'}
          </Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap border-r border-border">
          {activeCount > 0 ? (
            <StatusBadge status="active" />
          ) : (
            <StatusBadge status="inactive" />
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {readOnly ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" onClick={(e) => e.stopPropagation()} />}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled aria-label="Edit member">
                  <Pencil className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {STUDY_DEACTIVATED_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); onEditMember(); }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="p-0 bg-muted/30">
            <div className="px-6 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Study Assignments</p>
                {readOnly ? (
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                        <Plus className="mr-1 h-3 w-3" />
                        Add Assignment
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {STUDY_DEACTIVATED_TOOLTIP}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddAssignment}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add Assignment
                  </Button>
                )}
              </div>
              {member.assignments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No assignments yet.</p>
              ) : (
                <div className="rounded-md border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] h-8">Study</TableHead>
                        <TableHead className="text-[10px] h-8">Role</TableHead>
                        <TableHead className="text-[10px] h-8">Site</TableHead>
                        <TableHead className="text-[10px] h-8">Active</TableHead>
                        <TableHead className="text-[10px] h-8 w-[70px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {member.assignments.map((a) => (
                        <TableRow key={a.id} className="h-[32px]">
                          <TableCell className="text-xs py-1">
                            <Link href={`/protected/studies/${a.study_id}`} className="text-primary hover:underline">
                              {a.study_title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-xs py-1">
                            <Badge variant="outline" className="text-[10px]">
                              {a.role === 'custom' && a.custom_role_name
                                ? a.custom_role_name
                                : TEAM_ROLE_LABEL[a.role]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-1">
                            {a.site_name ? (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {a.site_name}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="py-1">
                            <StatusBadge status={a.is_active ? 'active' : 'inactive'} />
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-1">
                              {readOnly ? (
                                <Tooltip>
                                  <TooltipTrigger render={<span className="inline-flex" />}>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled aria-label="Edit assignment">
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                                    {STUDY_DEACTIVATED_TOOLTIP}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => onEditAssignment(a)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                              {readOnly ? (
                                <Tooltip>
                                  <TooltipTrigger render={<span className="inline-flex" />}>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled aria-label="Remove assignment">
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                                    {STUDY_DEACTIVATED_TOOLTIP}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger
                                    render={<Button variant="ghost" size="sm" className="h-6 w-6 p-0" />}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Remove this team member from &ldquo;{a.study_title}&rdquo;?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => onDeleteAssignment(a.id, a.study_id)}>
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// =====================================================
// Edit Member Dialog
// =====================================================

const editMemberSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'user']),
});

type EditMemberValues = z.infer<typeof editMemberSchema>;

function EditMemberDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: {
  member: TeamMemberWithStudies;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const form = useForm<EditMemberValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      first_name: member.first_name ?? '',
      last_name: member.last_name ?? '',
      role: member.app_role,
    },
  });

  const onSubmit = async (values: EditMemberValues) => {
    const { error } = await updateProfile({
      profile_id: member.profile_id,
      first_name: values.first_name,
      last_name: values.last_name,
      role: values.role,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Member updated');
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>Update member profile details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input {...form.register('first_name')} />
              {form.formState.errors.first_name && (
                <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input {...form.register('last_name')} />
              {form.formState.errors.last_name && (
                <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={member.email ?? ''} disabled className="bg-muted/50" />
            <p className="text-[10px] text-muted-foreground">Email is tied to authentication and cannot be changed here.</p>
          </div>
          <div className="space-y-2">
            <Label>App Role</Label>
            <Select value={form.watch('role')} onValueChange={(val) => form.setValue('role', val as 'admin' | 'user')}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select role"
                  getDisplayLabel={(v) => v === 'admin' ? 'Admin' : 'User'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Edit Assignment Dialog
// =====================================================

const editAssignmentSchema = z.object({
  role: z.string().min(1),
  custom_role_id: z.string().optional(),
  is_active: z.boolean(),
});

type EditAssignmentValues = z.infer<typeof editAssignmentSchema>;

function EditAssignmentDialog({
  assignment,
  studyId,
  teamRoles,
  open,
  onOpenChange,
  onSuccess,
}: {
  assignment: TeamMemberWithStudies['assignments'][number];
  studyId: string;
  teamRoles: TeamRole[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const form = useForm<EditAssignmentValues>({
    resolver: zodResolver(editAssignmentSchema),
    defaultValues: {
      role: assignment.role,
      custom_role_id: '',
      is_active: assignment.is_active,
    },
  });

  const watchedRole = form.watch('role');

  const onSubmit = async (values: EditAssignmentValues) => {
    const { error } = await updateTeamMember({
      id: assignment.id,
      study_id: studyId,
      role: values.role as TeamMemberRole,
      custom_role_id: values.role === 'custom' ? values.custom_role_id : undefined,
      is_active: values.is_active,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Assignment updated');
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>
            Update assignment for &ldquo;{assignment.study_title}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={watchedRole} onValueChange={(val) => form.setValue('role', val)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select role"
                  getDisplayLabel={(v) => TEAM_ROLE_OPTIONS.find((o) => o.value === v)?.label ?? String(v)}
                />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {watchedRole === 'custom' && teamRoles.length > 0 && (
            <div className="space-y-2">
              <Label>Custom Role</Label>
              <Select value={form.watch('custom_role_id') ?? ''} onValueChange={(val) => form.setValue('custom_role_id', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Select custom role"
                    getDisplayLabel={(v) => teamRoles.find((r) => r.id === v)?.role_name ?? 'Select custom role'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {teamRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={form.watch('is_active')}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Add Assignment Dialog
// =====================================================

const addAssignmentSchema = z.object({
  study_id: z.string().min(1, 'Study is required'),
  role: z.string().min(1, 'Role is required'),
  custom_role_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type AddAssignmentValues = z.infer<typeof addAssignmentSchema>;

function AddAssignmentDialog({
  member,
  studies,
  teamRoles,
  open,
  onOpenChange,
  onSuccess,
}: {
  member: TeamMemberWithStudies;
  studies: Study[];
  teamRoles: TeamRole[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const form = useForm<AddAssignmentValues>({
    resolver: zodResolver(addAssignmentSchema),
    defaultValues: {
      study_id: '',
      role: 'clinical_research_associate',
      custom_role_id: '',
      start_date: '',
      end_date: '',
    },
  });

  const watchedRole = form.watch('role');
  const memberName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'this member';

  const onSubmit = async (values: AddAssignmentValues) => {
    const { error } = await addTeamMember({
      study_id: values.study_id,
      profile_id: member.profile_id,
      role: values.role as TeamMemberRole,
      custom_role_id: values.role === 'custom' ? values.custom_role_id : undefined,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Assignment added');
    onOpenChange(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Assignment</DialogTitle>
          <DialogDescription>
            Assign {memberName} to a study.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Study</Label>
            <Select value={form.watch('study_id')} onValueChange={(val) => form.setValue('study_id', val)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select study"
                  getDisplayLabel={(v) => studySelectDisplayLabel(studies, v, 'Select study')}
                />
              </SelectTrigger>
              <SelectContent>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className="truncate">{studyShortLabel(s)}</span>
                      {s.study_name?.trim() && (
                        <span className="text-muted-foreground text-xs">
                          {s.protocol_number}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.study_id && (
              <p className="text-xs text-destructive">{form.formState.errors.study_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={watchedRole} onValueChange={(val) => form.setValue('role', val)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select role"
                  getDisplayLabel={(v) => TEAM_ROLE_OPTIONS.find((o) => o.value === v)?.label ?? String(v)}
                />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {watchedRole === 'custom' && teamRoles.length > 0 && (
            <div className="space-y-2">
              <Label>Custom Role</Label>
              <Select value={form.watch('custom_role_id') ?? ''} onValueChange={(val) => form.setValue('custom_role_id', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Select custom role"
                    getDisplayLabel={(v) => teamRoles.find((r) => r.id === v)?.role_name ?? 'Select custom role'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {teamRoles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" {...form.register('start_date')} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" {...form.register('end_date')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Adding...' : 'Add Assignment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Invite User Dialog
// =====================================================

const inviteUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(['admin', 'user']),
  study_id: z.string().min(1, 'Study is required'),
  study_role: z.string().min(1, 'Study role is required'),
});

type InviteUserValues = z.infer<typeof inviteUserSchema>;

function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
  studies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  studies: Study[];
}) {
  const form = useForm<InviteUserValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      study_id: '',
      study_role: 'clinical_research_associate',
    },
  });

  const onSubmit = async (values: InviteUserValues) => {
    const { data, error } = await inviteUser({
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
    form.reset({ email: '', first_name: '', last_name: '', role: 'user', study_id: '', study_role: 'clinical_research_associate' });
    onOpenChange(false);
    onSuccess();
  };

  const hasStudies = studies.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member. They will receive an email with a link to join your organization.
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
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
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
                  getDisplayLabel={(v) => studySelectDisplayLabel(studies, v, 'Select study')}
                />
              </SelectTrigger>
              <SelectContent>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className="truncate">{studyShortLabel(s)}</span>
                      {s.study_name?.trim() && (
                        <span className="text-muted-foreground text-xs">
                          {s.protocol_number}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasStudies && (
              <p className="text-xs text-muted-foreground">Create a study first to invite team members.</p>
            )}
            {form.formState.errors.study_id && (
              <p className="text-xs text-destructive">{form.formState.errors.study_id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Study Role</Label>
            <Select
              value={form.watch('study_role') || 'clinical_research_associate'}
              onValueChange={(val) => form.setValue('study_role', val)}
              disabled={!hasStudies}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select role"
                  getDisplayLabel={(v) => TEAM_ROLE_OPTIONS.find((o) => o.value === v)?.label ?? v}
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
            {form.formState.errors.study_role && (
              <p className="text-xs text-destructive">{form.formState.errors.study_role.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !hasStudies}>
              {form.formState.isSubmitting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// Join Link Manager Dialog
// =====================================================

const joinLinkFormSchema = z.object({
  label: z.string().optional(),
  role: z.enum(['admin', 'user']),
  expiresInDays: z.union([z.literal(0), z.literal(7), z.literal(30), z.literal(90)]),
  maxUses: z.string().optional(),
  study_id: z.string().optional(),
  study_role: z.string().optional(),
});

type JoinLinkFormValues = z.infer<typeof joinLinkFormSchema>;

function JoinLinkManagerDialog({
  open,
  onOpenChange,
  initialLinks,
  studies,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLinks: JoinLink[];
  studies: Study[];
  onSuccess: () => void;
}) {
  const [links, setLinks] = useState<JoinLink[]>(initialLinks);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const form = useForm<JoinLinkFormValues>({
    resolver: zodResolver(joinLinkFormSchema),
    defaultValues: {
      label: '',
      role: 'user',
      expiresInDays: 0,
      maxUses: '',
      study_id: '',
      study_role: 'clinical_research_associate',
    },
  });

  const joinLinkStudyId = form.watch('study_id');
  const hasStudies = studies.length > 0;

  const loadLinks = useCallback(async () => {
    const data = await getJoinLinks();
    setLinks(data);
  }, []);

  useEffect(() => {
    if (open) {
      setLinks(initialLinks);
      startTransition(() => {
        loadLinks();
      });
    }
  }, [open, loadLinks, initialLinks]);

  const handleCopy = (token: string) => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${siteUrl}/join/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleRevoke = async (linkId: string) => {
    setRevokingId(linkId);
    try {
      const { error } = await revokeJoinLink(linkId);
      if (error) {
        toast.error(error);
      } else {
        toast.success('Join link revoked');
        await loadLinks();
        onSuccess();
      }
    } finally {
      setRevokingId(null);
    }
  };

  const handleCreate = async (values: JoinLinkFormValues) => {
    setIsLoading(true);
    try {
      const { data, error } = await createJoinLink({
        role: values.role,
        label: values.label?.trim() || undefined,
        expiresInDays: values.expiresInDays === 0 ? undefined : values.expiresInDays,
        maxUses: values.maxUses ? parseInt(values.maxUses, 10) : undefined,
      });
      if (error) {
        toast.error(error);
      } else if (data) {
        toast.success('Join link created');
        setLinks((prev) => [data, ...prev]);
        form.reset({
          label: '',
          role: 'user',
          expiresInDays: 0,
          maxUses: '',
          study_id: '',
          study_role: 'clinical_research_associate',
        });
        setShowCreateForm(false);
        handleCopy(data.token);
        onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never';
    const d = new Date(expiresAt);
    return d.toLocaleDateString();
  };

  const formatUses = (useCount: number, maxUses: number | null) => {
    if (maxUses == null) return `${useCount} / Unlimited`;
    return `${useCount} / ${maxUses}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Join Links</DialogTitle>
          <DialogDescription>
            Share these links so new users can create an account and join your company. Anyone with a link can sign up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!showCreateForm ? (
            <Button variant="outline" size="sm" onClick={() => setShowCreateForm(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Generate New Link
            </Button>
          ) : (
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4 rounded-md border p-4">
              <div className="space-y-2">
                <Label>Label (optional)</Label>
                <Input placeholder="e.g. Marketing team" {...form.register('label')} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.watch('role')}
                  onValueChange={(v) => form.setValue('role', v as 'admin' | 'user')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Study (optional)</Label>
                <Select
                  value={form.watch('study_id') || '__none__'}
                  onValueChange={(v) => {
                    if (v === '__none__') {
                      form.setValue('study_id', '');
                      form.setValue('study_role', 'clinical_research_associate');
                    } else {
                      form.setValue('study_id', v);
                    }
                  }}
                  disabled={!hasStudies}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder="No study assignment"
                      getDisplayLabel={(v) =>
                        !v || v === '__none__'
                          ? 'No study assignment'
                          : studySelectDisplayLabel(studies, v, 'Select study')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No study assignment</SelectItem>
                    {studies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className="truncate">{studyShortLabel(s)}</span>
                          {s.study_name?.trim() && (
                            <span className="text-muted-foreground text-xs">
                              {s.protocol_number}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!hasStudies && (
                  <p className="text-xs text-muted-foreground">Create a study first to assign new members to a study.</p>
                )}
              </div>
              {joinLinkStudyId && joinLinkStudyId !== '__none__' && (
                <div className="space-y-2">
                  <Label>Study role</Label>
                  <Select
                    value={form.watch('study_role') || 'clinical_research_associate'}
                    onValueChange={(v) => form.setValue('study_role', v)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        getDisplayLabel={(v) => TEAM_ROLE_OPTIONS.find((o) => o.value === v)?.label ?? String(v)}
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
              )}
              <div className="space-y-2">
                <Label>Expires in</Label>
                <Select
                  value={String(form.watch('expiresInDays'))}
                  onValueChange={(v) => form.setValue('expiresInDays', parseInt(v, 10) as 0 | 7 | 30 | 90)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Never</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max uses (optional)</Label>
                <Input type="number" min={1} placeholder="Unlimited" {...form.register('maxUses')} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create Link'}
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Active links</p>
            {links.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active join links. Generate one above.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{link.label || 'Unnamed link'}</p>
                      <p className="text-xs text-muted-foreground">
                        Role: {link.role}
                        {link.study_id
                          ? ` · Study: ${studies.find((s) => s.id === link.study_id)?.title ?? link.study_id} (${TEAM_ROLE_LABEL[link.study_role as TeamMemberRole] ?? link.study_role})`
                          : ''}
                        {' '}
                        · Expires: {formatExpiry(link.expires_at)} · Uses: {formatUses(link.use_count, link.max_uses)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(link.token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                          disabled={revokingId === link.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke this join link?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Anyone with this link will no longer be able to use it to join your company.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleRevoke(link.id)}
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
