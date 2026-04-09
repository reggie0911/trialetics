'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getAddInventoryContentsPerUnitTooltip, getAddOrderDrugCopy } from '@/lib/utils/ip-inventory-ui-copy';
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
  /** Central pool quantity for this catalog item (matches Inventory summary “Global in stock”). */
  globalInStock: number;
  /** From catalog metadata; prefills optional contents field for any category when set. */
  defaultContentsPerCatalogUnit?: number | null;
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
  globalInStock,
  defaultContentsPerCatalogUnit = null,
  onSuccess,
}: IpAddOrderDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [lotNumber, setLotNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [contentsPerCatalogUnit, setContentsPerCatalogUnit] = useState('');
  const [orderReference, setOrderReference] = useState('');

  const isDrug = itemCategory === 'investigational_drug';
  const drugCopy = useMemo(() => getAddOrderDrugCopy(), []);
  const contentsTooltipCategory = itemCategory ?? 'study_supplies';

  const maxQty = useMemo(() => Math.max(0, Math.floor(Number(globalInStock))), [globalInStock]);

  useEffect(() => {
    if (!open) return;
    setQuantity(maxQty > 0 ? '1' : '0');
    if (defaultContentsPerCatalogUnit != null && defaultContentsPerCatalogUnit >= 1) {
      setContentsPerCatalogUnit(String(defaultContentsPerCatalogUnit));
    } else {
      setContentsPerCatalogUnit('');
    }
  }, [open, maxQty, defaultContentsPerCatalogUnit]);

  const resetForm = useCallback(() => {
    setLotNumber('');
    setBatchNumber('');
    setExpiryDate('');
    setQuantity('1');
    setContentsPerCatalogUnit('');
    setOrderReference('');
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      onOpenChange(next);
    },
    [onOpenChange, resetForm]
  );

  const parsedQty = useMemo(() => {
    if (maxQty === 0) return 0;
    const n = parseInt(quantity, 10);
    if (quantity.trim() === '' || Number.isNaN(n)) return NaN;
    return Math.min(Math.max(1, n), maxQty);
  }, [quantity, maxQty]);

  const canSubmit =
    maxQty > 0 && Number.isFinite(parsedQty) && parsedQty >= 1 && parsedQty <= maxQty;

  const handleQuantityChange = (raw: string) => {
    if (maxQty <= 0) return;
    if (raw === '') {
      setQuantity('');
      return;
    }
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    setQuantity(String(Math.min(Math.max(1, n), maxQty)));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !Number.isFinite(parsedQty)) return;
    const qty = parsedQty;
    setSubmitting(true);
    try {
      let contentsArg: number | undefined;
      if (contentsPerCatalogUnit.trim() !== '') {
        const c = parseInt(contentsPerCatalogUnit.trim(), 10);
        if (Number.isFinite(c) && c >= 1) contentsArg = c;
      }
      await createIpOrder({
        studyId,
        studySiteId,
        itemId,
        lotNumber: lotNumber.trim() || undefined,
        batchNumber: batchNumber.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        quantity: qty,
        orderReference: orderReference.trim() || undefined,
        contentsPerCatalogUnit: contentsArg,
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
      handleOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <Label className="text-xs">{drugCopy.contentsPerUnitLabel}</Label>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {getAddInventoryContentsPerUnitTooltip(contentsTooltipCategory, drugCopy, catalogUnit)}
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
          <div className="space-y-1">
            <Label className="text-xs">
              {isDrug ? drugCopy.quantityLabel : 'Quantity'}{' '}
              <span className="text-destructive">*</span>
            </Label>
            {isDrug ? (
              <p className="text-[11px] text-muted-foreground leading-snug">{drugCopy.catalogUnitHelper(catalogUnit)}</p>
            ) : null}
            {maxQty > 0 ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                You can ship up to {maxQty} {maxQty === 1 ? 'unit' : 'units'} from central inventory.
              </p>
            ) : (
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                There is no stock in the central pool for this item. Add inventory before shipping to a site.
              </p>
            )}
            <Input
              className="text-[12px] h-9"
              type="number"
              min={maxQty > 0 ? 1 : 0}
              max={maxQty}
              disabled={maxQty <= 0}
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              onBlur={() => {
                if (maxQty <= 0) return;
                if (quantity.trim() === '' || Number.isNaN(parseInt(quantity, 10))) {
                  setQuantity('1');
                }
              }}
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
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !canSubmit}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
