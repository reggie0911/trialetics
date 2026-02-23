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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createEngagementActivity } from '@/lib/actions/patient-engagement';
import type { EngagementActivityType, EngagementChannel, EngagementOutcome } from '@/lib/types/patient-engagement';
import { ACTIVITY_TYPE_LABELS, CHANNEL_LABELS, OUTCOME_LABELS } from '@/lib/types/patient-engagement';

interface EngagementActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EngagementActivityDialog({ open, onOpenChange, onSuccess }: EngagementActivityDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [protocolId, setProtocolId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [activityType, setActivityType] = useState<EngagementActivityType>('reminder');
  const [channel, setChannel] = useState<EngagementChannel>('phone');
  const [outcome, setOutcome] = useState<EngagementOutcome | ''>('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!protocolId.trim()) {
      toast({ title: 'Protocol ID is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await createEngagementActivity({
      protocol_id: protocolId,
      subject_id: subjectId.trim() || undefined,
      activity_type: activityType,
      channel,
      outcome: outcome || undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (res.success) {
      toast({ title: 'Activity logged' });
      setNotes('');
      setSubjectId('');
      onSuccess();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Log Engagement Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Protocol ID</Label>
              <Input value={protocolId} onChange={(e) => setProtocolId(e.target.value)} placeholder="Protocol ID" />
            </div>
            <div className="space-y-1">
              <Label>Subject ID (optional)</Label>
              <Input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Subject ID" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Activity Type</Label>
              <Select value={activityType} onValueChange={(v) => setActivityType(v as EngagementActivityType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as EngagementChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as EngagementOutcome)}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Activity notes..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Logging...' : 'Log Activity'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
