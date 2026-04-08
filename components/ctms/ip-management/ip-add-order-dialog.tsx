'use client';

import { useCallback, useMemo, useState } from 'react';
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
import { createIpOrder } from '@/lib/actions/ip-management';
import type { IpCategory } from '@/lib/types/ip-management';
import { getAddOrderDrugCopy } from '@/lib/utils/ip-inventory-ui-copy';
import { useToast } from '@/hooks/use-toast';

interface IpAddOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  itemId: string;
  studySiteId: string;
  /** When set to investigational drug, quantity copy references catalog unit (bottle, pack, etc.). */
  itemCategory?: IpCategory;
  /** Catalog `unit` string from the item row (shown for drug context). */
  catalogUnit?: string;
  onSuccess?: () => void;
}

export function IpAddOrderDialog({
  open,
  onOpenChange,
  studyId,
  itemId,
  studySiteId,
  itemCategory,
  catalogUnit = '',
  onSuccess,
}: IpAddOrderDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [lotNumber, setLotNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [orderReference, setOrderReference] = useState('');

  const isDrug = itemCategory === 'investigational_drug';
  const drugCopy = useMemo(() => getAddOrderDrugCopy(), []);

  const resetForm = useCallback(() => {
    setLotNumber('');
    setBatchNumber('');
    setExpiryDate('');
    setQuantity('1');
    setOrderReference('');
  }, []);

  const parsedQty = useMemo(
    () => Math.max(1, parseInt(quantity, 10) || 1),
    [quantity]
  );

  const handleSubmit = async () => {
    const qty = parsedQty;
    setSubmitting(true);
    try {
      await createIpOrder({
        studyId,
        studySiteId,
        itemId,
        lotNumber: lotNumber.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        quantity: qty,
        orderReference: orderReference.trim() || undefined,
      });
      if (isDrug) {
        toast({
          title: qty > 1 ? 'Orders created' : 'Order created',
          description:
            qty > 1
              ? drugCopy.toastCreatedMany(qty, catalogUnit)
              : drugCopy.toastCreatedOne(catalogUnit),
        });
      } else {
        toast({
          title: qty > 1 ? 'Orders created' : 'Order created',
          description:
            qty > 1
              ? `${qty} separate inventory lines and orders were created at this site (one unit each).`
              : 'Stock was moved from central inventory to this site.',
        });
      }
      resetForm();
      onOpenChange(false);
      await Promise.resolve(onSuccess?.());
    } catch (e) {
      toast({
        title: 'Failed to create order',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add order</DialogTitle>
          {isDrug ? (
            <DialogDescription className="text-xs leading-relaxed">
              {drugCopy.dialogDescription}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Lot number</Label>
              <Input
                className="text-[12px] h-9"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Batch number</Label>
              <Input
                className="text-[12px] h-9"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Expiry date</Label>
              <Input
                className="text-[12px] h-9"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              {isDrug ? drugCopy.quantityLabel : 'Quantity'}{' '}
              <span className="text-destructive">*</span>
            </Label>
            {isDrug ? (
              <p className="text-[11px] text-muted-foreground leading-snug">{drugCopy.catalogUnitHelper(catalogUnit)}</p>
            ) : null}
            <Input
              className="text-[12px] h-9"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Order reference</Label>
            <Input
              className="text-[12px] h-9"
              value={orderReference}
              onChange={(e) => setOrderReference(e.target.value)}
              placeholder="Optional reference number"
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
            Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
