'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/ui/status-badge';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

import {
  TEAM_ROLE_LABEL,
  TEAM_ROLE_OPTIONS,
  type TeamMemberRole,
  type TeamMemberWithStudies,
  type TeamRole,
  type Study,
} from '@/lib/types/ctms';
import {
  addTeamMember,
  removeTeamMember,
  updateProfile,
  updateTeamMember,
} from '@/lib/actions/team';

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  app_role: z.enum(['admin', 'user']),
});

type ProfileValues = z.infer<typeof profileSchema>;

const assignmentSchema = z.object({
  study_id: z.string().min(1, 'Study is required'),
  role: z.string().min(1, 'Role is required'),
  custom_role_id: z.string().optional(),
});

type AssignmentValues = z.infer<typeof assignmentSchema>;

interface ManageMemberDrawerProps {
  member: TeamMemberWithStudies;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  studies: Study[];
  teamRoles: TeamRole[];
  studyContextId: string;
  readOnly: boolean;
}

export function ManageMemberDrawer({
  member,
  open,
  onOpenChange,
  onSuccess,
  studies,
  teamRoles,
  studyContextId,
  readOnly,
}: ManageMemberDrawerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [showAddAssignment, setShowAddAssignment] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: member.first_name ?? '',
      last_name: member.last_name ?? '',
      app_role: member.app_role,
    },
  });

  const assignmentForm = useForm<AssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      study_id: studyContextId,
      role: 'clinical_research_associate',
      custom_role_id: '',
    },
  });

  const watchedRole = assignmentForm.watch('role');

  const handleProfileSave = profileForm.handleSubmit(async (values) => {
    const { error } = await updateProfile({
      profile_id: member.profile_id,
      first_name: values.first_name,
      last_name: values.last_name,
      role: values.app_role,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Profile updated');
    startTransition(() => router.refresh());
    onSuccess();
  });

  const handleAddAssignment = assignmentForm.handleSubmit(async (values) => {
    const { error } = await addTeamMember({
      study_id: values.study_id,
      profile_id: member.profile_id,
      role: values.role as TeamMemberRole,
      custom_role_id: values.role === 'custom' ? values.custom_role_id : undefined,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Assignment added');
    assignmentForm.reset({
      study_id: studyContextId,
      role: 'clinical_research_associate',
      custom_role_id: '',
    });
    setShowAddAssignment(false);
    startTransition(() => router.refresh());
    onSuccess();
  });

  const handleAssignmentToggleActive = async (
    assignment: TeamMemberWithStudies['assignments'][number]
  ) => {
    const { error } = await updateTeamMember({
      id: assignment.id,
      study_id: assignment.study_id,
      is_active: !assignment.is_active,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(assignment.is_active ? 'Assignment deactivated' : 'Assignment activated');
    startTransition(() => router.refresh());
    onSuccess();
  };

  const handleAssignmentRoleChange = async (
    assignment: TeamMemberWithStudies['assignments'][number],
    nextRole: TeamMemberRole
  ) => {
    const { error } = await updateTeamMember({
      id: assignment.id,
      study_id: assignment.study_id,
      role: nextRole,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Role updated');
    setEditingAssignmentId(null);
    startTransition(() => router.refresh());
    onSuccess();
  };

  const handleRemoveAssignment = async (
    assignment: TeamMemberWithStudies['assignments'][number]
  ) => {
    const { error } = await removeTeamMember(assignment.id, assignment.study_id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Assignment removed');
    startTransition(() => router.refresh());
    onSuccess();
  };

  const initials =
    ((member.first_name?.[0] ?? '') + (member.last_name?.[0] ?? '')).toUpperCase() ||
    (member.email?.[0] ?? '?').toUpperCase();
  const fullName =
    [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Unknown';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">{fullName}</SheetTitle>
              <SheetDescription className="truncate text-xs">
                {member.email ?? 'No email on file'}
              </SheetDescription>
            </div>
            <Badge
              variant={member.app_role === 'admin' ? 'default' : 'secondary'}
              className="text-[10px]"
            >
              {member.app_role === 'admin' ? 'Admin' : 'User'}
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <section className="space-y-3">
            <header>
              <h3 className="text-sm font-semibold text-foreground">Profile</h3>
              <p className="text-xs text-muted-foreground">
                Update display name and platform role.
              </p>
            </header>
            <form onSubmit={handleProfileSave} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name</Label>
                  <Input
                    {...profileForm.register('first_name')}
                    disabled={readOnly}
                  />
                  {profileForm.formState.errors.first_name && (
                    <p className="text-[10px] text-destructive">
                      {profileForm.formState.errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Name</Label>
                  <Input
                    {...profileForm.register('last_name')}
                    disabled={readOnly}
                  />
                  {profileForm.formState.errors.last_name && (
                    <p className="text-[10px] text-destructive">
                      {profileForm.formState.errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Platform Role</Label>
                <Select
                  value={profileForm.watch('app_role')}
                  onValueChange={(val) =>
                    profileForm.setValue('app_role', val as 'admin' | 'user')
                  }
                  disabled={readOnly}
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
              <div className="flex justify-end">
                {readOnly ? (
                  <Tooltip>
                    <TooltipTrigger render={<span className="inline-flex" />}>
                      <Button type="button" size="sm" disabled>
                        Save Profile
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {STUDY_DEACTIVATED_TOOLTIP}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={profileForm.formState.isSubmitting}
                  >
                    {profileForm.formState.isSubmitting ? 'Saving…' : 'Save Profile'}
                  </Button>
                )}
              </div>
            </form>
          </section>

          <section className="space-y-3">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Study Assignments</h3>
                <p className="text-xs text-muted-foreground">
                  {member.assignments.length === 0
                    ? 'No assignments yet.'
                    : `${member.assignments.length} ${member.assignments.length === 1 ? 'assignment' : 'assignments'}`}
                </p>
              </div>
              {readOnly ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    <Button size="sm" variant="outline" disabled>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {STUDY_DEACTIVATED_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddAssignment((s) => !s)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {showAddAssignment ? 'Cancel' : 'Add'}
                </Button>
              )}
            </header>

            {showAddAssignment && !readOnly && (
              <form
                onSubmit={handleAddAssignment}
                className="space-y-3 rounded-md border bg-muted/30 p-3"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs">Study</Label>
                  <Select
                    value={assignmentForm.watch('study_id')}
                    onValueChange={(val) => assignmentForm.setValue('study_id', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select study" />
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
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select
                    value={watchedRole}
                    onValueChange={(val) => assignmentForm.setValue('role', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {watchedRole === 'custom' && teamRoles.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Custom Role</Label>
                    <Select
                      value={assignmentForm.watch('custom_role_id') ?? ''}
                      onValueChange={(val) =>
                        assignmentForm.setValue('custom_role_id', val)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select custom role" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamRoles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.role_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={assignmentForm.formState.isSubmitting}
                  >
                    {assignmentForm.formState.isSubmitting ? 'Adding…' : 'Add Assignment'}
                  </Button>
                </div>
              </form>
            )}

            <ul className="space-y-2">
              {member.assignments.map((assignment) => {
                const isEditing = editingAssignmentId === assignment.id;
                return (
                  <li
                    key={assignment.id}
                    className="rounded-md border bg-background p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/protected/studies/${assignment.study_id}`}
                          className="block truncate text-sm font-medium text-primary hover:underline"
                        >
                          {assignment.study_title}
                        </Link>
                        {assignment.protocol_number && (
                          <p className="text-[11px] text-muted-foreground">
                            {assignment.protocol_number}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={assignment.is_active ? 'active' : 'inactive'} />
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      {isEditing && !readOnly ? (
                        <Select
                          value={assignment.role}
                          onValueChange={(val) =>
                            handleAssignmentRoleChange(assignment, val as TeamMemberRole)
                          }
                        >
                          <SelectTrigger className="h-7 w-[180px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {assignment.role === 'custom' && assignment.custom_role_name
                            ? assignment.custom_role_name
                            : TEAM_ROLE_LABEL[assignment.role]}
                        </Badge>
                      )}
                      {assignment.site_name && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{assignment.site_name}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={assignment.is_active}
                          onCheckedChange={() => handleAssignmentToggleActive(assignment)}
                          disabled={readOnly}
                        />
                        Active
                      </label>
                      <div className="flex items-center gap-1">
                        {readOnly ? (
                          <Tooltip>
                            <TooltipTrigger render={<span className="inline-flex" />}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled
                                aria-label="Edit assignment"
                              >
                                <Pencil className="h-3.5 w-3.5" />
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
                            onClick={() =>
                              setEditingAssignmentId(isEditing ? null : assignment.id)
                            }
                            aria-label={isEditing ? 'Done editing' : 'Edit assignment'}
                          >
                            {isEditing ? (
                              <RefreshCw className="h-3.5 w-3.5" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5" />
                            )}
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
                                aria-label="Remove assignment"
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
                                  aria-label="Remove assignment"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              }
                            />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove this assignment from &ldquo;{assignment.study_title}&rdquo;?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveAssignment(assignment)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
