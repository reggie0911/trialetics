'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  ensureIpSiteLotReceiptMirrorIfMissing,
  ipCorrectSiteLotSerial,
  ipReceiveAtSite,
} from '@/lib/actions/ip-management';
import type { IpMovementLineContext } from '@/lib/utils/ip-order-actions';

export interface IpReceiveInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: IpMovementLineContext | null;
  onSuccess: () => void | Promise<void>;
}

export function IpReceiveInventoryDialog({
  open,
  onOpenChange,
  line,
  onSuccess,
}: IpReceiveInventoryDialogProps) {
  const { toast } = useToast();
  const [qty, setQty] = useState('1');
  const [serialInput, setSerialInput] = useState('');
  const [serialReason, setSerialReason] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const maxQty = line?.in_transit_qty ?? 0;
  const canRecord = maxQty > 0;
  const hasSerialOnLot = Boolean(line?.serial_number?.trim());
  const canSaveSerialOnly =
    Boolean(line) &&
    !hasSerialOnLot &&
    !canRecord &&
    (line?.quantity_on_hand ?? 0) > 0;

  const eligibleForSerialRpc = useMemo(
    () => (line?.in_transit_qty ?? 0) > 0 || (line?.quantity_on_hand ?? 0) > 0,
    [line?.in_transit_qty, line?.quantity_on_hand]
  );

  const originalSerialTrim = line?.serial_number?.trim() ?? '';
  const inputSerialTrim = serialInput.trim();
  const serialDirty = inputSerialTrim !== originalSerialTrim;

  const showSerialCorrectionOnly = Boolean(
    line &&
      eligibleForSerialRpc &&
      hasSerialOnLot &&
      serialDirty &&
      !canRecord &&
      !canSaveSerialOnly
  );

  const showPrimaryAction = canRecord || canSaveSerialOnly || showSerialCorrectionOnly;

  const ackLabel = useMemo(() => {
    if (showSerialCorrectionOnly) return 'I confirm this serial number is correct.';
    if (canSaveSerialOnly) return 'I confirm this serial number is accurate.';
    if (canRecord && serialDirty) return 'I confirm this receipt and serial number are accurate.';
    if (canRecord) return 'I confirm this receipt is accurate.';
    return 'I confirm this serial number is accurate.';
  }, [canRecord, canSaveSerialOnly, showSerialCorrectionOnly, serialDirty]);

  useEffect(() => {
    if (open && line) {
      setQty('1');
      setSerialInput(line.serial_number?.trim() ? line.serial_number.trim() : '');
      setSerialReason('');
      setReceivedDate('');
      setNotes('');
      setConfirmed(false);
    }
  }, [open, line?.lot_id, line?.study_site_id, line?.in_transit_qty, line?.serial_number]);

  useEffect(() => {
    if (!open || !line || line.quantity_on_hand <= 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const repaired = await ensureIpSiteLotReceiptMirrorIfMissing({
          studyId: line.studyId,
          lotId: line.lot_id,
          studySiteId: line.study_site_id,
        });
        if (!cancelled && repaired) await onSuccess();
      } catch {
        /* ignore: user may lack access or RPC not deployed yet */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally omit onSuccess from deps (often wrapped in useCallback by parent).
  }, [open, line?.lot_id, line?.study_site_id, line?.studyId, line?.quantity_on_hand]);

  const applySerialChangeIfNeeded = async (): Promise<boolean> => {
    if (!line) return false;
    if (!serialDirty) return true;
    const sn = inputSerialTrim;
    if (!sn) {
      toast({
        title: 'Serial number required',
        description: hasSerialOnLot
          ? 'Enter a serial number. To keep the current value, reset the field to match the lot.'
          : 'Enter a serial number before saving.',
        variant: 'destructive',
      });
      return false;
    }
    await ipCorrectSiteLotSerial({
      studyId: line.studyId,
      lotId: line.lot_id,
      studySiteId: line.study_site_id,
      serialNumber: sn,
      reason: serialReason.trim() || null,
    });
    return true;
  };

  const handleSubmit = async () => {
    if (!line || !confirmed) return;

    if (canRecord) {
      const q = Math.max(1, parseInt(qty, 10) || 1);
      if (q > maxQty) {
        toast({
          title: 'Quantity too high',
          description: `At most ${maxQty} unit(s) sent to this site still awaiting receipt.`,
          variant: 'destructive',
        });
        return;
      }
      setSubmitting(true);
      try {
        if (serialDirty) {
          const ok = await applySerialChangeIfNeeded();
          if (!ok) return;
        }
        const receivedAtIso =
          receivedDate.trim() !== ''
            ? new Date(`${receivedDate}T12:00:00`).toISOString()
            : null;
        await ipReceiveAtSite({
          studyId: line.studyId,
          lotId: line.lot_id,
          studySiteId: line.study_site_id,
          quantity: q,
          receivedAt: receivedAtIso,
          notes: notes.trim() || null,
          serialNumber: null,
        });
        toast({ title: 'Receipt recorded' });
        await onSuccess();
        onOpenChange(false);
      } catch (e) {
        toast({
          title: 'Receive failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (canSaveSerialOnly) {
      const sn = serialInput.trim();
      if (!sn) {
        toast({
          title: 'Serial number required',
          description: 'Enter a serial number before saving.',
          variant: 'destructive',
        });
        return;
      }
      setSubmitting(true);
      try {
        await ipCorrectSiteLotSerial({
          studyId: line.studyId,
          lotId: line.lot_id,
          studySiteId: line.study_site_id,
          serialNumber: sn,
          reason: serialReason.trim() || null,
        });
        toast({ title: 'Serial number saved' });
        await onSuccess();
        onOpenChange(false);
      } catch (e) {
        toast({
          title: 'Could not save serial number',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (showSerialCorrectionOnly) {
      setSubmitting(true);
      try {
        const ok = await applySerialChangeIfNeeded();
        if (!ok) return;
        toast({ title: 'Serial number updated' });
        await onSuccess();
        onOpenChange(false);
      } catch (e) {
        toast({
          title: 'Could not update serial number',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const primaryButtonLabel = showSerialCorrectionOnly
    ? 'Save serial'
    : canSaveSerialOnly
      ? 'Save'
      : 'Record receipt';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receive inventory</DialogTitle>
          <DialogDescription>
            Record physical receipt at the site. The quantity cannot exceed what was sent to this site and not yet
            received. You can correct the serial number before saving when it does not match the physical unit.
          </DialogDescription>
        </DialogHeader>
        {line && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
              <p className="font-medium">{line.item_name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Serial number</Label>
              {eligibleForSerialRpc ? (
                <Input
                  className="text-[12px] h-9"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  placeholder={
                    hasSerialOnLot
                      ? 'Edit if the label does not match the physical unit.'
                      : 'Serial number is optional, enter NA if not applicable.'
                  }
                  autoComplete="off"
                />
              ) : hasSerialOnLot ? (
                <div
                  className="flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-muted/30 px-2.5 text-[12px]"
                  aria-readonly
                >
                  {line.serial_number}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Serial number cannot be edited here until this line has on-hand quantity at the site or a shipment
                  in transit.
                </p>
              )}
            </div>
            {serialDirty && eligibleForSerialRpc && (
              <div className="space-y-1">
                <Label htmlFor="ip-rcv-serial-reason" className="text-xs">
                  Reason for change <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="ip-rcv-serial-reason"
                  className="text-[12px] min-h-[56px]"
                  value={serialReason}
                  onChange={(e) => setSerialReason(e.target.value)}
                  placeholder="e.g. typo at dispatch, relabeled unit"
                />
              </div>
            )}
            {!canRecord && !canSaveSerialOnly && !showSerialCorrectionOnly ? (
              <p className="text-xs text-muted-foreground">
                {hasSerialOnLot && (line.quantity_on_hand ?? 0) > 0
                  ? 'Receipt details in the log will update automatically when this record is synced.'
                  : 'There is nothing sent to this site still awaiting receipt for this lot.'}
              </p>
            ) : canRecord ? (
              <>
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
                  <Label htmlFor="ip-rcv-date" className="text-xs">
                    Receipt date
                  </Label>
                  <Input
                    id="ip-rcv-date"
                    type="date"
                    className="text-[12px] h-9"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ip-rcv-notes" className="text-xs">
                    Receipt notes
                  </Label>
                  <Textarea
                    id="ip-rcv-notes"
                    className="text-[12px] min-h-[72px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional confirmation details"
                  />
                </div>
              </>
            ) : null}
            {showPrimaryAction && (
              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="ip-rcv-ack"
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="ip-rcv-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
                  {ackLabel}
                </Label>
              </div>
            )}
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            {showPrimaryAction ? 'Cancel' : 'Close'}
          </Button>
          {showPrimaryAction && (
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={
                submitting ||
                !confirmed ||
                !line ||
                (canSaveSerialOnly && !serialInput.trim()) ||
                (showSerialCorrectionOnly && !serialInput.trim())
              }
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {primaryButtonLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
