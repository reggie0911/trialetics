'use client';

import { useState, useCallback, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { GeneratePaymentDialog } from './generate-payment-dialog';
import { PaymentSplitDialog } from './payment-split-dialog';
import { updatePaymentActivity, getContractsForClinicalSite, getPayeeContactsForSite } from '@/lib/actions/clinical-payments';
import type { PaymentActivityWithRelations } from '@/lib/types/clinical-payments';
import { useToast } from '@/hooks/use-toast';

interface PaymentActivityTableProps {
  activities: PaymentActivityWithRelations[];
  total: number;
  siteId: string;
  companyId: string;
  onRefresh: () => void;
}

function getPayeeName(payee: { first_name?: string | null; last_name?: string | null } | { first_name?: string | null; last_name?: string | null }[] | null | undefined): string {
  if (!payee) return '-';
  const p = Array.isArray(payee) ? payee[0] : payee;
  return [p?.first_name, p?.last_name].filter(Boolean).join(' ') || '-';
}

function getActivityName(sa: { activity_name?: string } | { activity_name?: string }[] | null): string {
  if (!sa) return '-';
  const s = Array.isArray(sa) ? sa[0] : sa;
  return s?.activity_name ?? '-';
}

function getVisitName(sv: { visit_name?: string } | { visit_name?: string }[] | null): string {
  if (!sv) return '-';
  const s = Array.isArray(sv) ? sv[0] : sv;
  return s?.visit_name ?? '-';
}

export function PaymentActivityTable({
  activities,
  total,
  siteId,
  companyId,
  onRefresh,
}: PaymentActivityTableProps) {
  const { toast } = useToast();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitActivity, setSplitActivity] = useState<PaymentActivityWithRelations | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Array<{ id: string; contract_number: string | null }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string | null; last_name: string | null }>>([]);

  useEffect(() => {
    Promise.all([
      getContractsForClinicalSite(siteId),
      getPayeeContactsForSite(companyId, siteId),
    ]).then(([cRes, pRes]) => {
      if (cRes.success && cRes.data) setContracts(cRes.data);
      if (pRes.success && pRes.data) setContacts(pRes.data);
    });
  }, [siteId, companyId]);

  const completedUnpaid = activities.filter(
    (a) => a.is_completed && !a.payment_record_id
  );
  const canGenerate = completedUnpaid.length > 0;

  const handleToggleComplete = async (activity: PaymentActivityWithRelations) => {
    setUpdatingId(activity.id);
    const result = await updatePaymentActivity(activity.id, {
      is_completed: !activity.is_completed,
    });
    if (result.success) {
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error ?? 'Failed to update',
        variant: 'destructive',
      });
    }
    setUpdatingId(null);
  };

  const handleContractPayeeChange = useCallback(
    async (activity: PaymentActivityWithRelations, contractId: string | null, payeeId: string | null) => {
      setUpdatingId(activity.id);
      const result = await updatePaymentActivity(activity.id, {
        contract_id: contractId || null,
        payee_contact_id: payeeId || null,
      });
      if (result.success) {
        onRefresh();
      } else {
        toast({
          title: 'Error',
          description: result.error ?? 'Failed to update',
          variant: 'destructive',
        });
      }
      setUpdatingId(null);
    },
    [onRefresh, toast]
  );

  const handleDeviationChange = useCallback(
    async (activity: PaymentActivityWithRelations, value: string) => {
      const num = value === '' ? 0 : parseFloat(value);
      if (isNaN(num)) return;
      setUpdatingId(activity.id);
      const result = await updatePaymentActivity(activity.id, {
        deviation_amount: num,
      });
      if (result.success) {
        onRefresh();
      } else {
        toast({
          title: 'Error',
          description: result.error ?? 'Failed to update deviation',
          variant: 'destructive',
        });
      }
      setUpdatingId(null);
    },
    [onRefresh, toast]
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <>
      <div className="space-y-4">
        {canGenerate && (
          <Button
            size="sm"
            onClick={() => setGenerateOpen(true)}
            className="text-xs"
          >
            Generate Payment ({completedUnpaid.length} selected)
          </Button>
        )}

        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            No payment activities. Sync will create them from completed subject activities with payment amounts.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-12">Complete</TableHead>
                <TableHead className="text-xs">Activity</TableHead>
                <TableHead className="text-xs">Visit</TableHead>
                <TableHead className="text-xs">Standard Amount</TableHead>
                <TableHead className="text-xs">Deviation</TableHead>
                <TableHead className="text-xs">Actual Amount</TableHead>
                <TableHead className="text-xs">Contract</TableHead>
                <TableHead className="text-xs">Payee</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-16">Split</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {!a.payment_record_id && (
                      <Checkbox
                        checked={a.is_completed}
                        onCheckedChange={() => handleToggleComplete(a)}
                        disabled={!!updatingId}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.is_unplanned ? 'Unplanned' : getActivityName(a.subject_activity ?? null)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {a.is_unplanned ? '-' : getVisitName(a.subject_visit ?? null)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatCurrency(a.standard_amount)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {!a.payment_record_id ? (
                      <Input
                        key={`${a.id}-${a.deviation_amount ?? 0}`}
                        type="number"
                        step="0.01"
                        className="h-7 w-20 text-xs"
                        defaultValue={a.deviation_amount ?? 0}
                        onBlur={(e) => {
                          const v = e.target.value;
                          const current = a.deviation_amount ?? 0;
                          const newVal = v === '' ? 0 : parseFloat(v);
                          if (!isNaN(newVal) && newVal !== current) {
                            handleDeviationChange(a, v === '' ? '0' : v);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        disabled={!!updatingId}
                      />
                    ) : (
                      formatCurrency(a.deviation_amount ?? 0)
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatCurrency(a.actual_amount)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {!a.payment_record_id ? (
                      <Select
                        value={a.contract_id ?? ''}
                        onValueChange={(v) => handleContractPayeeChange(a, v || null, a.payee_contact_id ?? null)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">-</SelectItem>
                          {contracts.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.contract_number ?? c.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      (Array.isArray(a.contract) ? a.contract[0]?.contract_number : a.contract?.contract_number) ?? '-'
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {!a.payment_record_id ? (
                      <Select
                        value={a.payee_contact_id ?? ''}
                        onValueChange={(v) => handleContractPayeeChange(a, a.contract_id ?? null, v || null)}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue placeholder="-" />
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
                    ) : (
                      getPayeeName(a.payee)
                    )}
                  </TableCell>
                  <TableCell>
                    {a.payment_record_id ? (
                      <Badge variant="secondary" className="text-xs">
                        Paid
                      </Badge>
                    ) : a.is_completed ? (
                      <Badge variant="outline" className="text-xs">
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs opacity-70">
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {!a.payment_record_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSplitActivity(a);
                          setSplitOpen(true);
                        }}
                      >
                        Split
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <GeneratePaymentDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onSuccess={() => {
          setGenerateOpen(false);
          onRefresh();
        }}
        siteId={siteId}
        companyId={companyId}
        activityIds={completedUnpaid.map((a) => a.id)}
      />

      <PaymentSplitDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        onSuccess={onRefresh}
        activity={splitActivity}
        siteId={siteId}
        companyId={companyId}
        otherUnpaidActivityIds={activities
          .filter((a) => !a.payment_record_id && a.id !== splitActivity?.id)
          .map((a) => a.id)}
      />
    </>
  );
}
