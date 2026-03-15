'use client';

import { useState, useMemo, useCallback, useTransition } from 'react';
import Link from 'next/link';
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
import { Switch } from '@/components/ui/switch';

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
} from '@/lib/actions/team';

interface TeamDirectoryProps {
  members: TeamMemberWithStudies[];
  studies: Study[];
  teamRoles: TeamRole[];
}

type AssignmentStatusFilter = 'all' | 'has_assignments' | 'no_assignments';
type AppRoleFilter = 'all' | 'admin' | 'user';

export function TeamDirectory({ members: initialMembers, studies, teamRoles }: TeamDirectoryProps) {
  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatusFilter>('all');
  const [appRoleFilter, setAppRoleFilter] = useState<AppRoleFilter>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingMember, setEditingMember] = useState<TeamMemberWithStudies | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<{ member: TeamMemberWithStudies; assignment: TeamMemberWithStudies['assignments'][number] } | null>(null);
  const [addingAssignmentFor, setAddingAssignmentFor] = useState<TeamMemberWithStudies | null>(null);
  const [, startTransition] = useTransition();

  const refreshMembers = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getTeamDirectory();
        setMembers(data);
      } catch {
        toast.error('Failed to refresh team data');
      }
    });
  }, [startTransition]);

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
    const rows = [['Name', 'Email', 'App Role', 'Assignments', 'Studies']];
    filteredMembers.forEach((m) => {
      const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Unknown';
      const studyTitles = m.assignments.map((a) => a.study_title).join('; ');
      rows.push([name, m.email ?? '', m.app_role, String(m.assignments.length), studyTitles]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team-directory.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <Card className="rounded-lg">
        <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
          {[
            { label: 'Total Members', value: members.length, markerColor: null as string | null },
            { label: 'With Assignments', value: members.filter((m) => m.assignments.length > 0).length, markerColor: 'bg-emerald-500' },
            { label: 'Total Assignments', value: members.reduce((sum, m) => sum + m.assignments.length, 0), markerColor: 'bg-blue-500' },
            { label: 'Active Roles', value: activeRolesCount, markerColor: 'bg-violet-500' },
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
            <SelectValue
              placeholder="All Roles"
              getDisplayLabel={(v) => {
                if (v === 'all') return 'All Roles';
                return TEAM_ROLE_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
              }}
            />
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
            <SelectValue
              placeholder="All App Roles"
              getDisplayLabel={(v) => {
                if (v === 'all') return 'All App Roles';
                if (v === 'admin') return 'Admin';
                return 'User';
              }}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All App Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCsv} className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No team members found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adjust filters or invite team members to your company.
            </p>
          </CardContent>
        </Card>
      ) : (
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
              {filteredMembers.map((member) => {
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
                    onToggleExpand={() => toggleExpanded(member.profile_id)}
                    onEditMember={() => setEditingMember(member)}
                    onEditAssignment={(assignment) => setEditingAssignment({ member, assignment })}
                    onAddAssignment={() => setAddingAssignmentFor(member)}
                    onDeleteAssignment={handleDeleteAssignment}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
  onToggleExpand: () => void;
  onEditMember: () => void;
  onEditAssignment: (a: TeamMemberWithStudies['assignments'][number]) => void;
  onAddAssignment: () => void;
  onDeleteAssignment: (id: string, studyId: string) => void;
}) {
  return (
    <>
      <TableRow className="hover:bg-[#79D7BE] cursor-pointer h-[40px]" onClick={onToggleExpand}>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); onEditMember(); }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="p-0 bg-muted/30">
            <div className="px-6 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Study Assignments</p>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddAssignment}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Assignment
                </Button>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onEditAssignment(a)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
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
      role: 'CRA',
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
                  getDisplayLabel={(v) => studies.find((s) => s.id === v)?.title ?? 'Select study'}
                />
              </SelectTrigger>
              <SelectContent>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
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
