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
import { archiveIpItem, getIpItemSiteMetrics } from '@/lib/actions/ip-management';

export interface IpDeleteEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  itemId: string;
  itemName: string;
  onSuccess: () => void | Promise<void>;
}

export function IpDeleteEquipmentDialog({
  open,
  onOpenChange,
  studyId,
  itemId,
  itemName,
  onSuccess,
}: IpDeleteEquipmentDialogProps) {
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
      await archiveIpItem(itemId);
      toast({ title: 'Equipment removed from active inventory' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Could not remove equipment',
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
          <DialogTitle>Delete equipment</DialogTitle>
          <DialogDescription>
            This archives the catalog item. It will no longer appear in the default inventory list. You can restore it
            later if no stock or in-transit quantity remains.
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
          <p className="text-amber-700 dark:text-amber-500/90">
            Removal is only allowed when all on-hand and in-transit quantities for this item are zero.
          </p>
          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="ip-delete-ack"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="ip-delete-ack" className="text-[12px] font-normal leading-snug cursor-pointer">
              I understand this equipment will be archived and hidden from the active inventory list.
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
            disabled={submitting || !confirmed || loadingSites}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Yes, delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
