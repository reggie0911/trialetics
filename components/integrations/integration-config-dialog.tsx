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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createIntegrationConfig } from '@/lib/actions/integrations';
import type { IntegrationType } from '@/lib/types/integrations';
import { INTEGRATION_TYPE_LABELS } from '@/lib/types/integrations';

interface IntegrationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  integrationType?: IntegrationType;
}

export function IntegrationConfigDialog({
  open,
  onOpenChange,
  onSuccess,
  integrationType,
}: IntegrationConfigDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<IntegrationType>(integrationType ?? 'edc');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setType(integrationType ?? 'edc');
      setDescription('');
    }
  }, [open, integrationType]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const result = await createIntegrationConfig({
      integration_type: type,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: 'Integration config created' });
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
          <DialogTitle>New Integration Config</DialogTitle>
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
            <Label className="text-xs">Integration Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as IntegrationType)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(INTEGRATION_TYPE_LABELS) as IntegrationType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {INTEGRATION_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
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
