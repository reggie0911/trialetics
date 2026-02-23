'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { createExportConfig } from '@/lib/actions/financial-integration';
import type { FinancialExportFormat } from '@/lib/types/financial-integration';
import { EXPORT_FORMAT_LABELS } from '@/lib/types/financial-integration';

interface ExportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ExportConfigDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExportConfigDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [exportFormat, setExportFormat] = useState<FinancialExportFormat>('csv');
  const [targetSystem, setTargetSystem] = useState('');
  const [schedule, setSchedule] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setExportFormat('csv');
      setTargetSystem('');
      setSchedule('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await createExportConfig({
      name: name.trim(),
      export_format: exportFormat,
      target_system: targetSystem.trim() || undefined,
      schedule: schedule.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: 'Export config created' });
      onOpenChange(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>New Export Config</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Config name"
              className="text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Export Format</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as FinancialExportFormat)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EXPORT_FORMAT_LABELS) as FinancialExportFormat[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {EXPORT_FORMAT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Target System</Label>
            <Input
              value={targetSystem}
              onChange={(e) => setTargetSystem(e.target.value)}
              placeholder="e.g. SAP, Oracle"
              className="text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Schedule</Label>
            <Input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g. daily, weekly"
              className="text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
