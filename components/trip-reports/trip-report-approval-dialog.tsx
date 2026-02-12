'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateTripReport } from '@/lib/actions/trip-reports';
import type { TripReportWithRelations, TripReportStatus } from '@/lib/types/trip-reports';
import { TRIP_REPORT_STATUS_LABELS } from '@/lib/types/trip-reports';

interface TripReportApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripReport: TripReportWithRelations;
  profileId: string;
  canReview: boolean;
  canApprove: boolean;
  onSuccess: () => void;
}

export function TripReportApprovalDialog({
  open,
  onOpenChange,
  tripReport,
  profileId,
  canReview,
  canApprove,
  onSuccess,
}: TripReportApprovalDialogProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState('');
  const [newStatus, setNewStatus] = useState<TripReportStatus | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newStatus) return;
    setIsSubmitting(true);
    const payload: { status: TripReportStatus; reviewer_comments?: string; approver_comments?: string } = {
      status: newStatus as TripReportStatus,
    };
    if (canReview) {
      payload.reviewer_comments = comments;
    } else if (canApprove) {
      payload.approver_comments = comments;
    }
    const result = await updateTripReport(tripReport.id, payload);
    if (result.success) {
      setComments('');
      setNewStatus('');
      onOpenChange(false);
      onSuccess();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const reviewOptions: TripReportStatus[] = ['reviewed_with_comments', 'rejected', 'submitted_for_approval'];
  const approveOptions: TripReportStatus[] = ['approved', 'rejected'];

  const options = canApprove ? approveOptions : reviewOptions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xs">
            {canApprove ? 'Approve Trip Report' : 'Review Trip Report'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {canApprove
              ? 'Approve or reject the trip report. Add comments if rejecting.'
              : 'Set the review outcome. Add comments for Reviewed with Comments or Rejected.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TripReportStatus)}>
              <SelectTrigger className="text-[12px] h-8">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s} value={s} className="text-[12px]">
                    {TRIP_REPORT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {canApprove ? 'Approver Comments' : 'Reviewer Comments'}
            </Label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add comments..."
              className="text-[12px] min-h-[80px]"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!newStatus || isSubmitting} className="text-xs">
            {isSubmitting ? 'Saving...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
