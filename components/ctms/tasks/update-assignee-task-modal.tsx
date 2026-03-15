'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
} from '@/components/ui/alert-dialog';
import { getTaskById, updateTask, deleteTask, getTaskComments, addTaskComment } from '@/lib/actions/tasks';
import { getCompanyProfiles } from '@/lib/actions/team';
import { getAllSites } from '@/lib/actions/sites';
import type { TaskWithRelations } from '@/lib/types/tasks';
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  ON_TRACK_OPTIONS,
} from '@/lib/types/tasks';

function capitalizeLabel(str: string | null | undefined): string {
  if (str == null || str === '') return '';
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function displayLabel(value: string | null, label: string | null | undefined, placeholder: string): string | null {
  if (!value) return null;
  if (label == null || label === '' || UUID_REGEX.test(label)) return placeholder;
  return capitalizeLabel(label);
}

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  planned_start_date: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  on_track_status: z.enum(['on_track', 'at_risk', 'off_track']).optional().nullable(),
  site_id: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface UpdateAssigneeTaskModalProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isAdmin?: boolean;
  staticSiteContext?: boolean;
  /** When true, Description, Site Name, and Assigned To are shown as read-only static text. */
  staticDescriptionSiteAndAssignee?: boolean;
  /** When true, show Delete if current user created the task (in addition to admin). */
  allowCreatorDelete?: boolean;
  /** Current user's profile id; required for allowCreatorDelete. */
  currentUserProfileId?: string;
  /** When true, Task / Activity Name is editable and submitted with the form. */
  editableTaskTitle?: boolean;
  dialogTitle?: string;
}

export function UpdateAssigneeTaskModal({
  taskId,
  open,
  onOpenChange,
  onSuccess,
  isAdmin = false,
  staticSiteContext = false,
  staticDescriptionSiteAndAssignee = false,
  allowCreatorDelete = false,
  currentUserProfileId,
  editableTaskTitle = false,
  dialogTitle = 'Update Task',
}: UpdateAssigneeTaskModalProps) {
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; first_name: string | null; last_name: string | null; email: string | null }[]>([]);
  const [comments, setComments] = useState<{ id: string; content: string; created_at: string; profiles?: { first_name: string | null; last_name: string | null } | null }[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      planned_start_date: '',
      due_date: '',
      status: 'not_started',
      priority: 'low',
      on_track_status: null,
      site_id: null,
      assigned_to: null,
    },
  });

  useEffect(() => {
    if (!open || !taskId) return;
    (async () => {
      const t = await getTaskById(taskId);
      setTask(t);
      if (t) {
        form.reset({
          title: t.title ?? '',
          description: t.description ?? '',
          planned_start_date: t.planned_start_date ?? '',
          due_date: t.due_date ?? '',
          status: t.status,
          priority: t.priority,
          on_track_status: t.on_track_status ?? null,
          site_id: t.site_id ?? null,
          assigned_to: t.assigned_to ?? null,
        });
        const [sitesRes, profilesRes, commentsRes] = await Promise.all([
          getAllSites({ studyId: t.study_id }),
          getCompanyProfiles(),
          getTaskComments(taskId),
        ]);
        setSites(sitesRes.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
        setProfiles(profilesRes);
        setComments(commentsRes);
      }
    })();
  }, [open, taskId, form]);

  const onSubmit = async (values: FormValues) => {
    if (!taskId) return;
    const payload: Parameters<typeof updateTask>[1] = {
      description: values.description ?? null,
      planned_start_date: values.planned_start_date || null,
      due_date: values.due_date || null,
      status: values.status,
      priority: values.priority,
      on_track_status: values.on_track_status,
      site_id: values.site_id,
      assigned_to: values.assigned_to,
    };
    if (editableTaskTitle && values.title != null && values.title.trim()) {
      payload.title = values.title.trim();
    }
    const { error } = await updateTask(taskId, payload);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Task updated');
    onSuccess();
    onOpenChange(false);
  };

  const handleDelete = async () => {
    const { error } = await deleteTask(taskId);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Task deleted');
    setShowDeleteConfirm(false);
    onSuccess();
    onOpenChange(false);
  };

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    const { error } = await addTaskComment(taskId, content);
    if (error) {
      toast.error(error);
      return;
    }
    const updated = await getTaskComments(taskId);
    setComments(updated);
    setNewComment('');
  };

  const milestoneName = task?.study_milestones?.name ?? '—';
  const taskTitle = task?.title ?? '—';
  const assigneeDisplay = task?.profiles
    ? [task.profiles.first_name, task.profiles.last_name].filter(Boolean).join(' ') || task.profiles.email || '—'
    : '—';
  const showStaticDescription = staticSiteContext || staticDescriptionSiteAndAssignee;
  const showStaticSite = staticSiteContext || staticDescriptionSiteAndAssignee;
  const showStaticAssignee = staticDescriptionSiteAndAssignee;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{dialogTitle}</DialogTitle>
          </DialogHeader>
          {task && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Milestone Name</Label>
                  <Input value={milestoneName} readOnly className="bg-[color-mix(in_oklch,var(--muted)_95%,black)]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-title">Task / Activity Name</Label>
                  {editableTaskTitle ? (
                    <Input
                      id="task-title"
                      {...form.register('title')}
                      className={form.formState.errors.title ? 'border-destructive' : ''}
                    />
                  ) : (
                    <Input value={taskTitle} readOnly className="bg-[color-mix(in_oklch,var(--muted)_95%,black)]" />
                  )}
                  {form.formState.errors.title && (
                    <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                {showStaticDescription ? (
                  <Textarea
                    id="description"
                    value={form.watch('description') ?? ''}
                    readOnly
                    rows={3}
                    className="bg-[color-mix(in_oklch,var(--muted)_95%,black)] resize-none min-h-0"
                  />
                ) : (
                  <Textarea
                    id="description"
                    placeholder="Provide Description..."
                    rows={3}
                    {...form.register('description')}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planned_start_date">Planned Start Date</Label>
                  <Input
                    id="planned_start_date"
                    type="date"
                    {...form.register('planned_start_date')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Planned Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    {...form.register('due_date')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(v) => form.setValue('status', v as FormValues['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue
                        getDisplayLabel={(v) => TASK_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? (v ?? '')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority Status</Label>
                  <Select
                    value={form.watch('priority')}
                    onValueChange={(v) => form.setValue('priority', v as FormValues['priority'])}
                  >
                    <SelectTrigger>
                      <SelectValue
                        getDisplayLabel={(v) => TASK_PRIORITY_OPTIONS.find((o) => o.value === v)?.label ?? (v ?? '')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task On Track?</Label>
                  <Select
                    value={form.watch('on_track_status') ?? ''}
                    onValueChange={(v) => form.setValue('on_track_status', v ? (v as FormValues['on_track_status']) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        getDisplayLabel={(v) => {
                          if (!v) return '—';
                          return ON_TRACK_OPTIONS.find((o) => o.value === v)?.label ?? v;
                        }}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {ON_TRACK_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Change Site Name</Label>
                  {showStaticSite ? (
                    <Input
                      value={task?.study_sites?.name ?? '—'}
                      readOnly
                      className="bg-[color-mix(in_oklch,var(--muted)_95%,black)]"
                    />
                  ) : (
                    <Select
                      value={form.watch('site_id') ?? ''}
                      onValueChange={(v) => form.setValue('site_id', v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder="Select Site..."
                          getDisplayLabel={(v) => {
                            if (!v) return null;
                            const site = sites.find((s) => s.id === v);
                            const label = site?.name ?? 'Select Site...';
                            return capitalizeLabel(label);
                          }}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">—</SelectItem>
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Replace Team Member</Label>
                {showStaticAssignee ? (
                  <Input
                    value={assigneeDisplay}
                    readOnly
                    className="bg-[color-mix(in_oklch,var(--muted)_95%,black)]"
                  />
                ) : (
                  <Select
                    value={form.watch('assigned_to') ?? ''}
                    onValueChange={(v) => form.setValue('assigned_to', v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder="Select Member"
                        getDisplayLabel={(v) => {
                          const p = profiles.find((x) => x.id === v);
                          const raw = p ? ([p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || null) : null;
                          return displayLabel(v, raw, 'Select Member');
                        }}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">—</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {[p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <DialogFooter className="flex flex-wrap gap-2">
                <Button type="submit">Save</Button>
                {(isAdmin || (allowCreatorDelete && currentUserProfileId && task?.created_by === currentUserProfileId)) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Task
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}

          {task && (
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-sm mb-2">Comments ({comments.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="text-xs p-2 rounded bg-muted/50"
                  >
                    <p className="font-medium">
                      {c.profiles
                        ? [c.profiles.first_name, c.profiles.last_name].filter(Boolean).join(' ') || 'User'
                        : 'User'}
                    </p>
                    <p className="text-muted-foreground mt-0.5">{c.content}</p>
                    <p className="text-muted-foreground text-[10px] mt-1">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={handleAddComment}>
                  Add
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
