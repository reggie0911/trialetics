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
import { getIpItemSiteMetrics, restoreIpItem } from '@/lib/actions/ip-management';

export interface IpRestoreEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  itemId: string;
  itemName: string;
  onSuccess: () => void | Promise<void>;
}

export function IpRestoreEquipmentDialog({
  open,
  onOpenChange,
  studyId,
  itemId,
  itemName,
  onSuccess,
}: IpRestoreEquipmentDialogProps) {
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [siteCount, setSiteCount] = useState<number | null>(null);
  const [loadingSites, setLoadingSites] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !studyId || !itemId) return;
    setConfirmed(false);
    setSiteCount(null);
    setLoadingSites(true);
    void getIpItemSiteMetrics({ studyId, itemId })
      .then((rows) => setSiteCount(rows.length))
      .catch(() => setSiteCount(0))
      .finally(() => setLoadingSites(false));
  }, [open, studyId, itemId]);

  const handleConfirm = async () => {
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await restoreIpItem(itemId);
      toast({ title: 'Equipment restored to active inventory' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not restore equipment',
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
          <DialogTitle>Restore equipment</DialogTitle>
          <DialogDescription>
            This returns the catalog item to active inventory so it appears in the default list again and can receive new
            shipments and receipts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium">Item:</span> {itemName}
          </p>
          <p className="text-muted-foreground">
            {loadingSites ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Counting associated sites…
              </span>
            ) : (
              <>
                Associated sites: <span className="font-medium text-foreground">{siteCount ?? 0}</span>
              </>
            )}
          </p>
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="ip-restore-ack"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="ip-restore-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
              I want to restore this equipment to active inventory.
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
            disabled={submitting || !confirmed || loadingSites}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yes, restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
