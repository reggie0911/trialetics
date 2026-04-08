'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
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
import {
  ipAdminResetSiteLineToAvailable,
  ipDestroyAtSite,
  ipDispense,
  ipReturnToGlobal,
} from '@/lib/actions/ip-management';
import type { IpMovementLineContext } from '@/lib/utils/ip-order-actions';
import type { ContainerFillState } from '@/lib/utils/ip-container-fill-state';
import { CONTAINER_FILL_STATE_LABELS, CONTAINER_FILL_STATE_VALUES } from '@/lib/utils/ip-container-fill-state';

type DispositionChoice = '' | 'used' | 'returned' | 'destroyed' | 'unused';

export interface SubjectOption {
  id: string;
  subject_number: string;
}

export interface IpChangeDispositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: IpMovementLineContext | null;
  isIpAdmin: boolean;
  subjects: SubjectOption[];
  onSuccess: () => void | Promise<void>;
}

export function IpChangeDispositionDialog({
  open,
  onOpenChange,
  line,
  isIpAdmin,
  subjects,
  onSuccess,
}: IpChangeDispositionDialogProps) {
  const { toast } = useToast();
  const [choice, setChoice] = useState<DispositionChoice>('');
  const [qty, setQty] = useState('1');
  const [subjectId, setSubjectId] = useState('');
  const [subjectManual, setSubjectManual] = useState('');
  const [unusedReason, setUnusedReason] = useState('');
  const [containerFill, setContainerFill] = useState<'' | ContainerFillState>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && line) {
      setChoice('');
      setQty('1');
      setSubjectId('');
      setSubjectManual('');
      setUnusedReason('');
      setContainerFill('');
    }
  }, [open, line?.lot_id, line?.study_site_id]);

  const isDrug = line?.category === 'investigational_drug';
  const needsContainerFill =
    isDrug && (choice === 'used' || choice === 'returned' || choice === 'destroyed');

  const maxHand = line?.quantity_on_hand ?? 0;
  const maxAvail = line?.quantity_available ?? 0;

  useEffect(() => {
    if (choice === 'used' && maxAvail === 1) setQty('1');
    if ((choice === 'returned' || choice === 'destroyed') && maxHand === 1) setQty('1');
  }, [choice, maxAvail, maxHand]);

  const handleSubmit = async () => {
    if (!line || !choice) return;
    setSubmitting(true);
    try {
      if (choice === 'used') {
        const q = Math.max(1, parseInt(qty, 10) || 1);
        if (q > maxAvail) {
          toast({
            title: 'Quantity too high',
            description: `At most ${maxAvail} available.`,
            variant: 'destructive',
          });
          return;
        }
        const man = subjectManual.trim();
        if (!subjectId && !man) {
          toast({ title: 'Subject required', variant: 'destructive' });
          return;
        }
        await ipDispense({
          studyId: line.studyId,
          lotId: line.lot_id,
          studySiteId: line.study_site_id,
          quantity: q,
          subjectId: subjectId || null,
          subjectNumberFreeText: subjectId ? null : man,
          containerFillState: needsContainerFill && containerFill !== '' ? containerFill : null,
        });
        toast({ title: 'Dispense recorded' });
      } else if (choice === 'returned') {
        const q = Math.max(1, parseInt(qty, 10) || 1);
        if (q > maxHand) {
          toast({ title: 'Quantity too high', description: `At most ${maxHand} on hand.`, variant: 'destructive' });
          return;
        }
        await ipReturnToGlobal({
          studyId: line.studyId,
          lotId: line.lot_id,
          studySiteId: line.study_site_id,
          quantity: q,
          containerFillState: needsContainerFill && containerFill !== '' ? containerFill : null,
        });
        toast({ title: 'Return recorded' });
      } else if (choice === 'destroyed') {
        const q = Math.max(1, parseInt(qty, 10) || 1);
        if (q > maxHand) {
          toast({ title: 'Quantity too high', description: `At most ${maxHand} on hand.`, variant: 'destructive' });
          return;
        }
        await ipDestroyAtSite({
          studyId: line.studyId,
          lotId: line.lot_id,
          studySiteId: line.study_site_id,
          quantity: q,
          containerFillState: needsContainerFill && containerFill !== '' ? containerFill : null,
        });
        toast({ title: 'Destruction recorded' });
      } else if (choice === 'unused') {
        await ipAdminResetSiteLineToAvailable({
          studyId: line.studyId,
          lotId: line.lot_id,
          studySiteId: line.study_site_id,
          reason: unusedReason.trim() || null,
        });
        toast({ title: 'Disposition updated to available' });
      }
      await onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: 'Action failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    choice === 'unused'
      ? isIpAdmin && unusedReason.trim() !== ''
      : choice === 'used'
        ? maxAvail > 0 &&
          (!!subjectId || subjectManual.trim() !== '') &&
          (!needsContainerFill || containerFill !== '')
        : choice === 'returned' || choice === 'destroyed'
          ? maxHand > 0 && (!needsContainerFill || containerFill !== '')
          : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change disposition</DialogTitle>
        </DialogHeader>
        {line && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="font-medium">{line.item_name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">New disposition action</Label>
              <Select
                value={choice === '' ? '__pick__' : choice}
                onValueChange={(v) => setChoice(v === '__pick__' ? '' : (v as DispositionChoice))}
              >
                <SelectTrigger className="text-[12px] h-9 w-full min-h-9">
                  <SelectValue
                    placeholder="Select action"
                    getDisplayLabel={(v) => {
                      if (v == null || v === '' || v === '__pick__') return null;
                      const labels: Record<string, string> = {
                        used: 'Used — record dispense',
                        returned: 'Returned — send to central pool',
                        destroyed: 'Destroyed — discard quantity',
                        unused: 'Unused — mark available again (admin)',
                      };
                      return labels[v] ?? null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pick__" className="text-[12px]">
                    Select…
                  </SelectItem>
                  <SelectItem value="used" className="text-[12px]">
                    Used — record dispense
                  </SelectItem>
                  <SelectItem value="returned" className="text-[12px]">
                    Returned — send to central pool
                  </SelectItem>
                  <SelectItem value="destroyed" className="text-[12px]">
                    Destroyed — discard quantity
                  </SelectItem>
                  {isIpAdmin && (
                    <SelectItem value="unused" className="text-[12px]">
                      Unused — mark available again (admin)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {choice === 'used' && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Quantity (max {maxAvail})</Label>
                  {maxAvail === 1 ? (
                    <div
                      className="flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-muted/30 px-2.5 text-[12px]"
                      aria-readonly
                    >
                      1
                    </div>
                  ) : (
                    <Input className="text-[12px] h-9" type="number" min={1} max={maxAvail} value={qty} onChange={(e) => setQty(e.target.value)} />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subject</Label>
                  <Select
                    value={subjectId || '__none__'}
                    onValueChange={(v) => {
                      setSubjectId(v === '__none__' ? '' : v);
                      if (v !== '__none__') setSubjectManual('');
                    }}
                  >
                    <SelectTrigger className="text-[12px] h-9 w-full min-h-9">
                      <SelectValue
                        placeholder="Select subject"
                        getDisplayLabel={(v) => {
                          if (v == null || v === '' || v === '__none__') return null;
                          const s = subjects.find((x) => x.id === v);
                          return s ? `Subject ${s.subject_number}` : null;
                        }}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-[12px]">
                        None — manual number
                      </SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-[12px]">
                          Subject {s.subject_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Subject study number (if not in list)</Label>
                  <Input
                    className="text-[12px] h-9"
                    value={subjectManual}
                    onChange={(e) => setSubjectManual(e.target.value)}
                    disabled={!!subjectId}
                  />
                </div>
              </>
            )}

            {(choice === 'returned' || choice === 'destroyed') && (
              <div className="space-y-1">
                <Label className="text-xs">Quantity (max {maxHand})</Label>
                {maxHand === 1 ? (
                  <div
                    className="flex h-9 w-full min-w-0 items-center rounded-md border border-input bg-muted/30 px-2.5 text-[12px]"
                    aria-readonly
                  >
                    1
                  </div>
                ) : (
                  <Input className="text-[12px] h-9" type="number" min={1} max={maxHand} value={qty} onChange={(e) => setQty(e.target.value)} />
                )}
              </div>
            )}

            {needsContainerFill && (
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

            {choice === 'unused' && isIpAdmin && (
              <div className="space-y-1">
                <Label htmlFor="ip-cd-reason" className="text-xs">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="ip-cd-reason"
                  className="text-[12px] min-h-[80px]"
                  value={unusedReason}
                  onChange={(e) => setUnusedReason(e.target.value)}
                  placeholder="Document why the line is being reset to available"
                />
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !line || !choice || !canSubmit}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
