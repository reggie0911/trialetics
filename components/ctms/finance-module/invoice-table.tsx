'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import type { FinanceBulkAction } from '@/components/ctms/finance-module/_shared/bulk-actions-bar';
import { FinanceDeleteConfirmDialog } from '@/components/ctms/finance-module/_shared/delete-confirm-dialog';
import { FmApprovalLimitHint } from '@/components/ctms/finance-module/_shared/fm-approval-limit-hint';
import { FinanceEntityDetailSheet } from '@/components/ctms/finance-module/_shared/entity-detail-sheet';
import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
import { ContractChip } from '@/components/ctms/finance-module/_shared/chips/contract-chip';
import { PurchaseOrderChip } from '@/components/ctms/finance-module/_shared/chips/purchase-order-chip';
import { SiteChip } from '@/components/ctms/finance-module/_shared/chips/site-chip';
import { VendorChip } from '@/components/ctms/finance-module/_shared/chips/vendor-chip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  approveInvoice,
  deleteInvoice,
  enqueueFinanceExportJob,
  recordPayment,
  rejectInvoice,
  submitInvoiceForApproval,
  updateInvoice,
} from '@/lib/actions/study-finance-module';
import { formatCurrency } from '@/lib/finance-module/calculations';
import {
  FM_INVOICE_APPROVAL_STATUS_LABELS,
  FM_INVOICE_PAYMENT_STATUS_LABELS,
  type FmBudgetCategory,
  type FmContract,
  type FmInvoice,
  type FmInvoiceApprovalStatus,
  type FmInvoicePaymentStatus,
  type FmPurchaseOrder,
  type FmVendor,
} from '@/lib/finance-module/types';
import { useFinanceMutation } from '@/hooks/use-finance-mutation';
import { useFmPermissions } from '@/hooks/use-fm-permissions';
import { cn } from '@/lib/utils';

export interface InvoiceTableStudySite {
  id: string;
  name: string;
  site_number: string | null;
}

interface InvoiceTableProps {
  studyId: string;
  invoices: FmInvoice[];
  selectedInvoiceId?: string | null;
  vendors: FmVendor[];
  contracts: FmContract[];
  categories: FmBudgetCategory[];
  purchaseOrders: FmPurchaseOrder[];
  studySites: InvoiceTableStudySite[];
  currentUserId: string | null;
}

const APPROVAL_VARIANT: Record<
  FmInvoiceApprovalStatus,
  'secondary' | 'info' | 'success' | 'warning' | 'destructive'
> = {
  draft: 'secondary',
  submitted: 'info',
  under_review: 'warning',
  approved: 'success',
  rejected: 'destructive',
  disputed: 'destructive',
};

const PAYMENT_VARIANT: Record<
  FmInvoicePaymentStatus,
  'secondary' | 'success' | 'warning' | 'destructive' | 'info'
> = {
  pending: 'secondary',
  paid: 'success',
  overdue: 'destructive',
  disputed: 'destructive',
  partial: 'info',
};

function siteLabel(s: InvoiceTableStudySite) {
  return s.site_number ? `${s.name} (#${s.site_number})` : s.name;
}

export function InvoiceTable({
  studyId,
  invoices,
  selectedInvoiceId,
  vendors,
  contracts,
  categories,
  purchaseOrders,
  studySites,
  currentUserId,
}: InvoiceTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fmHealth = searchParams.get('fmHealth');
  const base = `/protected/studies/${studyId}/finance-module/invoices`;
  const [isPending, startTransition] = useTransition();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null);

  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeBlockedReason =
    permsQ.isFetched && !canWrite
      ? 'You cannot modify finance records for this study (read-only or closed).'
      : undefined;

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<FmInvoice | null>(null);
  const [deleteRow, setDeleteRow] = useState<FmInvoice | null>(null);
  const [rejectRow, setRejectRow] = useState<FmInvoice | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveRow, setApproveRow] = useState<FmInvoice | null>(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [payRow, setPayRow] = useState<FmInvoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payReference, setPayReference] = useState('');
  const [bulkRejectInvOpen, setBulkRejectInvOpen] = useState(false);
  const [bulkRejectInvReason, setBulkRejectInvReason] = useState('');

  const [vendorId, setVendorId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [contractId, setContractId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');

  const activeVendors = useMemo(() => vendors.filter((v) => v.status !== 'archived'), [vendors]);
  const activeCats = useMemo(() => categories.filter((c) => !c.is_archived), [categories]);
  const openPos = useMemo(() => purchaseOrders.filter((p) => p.status === 'open'), [purchaseOrders]);
  const vendorContracts = useMemo(
    () => contracts.filter((c) => c.vendor_id === vendorId && c.status !== 'archived'),
    [contracts, vendorId],
  );

  const vendorName = useCallback(
    (id: string | null) => (id ? (vendors.find((v) => v.id === id)?.name ?? 'Vendor') : '—'),
    [vendors],
  );

  const contractLabel = useCallback(
    (id: string | null) => {
      if (!id) return 'Contract';
      const c = contracts.find((x) => x.id === id);
      if (!c) return 'Contract';
      return [c.contract_number, c.title].filter(Boolean).join(' — ') || 'Contract';
    },
    [contracts],
  );

  const poLabel = useCallback(
    (id: string | null) => {
      if (!id) return 'PO';
      return purchaseOrders.find((p) => p.id === id)?.po_number ?? 'PO';
    },
    [purchaseOrders],
  );

  const detailInv = useMemo(
    () => (detailInvoiceId ? invoices.find((i) => i.id === detailInvoiceId) ?? null : null),
    [detailInvoiceId, invoices],
  );

  const selectedRows = useMemo(
    () => invoices.filter((i) => rowSelection[i.id]),
    [invoices, rowSelection],
  );

  const selectedApprovableInvoices = useMemo(
    () =>
      selectedRows.filter(
        (i) => i.approval_status === 'submitted' || i.approval_status === 'under_review',
      ),
    [selectedRows],
  );

  const clearSelection = useCallback(() => setRowSelection({}), []);

  const submitMut = useFinanceMutation(
    (vars: { invoiceId: string; updatedAt: string }) =>
      submitInvoiceForApproval({ studyId, invoiceId: vars.invoiceId, updatedAt: vars.updatedAt }),
    {
      successToast: 'Submitted for approval.',
      onResult: () => router.refresh(),
    },
  );

  const submitOne = useCallback(
    (invoiceId: string, updatedAt: string) => {
      submitMut.mutate({ invoiceId, updatedAt });
    },
    [submitMut],
  );

  const rowBusy = isPending || submitMut.isPending;

  const openEdit = useCallback((row: FmInvoice) => {
    setEditRow(row);
    setVendorId(row.vendor_id ?? '');
    setSiteId(row.site_id ?? '');
    setPurchaseOrderId(row.purchase_order_id ?? '');
    setContractId(row.contract_id ?? '');
    setCategoryId(row.category_id ?? '');
    setInvoiceNumber(row.invoice_number);
    setInvoiceDate(row.invoice_date.slice(0, 10));
    setDueDate(row.due_date?.slice(0, 10) ?? '');
    setTotalAmount(String(row.total_amount));
    setCurrency(row.currency);
    setNotes(row.notes ?? '');
    setEditOpen(true);
  }, []);

  const saveEdit = () => {
    if (!editRow) return;
    startTransition(async () => {
      const { error, code } = await updateInvoice({
        studyId,
        invoiceId: editRow.id,
        updatedAt: editRow.updated_at,
        vendorId: vendorId ? vendorId : null,
        siteId: siteId && siteId !== '__none__' ? siteId : null,
        purchaseOrderId: purchaseOrderId && purchaseOrderId !== '__none__' ? purchaseOrderId : null,
        contractId: contractId && contractId !== '__none__' ? contractId : null,
        categoryId: categoryId && categoryId !== '__none__' ? categoryId : null,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        dueDate: dueDate.trim() || null,
        totalAmount: Number(totalAmount),
        currency: currency.trim().toUpperCase(),
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
        return;
      }
      toast.success('Invoice updated.');
      setEditOpen(false);
      setEditRow(null);
      router.refresh();
    });
  };

  const confirmApprove = () => {
    if (!approveRow) return;
    startTransition(async () => {
      const { error } = await approveInvoice({
        studyId,
        invoiceId: approveRow.id,
        updatedAt: approveRow.updated_at,
        notes: approveNotes.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Invoice approved.');
      setApproveRow(null);
      setApproveNotes('');
      router.refresh();
    });
  };

  const confirmReject = () => {
    if (!rejectRow || !rejectReason.trim()) {
      toast.error('A rejection reason is required.');
      return;
    }
    startTransition(async () => {
      const { error } = await rejectInvoice({
        studyId,
        invoiceId: rejectRow.id,
        updatedAt: rejectRow.updated_at,
        reason: rejectReason.trim(),
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Invoice rejected.');
      setRejectRow(null);
      setRejectReason('');
      router.refresh();
    });
  };

  const confirmPay = () => {
    if (!payRow) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }
    startTransition(async () => {
      const { error } = await recordPayment({
        studyId,
        invoiceId: payRow.id,
        amount: amt,
        currency: payRow.currency,
        paymentDate: payDate,
        reference: payReference.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Payment recorded.');
      setPayRow(null);
      router.refresh();
    });
  };

  const bulkSubmitDrafts = useCallback(() => {
    const targets = invoices.filter((i) => rowSelection[i.id] && i.approval_status === 'draft');
    if (targets.length === 0) {
      toast.error('No draft invoices in the current selection.');
      return;
    }
    startTransition(async () => {
      for (const inv of targets) {
        const { error } = await submitInvoiceForApproval({
          studyId,
          invoiceId: inv.id,
          updatedAt: inv.updated_at,
        });
        if (error) {
          toast.error(`${inv.invoice_number}: ${error}`);
          router.refresh();
          return;
        }
      }
      toast.success(`Submitted ${targets.length} invoice(s).`);
      clearSelection();
      router.refresh();
    });
  }, [clearSelection, invoices, rowSelection, router, studyId]);

  const queueExportSelectedInvoices = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.error('Select at least one invoice.');
      return;
    }
    startTransition(async () => {
      const { error } = await enqueueFinanceExportJob({
        studyId,
        kind: 'invoices',
        rowIds: selectedRows.map((i) => i.id),
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(`Queued export for ${selectedRows.length} invoice(s). Check Finance → Reports → Data exports.`);
      clearSelection();
      router.refresh();
    });
  }, [clearSelection, router, selectedRows, studyId]);

  const bulkApproveInvoices = useCallback(() => {
    if (selectedApprovableInvoices.length === 0) {
      toast.error('Select invoices in Submitted or Under review to approve.');
      return;
    }
    startTransition(async () => {
      for (const inv of selectedApprovableInvoices) {
        const { error, code } = await approveInvoice({
          studyId,
          invoiceId: inv.id,
          updatedAt: inv.updated_at,
          notes: null,
        });
        if (error) {
          toast.error(`${inv.invoice_number}: ${error}`, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
          router.refresh();
          return;
        }
      }
      toast.success(`Approved ${selectedApprovableInvoices.length} invoice(s).`);
      clearSelection();
      router.refresh();
    });
  }, [selectedApprovableInvoices, studyId, router, clearSelection]);

  const bulkRejectInvoicesConfirm = useCallback(() => {
    if (selectedApprovableInvoices.length === 0) {
      toast.error('Select invoices in Submitted or Under review to reject.');
      return;
    }
    if (!bulkRejectInvReason.trim()) {
      toast.error('Enter a rejection reason.');
      return;
    }
    const reason = bulkRejectInvReason.trim();
    startTransition(async () => {
      for (const inv of selectedApprovableInvoices) {
        const { error, code } = await rejectInvoice({
          studyId,
          invoiceId: inv.id,
          updatedAt: inv.updated_at,
          reason,
        });
        if (error) {
          toast.error(`${inv.invoice_number}: ${error}`, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
          router.refresh();
          return;
        }
      }
      toast.success(`Rejected ${selectedApprovableInvoices.length} invoice(s).`);
      setBulkRejectInvOpen(false);
      setBulkRejectInvReason('');
      clearSelection();
      router.refresh();
    });
  }, [selectedApprovableInvoices, studyId, router, bulkRejectInvReason, clearSelection]);

  const rowActions = useCallback(
    (row: FmInvoice): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [
        {
          id: 'open',
          label: 'Open in workflow',
          disabled: rowBusy,
          onSelect: () => {
            router.push(`${base}?invoice=${encodeURIComponent(row.id)}`, { scroll: false });
          },
        },
        {
          id: 'details',
          label: 'Details',
          disabled: rowBusy,
          onSelect: () => setDetailInvoiceId(row.id),
        },
        {
          id: 'export-queue',
          label: 'Export to queue',
          disabled: rowBusy || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => {
            startTransition(async () => {
              const { error } = await enqueueFinanceExportJob({
                studyId,
                kind: 'invoices',
                rowIds: [row.id],
              });
              if (error) {
                toast.error(error);
                return;
              }
              toast.success('Invoice export queued.');
              router.refresh();
            });
          },
        },
      ];
      if (row.approval_status === 'draft') {
        items.push(
          {
            id: 'edit',
            label: 'Edit',
            disabled: rowBusy || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () => openEdit(row),
          },
          {
            id: 'submit',
            label: 'Submit for approval',
            disabled: rowBusy || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () => submitOne(row.id, row.updated_at),
          },
          {
            id: 'del',
            label: 'Delete',
            variant: 'destructive',
            disabled: rowBusy || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () => setDeleteRow(row),
          },
        );
      }
      if (row.approval_status === 'submitted' || row.approval_status === 'under_review') {
        items.push(
          {
            id: 'approve',
            label: 'Approve',
            disabled: rowBusy || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () => {
              setApproveNotes('');
              setApproveRow(row);
            },
          },
          {
            id: 'reject',
            label: 'Reject',
            variant: 'destructive',
            disabled: rowBusy || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () => {
              setRejectReason('');
              setRejectRow(row);
            },
          },
        );
      }
      if (row.approval_status === 'approved' && row.payment_status !== 'paid') {
        items.push({
          id: 'pay',
          label: 'Record payment',
          disabled: rowBusy || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => {
            setPayAmount(String(Number(row.total_amount)));
            setPayDate(new Date().toISOString().slice(0, 10));
            setPayReference('');
            setPayRow(row);
          },
        });
      }
      return items;
    },
    [rowBusy, router, base, openEdit, submitOne, canWrite, writeBlockedReason, studyId],
  );

  const columns = useMemo<ColumnDef<FmInvoice>[]>(
    () => [
      {
        accessorKey: 'invoice_number',
        header: 'Invoice #',
        cell: ({ row }) => (
          <Link
            href={`${base}?invoice=${encodeURIComponent(row.original.id)}`}
            className={cn('text-xs font-medium text-primary underline-offset-2 hover:underline')}
            scroll={false}
          >
            {row.original.invoice_number}
          </Link>
        ),
      },
      {
        id: 'vendor',
        header: 'Vendor',
        cell: ({ row }) =>
          row.original.vendor_id ? (
            <VendorChip
              studyId={studyId}
              vendorId={row.original.vendor_id}
              label={vendorName(row.original.vendor_id)}
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: 'links',
        header: 'Links',
        cell: ({ row }) => {
          const site = row.original.site_id ? studySites.find((s) => s.id === row.original.site_id) : undefined;
          const hasPo = Boolean(row.original.purchase_order_id);
          const hasSite = Boolean(row.original.site_id && site);
          const hasCo = Boolean(row.original.contract_id);
          if (!hasPo && !hasSite && !hasCo) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div className="flex max-w-[180px] flex-col gap-0.5">
              {hasPo && row.original.purchase_order_id ? (
                <PurchaseOrderChip
                  studyId={studyId}
                  purchaseOrderId={row.original.purchase_order_id}
                  label={poLabel(row.original.purchase_order_id)}
                />
              ) : null}
              {hasSite && site ? (
                <SiteChip studyId={studyId} siteId={site.id} label={siteLabel(site)} />
              ) : null}
              {hasCo && row.original.contract_id ? (
                <ContractChip
                  studyId={studyId}
                  contractId={row.original.contract_id}
                  label={contractLabel(row.original.contract_id)}
                />
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: 'invoice_date',
        header: 'Invoice date',
        cell: ({ row }) => <span className="text-xs">{row.original.invoice_date.slice(0, 10)}</span>,
      },
      {
        accessorKey: 'due_date',
        header: 'Due',
        cell: ({ row }) => <span className="text-xs">{row.original.due_date?.slice(0, 10) ?? '—'}</span>,
      },
      {
        accessorKey: 'total_amount',
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="text-xs tabular-nums">
              {formatCurrency(Number(row.original.total_amount), row.original.currency)}
            </div>
            <FmApprovalLimitHint
              studyId={studyId}
              kind="invoice"
              amount={Number(row.original.total_amount)}
              currency={row.original.currency}
            />
          </div>
        ),
      },
      {
        accessorKey: 'approval_status',
        header: 'Approval',
        meta: {
          facetOptions: Object.entries(FM_INVOICE_APPROVAL_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        },
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <Badge variant={APPROVAL_VARIANT[row.original.approval_status]} className="text-[10px]">
            {FM_INVOICE_APPROVAL_STATUS_LABELS[row.original.approval_status]}
          </Badge>
        ),
      },
      {
        accessorKey: 'payment_status',
        header: 'Payment',
        meta: {
          facetOptions: Object.entries(FM_INVOICE_PAYMENT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        },
        filterFn: 'equalsString',
        cell: ({ row }) => (
          <Badge variant={PAYMENT_VARIANT[row.original.payment_status]} className="text-[10px]">
            {FM_INVOICE_PAYMENT_STATUS_LABELS[row.original.payment_status]}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <FinanceRowActionsMenu
            ariaLabel="Invoice actions"
            telemetryContext={{ studyId, tableKey: 'invoices', entityType: 'fm_invoices' }}
            items={rowActions(row.original)}
          />
        ),
      },
    ],
    [base, studyId, vendorName, rowActions, studySites, poLabel, contractLabel],
  );

  const invoiceBulkActions: FinanceBulkAction[] = useMemo(
    () => [
      {
        id: 'submit-drafts',
        label: 'Submit drafts',
        onClick: bulkSubmitDrafts,
        disabled: isPending || submitMut.isPending || !canWrite,
      },
      {
        id: 'bulk-approve',
        label: 'Approve selected',
        onClick: bulkApproveInvoices,
        disabled: isPending || submitMut.isPending || !canWrite || selectedApprovableInvoices.length === 0,
      },
      {
        id: 'bulk-reject',
        label: 'Reject selected…',
        variant: 'destructive',
        onClick: () => setBulkRejectInvOpen(true),
        disabled: isPending || submitMut.isPending || !canWrite || selectedApprovableInvoices.length === 0,
      },
      {
        id: 'export-queue',
        label: 'Export to queue',
        variant: 'outline',
        onClick: queueExportSelectedInvoices,
      },
      {
        id: 'clear',
        label: 'Clear',
        variant: 'secondary',
        onClick: clearSelection,
      },
    ],
    [
      bulkSubmitDrafts,
      bulkApproveInvoices,
      clearSelection,
      queueExportSelectedInvoices,
      isPending,
      submitMut.isPending,
      canWrite,
      selectedApprovableInvoices.length,
    ],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Invoices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fmHealth === 'orphan_lines' ? (
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertTitle className="text-xs">Data health: invoice line categories</AlertTitle>
            <AlertDescription className="text-[11px] text-muted-foreground">
              Open an invoice and review line items — one or more rows reference budget categories that no longer
              exist. Fix categories in Settings, then refresh line items from the invoice detail sheet.
            </AlertDescription>
          </Alert>
        ) : null}
        {invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No invoices yet. Use the upload area below to add the first invoice for this study.
          </p>
        ) : (
          <>
            <FinanceDataTable
              urlPrefix="fmt_inv"
              studyId={studyId}
              enableSavedViews
              columns={columns}
              data={invoices}
              getRowId={(r) => r.id}
              enableRowSelection
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              bulkActions={invoiceBulkActions}
              getRowClassName={(row) =>
                selectedInvoiceId === row.id ? 'bg-primary/5' : undefined
              }
            />
          </>
        )}

        <Dialog open={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
          <DialogContent className="max-w-md gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit draft invoice</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
              <Label className="text-[11px]">Vendor (optional)</Label>
              <Select
                value={vendorId || '__none__'}
                onValueChange={(v) => {
                  setVendorId(v === '__none__' ? '' : v);
                  setContractId('');
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue
                    getDisplayLabel={(val) => {
                      if (!val || val === '__none__') return 'None';
                      return activeVendors.find((x) => x.id === val)?.name ?? null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">
                    None
                  </SelectItem>
                  {activeVendors.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[11px]">Site (optional)</Label>
              <Select value={siteId || '__none__'} onValueChange={(v) => setSiteId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue
                    getDisplayLabel={(val) => {
                      if (!val || val === '__none__') return 'None';
                      const s = studySites.find((x) => x.id === val);
                      return s ? siteLabel(s) : null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">
                    None
                  </SelectItem>
                  {studySites.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {siteLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[11px]">Purchase order (optional)</Label>
              <Select
                value={purchaseOrderId || '__none__'}
                onValueChange={(v) => setPurchaseOrderId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue
                    getDisplayLabel={(val) => {
                      if (!val || val === '__none__') return 'None';
                      return openPos.find((p) => p.id === val)?.po_number ?? null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">
                    None
                  </SelectItem>
                  {openPos.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.po_number} · {formatCurrency(Number(p.po_value), p.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[11px]">Contract (optional)</Label>
              <Select
                value={contractId || '__none__'}
                onValueChange={(v) => setContractId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="h-9 text-xs" disabled={!vendorId}>
                  <SelectValue
                    getDisplayLabel={(val) => {
                      if (!val || val === '__none__') return 'None';
                      return vendorContracts.find((c) => c.id === val)?.title ?? null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">
                    None
                  </SelectItem>
                  {vendorContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[11px]">Budget category (optional)</Label>
              <Select
                value={categoryId || '__none__'}
                onValueChange={(v) => setCategoryId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue
                    getDisplayLabel={(val) => {
                      if (!val || val === '__none__') return 'None';
                      return activeCats.find((c) => c.id === val)?.name ?? null;
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">
                    None
                  </SelectItem>
                  {activeCats.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[11px]">Invoice number</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Invoice date</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Due date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Total amount</Label>
              <Input type="number" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Currency</Label>
              <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="h-9 text-xs" />
              <Label className="text-[11px]">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isPending || !invoiceNumber.trim()}
                onClick={saveEdit}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(approveRow)} onOpenChange={(o) => !o && setApproveRow(null)}>
          <DialogContent className="max-w-sm gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">Approve invoice</DialogTitle>
            </DialogHeader>
            <Label className="text-[11px]">Notes (optional)</Label>
            <Textarea value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} rows={3} className="text-xs" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setApproveRow(null)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={isPending} onClick={confirmApprove}>
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(rejectRow)} onOpenChange={(o) => !o && setRejectRow(null)}>
          <DialogContent className="max-w-sm gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">Reject invoice</DialogTitle>
            </DialogHeader>
            <Label className="text-[11px]">Reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="text-xs" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectRow(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={confirmReject}>
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={bulkRejectInvOpen}
          onOpenChange={(o) => {
            if (!o) {
              setBulkRejectInvOpen(false);
              setBulkRejectInvReason('');
            }
          }}
        >
          <DialogContent className="max-w-sm gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">
                Reject {selectedApprovableInvoices.length} invoice{selectedApprovableInvoices.length === 1 ? '' : 's'}
              </DialogTitle>
            </DialogHeader>
            <Label className="text-[11px]">Reason (applies to all)</Label>
            <Textarea
              value={bulkRejectInvReason}
              onChange={(e) => setBulkRejectInvReason(e.target.value)}
              rows={3}
              className="text-xs"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkRejectInvOpen(false);
                  setBulkRejectInvReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending || !bulkRejectInvReason.trim()}
                onClick={bulkRejectInvoicesConfirm}
              >
                Reject all
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(payRow)} onOpenChange={(o) => !o && setPayRow(null)}>
          <DialogContent className="max-w-sm gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">Record payment</DialogTitle>
            </DialogHeader>
            <Label className="text-[11px]">Amount</Label>
            <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="h-9 text-xs" />
            <Label className="text-[11px]">Payment date</Label>
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="h-9 text-xs" />
            <Label className="text-[11px]">Reference (optional)</Label>
            <Input value={payReference} onChange={(e) => setPayReference(e.target.value)} className="h-9 text-xs" />
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setPayRow(null)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={isPending} onClick={confirmPay}>
                Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {detailInv ? (
          <FinanceEntityDetailSheet
            open
            onOpenChange={(o) => {
              if (!o) setDetailInvoiceId(null);
            }}
            studyId={studyId}
            entityType="fm_invoices"
            entityId={detailInv.id}
            title={`Invoice ${detailInv.invoice_number}`}
            overview={
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5 text-[11px]">
                <dt className="text-muted-foreground">Approval</dt>
                <dd>{FM_INVOICE_APPROVAL_STATUS_LABELS[detailInv.approval_status]}</dd>
                <dt className="text-muted-foreground">Payment</dt>
                <dd>{FM_INVOICE_PAYMENT_STATUS_LABELS[detailInv.payment_status]}</dd>
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="tabular-nums">
                  {formatCurrency(Number(detailInv.total_amount), detailInv.currency)}
                </dd>
                <dt className="text-muted-foreground">Due</dt>
                <dd>{detailInv.due_date?.slice(0, 10) ?? '—'}</dd>
              </dl>
            }
            related={
              <div className="flex flex-col gap-2">
                {detailInv.vendor_id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">Vendor</span>
                    <VendorChip
                      studyId={studyId}
                      vendorId={detailInv.vendor_id}
                      label={vendorName(detailInv.vendor_id)}
                    />
                  </div>
                ) : null}
                {detailInv.purchase_order_id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">PO</span>
                    <PurchaseOrderChip
                      studyId={studyId}
                      purchaseOrderId={detailInv.purchase_order_id}
                      label={poLabel(detailInv.purchase_order_id)}
                    />
                  </div>
                ) : null}
                {detailInv.site_id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">Site</span>
                    {(() => {
                      const s = studySites.find((x) => x.id === detailInv.site_id);
                      return s ? (
                        <SiteChip studyId={studyId} siteId={s.id} label={siteLabel(s)} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      );
                    })()}
                  </div>
                ) : null}
                {detailInv.contract_id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">Contract</span>
                    <ContractChip
                      studyId={studyId}
                      contractId={detailInv.contract_id}
                      label={contractLabel(detailInv.contract_id)}
                    />
                  </div>
                ) : null}
                {!detailInv.vendor_id &&
                !detailInv.purchase_order_id &&
                !detailInv.site_id &&
                !detailInv.contract_id ? (
                  <p className="text-[11px] text-muted-foreground">No linked vendor, PO, site, or contract.</p>
                ) : null}
              </div>
            }
            attachments={{
              kind: 'invoice',
              invoiceId: detailInv.id,
              storagePath: detailInv.storage_path,
              rowUpdatedAt: detailInv.updated_at,
              allowMutate: canWrite && detailInv.approval_status === 'draft',
            }}
            currentUserId={currentUserId}
            onEntityUpdated={() => router.refresh()}
          />
        ) : null}

        <FinanceDeleteConfirmDialog
          open={Boolean(deleteRow)}
          onOpenChange={(o) => !o && setDeleteRow(null)}
          title="Delete draft invoice?"
          description="This removes the invoice and its line items. Only drafts without payments can be deleted."
          onConfirm={async () => {
            if (!deleteRow) return;
            const { error, code } = await deleteInvoice({
              studyId,
              invoiceId: deleteRow.id,
              updatedAt: deleteRow.updated_at,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Invoice deleted.');
            setDeleteRow(null);
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
