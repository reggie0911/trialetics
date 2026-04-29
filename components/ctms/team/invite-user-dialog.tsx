'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

import type { TeamMemberRole, Study } from '@/lib/types/ctms';
import { TEAM_ROLE_OPTIONS } from '@/lib/types/ctms';
import { inviteUser } from '@/lib/actions/team';

/**
 * Compact identifier for a study used in select triggers and option rows.
 */
function studyShortLabel(s: Pick<Study, 'study_name' | 'protocol_number'>): string {
  return s.study_name?.trim() || s.protocol_number;
}

function studySelectDisplayLabel(
  studies: Study[],
  studyId: string | null | undefined,
  placeholder: string,
): string {
  if (!studyId?.trim()) return placeholder;
  const s = studies.find((x) => x.id === studyId);
  if (!s) return placeholder;
  return studyShortLabel(s);
}

export const inviteUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(['admin', 'user']),
  study_id: z.string().min(1, 'Study is required'),
  study_role: z.string().min(1, 'Study role is required'),
});

export type InviteUserValues = z.infer<typeof inviteUserSchema>;

export function InviteUserDialog({
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
    form.reset({
      email: '',
      first_name: '',
      last_name: '',
      role: 'user',
      study_id: '',
      study_role: 'clinical_research_associate',
    });
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
            Send an invitation to a new team member. They will receive an email with a link to
            join your organization.
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
              <p className="text-xs text-muted-foreground">
                Create a study first to invite team members.
              </p>
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
