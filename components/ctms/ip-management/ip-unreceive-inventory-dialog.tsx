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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ipUnreceiveAtSite } from '@/lib/actions/ip-management';
import type { IpMovementLineContext } from '@/lib/utils/ip-order-actions';

export interface IpUnreceiveInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: IpMovementLineContext | null;
  onSuccess: () => void | Promise<void>;
}

export function IpUnreceiveInventoryDialog({
  open,
  onOpenChange,
  line,
  onSuccess,
}: IpUnreceiveInventoryDialogProps) {
  const { toast } = useToast();
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const maxQty = line?.quantity_available ?? 0;

  useEffect(() => {
    if (open && line) {
      setQty('1');
      setReason('');
      setConfirmed(false);
    }
  }, [open, line?.lot_id, line?.study_site_id]);

  const handleSubmit = async () => {
    if (!line || !confirmed) return;
    const q = Math.max(1, parseInt(qty, 10) || 1);
    if (q > maxQty) {
      toast({
        title: 'Quantity too high',
        description: `You can reverse at most ${maxQty} available unit(s) on this line.`,
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await ipUnreceiveAtSite({
        studyId: line.studyId,
        lotId: line.lot_id,
        studySiteId: line.study_site_id,
        quantity: q,
        reason: reason.trim() || null,
      });
      toast({ title: 'Receipt reversed' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not reverse receipt',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reverse receipt</DialogTitle>
          <DialogDescription>
            Use when a receipt was recorded by mistake. Site quantity decreases and pending receipt increases again. Stock
            is not returned to the central pool (use Returns for that).
          </DialogDescription>
        </DialogHeader>
        {line && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
              <p className="font-medium">{line.item_name}</p>
              <p className="text-xs text-muted-foreground">
                Available to reverse: {line.quantity_available} (of {line.quantity_on_hand} on hand at site)
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Quantity <span className="text-destructive">*</span>
                <span className="text-muted-foreground ml-1">(max {maxQty})</span>
              </Label>
              {maxQty === 1 ? (
                <div
                  className="flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-muted/30 px-2.5 text-[12px]"
                  aria-readonly
                >
                  1
                </div>
              ) : (
                <Input
                  className="text-[12px] h-9"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ip-unrcv-reason" className="text-xs">
                Reason
              </Label>
              <Textarea
                id="ip-unrcv-reason"
                className="text-[12px] min-h-[72px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional context for the audit trail"
              />
            </div>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="ip-unrcv-ack"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="ip-unrcv-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
                I confirm this reversal is accurate and authorized.
              </Label>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !confirmed || !line || maxQty <= 0}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Reverse receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
