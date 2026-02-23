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
import { useToast } from '@/hooks/use-toast';
import { createSupplyItem } from '@/lib/actions/randomization-supply';

interface SupplyItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SupplyItemDialog({ open, onOpenChange, onSuccess }: SupplyItemDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [protocolId, setProtocolId] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('unit');
  const [storage, setStorage] = useState('');
  const [shelfLife, setShelfLife] = useState('');

  const handleSubmit = async () => {
    if (!protocolId.trim() || !itemCode.trim() || !name.trim()) {
      toast({ title: 'Protocol ID, code, and name are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await createSupplyItem({
      protocol_id: protocolId,
      item_code: itemCode.trim(),
      name: name.trim(),
      unit: unit.trim() || 'unit',
      storage_conditions: storage.trim() || undefined,
      shelf_life_months: shelfLife ? parseInt(shelfLife) : undefined,
    });
    setSaving(false);
    if (res.success) {
      toast({ title: 'Supply item created' });
      setItemCode('');
      setName('');
      setStorage('');
      setShelfLife('');
      onSuccess();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Supply Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Protocol ID</Label>
            <Input value={protocolId} onChange={(e) => setProtocolId(e.target.value)} placeholder="Protocol ID" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Item Code</Label>
              <Input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="e.g. DRG-001" />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="unit" />
            </div>
            <div className="space-y-1">
              <Label>Shelf Life (months)</Label>
              <Input type="number" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} placeholder="—" />
            </div>
            <div className="space-y-1">
              <Label>Storage</Label>
              <Input value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="e.g. 2-8°C" />
            </div>
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
