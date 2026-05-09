'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { useFmPermissions } from '@/hooks/use-fm-permissions';

import { ChangeOrderChip } from '@/components/ctms/finance-module/_shared/chips/change-order-chip';
import { FmApprovalLimitHint } from '@/components/ctms/finance-module/_shared/fm-approval-limit-hint';
import { FinanceBulkActionsBar, type FinanceBulkAction } from '@/components/ctms/finance-module/_shared/bulk-actions-bar';
import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import { FinanceDeleteConfirmDialog } from '@/components/ctms/finance-module/_shared/delete-confirm-dialog';
import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  approveChangeOrder,
  applyChangeOrder,
  cancelChangeOrder,
  createChangeOrder,
  enqueueFinanceExportJob,
  deleteChangeOrder,
  duplicateChangeOrder,
  rejectChangeOrder,
  submitChangeOrder,
  updateChangeOrder,
} from '@/lib/actions/study-finance-module';
import { formatCurrency } from '@/lib/finance-module/calculations';
import type {
  FmBudgetVersion,
  FmChangeOrder,
  FmChangeOrderStatus,
  FmChangeOrderTargetType,
  FmContract,
} from '@/lib/finance-module/types';

const TARGET_LABEL: Record<FmChangeOrderTargetType, string> = {
  budget_version: 'Budget version',
  contract: 'Contract',
  purchase_order: 'Purchase order',
  site_payment_schedule: 'Site payment',
};

const STATUS_LABEL: Record<FmChangeOrderStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  applied: 'Applied',
  cancelled: 'Cancelled',
};

interface ChangeOrdersPanelProps {
  studyId: string;
  orders: FmChangeOrder[];
  budgetVersions: FmBudgetVersion[];
  contracts: FmContract[];
  purchaseOrders: { id: string; po_number: string }[];
  siteSchedules: { id: string; milestone_label: string }[];
  baseCurrency: string;
}

export function ChangeOrdersPanel({
  studyId,
  orders,
  budgetVersions,
  contracts,
  purchaseOrders,
  siteSchedules,
  baseCurrency,
}: ChangeOrdersPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fmHealth = searchParams.get('fmHealth');
  const displayOrders = useMemo(() => {
    const targetMissing = (co: FmChangeOrder) => {
      if (['applied', 'cancelled'].includes(co.status)) return false;
      switch (co.target_object_type) {
        case 'budget_version':
          return !budgetVersions.some((v) => v.id === co.target_object_id);
        case 'contract':
          return !contracts.some((c) => c.id === co.target_object_id);
        case 'purchase_order':
          return !purchaseOrders.some((p) => p.id === co.target_object_id);
        case 'site_payment_schedule':
          return !siteSchedules.some((s) => s.id === co.target_object_id);
        default:
          return true;
      }
    };
    if (fmHealth === 'stale_targets') return orders.filter(targetMissing);
    return orders;
  }, [orders, fmHealth, budgetVersions, contracts, purchaseOrders, siteSchedules]);
  const [listPending, listTransition] = useTransition();
  const [createPending, createTransition] = useTransition();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkRejectCoOpen, setBulkRejectCoOpen] = useState(false);
  const [bulkRejectCoReason, setBulkRejectCoReason] = useState('');

  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeBlockedReason =
    permsQ.isFetched && !canWrite
      ? 'You cannot modify finance records for this study (read-only or closed).'
      : undefined;

  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [changeNumber, setChangeNumber] = useState('');
  const [targetType, setTargetType] = useState<FmChangeOrderTargetType>('budget_version');
  const [targetObjectId, setTargetObjectId] = useState('');
  const [deltaAmount, setDeltaAmount] = useState('');
  const [currency, setCurrency] = useState(baseCurrency);

  const [deleteTarget, setDeleteTarget] = useState<FmChangeOrder | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FmChangeOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<FmChangeOrder | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCo, setEditCo] = useState<FmChangeOrder | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editChangeNumber, setEditChangeNumber] = useState('');
  const [editDelta, setEditDelta] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');

  const targetChoices = useMemo(() => {
    switch (targetType) {
      case 'budget_version':
        return budgetVersions.map((v) => ({
          id: v.id,
          label: `${v.label?.trim() ? `${v.label.trim()} · ` : ''}v${v.version_number} (${v.status})`,
        }));
      case 'contract':
        return contracts
          .filter((c) => c.status !== 'archived')
          .map((c) => ({ id: c.id, label: c.title }));
      case 'purchase_order':
        return purchaseOrders.map((p) => ({ id: p.id, label: p.po_number }));
      case 'site_payment_schedule':
        return siteSchedules.map((s) => ({ id: s.id, label: s.milestone_label }));
      default:
        return [];
    }
  }, [budgetVersions, contracts, purchaseOrders, siteSchedules, targetType]);

  const runTransition = useCallback(
    (fn: () => Promise<{ error: string | null; code?: string } | { data: unknown; error: string | null; code?: string }>, okMessage: string) => {
      listTransition(async () => {
        const res = await fn();
        if ('error' in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success(okMessage);
        router.refresh();
      });
    },
    [listTransition, router],
  );

  const submitCreate = () => {
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!targetObjectId) {
      toast.error('Select a target record.');
      return;
    }
    createTransition(async () => {
      const { error } = await createChangeOrder({
        studyId,
        title: title.trim(),
        reason: reason.trim() || null,
        changeNumber: changeNumber.trim() || null,
        targetObjectType: targetType,
        targetObjectId,
        deltaAmount: Number(deltaAmount),
        currency: currency.trim().toUpperCase(),
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Change order created.');
      setTitle('');
      setReason('');
      setChangeNumber('');
      setTargetObjectId('');
      setDeltaAmount('');
      router.refresh();
    });
  };

  const badgeVariant = (status: FmChangeOrderStatus): 'secondary' | 'default' | 'outline' | 'destructive' => {
    if (status === 'applied') return 'default';
    if (status === 'rejected' || status === 'cancelled') return 'destructive';
    return 'secondary';
  };

  const rowActionsFor = useCallback(
    (co: FmChangeOrder): FinanceRowActionItem[] => {
      const gate = listPending || !canWrite;
      const gateReason = writeBlockedReason;
      const items: FinanceRowActionItem[] = [
        {
          id: 'export-queue-budget',
          label: 'Export to queue (budget)',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () => {
            listTransition(async () => {
              const { error } = await enqueueFinanceExportJob({ studyId, kind: 'budget' });
              if (error) {
                toast.error(error);
                return;
              }
              toast.success('Budget CSV export queued.');
              router.refresh();
            });
          },
        },
      ];
      if (co.status === 'draft') {
        items.push({
          id: 'edit',
          label: 'Edit draft',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () => {
            setEditCo(co);
            setEditTitle(co.title);
            setEditReason(co.reason ?? '');
            setEditChangeNumber(co.change_number ?? '');
            setEditDelta(String(co.delta_amount));
            setEditCurrency(co.currency);
            setEditOpen(true);
          },
        });
        items.push({
          id: 'submit',
          label: 'Submit',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () =>
            runTransition(
              () => submitChangeOrder({ studyId, changeOrderId: co.id, updatedAt: co.updated_at }),
              'Submitted.',
            ),
        });
        items.push({
          id: 'dup',
          label: 'Duplicate',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () =>
            runTransition(() => duplicateChangeOrder({ studyId, sourceChangeOrderId: co.id }), 'Duplicated as new draft.'),
        });
        items.push({
          id: 'del',
          label: 'Delete draft',
          variant: 'destructive',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () => setDeleteTarget(co),
        });
      }
      if (co.status === 'submitted') {
        items.push({
          id: 'approve',
          label: 'Approve',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () =>
            runTransition(
              () => approveChangeOrder({ studyId, changeOrderId: co.id, updatedAt: co.updated_at }),
              'Approved.',
            ),
        });
        items.push({
          id: 'reject',
          label: 'Reject…',
          variant: 'destructive',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () => {
            setRejectTarget(co);
            setRejectReason('');
          },
        });
        items.push({
          id: 'cancel',
          label: 'Cancel',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () => setCancelTarget(co),
        });
        items.push({
          id: 'dup-s',
          label: 'Duplicate',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () =>
            runTransition(() => duplicateChangeOrder({ studyId, sourceChangeOrderId: co.id }), 'Duplicated as new draft.'),
        });
      }
      if (co.status === 'approved') {
        items.push({
          id: 'apply',
          label: 'Apply',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () =>
            runTransition(
              () => applyChangeOrder({ studyId, changeOrderId: co.id, updatedAt: co.updated_at }),
              'Applied.',
            ),
        });
      }
      if (co.status === 'rejected' || co.status === 'cancelled' || co.status === 'applied') {
        items.push({
          id: 'dup-end',
          label: 'Duplicate to new draft',
          disabled: gate,
          disabledReason: gateReason,
          onSelect: () =>
            runTransition(() => duplicateChangeOrder({ studyId, sourceChangeOrderId: co.id }), 'Duplicated as new draft.'),
        });
      }
      return items;
    },
    [listPending, canWrite, writeBlockedReason, runTransition, studyId, listTransition, router],
  );

  const selectedCoRows = useMemo(() => orders.filter((o) => rowSelection[o.id]), [orders, rowSelection]);
  const selectedSubmittedCos = useMemo(
    () => selectedCoRows.filter((o) => o.status === 'submitted'),
    [selectedCoRows],
  );
  const clearCoSelection = useCallback(() => setRowSelection({}), []);

  const queueBudgetCsvExport = useCallback(() => {
    listTransition(async () => {
      const { error } = await enqueueFinanceExportJob({ studyId, kind: 'budget' });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Budget CSV export queued. View Finance → Reports → Data exports.');
      clearCoSelection();
      router.refresh();
    });
  }, [clearCoSelection, listTransition, router, studyId]);

  const bulkApproveCo = useCallback(() => {
    if (selectedSubmittedCos.length === 0) {
      toast.error('Select submitted change orders to approve.');
      return;
    }
    listTransition(async () => {
      for (const co of selectedSubmittedCos) {
        const { error, code } = await approveChangeOrder({
          studyId,
          changeOrderId: co.id,
          updatedAt: co.updated_at,
        });
        if (error) {
          toast.error(`${co.title}: ${error}`, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
          router.refresh();
          return;
        }
      }
      toast.success(`Approved ${selectedSubmittedCos.length} change order(s).`);
      clearCoSelection();
      router.refresh();
    });
  }, [selectedSubmittedCos, studyId, router, listTransition, clearCoSelection]);

  const bulkRejectCoConfirm = useCallback(() => {
    if (selectedSubmittedCos.length === 0) {
      toast.error('Select submitted change orders to reject.');
      return;
    }
    if (!bulkRejectCoReason.trim()) {
      toast.error('Enter a rejection reason.');
      return;
    }
    const reason = bulkRejectCoReason.trim();
    listTransition(async () => {
      for (const co of selectedSubmittedCos) {
        const { error, code } = await rejectChangeOrder({
          studyId,
          changeOrderId: co.id,
          updatedAt: co.updated_at,
          reason,
        });
        if (error) {
          toast.error(`${co.title}: ${error}`, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
          router.refresh();
          return;
        }
      }
      toast.success(`Rejected ${selectedSubmittedCos.length} change order(s).`);
      setBulkRejectCoOpen(false);
      setBulkRejectCoReason('');
      clearCoSelection();
      router.refresh();
    });
  }, [selectedSubmittedCos, studyId, router, listTransition, bulkRejectCoReason, clearCoSelection]);

  const coBulkActions: FinanceBulkAction[] = useMemo(
    () => [
      {
        id: 'b-approve',
        label: 'Approve selected',
        onClick: bulkApproveCo,
        disabled: listPending || !canWrite,
      },
      {
        id: 'b-reject',
        label: 'Reject selected…',
        variant: 'destructive',
        onClick: () => setBulkRejectCoOpen(true),
        disabled: listPending || selectedSubmittedCos.length === 0 || !canWrite,
      },
      {
        id: 'b-export',
        label: 'Export to queue (budget)',
        variant: 'outline',
        onClick: queueBudgetCsvExport,
        disabled: listPending || !canWrite || selectedCoRows.length === 0,
      },
      { id: 'b-clear', label: 'Clear', variant: 'secondary', onClick: clearCoSelection },
    ],
    [
      bulkApproveCo,
      clearCoSelection,
      listPending,
      canWrite,
      selectedSubmittedCos.length,
      queueBudgetCsvExport,
      selectedCoRows.length,
    ],
  );

  const columns = useMemo<ColumnDef<FmChangeOrder>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div className="max-w-[220px]">
            <div className="truncate text-xs font-medium">{row.original.title}</div>
            {row.original.change_number ? (
              <div className="truncate font-mono text-[11px] text-muted-foreground">{row.original.change_number}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'co_link',
        header: 'Link',
        cell: ({ row }) => (
          <ChangeOrderChip
            studyId={studyId}
            changeOrderId={row.original.id}
            label={row.original.change_number?.trim() || row.original.title.slice(0, 18)}
          />
        ),
      },
      {
        id: 'target',
        header: 'Target',
        cell: ({ row }) => (
          <div className="text-xs">
            {TARGET_LABEL[row.original.target_object_type]}
            <div className="max-w-[140px] truncate font-mono text-[11px] text-muted-foreground">
              {row.original.target_object_id.slice(0, 8)}…
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'delta_amount',
        header: () => <span className="block text-right">Delta</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="text-xs tabular-nums">
              {formatCurrency(Number(row.original.delta_amount), row.original.currency)}
            </div>
            <FmApprovalLimitHint
              studyId={studyId}
              kind="budget"
              amount={Math.abs(Number(row.original.delta_amount))}
              currency={row.original.currency}
            />
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={badgeVariant(row.original.status)}>{STATUS_LABEL[row.original.status]}</Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const items = rowActionsFor(row.original);
          if (items.length === 0) return <span className="text-[11px] text-muted-foreground">—</span>;
          return (
            <FinanceRowActionsMenu
              ariaLabel={`Actions for ${row.original.title}`}
              telemetryContext={{ studyId, tableKey: 'change_orders', entityType: 'fm_change_orders' }}
              items={items}
            />
          );
        },
      },
    ],
    [rowActionsFor, studyId],
  );

  const saveEdit = () => {
    if (!editCo) return;
    listTransition(async () => {
      const { error, code } = await updateChangeOrder({
        studyId,
        changeOrderId: editCo.id,
        updatedAt: editCo.updated_at,
        title: editTitle.trim(),
        reason: editReason.trim() || null,
        changeNumber: editChangeNumber.trim() || null,
        deltaAmount: Number(editDelta),
        currency: editCurrency.trim().toUpperCase(),
      });
      if (error) {
        toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
        return;
      }
      toast.success('Change order updated.');
      setEditOpen(false);
      setEditCo(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Create change order</CardTitle>
          <CardDescription className="text-xs">
            Amendment tied to a budget version, contract, PO, or site payment milestone. Submit for approval, then apply
            when ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label className="text-[11px]">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Change # (optional)</Label>
            <Input value={changeNumber} onChange={(e) => setChangeNumber(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Target type</Label>
            <Select
              value={targetType}
              onValueChange={(v) => {
                setTargetType(v as FmChangeOrderTargetType);
                setTargetObjectId('');
              }}
            >
              <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                <SelectValue
                  placeholder="Target type"
                  getDisplayLabel={(val) => {
                    if (!val?.trim()) return null;
                    return TARGET_LABEL[val as FmChangeOrderTargetType] ?? null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TARGET_LABEL) as FmChangeOrderTargetType[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {TARGET_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Target</Label>
            <Select value={targetObjectId || '__'} onValueChange={(v) => setTargetObjectId(v === '__' ? '' : v)}>
              <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                <SelectValue
                  placeholder="Select target record"
                  getDisplayLabel={(val) => {
                    if (!val || val === '__') return null;
                    return targetChoices.find((o) => o.id === val)?.label ?? null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__" className="text-xs">
                  Select…
                </SelectItem>
                {targetChoices.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Delta amount</Label>
            <Input type="number" step="0.01" value={deltaAmount} onChange={(e) => setDeltaAmount(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Currency</Label>
            <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="h-9 text-xs" />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label className="text-[11px]">Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="text-xs" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button size="sm" disabled={createPending || targetChoices.length === 0} onClick={submitCreate}>
              Create draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Change orders</CardTitle>
          <CardDescription className="text-xs">Workflow: draft → submit → approve → apply. Use the row menu for edits and lifecycle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fmHealth === 'stale_targets' ? (
            <Alert className="border-amber-500/50 bg-amber-500/5">
              <AlertTitle className="text-xs">Data health: change orders with missing targets</AlertTitle>
              <AlertDescription className="text-[11px] text-muted-foreground">
                Showing change orders whose target record no longer exists (excluding applied/cancelled). Update the
                target or cancel the change order.
              </AlertDescription>
            </Alert>
          ) : null}
          {orders.length === 0 ? (
            <p className="text-xs text-muted-foreground">No change orders yet.</p>
          ) : displayOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rows match this health filter.</p>
          ) : (
            <div className="space-y-2">
              <FinanceBulkActionsBar selectedCount={selectedCoRows.length} actions={coBulkActions} />
              <FinanceDataTable
                urlPrefix="fmt_co"
                studyId={studyId}
                columns={columns}
                data={displayOrders}
                getRowId={(r) => r.id}
                enableRowSelection
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit draft change order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label className="text-[11px]">Title</Label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-9 text-xs" />
            <Label className="text-[11px]">Change #</Label>
            <Input value={editChangeNumber} onChange={(e) => setEditChangeNumber(e.target.value)} className="h-9 text-xs" />
            <Label className="text-[11px]">Delta</Label>
            <Input type="number" step="0.01" value={editDelta} onChange={(e) => setEditDelta(e.target.value)} className="h-9 text-xs" />
            <Label className="text-[11px]">Currency</Label>
            <Input value={editCurrency} maxLength={3} onChange={(e) => setEditCurrency(e.target.value.toUpperCase())} className="h-9 text-xs" />
            <Label className="text-[11px]">Reason</Label>
            <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={2} className="text-xs" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={listPending} onClick={saveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject change order</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[11px]">Reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="text-xs" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={listPending || !rejectTarget || !rejectReason.trim()}
              onClick={() => {
                if (!rejectTarget) return;
                const co = rejectTarget;
                listTransition(async () => {
                  const { error, code } = await rejectChangeOrder({
                    studyId,
                    changeOrderId: co.id,
                    updatedAt: co.updated_at,
                    reason: rejectReason.trim(),
                  });
                  if (error) {
                    toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                    return;
                  }
                  toast.success('Rejected.');
                  setRejectTarget(null);
                  setRejectReason('');
                  router.refresh();
                });
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkRejectCoOpen}
        onOpenChange={(o) => {
          if (!o) {
            setBulkRejectCoOpen(false);
            setBulkRejectCoReason('');
          }
        }}
      >
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Reject {selectedSubmittedCos.length} change order{selectedSubmittedCos.length === 1 ? '' : 's'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[11px]">Reason (applies to all)</Label>
            <Textarea
              value={bulkRejectCoReason}
              onChange={(e) => setBulkRejectCoReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkRejectCoOpen(false);
                setBulkRejectCoReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={listPending || !bulkRejectCoReason.trim()}
              onClick={bulkRejectCoConfirm}
            >
              Reject all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FinanceDeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete change order?"
        description="Only draft orders can be permanently deleted. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          const co = deleteTarget;
          const { error, code } = await deleteChangeOrder({
            studyId,
            changeOrderId: co.id,
            updatedAt: co.updated_at,
          });
          if (error) {
            toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
            return;
          }
          toast.success('Deleted.');
          setDeleteTarget(null);
          router.refresh();
        }}
      />

      <FinanceDeleteConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="Cancel change order?"
        description="The change order will move to Cancelled and will not be applied."
        confirmLabel="Cancel order"
        onConfirm={async () => {
          if (!cancelTarget) return;
          const co = cancelTarget;
          const { error, code } = await cancelChangeOrder({
            studyId,
            changeOrderId: co.id,
            updatedAt: co.updated_at,
          });
          if (error) {
            toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
            return;
          }
          toast.success('Cancelled.');
          setCancelTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}
