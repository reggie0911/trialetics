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
import { updateIpOrder } from '@/lib/actions/ip-management';
import type { IpOrderRow } from '@/lib/types/ip-management';
import { useToast } from '@/hooks/use-toast';

interface IpEditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: IpOrderRow | null;
  onSuccess?: () => void;
}

export function IpEditOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: IpEditOrderDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [orderReference, setOrderReference] = useState('');

  useEffect(() => {
    if (order) {
      setOrderReference(order.order_reference);
    }
  }, [order]);

  const handleSubmit = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      await updateIpOrder({
        orderId: order.order_id,
        orderReference,
      });
      toast({ title: 'Order updated' });
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast({
        title: 'Failed to update order',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit order</DialogTitle>
          <DialogDescription>
            Update order reference.
            {order?.lot_number && ` Lot: ${order.lot_number}`}
            {order?.serial_number && ` · Serial: ${order.serial_number}`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Order reference</Label>
            <Input
              className="text-[12px] h-9"
              value={orderReference}
              onChange={(e) => setOrderReference(e.target.value)}
              placeholder="Reference number"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
