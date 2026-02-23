'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createDeviation } from '@/lib/actions/deviations';
import { DEVIATION_SEVERITY_LABELS } from '@/lib/types/deviations';
import type { DeviationSeverity } from '@/lib/types/deviations';

interface DeviationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSuccess: () => void;
}

export function DeviationFormDialog({ open, onOpenChange, companyId, onSuccess }: DeviationFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<DeviationSeverity>('minor');
  const [detectedDate, setDetectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    const result = await createDeviation({
      title: title.trim(),
      description: description.trim() || undefined,
      severity,
      detected_date: detectedDate || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      setTitle('');
      setDescription('');
      setSeverity('minor');
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Deviation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Title</Label>
            <Input className="mt-1 text-xs" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deviation title" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea className="mt-1 text-xs" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the deviation..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as DeviationSeverity)}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEVIATION_SEVERITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Detected Date</Label>
              <Input type="date" className="mt-1 text-xs" value={detectedDate} onChange={(e) => setDetectedDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Creating...' : 'Create Deviation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
