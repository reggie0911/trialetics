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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ipTransferSite } from '@/lib/actions/ip-management';
import type { IpMovementLineContext } from '@/lib/utils/ip-order-actions';

export interface SiteOption {
  id: string;
  site_number: string | null;
  name: string;
}

export interface IpTransferSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: IpMovementLineContext | null;
  sites: SiteOption[];
  onSuccess: () => void | Promise<void>;
}

export function IpTransferSiteDialog({
  open,
  onOpenChange,
  line,
  sites,
  onSuccess,
}: IpTransferSiteDialogProps) {
  const { toast } = useToast();
  const [qty, setQty] = useState('1');
  const [toSiteId, setToSiteId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && line) {
      setQty('1');
      setToSiteId('');
    }
  }, [open, line?.lot_id, line?.study_site_id]);

  const max = line?.quantity_on_hand ?? 0;
  const destSites = sites.filter((s) => s.id !== line?.study_site_id);

  const handleSubmit = async () => {
    if (!line || !toSiteId) return;
    const q = Math.max(1, parseInt(qty, 10) || 1);
    if (q > max) {
      toast({
        title: 'Quantity too high',
        description: `At most ${max} on hand at this site.`,
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await ipTransferSite({
        studyId: line.studyId,
        lotId: line.lot_id,
        fromSiteId: line.study_site_id,
        toSiteId,
        quantity: q,
      });
      toast({ title: 'Transfer recorded' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Transfer failed',
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
          <DialogTitle>Transfer to another site</DialogTitle>
          <DialogDescription>Move on-hand quantity from this site to a destination study site.</DialogDescription>
        </DialogHeader>
        {line && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Destination site <span className="text-destructive">*</span></Label>
              <Select value={toSiteId} onValueChange={setToSiteId}>
                <SelectTrigger className="text-[12px] h-9">
                  <SelectValue
                    placeholder="Select destination site"
                    getDisplayLabel={(v) => {
                      if (v == null || v === '') return null;
                      const s = destSites.find((x) => x.id === v);
                      return s ? `${s.site_number ?? '—'} — ${s.name}` : null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {destSites.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-[12px]">
                      {s.site_number ?? '—'} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Quantity <span className="text-destructive">*</span>
                <span className="text-muted-foreground ml-1">(max {max})</span>
              </Label>
              <Input
                className="text-[12px] h-9"
                type="number"
                min={1}
                max={max}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !line || !toSiteId}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
