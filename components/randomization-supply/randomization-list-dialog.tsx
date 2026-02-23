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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createRandomizationList } from '@/lib/actions/randomization-supply';
import type { RandomizationMethod } from '@/lib/types/randomization-supply';
import { RANDOMIZATION_METHOD_LABELS } from '@/lib/types/randomization-supply';

interface RandomizationListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RandomizationListDialog({ open, onOpenChange, onSuccess }: RandomizationListDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [protocolId, setProtocolId] = useState('');
  const [name, setName] = useState('');
  const [method, setMethod] = useState<RandomizationMethod>('simple');
  const [blockSize, setBlockSize] = useState('');
  const [arms, setArms] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !protocolId.trim()) {
      toast({ title: 'Name and Protocol ID are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await createRandomizationList({
      protocol_id: protocolId,
      name: name.trim(),
      method,
      block_size: blockSize ? parseInt(blockSize) : undefined,
      treatment_arms: arms ? arms.split(',').map((a) => a.trim()).filter(Boolean) : undefined,
    });
    setSaving(false);
    if (res.success) {
      toast({ title: 'Randomization list created' });
      setName('');
      setProtocolId('');
      setBlockSize('');
      setArms('');
      onSuccess();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>New Randomization List</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Protocol ID</Label>
            <Input value={protocolId} onChange={(e) => setProtocolId(e.target.value)} placeholder="Protocol ID" />
          </div>
          <div className="space-y-1">
            <Label>List Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Primary Randomization" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as RandomizationMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RANDOMIZATION_METHOD_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Block Size</Label>
              <Input type="number" value={blockSize} onChange={(e) => setBlockSize(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Treatment Arms (comma-separated)</Label>
            <Input value={arms} onChange={(e) => setArms(e.target.value)} placeholder="e.g. Drug A, Placebo" />
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
