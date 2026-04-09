'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, isValid, parse } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CalendarDays, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  ensureIpSiteLotReceiptMirrorIfMissing,
  ipCorrectSiteLotSerial,
  ipReceiveAtSite,
} from '@/lib/actions/ip-management';
import type { IpMovementLineContext } from '@/lib/utils/ip-order-actions';
import { cn } from '@/lib/utils';

function parseReceiptIsoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : undefined;
}

function formatIsoToReceiptDisplay(iso: string): string {
  const parsed = parse(iso, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? format(parsed, 'dd-MMM-yyyy', { locale: enUS }) : '';
}

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
  const [serialNa, setSerialNa] = useState(false);
  const [serialReason, setSerialReason] = useState('');
  const [receivedDateIso, setReceivedDateIso] = useState('');
  const [receiptDateOpen, setReceiptDateOpen] = useState(false);
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

  const originalSerialNormalized = useMemo(() => {
    const t = line?.serial_number?.trim() ?? '';
    return t.toUpperCase() === 'NA' ? 'NA' : t;
  }, [line?.serial_number]);

  const effectiveSerialTrim = serialNa ? 'NA' : serialInput.trim();
  const serialDirty = effectiveSerialTrim !== originalSerialNormalized;
  const showSerialChangeReason = serialDirty && eligibleForSerialRpc && hasSerialOnLot;

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
      const rawSn = line.serial_number?.trim() ?? '';
      if (rawSn.toUpperCase() === 'NA') {
        setSerialNa(true);
        setSerialInput('');
      } else {
        setSerialNa(false);
        setSerialInput(rawSn);
      }
      setSerialReason('');
      setReceivedDateIso('');
      setReceiptDateOpen(false);
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
    const sn = effectiveSerialTrim;
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
          receivedDateIso.trim() !== ''
            ? new Date(`${receivedDateIso}T12:00:00`).toISOString()
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
      const sn = effectiveSerialTrim;
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
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
                    <Input
                      className="text-[12px] h-9 min-w-0 flex-1"
                      value={serialInput}
                      disabled={serialNa}
                      onChange={(e) => setSerialInput(e.target.value)}
                      placeholder={
                        hasSerialOnLot ? 'Edit if the label does not match the physical unit.' : 'Enter serial number'
                      }
                      autoComplete="off"
                    />
                    <div className="flex shrink-0 items-center gap-2 sm:pb-0.5">
                      <Checkbox
                        id="ip-rcv-serial-na"
                        checked={serialNa}
                        onCheckedChange={(v) => {
                          const on = v === true;
                          setSerialNa(on);
                          if (on) setSerialInput('');
                        }}
                        className="mt-0.5"
                      />
                      <Label htmlFor="ip-rcv-serial-na" className="text-[12px] font-normal cursor-pointer leading-snug">
                        Not applicable (NA)
                      </Label>
                    </div>
                  </div>
                  {serialNa ? (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      NA will be saved as the serial number for this unit.
                    </p>
                  ) : null}
                </div>
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
            {showSerialChangeReason ? (
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
            ) : null}
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
                  <p className="text-[11px] text-muted-foreground leading-snug">Format: dd-MMM-yyyy (optional)</p>
                  <Popover open={receiptDateOpen} onOpenChange={setReceiptDateOpen}>
                    <PopoverTrigger
                      id="ip-rcv-date"
                      type="button"
                      className={cn(
                        'border-input bg-transparent shadow-xs flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border px-2.5 text-[12px] outline-none transition-[color,box-shadow]',
                        'hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        !receivedDateIso && 'text-muted-foreground'
                      )}
                    >
                      <span className="truncate tabular-nums text-left">
                        {receivedDateIso ? formatIsoToReceiptDisplay(receivedDateIso) : '07-Apr-2026'}
                      </span>
                      <CalendarDays className="size-3.5 shrink-0 opacity-60" aria-hidden />
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-2 gap-2">
                      <Calendar
                        mode="single"
                        selected={parseReceiptIsoToDate(receivedDateIso)}
                        onSelect={(d) => {
                          setReceivedDateIso(d ? format(d, 'yyyy-MM-dd') : '');
                          setReceiptDateOpen(false);
                        }}
                        captionLayout="dropdown"
                        fromYear={2000}
                        toYear={new Date().getFullYear() + 5}
                        defaultMonth={parseReceiptIsoToDate(receivedDateIso) ?? new Date()}
                      />
                      {receivedDateIso ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-full text-[12px] text-muted-foreground"
                          onClick={() => {
                            setReceivedDateIso('');
                            setReceiptDateOpen(false);
                          }}
                        >
                          Clear date
                        </Button>
                      ) : null}
                    </PopoverContent>
                  </Popover>
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
                (canSaveSerialOnly && !effectiveSerialTrim) ||
                (showSerialCorrectionOnly && !effectiveSerialTrim)
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
