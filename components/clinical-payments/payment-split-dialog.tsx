'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getPaymentSplits, createPaymentSplit, deletePaymentSplit, applySplitToOther, unsplitPaymentActivity } from '@/lib/actions/clinical-payments';
import { getContractsForClinicalSite, getPayeeContactsForSite } from '@/lib/actions/clinical-payments';
import { useToast } from '@/hooks/use-toast';
import type { PaymentActivityWithRelations, PaymentSplitWithRelations } from '@/lib/types/clinical-payments';
import { Plus, Trash2 } from 'lucide-react';

interface PaymentSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  activity: PaymentActivityWithRelations | null;
  siteId: string;
  companyId: string;
  /** Other unpaid activities for "Apply Split to Other" */
  otherUnpaidActivityIds?: string[];
}

function getPayeeName(payee: { first_name?: string | null; last_name?: string | null } | null): string {
  if (!payee) return '-';
  return [payee.first_name, payee.last_name].filter(Boolean).join(' ') || '-';
}

export function PaymentSplitDialog({
  open,
  onOpenChange,
  onSuccess,
  activity,
  siteId,
  companyId,
  otherUnpaidActivityIds = [],
}: PaymentSplitDialogProps) {
  const { toast } = useToast();
  const [splits, setSplits] = useState<PaymentSplitWithRelations[]>([]);
  const [contracts, setContracts] = useState<Array<{ id: string; contract_number: string | null; contract_type: string }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string | null; last_name: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [newContractId, setNewContractId] = useState('');
  const [newPayeeId, setNewPayeeId] = useState('');
  const [newPercentage, setNewPercentage] = useState<string>('');

  const totalAmount = activity?.actual_amount ?? 0;

  useEffect(() => {
    if (open && activity) {
      setLoading(true);
      Promise.all([
        getPaymentSplits(activity.id),
        getContractsForClinicalSite(siteId),
        getPayeeContactsForSite(companyId, siteId),
      ]).then(([sRes, cRes, pRes]) => {
        if (sRes.success && sRes.data) setSplits(sRes.data);
        if (cRes.success && cRes.data) setContracts(cRes.data);
        if (pRes.success && pRes.data) setContacts(pRes.data);
        setLoading(false);
      });
    }
  }, [open, activity?.id, siteId, companyId]);

  useEffect(() => {
    if (!open) {
      setNewContractId('');
      setNewPayeeId('');
      setNewPercentage('');
    }
  }, [open]);

  const totalPercent = splits.reduce((s, sp) => s + (sp.split_percentage ?? 0), 0);
  const remainingPercent = 100 - totalPercent;

  const handleAddSplit = async () => {
    if (!activity || !newContractId) return;
    const pct = parseFloat(newPercentage);
    if (isNaN(pct) || pct <= 0 || pct > remainingPercent) {
      toast({
        title: 'Invalid percentage',
        description: `Enter a value between 0 and ${remainingPercent.toFixed(2)}. Total must be 100%.`,
        variant: 'destructive',
      });
      return;
    }

    const splitAmount = (totalAmount * pct) / 100;

    const result = await createPaymentSplit({
      payment_activity_id: activity.id,
      contract_id: newContractId,
      payee_contact_id: newPayeeId || null,
      split_percentage: pct,
      split_amount: splitAmount,
    });

    if (result.success) {
      toast({ title: 'Success', description: 'Split added' });
      const sRes = await getPaymentSplits(activity.id);
      if (sRes.success && sRes.data) setSplits(sRes.data);
      setNewContractId('');
      setNewPayeeId('');
      setNewPercentage('');
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error ?? 'Failed to add split',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSplit = async (id: string) => {
    const result = await deletePaymentSplit(id);
    if (result.success) {
      toast({ title: 'Success', description: 'Split removed' });
      if (activity) {
        const sRes = await getPaymentSplits(activity.id);
        if (sRes.success && sRes.data) setSplits(sRes.data);
      }
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error ?? 'Failed to remove split',
        variant: 'destructive',
      });
    }
  };

  if (!activity) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold">Payment Splits</DialogTitle>
          <DialogDescription className="text-xs">
            Split this payment activity between multiple contracts and payees. Total must equal 100%.
            Activity: {formatCurrency(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-xs text-muted-foreground py-4">Loading...</p>
        ) : (
          <div className="space-y-4">
            {splits.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Current splits ({totalPercent.toFixed(1)}%)</p>
                {splits.map((s) => {
                  const c = Array.isArray(s.contract) ? s.contract[0] : s.contract;
                  const p = Array.isArray(s.payee) ? s.payee[0] : s.payee;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded border p-2 text-xs"
                    >
                      <span>
                        {c?.contract_number ?? 'Contract'}-{getPayeeName(p)}: {s.split_percentage}% ({formatCurrency(s.split_amount)})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDeleteSplit(s.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {remainingPercent > 0 && (
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[10px] text-muted-foreground mb-1">Contract</p>
                  <Select value={newContractId} onValueChange={(v) => setNewContractId(v ?? '')}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select contract" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.contract_number ?? c.contract_type}-{c.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[10px] text-muted-foreground mb-1">Payee</p>
                  <Select value={newPayeeId} onValueChange={(v) => setNewPayeeId(v ?? '')}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select payee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">-</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20">
                  <p className="text-[10px] text-muted-foreground mb-1">%</p>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={remainingPercent}
                    placeholder={`Max ${remainingPercent.toFixed(0)}`}
                    value={newPercentage}
                    onChange={(e) => setNewPercentage(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleAddSplit}
                  disabled={!newContractId || !newPercentage}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            )}

            {totalPercent === 100 && (
              <p className="text-xs text-green-600">Splits complete (100%).</p>
            )}

            {splits.length > 0 && (
              <div className="flex gap-2 pt-2 border-t">
                {otherUnpaidActivityIds.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={async () => {
                      if (!activity) return;
                      const result = await applySplitToOther(
                        activity.id,
                        otherUnpaidActivityIds.filter((id) => id !== activity.id)
                      );
                      if (result.success) {
                        toast({
                          title: 'Success',
                          description: `Applied splits to ${result.data?.applied ?? 0} activities`,
                        });
                        onSuccess();
                        onOpenChange(false);
                      } else {
                        toast({
                          title: 'Error',
                          description: result.error,
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    Apply Split to Other
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 text-destructive"
                  onClick={async () => {
                    if (!activity) return;
                    const result = await unsplitPaymentActivity(activity.id);
                    if (result.success) {
                      toast({ title: 'Success', description: 'Splits removed' });
                      const sRes = await getPaymentSplits(activity.id);
                      if (sRes.success && sRes.data) setSplits(sRes.data);
                      onSuccess();
                    } else {
                      toast({
                        title: 'Error',
                        description: result.error,
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  Unsplit
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
