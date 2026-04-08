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
import { getIpSiteOrders, restoreIpItemSiteLink } from '@/lib/actions/ip-management';

export interface IpRestoreSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  itemId: string;
  studySiteId: string;
  siteLabel: string;
  initialOrderCount: number;
  onSuccess: () => void | Promise<void>;
}

export function IpRestoreSiteDialog({
  open,
  onOpenChange,
  studyId,
  itemId,
  studySiteId,
  siteLabel,
  initialOrderCount,
  onSuccess,
}: IpRestoreSiteDialogProps) {
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
      await restoreIpItemSiteLink({ studyId, itemId, studySiteId });
      toast({ title: 'Site link restored' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not restore site',
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
          <DialogTitle>Restore site</DialogTitle>
          <DialogDescription>
            This returns the site under this equipment in the default inventory list so you can add orders and record
            site activity again.
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
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="ip-restore-site-ack"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="ip-restore-site-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
              I want to restore this site link for this equipment.
            </Label>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting || !confirmed || loadingOrders}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yes, restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
