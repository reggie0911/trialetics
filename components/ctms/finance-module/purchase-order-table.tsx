'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import { FinanceDeleteConfirmDialog } from '@/components/ctms/finance-module/_shared/delete-confirm-dialog';
import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
import { ContractChip } from '@/components/ctms/finance-module/_shared/chips/contract-chip';
import { InvoiceChip } from '@/components/ctms/finance-module/_shared/chips/invoice-chip';
import { VendorChip } from '@/components/ctms/finance-module/_shared/chips/vendor-chip';
import { FmApprovalLimitHint } from '@/components/ctms/finance-module/_shared/fm-approval-limit-hint';
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
  closePurchaseOrder,
  deletePurchaseOrder,
  duplicatePurchaseOrder,
  reopenPurchaseOrder,
  updatePurchaseOrder,
  type PoTrackerRow,
} from '@/lib/actions/study-finance-module';
import { formatCurrency } from '@/lib/finance-module/calculations';
import type { FmBudgetCategory, FmContract, FmVendor } from '@/lib/finance-module/types';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

interface PurchaseOrderTableProps {
  studyId: string;
  rows: PoTrackerRow[];
  vendors: FmVendor[];
  contracts: FmContract[];
  categories: FmBudgetCategory[];
}

const BAND_LABEL: Record<PoTrackerRow['utilizationBand'], string> = {
  open: 'Open',
  partially_used: 'Partially Used',
  near_fully_used: 'Near Fully Used',
  fully_utilized: 'Fully Utilized',
};

const BAND_VARIANT: Record<PoTrackerRow['utilizationBand'], 'success' | 'info' | 'warning' | 'destructive'> = {
  open: 'success',
  partially_used: 'info',
  near_fully_used: 'warning',
  fully_utilized: 'destructive',
};

export function PurchaseOrderTable({ studyId, rows, vendors, contracts, categories }: PurchaseOrderTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fmHealth = searchParams.get('fmHealth');
  const displayRows = useMemo(() => {
    if (fmHealth !== 'no_vendor') return rows;
    return rows.filter((r) => {
      if (!r.vendor_id) return true;
      const v = vendors.find((x) => x.id === r.vendor_id);
      return !v || v.status === 'archived';
    });
  }, [rows, fmHealth, vendors]);
  const [isPending, startTransition] = useTransition();
  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeBlockedReason =
    permsQ.isFetched && !canWrite
      ? 'You cannot modify finance records for this study (read-only or closed).'
      : undefined;
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<PoTrackerRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<PoTrackerRow | null>(null);

  const [vendorId, setVendorId] = useState('');
  const [contractId, setContractId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [description, setDescription] = useState('');
  const [poValue, setPoValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [poDate, setPoDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [studyArea, setStudyArea] = useState('');
  const [notes, setNotes] = useState('');

  const activeVendors = useMemo(() => vendors.filter((v) => v.status !== 'archived'), [vendors]);
  const activeCats = useMemo(() => categories.filter((c) => !c.is_archived), [categories]);
  const vendorContracts = useMemo(
    () => contracts.filter((c) => c.vendor_id === vendorId && c.status !== 'archived'),
    [contracts, vendorId],
  );

  const vendorName = useCallback(
    (id: string) => vendors.find((v) => v.id === id)?.name ?? 'Vendor',
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

  const closePo = useCallback(
    (row: PoTrackerRow) => {
      startTransition(async () => {
        const { error } = await closePurchaseOrder({
          studyId,
          purchaseOrderId: row.id,
          updatedAt: row.updated_at,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Purchase order closed.');
        router.refresh();
      });
    },
    [studyId, router],
  );

  const reopenPo = useCallback(
    (row: PoTrackerRow) => {
      startTransition(async () => {
        const { error, code } = await reopenPurchaseOrder({
          studyId,
          purchaseOrderId: row.id,
          updatedAt: row.updated_at,
        });
        if (error) {
          toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
          return;
        }
        toast.success('Purchase order reopened.');
        router.refresh();
      });
    },
    [studyId, router],
  );

  const duplicatePo = useCallback(
    (purchaseOrderId: string) => {
      startTransition(async () => {
        const { error } = await duplicatePurchaseOrder({ studyId, purchaseOrderId });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Duplicate PO created as open.');
        router.refresh();
      });
    },
    [studyId, router],
  );

  const openEdit = useCallback((row: PoTrackerRow) => {
    setEditRow(row);
    setVendorId(row.vendor_id);
    setContractId(row.contract_id ?? '');
    setCategoryId(row.category_id ?? '');
    setPoNumber(row.po_number);
    setDescription(row.description ?? '');
    setPoValue(String(row.po_value));
    setCurrency(row.currency);
    setPoDate(row.po_date.slice(0, 10));
    setExpirationDate(row.expiration_date?.slice(0, 10) ?? '');
    setStudyArea(row.study_area ?? '');
    setNotes(row.notes ?? '');
    setEditOpen(true);
  }, []);

  const saveEdit = () => {
    if (!editRow) return;
    startTransition(async () => {
      const { error, code } = await updatePurchaseOrder({
        studyId,
        purchaseOrderId: editRow.id,
        updatedAt: editRow.updated_at,
        vendorId,
        contractId: contractId && contractId !== '__none__' ? contractId : null,
        categoryId: categoryId && categoryId !== '__none__' ? categoryId : null,
        poNumber: poNumber.trim(),
        description: description.trim() || null,
        poValue: Number(poValue),
        currency: currency.trim().toUpperCase(),
        poDate,
        expirationDate: expirationDate.trim() || null,
        studyArea: studyArea.trim() || null,
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
        return;
      }
      toast.success('Purchase order updated.');
      setEditOpen(false);
      setEditRow(null);
      router.refresh();
    });
  };

  const rowActions = useCallback(
    (row: PoTrackerRow): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [
        {
          id: 'edit',
          label: 'Edit',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => openEdit(row),
        },
        {
          id: 'dup',
          label: 'Duplicate',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => duplicatePo(row.id),
        },
      ];
      if (row.status === 'open') {
        items.push({
          id: 'close',
          label: 'Close PO',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => closePo(row),
        });
        items.push({
          id: 'del',
          label: 'Delete',
          variant: 'destructive',
          disabled: isPending || row.invoicedAmount > 0 || !canWrite,
          disabledReason:
            row.invoicedAmount > 0
              ? 'Remove or unlink invoices before deleting this PO.'
              : writeBlockedReason,
          onSelect: () => setDeleteRow(row),
        });
      } else {
        items.push({
          id: 'reopen',
          label: 'Reopen',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => reopenPo(row),
        });
      }
      return items;
    },
    [isPending, canWrite, writeBlockedReason, openEdit, duplicatePo, closePo, reopenPo],
  );

  const columns = useMemo<ColumnDef<PoTrackerRow>[]>(
    () => [
      {
        accessorKey: 'po_number',
        header: 'PO #',
        cell: ({ row }) => (
          <span className="text-xs font-medium tabular-nums">{row.original.po_number}</span>
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
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Missing vendor</span>
          ),
      },
      {
        id: 'contract',
        header: 'Contract',
        cell: ({ row }) =>
          row.original.contract_id ? (
            <ContractChip
              studyId={studyId}
              contractId={row.original.contract_id}
              label={contractLabel(row.original.contract_id)}
            />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: 'invoices',
        header: 'Invoices',
        cell: ({ row }) =>
          row.original.linkedInvoices.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <div className="flex max-w-[200px] flex-col gap-0.5">
              {row.original.linkedInvoices.map((inv) => (
                <InvoiceChip key={inv.id} studyId={studyId} invoiceId={inv.id} label={inv.invoice_number} />
              ))}
            </div>
          ),
      },
      {
        accessorKey: 'po_date',
        header: 'PO date',
        cell: ({ row }) => <span className="text-xs">{row.original.po_date.slice(0, 10)}</span>,
      },
      {
        accessorKey: 'po_value',
        header: () => <span className="block text-right">Value</span>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="text-xs tabular-nums">
              {formatCurrency(Number(row.original.po_value), row.original.currency)}
            </div>
            <FmApprovalLimitHint
              studyId={studyId}
              kind="po"
              amount={Number(row.original.po_value)}
              currency={row.original.currency}
            />
          </div>
        ),
      },
      {
        id: 'invoiced',
        header: () => <span className="block text-right">Invoiced</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCurrency(row.original.invoicedAmount, row.original.currency)}
          </div>
        ),
      },
      {
        id: 'remaining',
        header: () => <span className="block text-right">Remaining</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCurrency(row.original.remaining, row.original.currency)}
          </div>
        ),
      },
      {
        id: 'util',
        header: 'Utilization',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className={
                  row.original.utilizationBand === 'fully_utilized'
                    ? 'h-full bg-destructive'
                    : row.original.utilizationBand === 'near_fully_used'
                      ? 'h-full bg-amber-500'
                      : row.original.utilizationBand === 'partially_used'
                        ? 'h-full bg-blue-500'
                        : 'h-full bg-emerald-500'
                }
                style={{ width: `${Math.min(row.original.utilizationPct, 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {row.original.utilizationPct.toFixed(0)}%
            </span>
          </div>
        ),
      },
      {
        id: 'po_status',
        header: 'PO status',
        cell: ({ row }) => (
          <Badge variant={BAND_VARIANT[row.original.utilizationBand]} className="w-fit text-[10px]">
            {row.original.status === 'closed' ? 'Closed' : BAND_LABEL[row.original.utilizationBand]}
          </Badge>
        ),
      },
      {
        id: 'expiration',
        header: 'Expiration',
        cell: ({ row }) =>
          row.original.expiration_date ? (
            <span
              className={`text-xs ${row.original.isOverdue ? 'font-medium text-destructive' : 'text-foreground'}`}
            >
              {row.original.expiration_date.slice(0, 10)}
              {row.original.daysToExpiration != null
                ? row.original.daysToExpiration < 0
                  ? ` · ${Math.abs(row.original.daysToExpiration)}d overdue`
                  : ` · ${row.original.daysToExpiration}d left`
                : null}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <FinanceRowActionsMenu
            ariaLabel="PO actions"
            telemetryContext={{ studyId, tableKey: 'purchase_orders', entityType: 'fm_purchase_orders' }}
            items={rowActions(row.original)}
          />
        ),
      },
    ],
    [studyId, vendorName, contractLabel, rowActions],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fmHealth === 'no_vendor' ? (
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertTitle className="text-xs">Data health: purchase order vendor links</AlertTitle>
            <AlertDescription className="text-[11px] text-muted-foreground">
              Showing POs with no vendor or a vendor that is missing/archived. Edit each row to attach an active
              vendor.
            </AlertDescription>
          </Alert>
        ) : null}
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No purchase orders yet. Create POs to track committed vendor spend.
          </p>
        ) : displayRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rows match this health filter.</p>
        ) : (
          <FinanceDataTable
            urlPrefix="fmt_po"
            studyId={studyId}
            columns={columns}
            data={displayRows}
            getRowId={(r) => r.id}
          />
        )}

        <Dialog open={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
          <DialogContent className="max-w-md gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit purchase order</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
              <Label className="text-[11px]">Vendor</Label>
              <Select
                value={vendorId}
                onValueChange={(v) => {
                  setVendorId(v);
                  setContractId('');
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeVendors.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[11px]">Contract (optional)</Label>
              <Select
                value={contractId || '__none__'}
                onValueChange={(v) => setContractId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="h-9 text-xs">
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
              <Label className="text-[11px]">PO number</Label>
              <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="text-xs" />
              <Label className="text-[11px]">PO value</Label>
              <Input type="number" step="0.01" value={poValue} onChange={(e) => setPoValue(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Currency</Label>
              <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="h-9 text-xs" />
              <Label className="text-[11px]">PO date</Label>
              <Input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Expiration (optional)</Label>
              <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Study area (optional)</Label>
              <Input value={studyArea} onChange={(e) => setStudyArea(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Close
              </Button>
              <Button type="button" size="sm" disabled={isPending || !vendorId.trim() || !poNumber.trim()} onClick={saveEdit}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FinanceDeleteConfirmDialog
          open={Boolean(deleteRow)}
          onOpenChange={(o) => !o && setDeleteRow(null)}
          title="Delete purchase order?"
          description="Only open POs with no invoice references can be removed."
          onConfirm={async () => {
            if (!deleteRow) return;
            const { error, code } = await deletePurchaseOrder({
              studyId,
              purchaseOrderId: deleteRow.id,
              updatedAt: deleteRow.updated_at,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Purchase order deleted.');
            setDeleteRow(null);
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
