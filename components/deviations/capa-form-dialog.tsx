'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCAPA, getDeviations } from '@/lib/actions/deviations';
import { CAPA_TYPE_LABELS } from '@/lib/types/deviations';
import type { CAPAType, Deviation } from '@/lib/types/deviations';

interface CAPAFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  deviationId?: string;
  onSuccess: () => void;
}

export function CAPAFormDialog({ open, onOpenChange, companyId, deviationId, onSuccess }: CAPAFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CAPAType>('corrective');
  const [selectedDeviationId, setSelectedDeviationId] = useState(deviationId || '');
  const [actionPlan, setActionPlan] = useState('');
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && !deviationId) {
      getDeviations(companyId, { pageSize: 100 }).then((res) => {
        if (res.success && res.data) setDeviations(res.data.items);
      });
    }
  }, [open, companyId, deviationId]);

  const handleSubmit = async () => {
    if (!title.trim() || !selectedDeviationId) return;
    setIsSubmitting(true);
    const result = await createCAPA({
      deviation_id: selectedDeviationId,
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      action_plan: actionPlan.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      setTitle('');
      setDescription('');
      setActionPlan('');
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New CAPA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!deviationId && (
            <div>
              <Label className="text-xs">Linked Deviation</Label>
              <Select value={selectedDeviationId} onValueChange={setSelectedDeviationId}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue placeholder="Select deviation" /></SelectTrigger>
                <SelectContent>
                  {deviations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.deviation_number} - {d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Title</Label>
            <Input className="mt-1 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CAPA title" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as CAPAType)}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CAPA_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea className="mt-1 text-xs" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="text-xs">Action Plan</Label>
            <Textarea className="mt-1 text-xs" value={actionPlan} onChange={(e) => setActionPlan(e.target.value)} rows={3} placeholder="Describe the corrective/preventive actions..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !title.trim() || !selectedDeviationId}>
            {isSubmitting ? 'Creating...' : 'Create CAPA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
