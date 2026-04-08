'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ipVerifyLot } from '@/lib/actions/ip-management';
import type { IpLogRow, IpOrderRow } from '@/lib/types/ip-management';

export type IpVerifyInventoryTarget = IpLogRow | IpOrderRow;

export interface IpLogsVerifyInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  target: IpVerifyInventoryTarget | null;
  onSuccess: () => void | Promise<void>;
}

export function IpLogsVerifyInventoryDialog({
  open,
  onOpenChange,
  studyId,
  target,
  onSuccess,
}: IpLogsVerifyInventoryDialogProps) {
  const { toast } = useToast();
  const [dateOfUse, setDateOfUse] = useState('');
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDateOfUse('');
      setComment('');
      setConfirmed(false);
    }
  }, [open, target && 'location_id' in target ? target.location_id : target?.order_id]);

  const handleSubmit = async () => {
    if (!target || !confirmed) return;
    setSubmitting(true);
    try {
      const dateIso =
        dateOfUse.trim() !== ''
          ? new Date(`${dateOfUse}T12:00:00`).toISOString()
          : null;
      await ipVerifyLot({
        studyId,
        lotId: target.lot_id,
        studySiteId: target.study_site_id,
        comment: comment.trim() || null,
        dateOfUse: dateIso,
      });
      toast({ title: 'Verification recorded' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Verify failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const serialLine = target?.serial_number ? `Serial: ${target.serial_number}` : null;
  const lotLine = target?.lot_number
    ? `Lot / batch: ${target.lot_number}${target.batch_number ? ` (${target.batch_number})` : ''}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verify inventory</DialogTitle>
          <DialogDescription>
            This records verification for the used line at the site. The inventory disposition stays Used; a verification
            timestamp and optional notes are stored for the audit trail.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
              {serialLine && <p>{serialLine}</p>}
              {lotLine && <p>{lotLine}</p>}
              {!serialLine && !lotLine && <p className="text-muted-foreground">No serial or lot on file</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ip-verify-date-use" className="text-xs">
                Date of use
              </Label>
              <Input
                id="ip-verify-date-use"
                type="date"
                className="text-[12px] h-9"
                value={dateOfUse}
                onChange={(e) => setDateOfUse(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ip-verify-comment" className="text-xs">
                Comment
              </Label>
              <Input
                id="ip-verify-comment"
                className="text-[12px] h-9"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="ip-verify-ack"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="ip-verify-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
                I confirm this verification is accurate and may be relied on for compliance review.
              </Label>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !confirmed || !target}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yes, verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
