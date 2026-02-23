'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { createCustomField } from '@/lib/actions/custom-trackers';
import type { CustomFieldType } from '@/lib/types/custom-trackers';
import { FIELD_TYPE_LABELS } from '@/lib/types/custom-trackers';

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerDefinitionId: string;
  onSuccess: () => void;
}

function fieldNameFromLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function AddFieldDialog({
  open,
  onOpenChange,
  trackerDefinitionId,
  onSuccess,
}: AddFieldDialogProps) {
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [required, setRequired] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setFieldLabel('');
      setFieldName('');
      setFieldType('text');
      setRequired(false);
      setSortOrder(0);
    }
  }, [open]);

  useEffect(() => {
    setFieldName(fieldNameFromLabel(fieldLabel));
  }, [fieldLabel]);

  const handleSubmit = async () => {
    if (!fieldLabel.trim() || !fieldName.trim()) return;
    setIsSubmitting(true);
    const result = await createCustomField({
      tracker_definition_id: trackerDefinitionId,
      field_name: fieldName.trim(),
      field_type: fieldType,
      field_label: fieldLabel.trim(),
      required,
      sort_order: sortOrder,
    });
    setIsSubmitting(false);
    if (result.success) {
      onOpenChange(false);
      onSuccess();
      toast({ title: 'Field added' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Field</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Field Label</Label>
            <Input
              className="mt-1 text-xs"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="Display name"
            />
          </div>
          <div>
            <Label className="text-xs">Field Name</Label>
            <Input
              className="mt-1 text-xs"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="field_name"
            />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select
              value={fieldType}
              onValueChange={(v) => setFieldType(v as CustomFieldType)}
            >
              <SelectTrigger className="mt-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {FIELD_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="required"
              checked={required}
              onCheckedChange={(c) => setRequired(c === true)}
            />
            <Label htmlFor="required" className="text-xs font-normal cursor-pointer">
              Required
            </Label>
          </div>
          <div>
            <Label className="text-xs">Sort Order</Label>
            <Input
              type="number"
              className="mt-1 text-xs"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              min={0}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !fieldLabel.trim() || !fieldName.trim()}
          >
            {isSubmitting ? 'Adding…' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
