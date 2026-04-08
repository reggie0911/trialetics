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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ipAdminUnverifyInventoryAtSite } from '@/lib/actions/ip-management';
import type { IpLogRow, IpOrderRow } from '@/lib/types/ip-management';

export type IpUnverifyInventoryTarget = IpLogRow | IpOrderRow;

export interface IpUnverifyInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  target: IpUnverifyInventoryTarget | null;
  onSuccess: () => void | Promise<void>;
}

export function IpUnverifyInventoryDialog({
  open,
  onOpenChange,
  studyId,
  target,
  onSuccess,
}: IpUnverifyInventoryDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setConfirmed(false);
    }
  }, [open, target && 'location_id' in target ? target.location_id : target?.order_id]);

  const handleSubmit = async () => {
    if (!target || !confirmed) return;
    setSubmitting(true);
    try {
      await ipAdminUnverifyInventoryAtSite({
        studyId,
        lotId: target.lot_id,
        studySiteId: target.study_site_id,
        reason: reason.trim() || null,
      });
      toast({ title: 'Verification removed' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not remove verification',
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
          <DialogTitle>Remove verification</DialogTitle>
          <DialogDescription>
            Use when verification was recorded by mistake. The line stays in Used disposition; the verification timestamp is
            cleared and an audit entry is added for compliance reporting.
          </DialogDescription>
        </DialogHeader>
        {target && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
              <p className="font-medium">{target.item_name}</p>
              {serialLine && <p>{serialLine}</p>}
              {lotLine && <p>{lotLine}</p>}
              {!serialLine && !lotLine && <p className="text-muted-foreground">No serial or lot on file</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ip-unverify-reason" className="text-xs">
                Reason
              </Label>
              <Textarea
                id="ip-unverify-reason"
                className="text-[12px] min-h-[72px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional context for the audit trail"
              />
            </div>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="ip-unverify-ack"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="ip-unverify-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
                I confirm removing this verification is accurate and authorized.
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
            Remove verification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
