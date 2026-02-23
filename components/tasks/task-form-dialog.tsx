'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTask } from '@/lib/actions/tasks';
import { TASK_PRIORITY_LABELS } from '@/lib/types/tasks';
import type { TaskPriority } from '@/lib/types/tasks';
import { createClient } from '@/lib/client';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}

export function TaskFormDialog({ open, onOpenChange, companyId, onSuccess }: TaskFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [protocolId, setProtocolId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [protocols, setProtocols] = useState<{ id: string; title: string | null }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const supabase = createClient();
      supabase
        .from('clinical_protocols')
        .select('id, title')
        .eq('company_id', companyId)
        .order('title')
        .then(({ data }) => { if (data) setProtocols(data); });
      supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .order('first_name')
        .then(({ data }) => { if (data) setTeamMembers(data); });
    }
  }, [open, companyId]);

  const handleSubmit = async () => {
    if (!name.trim() || !protocolId) return;
    setIsSubmitting(true);
    const result = await createTask({
      protocol_id: protocolId,
      name: name.trim(),
      description: description.trim() || undefined,
      priority,
      due_date: dueDate || undefined,
      assigned_to_id: assignedToId || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      setName('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setProtocolId('');
      setAssignedToId('');
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Protocol</Label>
            <Select value={protocolId} onValueChange={setProtocolId}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Select protocol" /></SelectTrigger>
              <SelectContent>
                {protocols.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title || 'Untitled'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Task Name</Label>
            <Input className="mt-1 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="Task name" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea className="mt-1 text-xs" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <Label className="text-xs">Due Date</Label>
              <Input type="date" className="mt-1 text-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Assign To</Label>
            <Select value={assignedToId} onValueChange={setAssignedToId}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.first_name || ''} {m.last_name || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !name.trim() || !protocolId}>
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
