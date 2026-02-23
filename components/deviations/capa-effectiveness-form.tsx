'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createCAPAReview } from '@/lib/actions/deviations';

interface CAPAEffectivenessFormProps {
  capaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CAPAEffectivenessForm({ capaId, open, onOpenChange, onSuccess }: CAPAEffectivenessFormProps) {
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEffective, setIsEffective] = useState<string>('true');
  const [findings, setFindings] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await createCAPAReview(capaId, {
      review_date: reviewDate,
      is_effective: isEffective === 'true',
      findings: findings.trim() || undefined,
      follow_up_required: followUpRequired,
      follow_up_notes: followUpNotes.trim() || undefined,
    });
    setIsSubmitting(false);
    if (result.success) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Effectiveness Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Review Date</Label>
            <Input type="date" className="mt-1 text-xs" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Effectiveness</Label>
            <Select value={isEffective} onValueChange={setIsEffective}>
              <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Effective</SelectItem>
                <SelectItem value="false">Ineffective</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Findings</Label>
            <Textarea className="mt-1 text-xs" value={findings} onChange={(e) => setFindings(e.target.value)} rows={3} placeholder="Document review findings..." />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox checked={followUpRequired} onCheckedChange={(c) => setFollowUpRequired(!!c)} id="followUp" />
            <Label htmlFor="followUp" className="text-xs">Follow-up required</Label>
          </div>
          {followUpRequired && (
            <div>
              <Label className="text-xs">Follow-up Notes</Label>
              <Textarea className="mt-1 text-xs" value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} rows={2} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
