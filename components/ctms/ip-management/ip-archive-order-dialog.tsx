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
import { archiveIpOrder } from '@/lib/actions/ip-management';
import type { IpOrderRow } from '@/lib/types/ip-management';

export interface IpArchiveOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteLabel: string;
  order: IpOrderRow | null;
  onSuccess: () => void | Promise<void>;
}

export function IpArchiveOrderDialog({
  open,
  onOpenChange,
  siteLabel,
  order,
  onSuccess,
}: IpArchiveOrderDialogProps) {
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
      await archiveIpOrder(order.order_id);
      toast({ title: 'Order archived' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not archive order',
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
          <DialogTitle>Delete order</DialogTitle>
          <DialogDescription>
            This archives the order in the inventory summary. Ledger history and site stock records are kept so you can
            restore the order later if needed.
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
            <p className="text-muted-foreground">
              On hand at site: <span className="font-medium text-foreground">{order.quantity_on_hand}</span>
              {' · '}
              Available: <span className="font-medium text-foreground">{order.quantity_available}</span>
            </p>
            <p className="text-amber-700 dark:text-amber-500/90">
              Archiving is only allowed when there is no on-hand or available quantity left at this site for this order
              line. Adjust inventory first if those values are not zero.
            </p>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="ip-archive-order-ack"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="ip-archive-order-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
                I understand this order will disappear from the default list until I restore it or show archived orders.
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
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={submitting || !confirmed || !order}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yes, delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
