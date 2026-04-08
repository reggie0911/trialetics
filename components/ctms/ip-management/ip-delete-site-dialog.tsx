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
import { archiveIpItemSiteLink, getIpSiteOrders } from '@/lib/actions/ip-management';

export interface IpDeleteSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  itemId: string;
  studySiteId: string;
  siteLabel: string;
  /** Initial count from the summary row; refreshed when dialog opens. */
  initialOrderCount: number;
  onSuccess: () => void | Promise<void>;
}

export function IpDeleteSiteDialog({
  open,
  onOpenChange,
  studyId,
  itemId,
  studySiteId,
  siteLabel,
  initialOrderCount,
  onSuccess,
}: IpDeleteSiteDialogProps) {
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [orderCount, setOrderCount] = useState(initialOrderCount);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !studyId || !itemId || !studySiteId) return;
    setConfirmed(false);
    setOrderCount(initialOrderCount);
    setLoadingOrders(true);
    void getIpSiteOrders({ studyId, itemId, studySiteId })
      .then((rows) => setOrderCount(rows.length))
      .catch(() => setOrderCount(initialOrderCount))
      .finally(() => setLoadingOrders(false));
  }, [open, studyId, itemId, studySiteId, initialOrderCount]);

  const handleConfirm = async () => {
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await archiveIpItemSiteLink({ studyId, itemId, studySiteId });
      toast({ title: 'Site link removed from this equipment' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not remove site',
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
          <DialogTitle>Delete site</DialogTitle>
          <DialogDescription>
            This removes the association between this equipment and the site in the active inventory list. Orders and
            ledger history are kept; you can restore the link when there are no blocking dependencies.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium">Site:</span> {siteLabel}
          </p>
          <p className="text-muted-foreground">
            {loadingOrders ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Counting associated orders…
              </span>
            ) : (
              <>
                Associated orders: <span className="font-medium text-foreground">{orderCount}</span>
              </>
            )}
          </p>
          <p className="text-amber-700 dark:text-amber-500/90">
            Removal is only allowed when there are no orders for this site and no on-hand or in-transit quantity at this
            site for this equipment.
          </p>
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="ip-delete-site-ack"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="ip-delete-site-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
              I understand this site will no longer appear under this equipment until the link is restored.
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={submitting || !confirmed || loadingOrders}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yes, delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
