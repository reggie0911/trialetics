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
import { useToast } from '@/hooks/use-toast';
import { restoreIpOrder } from '@/lib/actions/ip-management';
import type { IpOrderRow } from '@/lib/types/ip-management';

export interface IpRestoreOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteLabel: string;
  order: IpOrderRow | null;
  onSuccess: () => void | Promise<void>;
}

export function IpRestoreOrderDialog({
  open,
  onOpenChange,
  siteLabel,
  order,
  onSuccess,
}: IpRestoreOrderDialogProps) {
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open, order?.order_id]);

  const handleConfirm = async () => {
    if (!confirmed || !order) return;
    setSubmitting(true);
    try {
      await restoreIpOrder(order.order_id);
      toast({ title: 'Order restored' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not restore order',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const lotLine =
    order?.serial_number || order?.lot_number
      ? [order.serial_number ? `Serial: ${order.serial_number}` : null, order.lot_number ? `Lot: ${order.lot_number}` : null]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Restore order</DialogTitle>
          <DialogDescription>
            This returns the order to the default inventory summary so it appears with other active orders at the site.
          </DialogDescription>
        </DialogHeader>
        {order && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">Site:</span> {siteLabel}
            </p>
            {order.order_reference ? (
              <p>
                <span className="font-medium">Reference:</span> {order.order_reference}
              </p>
            ) : null}
            {lotLine ? (
              <p>
                <span className="font-medium">Identifiers:</span> {lotLine}
              </p>
            ) : null}
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="ip-restore-order-ack"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="ip-restore-order-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
                I understand this order will be active in the default list again.
              </Label>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={submitting || !confirmed || !order}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yes, restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
