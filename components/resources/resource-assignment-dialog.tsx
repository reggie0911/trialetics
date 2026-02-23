'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { createResourceAssignment } from '@/lib/actions/resources';
import { useToast } from '@/hooks/use-toast';
import {
  ASSIGNMENT_STATUS_LABELS,
  type ResourceAssignmentStatus,
} from '@/lib/types/resources';

interface ResourceAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ResourceAssignmentDialog({
  open,
  onOpenChange,
  onSuccess,
}: ResourceAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [protocolId, setProtocolId] = useState('');
  const [role, setRole] = useState('');
  const [allocationPercentage, setAllocationPercentage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ResourceAssignmentStatus>('planned');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId.trim() || !role.trim()) return;
    setIsSubmitting(true);

    const result = await createResourceAssignment({
      profile_id: profileId.trim(),
      protocol_id: protocolId.trim() || undefined,
      role: role.trim(),
      allocation_percentage: allocationPercentage ? Number(allocationPercentage) : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      status,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);
    if (result.success) {
      setProfileId('');
      setProtocolId('');
      setRole('');
      setAllocationPercentage('');
      setStartDate('');
      setEndDate('');
      setStatus('planned');
      setNotes('');
      onSuccess();
      onOpenChange(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Resource Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-id">Profile ID</Label>
            <Input
              id="profile-id"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              placeholder="UUID"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protocol-id">Protocol ID</Label>
            <Input
              id="protocol-id"
              value={protocolId}
              onChange={(e) => setProtocolId(e.target.value)}
              placeholder="UUID (optional)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="allocation">Allocation %</Label>
            <Input
              id="allocation"
              type="number"
              min={0}
              max={100}
              value={allocationPercentage}
              onChange={(e) => setAllocationPercentage(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ResourceAssignmentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ASSIGNMENT_STATUS_LABELS) as ResourceAssignmentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {ASSIGNMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !profileId.trim() || !role.trim()}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
