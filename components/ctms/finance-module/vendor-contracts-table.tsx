'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ContractChip } from '@/components/ctms/finance-module/_shared/chips/contract-chip';
import { VendorChip } from '@/components/ctms/finance-module/_shared/chips/vendor-chip';
import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import { FinanceDeleteConfirmDialog } from '@/components/ctms/finance-module/_shared/delete-confirm-dialog';
import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { deleteContract, updateContract } from '@/lib/actions/study-finance-module';
import { formatCurrency } from '@/lib/finance-module/calculations';
import type { FmContract, FmVendor } from '@/lib/finance-module/types';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

interface VendorContractsTableProps {
  studyId: string;
  contracts: FmContract[];
  vendors: FmVendor[];
}

export function VendorContractsTable({ studyId, contracts, vendors }: VendorContractsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeBlockedReason =
    permsQ.isFetched && !canWrite
      ? 'You cannot modify finance records for this study (read-only or closed).'
      : undefined;

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<FmContract | null>(null);
  const [title, setTitle] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [deleteRow, setDeleteRow] = useState<FmContract | null>(null);

  const vendorName = useCallback(
    (id: string) => vendors.find((v) => v.id === id)?.name ?? 'Vendor',
    [vendors],
  );

  const openEdit = useCallback((row: FmContract) => {
    setEditRow(row);
    setTitle(row.title);
    setContractNumber(row.contract_number ?? '');
    setTotalValue(String(row.total_value));
    setCurrency(row.currency);
    setNotes(row.notes ?? '');
    setEditOpen(true);
  }, []);

  const saveEdit = () => {
    if (!editRow) return;
    startTransition(async () => {
      const { error, code } = await updateContract({
        studyId,
        contractId: editRow.id,
        updatedAt: editRow.updated_at,
        title: title.trim(),
        contractNumber: contractNumber.trim() || null,
        totalValue: Number(totalValue),
        currency: currency.trim().toUpperCase(),
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
        return;
      }
      toast.success('Contract updated.');
      setEditOpen(false);
      setEditRow(null);
      router.refresh();
    });
  };

  const rowActions = useCallback(
    (row: FmContract): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [
        {
          id: 'jump',
          label: 'Open in tracker',
          disabled: isPending,
          onSelect: () => {
            router.push(`/protected/studies/${studyId}/finance-module/vendors#contract-${row.id}`, { scroll: true });
          },
        },
      ];
      if (row.status === 'draft') {
        items.push(
          {
            id: 'edit',
            label: 'Edit draft',
            disabled: isPending || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () => openEdit(row),
          },
          {
            id: 'del',
            label: 'Delete draft',
            variant: 'destructive',
            disabled: isPending || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () => setDeleteRow(row),
          },
        );
      }
      return items;
    },
    [isPending, canWrite, writeBlockedReason, openEdit, router, studyId],
  );

  const columns = useMemo<ColumnDef<FmContract>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Contract',
        cell: ({ row }) => (
          <ContractChip
            studyId={studyId}
            contractId={row.original.id}
            label={row.original.title}
          />
        ),
      },
      {
        accessorKey: 'contract_number',
        header: '#',
        cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.contract_number ?? '—'}</span>,
      },
      {
        id: 'vendor',
        header: 'Vendor',
        cell: ({ row }) => (
          <VendorChip studyId={studyId} vendorId={row.original.vendor_id} label={vendorName(row.original.vendor_id)} />
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge className="text-[10px] capitalize">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'total_value',
        header: () => <span className="block text-right">Value</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCurrency(Number(row.original.total_value), row.original.currency)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <FinanceRowActionsMenu
            ariaLabel="Contract actions"
            telemetryContext={{ studyId, tableKey: 'contracts', entityType: 'fm_contracts' }}
            items={rowActions(row.original)}
          />
        ),
      },
    ],
    [studyId, vendorName, rowActions],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Contracts</CardTitle>
        <CardDescription className="text-xs">
          Draft contracts can be edited or deleted. Active contracts are managed from spend trackers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No contracts yet. Create one in the form above.</p>
        ) : (
          <FinanceDataTable urlPrefix="fmt_vendor_contracts" studyId={studyId} columns={columns} data={contracts} getRowId={(r) => r.id} />
        )}

        <Dialog open={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
          <DialogContent className="max-w-md gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit draft contract</DialogTitle>
            </DialogHeader>
            <div className="grid gap-2">
              <Label className="text-[11px]">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Contract #</Label>
              <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Total value</Label>
              <Input type="number" step="0.01" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Currency</Label>
              <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="h-9 text-xs" />
              <Label className="text-[11px]">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={isPending || !title.trim()} onClick={saveEdit}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FinanceDeleteConfirmDialog
          open={Boolean(deleteRow)}
          onOpenChange={(o) => !o && setDeleteRow(null)}
          title="Delete draft contract?"
          description="Only unreferenced draft contracts can be removed. Linked POs or invoices will block deletion."
          onConfirm={async () => {
            if (!deleteRow) return;
            const { error, code } = await deleteContract({
              studyId,
              contractId: deleteRow.id,
              updatedAt: deleteRow.updated_at,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Contract deleted.');
            setDeleteRow(null);
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
