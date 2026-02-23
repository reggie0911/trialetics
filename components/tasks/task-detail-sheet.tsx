'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateTask, getTaskComments, addTaskComment } from '@/lib/actions/tasks';
import type { ProtocolTask, TaskStatus, TaskPriority, TaskComment } from '@/lib/types/tasks';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/lib/types/tasks';

interface TaskDetailSheetProps {
  task: ProtocolTask;
  profileId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function TaskDetailSheet({ task, profileId, open, onOpenChange, onUpdate }: TaskDetailSheetProps) {
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [completionPct, setCompletionPct] = useState(task.completion_percentage);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const loadComments = useCallback(async () => {
    const result = await getTaskComments(task.id);
    if (result.success && result.data) setComments(result.data);
  }, [task.id]);

  useEffect(() => {
    if (open) loadComments();
  }, [open, loadComments]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateTask(task.id, { status, priority, completion_percentage: completionPct });
    setIsSaving(false);
    onUpdate();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsCommenting(true);
    const result = await addTaskComment(task.id, newComment.trim());
    setIsCommenting(false);
    if (result.success) {
      setNewComment('');
      loadComments();
    }
  };

  const assignedTo = task.assigned_to
    ? `${task.assigned_to.first_name || ''} ${task.assigned_to.last_name || ''}`.trim()
    : 'Unassigned';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{task.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {task.description && (
            <p className="text-xs text-muted-foreground">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Assigned To</p>
              <p className="text-sm">{assignedTo}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Protocol</p>
              <p className="text-sm">{task.protocol?.title || task.protocol?.protocol_number || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Due Date</p>
              <p className="text-sm">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-medium">Dependency</p>
              <p className="text-sm">{task.depends_on?.name || 'None'}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Completion ({completionPct}%)</Label>
            <Input
              type="range"
              min={0}
              max={100}
              step={5}
              value={completionPct}
              onChange={(e) => setCompletionPct(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <Button size="sm" onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>

          <Separator />

          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-2">Comments ({comments.length})</p>
            <div className="space-y-2 max-h-[200px] overflow-y-auto mb-3">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium">
                      {comment.author?.first_name || ''} {comment.author?.last_name || ''}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs mt-1">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground">No comments yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                className="text-xs flex-1"
                rows={2}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={isCommenting || !newComment.trim()}
                className="self-end"
              >
                {isCommenting ? '...' : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
