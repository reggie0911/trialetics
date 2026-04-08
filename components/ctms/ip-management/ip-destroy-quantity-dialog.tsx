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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ipDestroyAtSite } from '@/lib/actions/ip-management';
import type { IpMovementLineContext } from '@/lib/utils/ip-order-actions';
import type { ContainerFillState } from '@/lib/utils/ip-container-fill-state';
import { CONTAINER_FILL_STATE_LABELS, CONTAINER_FILL_STATE_VALUES } from '@/lib/utils/ip-container-fill-state';

export interface IpDestroyQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: IpMovementLineContext | null;
  onSuccess: () => void | Promise<void>;
}

export function IpDestroyQuantityDialog({
  open,
  onOpenChange,
  line,
  onSuccess,
}: IpDestroyQuantityDialogProps) {
  const { toast } = useToast();
  const [qty, setQty] = useState('1');
  const [containerFill, setContainerFill] = useState<'' | ContainerFillState>('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && line) {
      setQty('1');
      setContainerFill('');
      setComments('');
    }
  }, [open, line?.lot_id, line?.study_site_id]);

  const max = line?.quantity_on_hand ?? 0;
  const isDrug = line?.category === 'investigational_drug';

  const handleSubmit = async () => {
    if (!line) return;
    const q = max === 1 ? 1 : Math.max(1, parseInt(qty, 10) || 1);
    if (q > max) {
      toast({
        title: 'Quantity too high',
        description: `At most ${max} on hand at this site.`,
        variant: 'destructive',
      });
      return;
    }
    if (isDrug && !containerFill) {
      toast({ title: 'Container condition required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await ipDestroyAtSite({
        studyId: line.studyId,
        lotId: line.lot_id,
        studySiteId: line.study_site_id,
        quantity: q,
        containerFillState: isDrug && containerFill !== '' ? containerFill : null,
        notes: comments.trim() || null,
      });
      toast({ title: 'Destruction recorded' });
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Destroy failed',
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
          <DialogTitle>Destroy quantity</DialogTitle>
          <DialogDescription>Permanent removal at the selected site per protocol.</DialogDescription>
        </DialogHeader>
        {line && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">
                Quantity <span className="text-destructive">*</span>
                <span className="text-muted-foreground ml-1">(max {max})</span>
              </Label>
              {max === 1 ? (
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
                  max={max}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              )}
            </div>
            {isDrug && (
              <div className="space-y-1">
                <Label className="text-xs">
                  Container condition <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={containerFill === '' ? '__pick__' : containerFill}
                  onValueChange={(v) =>
                    setContainerFill(v === '__pick__' ? '' : (v as ContainerFillState))
                  }
                >
                  <SelectTrigger className="text-[12px] h-9 w-full min-h-9">
                    <SelectValue
                      placeholder="Select condition"
                      getDisplayLabel={(v) => {
                        if (v == null || v === '' || v === '__pick__') return null;
                        if (CONTAINER_FILL_STATE_VALUES.includes(v as ContainerFillState)) {
                          return CONTAINER_FILL_STATE_LABELS[v as ContainerFillState];
                        }
                        return null;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pick__" className="text-[12px]">
                      Select…
                    </SelectItem>
                    {(CONTAINER_FILL_STATE_VALUES as readonly ContainerFillState[]).map((k) => (
                      <SelectItem key={k} value={k} className="text-[12px]">
                        {CONTAINER_FILL_STATE_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Comments</Label>
              <Textarea
                className="text-[12px] min-h-[80px]"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional notes for the ledger"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleSubmit()} disabled={submitting || !line}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Destroy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
