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
  const [contentsPerCatalogUnit, setContentsPerCatalogUnit] = useState('');

  const isDrug = order?.category === 'investigational_drug';

  useEffect(() => {
    if (order) {
      setOrderReference(order.order_reference);
      setContentsPerCatalogUnit(
        order.contents_per_catalog_unit != null ? String(order.contents_per_catalog_unit) : ''
      );
    }
  }, [order]);

  const handleSubmit = async () => {
    if (!order) return;
    setSubmitting(true);
    try {
      let contentsUpdate: number | null | undefined;
      if (isDrug) {
        if (contentsPerCatalogUnit.trim() === '') {
          contentsUpdate = null;
        } else {
          const c = parseInt(contentsPerCatalogUnit.trim(), 10);
          contentsUpdate = Number.isFinite(c) && c >= 1 ? c : null;
        }
      }
      await updateIpOrder({
        orderId: order.order_id,
        orderReference,
        ...(isDrug ? { contentsPerCatalogUnit: contentsUpdate } : {}),
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
          {isDrug ? (
            <div className="space-y-1">
              <Label className="text-xs">Contents per catalog unit (optional)</Label>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Tablets, capsules, or inner packs in each {order?.unit?.trim() || 'catalog unit'}. Leave blank to
                clear.
              </p>
              <Input
                className="text-[12px] h-9"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="e.g. 30"
                value={contentsPerCatalogUnit}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    setContentsPerCatalogUnit('');
                    return;
                  }
                  const n = parseInt(v, 10);
                  if (Number.isNaN(n)) return;
                  if (n < 1) return;
                  setContentsPerCatalogUnit(String(n));
                }}
              />
            </div>
          ) : null}
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
