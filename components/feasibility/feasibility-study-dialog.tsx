'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createFeasibilityStudy } from '@/lib/actions/feasibility';

interface FeasibilityStudyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}

export function FeasibilityStudyDialog({ open, onOpenChange, companyId, onSuccess }: FeasibilityStudyDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [protocolId, setProtocolId] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !protocolId.trim()) {
      toast({ title: 'Name and Protocol ID are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await createFeasibilityStudy({
      protocol_id: protocolId,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setSaving(false);
    if (res.success) {
      toast({ title: 'Feasibility study created' });
      setName('');
      setDescription('');
      setProtocolId('');
      onSuccess();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>New Feasibility Study</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Protocol ID</Label>
            <Input value={protocolId} onChange={(e) => setProtocolId(e.target.value)} placeholder="Protocol ID" />
          </div>
          <div className="space-y-1">
            <Label>Study Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Phase 3 Site Feasibility" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Optional description..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
