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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createRetentionMilestone } from '@/lib/actions/patient-engagement';

interface RetentionMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RetentionMilestoneDialog({ open, onOpenChange, onSuccess }: RetentionMilestoneDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [protocolId, setProtocolId] = useState('');
  const [name, setName] = useState('');
  const [visitNumber, setVisitNumber] = useState('');
  const [expectedDay, setExpectedDay] = useState('');
  const [description, setDescription] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !protocolId.trim()) {
      toast({ title: 'Name and Protocol ID are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await createRetentionMilestone({
      protocol_id: protocolId,
      name: name.trim(),
      visit_number: visitNumber ? parseInt(visitNumber) : undefined,
      expected_day: expectedDay ? parseInt(expectedDay) : undefined,
      description: description.trim() || undefined,
      is_critical: isCritical,
    });
    setSaving(false);
    if (res.success) {
      toast({ title: 'Milestone created' });
      setName('');
      setVisitNumber('');
      setExpectedDay('');
      setDescription('');
      setIsCritical(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Retention Milestone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Protocol ID</Label>
            <Input value={protocolId} onChange={(e) => setProtocolId(e.target.value)} placeholder="Protocol ID" />
          </div>
          <div className="space-y-1">
            <Label>Milestone Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Screening Visit" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Visit Number</Label>
              <Input type="number" value={visitNumber} onChange={(e) => setVisitNumber(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Expected Day</Label>
              <Input type="number" value={expectedDay} onChange={(e) => setExpectedDay(e.target.value)} placeholder="e.g. 28" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="critical" checked={isCritical} onCheckedChange={(c) => setIsCritical(c === true)} />
            <label htmlFor="critical" className="text-sm">Critical milestone</label>
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
