'use client';

import { useState, useCallback, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  Trash2,
  UserCircle,
  Building2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import type {
  StudyTeamMemberWithProfile,
  TeamMemberRole,
  TeamRole,
  StudySite,
} from '@/lib/types/ctms';
import { TEAM_ROLE_OPTIONS, TEAM_ROLE_LABEL } from '@/lib/types/ctms';
import {
  getStudyTeamMembers,
  getCompanyProfiles,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
} from '@/lib/actions/team';

interface TeamTabProps {
  studyId: string;
  initialMembers: StudyTeamMemberWithProfile[];
  teamRoles: TeamRole[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
}

export function TeamTab({ studyId, initialMembers, teamRoles, sites }: TeamTabProps) {
  const [members, setMembers] = useState(initialMembers);
  const [, startTransition] = useTransition();

  const refreshMembers = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getStudyTeamMembers(studyId);
        setMembers(data);
      } catch {
        toast.error('Failed to refresh team data');
      }
    });
  }, [studyId]);

  const handleRemove = async (id: string) => {
    const { error } = await removeTeamMember(id, studyId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Team member removed');
    refreshMembers();
  };

  const handleToggleActive = async (member: StudyTeamMemberWithProfile) => {
    const { error } = await updateTeamMember({
      id: member.id,
      study_id: studyId,
      is_active: !member.is_active,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(member.is_active ? 'Member deactivated' : 'Member activated');
    refreshMembers();
  };

  const getRoleDisplay = (member: StudyTeamMemberWithProfile) => {
    if (member.role === 'custom' && member.team_roles) {
      return member.team_roles.role_name;
    }
    return TEAM_ROLE_LABEL[member.role];
  };

  const memberName = (member: StudyTeamMemberWithProfile) => {
    const p = member.profiles;
    if (!p) return 'Unknown';
    const parts = [p.first_name, p.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : p.email ?? 'Unknown';
  };

  const initials = (member: StudyTeamMemberWithProfile) => {
    const p = member.profiles;
    if (!p) return '?';
    const f = p.first_name?.[0] ?? '';
    const l = p.last_name?.[0] ?? '';
    const fromName = (f + l).toUpperCase();
    if (fromName) return fromName;
    const fromEmail = p.email?.[0];
    return fromEmail ? fromEmail.toUpperCase() : '?';
  };

  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Study Team</h3>
          <p className="text-sm text-muted-foreground">
            {activeCount} active member{activeCount !== 1 ? 's' : ''} assigned.
          </p>
        </div>
        <AddTeamMemberDialog
          studyId={studyId}
          teamRoles={teamRoles}
          sites={sites}
          existingMemberIds={members.map((m) => m.profile_id)}
          onSuccess={refreshMembers}
        />
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCircle className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No team members assigned</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add team members to track roles and responsibilities for this study.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Team Member</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs">Site Assignment</TableHead>
                <TableHead className="text-xs">Start Date</TableHead>
                <TableHead className="text-xs">End Date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} className={!member.is_active ? 'opacity-50' : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{initials(member)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{memberName(member)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profiles?.email ?? '—'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getRoleDisplay(member)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {member.study_sites ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {member.study_sites.name}
                      </span>
                    ) : (
                      'All Sites'
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {member.start_date
                      ? new Date(member.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {member.end_date
                      ? new Date(member.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.is_active ? 'default' : 'secondary'} className="text-xs">
                      {member.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleToggleActive(member)}
                        title={member.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {member.is_active ? (
                          <UserX className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <UserCheck className="h-3 w-3 text-green-600" />
                        )}
                      </Button>
                      <EditTeamMemberDialog
                        member={member}
                        studyId={studyId}
                        teamRoles={teamRoles}
                        sites={sites}
                        onSuccess={refreshMembers}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {memberName(member)} from this study? This does not delete their account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemove(member.id)}>
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
  );
}

// Add Team Member Dialog

const addMemberSchema = z.object({
  profile_id: z.string().min(1, 'Please select a team member'),
  role: z.string().min(1, 'Role is required'),
  custom_role_id: z.string().optional(),
  site_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

function AddTeamMemberDialog({
  studyId,
  teamRoles,
  sites,
  existingMemberIds,
  onSuccess,
}: {
  studyId: string;
  teamRoles: TeamRole[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  existingMemberIds: string[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      profile_id: '',
      role: 'clinical_research_associate',
      custom_role_id: '',
      site_id: '',
      start_date: '',
      end_date: '',
    },
  });

  const selectedRole = form.watch('role');

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && profiles.length === 0) {
      setLoadingProfiles(true);
      try {
        const data = await getCompanyProfiles();
        setProfiles(data);
      } catch {
        toast.error('Failed to load team members');
      }
      setLoadingProfiles(false);
    }
  };

  const onSubmit = async (values: AddMemberFormValues) => {
    const { error } = await addTeamMember({
      study_id: studyId,
      profile_id: values.profile_id,
      role: values.role as TeamMemberRole,
      custom_role_id: values.role === 'custom' ? values.custom_role_id : undefined,
      site_id: values.site_id || undefined,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Team member added');
    setOpen(false);
    form.reset();
    onSuccess();
  };

  const availableProfiles = profiles.filter((p) => !existingMemberIds.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Member
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Assign a team member to this study with a role.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Team Member</Label>
            {loadingProfiles ? (
              <p className="text-xs text-muted-foreground">Loading team members...</p>
            ) : (
              <Select value={form.watch('profile_id')} onValueChange={(val) => form.setValue('profile_id', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a person" />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || 'Unknown'}
                    </SelectItem>
                  ))}
                  {availableProfiles.length === 0 && (
                    <div className="px-2 py-1 text-xs text-muted-foreground">
                      No available members to add.
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
            {form.formState.errors.profile_id && (
              <p className="text-xs text-destructive">{form.formState.errors.profile_id.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(val) => form.setValue('role', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRole === 'custom' && teamRoles.length > 0 && (
              <div className="space-y-2">
                <Label>Custom Role</Label>
                <Select value={form.watch('custom_role_id')} onValueChange={(val) => form.setValue('custom_role_id', val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select custom role" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {sites.length > 0 && (
            <div className="space-y-2">
              <Label>Site Assignment (optional)</Label>
              <Select value={form.watch('site_id')} onValueChange={(val) => form.setValue('site_id', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sites</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.site_number} — {s.name}
                    </SelectItem>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Team Member Dialog

const editMemberSchema = z.object({
  role: z.string().min(1),
  custom_role_id: z.string().optional(),
  site_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type EditMemberFormValues = z.infer<typeof editMemberSchema>;

function EditTeamMemberDialog({
  member,
  studyId,
  teamRoles,
  sites,
  onSuccess,
}: {
  member: StudyTeamMemberWithProfile;
  studyId: string;
  teamRoles: TeamRole[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<EditMemberFormValues>({
    resolver: zodResolver(editMemberSchema),
    defaultValues: {
      role: member.role,
      custom_role_id: member.custom_role_id ?? '',
      site_id: member.site_id ?? '',
      start_date: member.start_date ?? '',
      end_date: member.end_date ?? '',
    },
  });

  const selectedRole = form.watch('role');

  const onSubmit = async (values: EditMemberFormValues) => {
    const { error } = await updateTeamMember({
      id: member.id,
      study_id: studyId,
      role: values.role as TeamMemberRole,
      custom_role_id: values.role === 'custom' ? values.custom_role_id : '',
      site_id: values.site_id,
      start_date: values.start_date,
      end_date: values.end_date,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Team member updated');
    setOpen(false);
    onSuccess();
  };

  const memberName =
    member.profiles == null
      ? 'Unknown'
      : [member.profiles.first_name, member.profiles.last_name].filter(Boolean).join(' ') ||
        member.profiles.email ||
        'Unknown';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
        <Pencil className="h-3 w-3" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
          <DialogDescription>Update role and assignment details for {memberName}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(val) => form.setValue('role', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRole === 'custom' && teamRoles.length > 0 && (
              <div className="space-y-2">
                <Label>Custom Role</Label>
                <Select value={form.watch('custom_role_id')} onValueChange={(val) => form.setValue('custom_role_id', val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select custom role" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.role_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {sites.length > 0 && (
            <div className="space-y-2">
              <Label>Site Assignment</Label>
              <Select value={form.watch('site_id')} onValueChange={(val) => form.setValue('site_id', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sites</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.site_number} — {s.name}
                    </SelectItem>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
