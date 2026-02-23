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
import { createSafetyRecord } from '@/lib/actions/safety-integration';
import type { SafetyEventType } from '@/lib/types/safety-integration';
import { SAFETY_EVENT_TYPE_LABELS } from '@/lib/types/safety-integration';

interface SafetyRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SafetyRecordDialog({
  open,
  onOpenChange,
  onSuccess,
}: SafetyRecordDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventType, setEventType] = useState<SafetyEventType>('sae');
  const [eventDescription, setEventDescription] = useState('');
  const [onsetDate, setOnsetDate] = useState('');
  const [awarenessDate, setAwarenessDate] = useState('');
  const [reportedDate, setReportedDate] = useState('');
  const [seriousnessCriteria, setSeriousnessCriteria] = useState('');
  const [outcome, setOutcome] = useState('');
  const [narrative, setNarrative] = useState('');

  useEffect(() => {
    if (open) {
      setEventType('sae');
      setEventDescription('');
      setOnsetDate('');
      setAwarenessDate('');
      setReportedDate('');
      setSeriousnessCriteria('');
      setOutcome('');
      setNarrative('');
    }
  }, [open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const criteria = seriousnessCriteria
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const result = await createSafetyRecord({
      event_type: eventType,
      event_description: eventDescription.trim() || undefined,
      onset_date: onsetDate || undefined,
      awareness_date: awarenessDate || undefined,
      reported_date: reportedDate || undefined,
      seriousness_criteria: criteria.length ? criteria : undefined,
      outcome: outcome.trim() || undefined,
      narrative: narrative.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: 'Safety record created' });
      onOpenChange(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Safety Record (SAE)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Event Type</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as SafetyEventType)}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SAFETY_EVENT_TYPE_LABELS) as SafetyEventType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SAFETY_EVENT_TYPE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Event Description</Label>
            <Textarea
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Describe the event"
              rows={2}
              className="text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Onset Date</Label>
              <Input
                type="date"
                value={onsetDate}
                onChange={(e) => setOnsetDate(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Awareness Date</Label>
              <Input
                type="date"
                value={awarenessDate}
                onChange={(e) => setAwarenessDate(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Reported Date</Label>
              <Input
                type="date"
                value={reportedDate}
                onChange={(e) => setReportedDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Seriousness Criteria</Label>
            <Input
              value={seriousnessCriteria}
              onChange={(e) => setSeriousnessCriteria(e.target.value)}
              placeholder="Comma or newline separated"
              className="text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Outcome</Label>
            <Textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Outcome"
              rows={2}
              className="text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Narrative</Label>
            <Textarea
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Narrative"
              rows={3}
              className="text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
