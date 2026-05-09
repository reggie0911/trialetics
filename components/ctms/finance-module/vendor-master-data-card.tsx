'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { VendorContractsTable } from '@/components/ctms/finance-module/vendor-contracts-table';
import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import { FinanceDeleteConfirmDialog } from '@/components/ctms/finance-module/_shared/delete-confirm-dialog';
import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { archiveStudyVendor, createContract, createStudyVendor, updateStudyVendor } from '@/lib/actions/study-finance-module';
import {
  FM_VENDOR_SERVICE_CATEGORY_LABELS,
  type FmContract,
  type FmVendor,
  type FmVendorServiceCategory,
  type FmVendorStatus,
} from '@/lib/finance-module/types';
import { Badge } from '@/components/ui/badge';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

const SERVICE_KEYS = Object.keys(FM_VENDOR_SERVICE_CATEGORY_LABELS) as FmVendorServiceCategory[];

const STATUS_KEYS: FmVendorStatus[] = ['active', 'inactive', 'archived'];

const VENDOR_STATUS_LABELS: Record<FmVendorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

interface VendorMasterDataCardProps {
  studyId: string;
  vendors: FmVendor[];
  contracts: FmContract[];
  baseCurrency: string;
}

export function VendorMasterDataCard({ studyId, vendors, contracts, baseCurrency }: VendorMasterDataCardProps) {
  const router = useRouter();
  const [pendingV, vendorTransition] = useTransition();
  const [pendingC, contractTransition] = useTransition();
  const [pendingE, editTransition] = useTransition();
  const [isArchiving, archiveTransition] = useTransition();
  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeBlockedReason =
    permsQ.isFetched && !canWrite
      ? 'You cannot modify finance records for this study (read-only or closed).'
      : undefined;

  const [vName, setVName] = useState('');
  const [vCat, setVCat] = useState<FmVendorServiceCategory>('other');
  const [vNotes, setVNotes] = useState('');

  const [cVendorId, setCVendorId] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cNum, setCNum] = useState('');
  const [cValue, setCValue] = useState('');
  const [cCurr, setCCurr] = useState(baseCurrency);

  const [editVendorId, setEditVendorId] = useState('');
  const [archiveVendor, setArchiveVendor] = useState<FmVendor | null>(null);
  const [evName, setEvName] = useState('');
  const [evCat, setEvCat] = useState<FmVendorServiceCategory>('other');
  const [evNotes, setEvNotes] = useState('');
  const [evStatus, setEvStatus] = useState<FmVendorStatus>('active');

  const vendorOptions = useMemo(() => vendors.filter((v) => v.status !== 'archived'), [vendors]);

  useEffect(() => {
    const v = vendors.find((x) => x.id === editVendorId);
    if (!v) {
      setEvName('');
      setEvNotes('');
      setEvCat('other');
      setEvStatus('active');
      return;
    }
    setEvName(v.name);
    setEvCat(v.service_category);
    setEvNotes(v.notes ?? '');
    setEvStatus(v.status);
  }, [editVendorId, vendors]);

  const submitVendor = () => {
    vendorTransition(async () => {
      const { error } = await createStudyVendor({
        studyId,
        name: vName.trim(),
        serviceCategory: vCat,
        notes: vNotes.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Vendor created.');
      setVName('');
      setVNotes('');
      router.refresh();
    });
  };

  const submitContract = () => {
    if (!cVendorId) {
      toast.error('Select a vendor.');
      return;
    }
    contractTransition(async () => {
      const { error } = await createContract({
        studyId,
        vendorId: cVendorId,
        title: cTitle.trim(),
        contractNumber: cNum.trim() || null,
        totalValue: Number(cValue),
        currency: cCurr.trim().toUpperCase(),
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Contract created.');
      setCTitle('');
      setCNum('');
      setCValue('');
      router.refresh();
    });
  };

  const vendorRowActions = useCallback(
    (row: FmVendor): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [
        {
          id: 'edit',
          label: 'Edit in panel',
          disabled: pendingE || isArchiving,
          onSelect: () => {
            setEditVendorId(row.id);
            document.getElementById('vendor-master-edit-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          },
        },
      ];
      if (row.status !== 'archived') {
        items.push({
          id: 'archive',
          label: 'Archive',
          variant: 'destructive',
          disabled: isArchiving || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => setArchiveVendor(row),
        });
      }
      return items;
    },
    [pendingE, isArchiving, canWrite, writeBlockedReason],
  );

  const vendorColumns = useMemo<ColumnDef<FmVendor>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Vendor',
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'service_category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-xs">{FM_VENDOR_SERVICE_CATEGORY_LABELS[row.original.service_category]}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge className="text-[10px] capitalize">{row.original.status}</Badge>,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <FinanceRowActionsMenu
            ariaLabel="Vendor actions"
            telemetryContext={{ studyId, tableKey: 'vendors', entityType: 'fm_vendors' }}
            items={vendorRowActions(row.original)}
          />
        ),
      },
    ],
    [vendorRowActions, studyId],
  );

  const submitEdit = () => {
    if (!editVendorId) {
      toast.error('Select a vendor to edit.');
      return;
    }
    editTransition(async () => {
      const v = vendors.find((x) => x.id === editVendorId);
      if (!v) {
        toast.error('Vendor not found.');
        return;
      }
      const { error } = await updateStudyVendor({
        studyId,
        vendorId: editVendorId,
        updatedAt: v.updated_at,
        name: evName.trim(),
        serviceCategory: evCat,
        notes: evNotes.trim() || null,
        status: evStatus,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Vendor updated.');
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Vendor & contract setup</CardTitle>
        <CardDescription className="text-xs">
          Add vendors and contracts so spend trackers and POs can reference them. Edit vendors to fix master data or
          archive when no longer used.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
      <div id="vendor-master-edit-panel" className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="text-[11px] font-medium text-muted-foreground">New vendor</div>
          <div className="space-y-1">
            <Label className="text-[11px]">Name</Label>
            <Input value={vName} onChange={(e) => setVName(e.target.value)} className="text-xs h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Service category</Label>
            <Select value={vCat} onValueChange={(v) => setVCat(v as FmVendorServiceCategory)}>
              <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                <SelectValue
                  placeholder="Service category"
                  getDisplayLabel={(val) =>
                    val && FM_VENDOR_SERVICE_CATEGORY_LABELS[val as FmVendorServiceCategory]
                      ? FM_VENDOR_SERVICE_CATEGORY_LABELS[val as FmVendorServiceCategory]
                      : null
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_KEYS.map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {FM_VENDOR_SERVICE_CATEGORY_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Notes</Label>
            <Textarea value={vNotes} onChange={(e) => setVNotes(e.target.value)} rows={2} className="text-xs" />
          </div>
          <Button size="sm" disabled={pendingV || !vName.trim()} onClick={submitVendor}>
            Add vendor
          </Button>
        </div>

        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="text-[11px] font-medium text-muted-foreground">New contract</div>
          <div className="space-y-1">
            <Label className="text-[11px]">Vendor</Label>
            <Select value={cVendorId || '__'} onValueChange={(v) => setCVendorId(v === '__' ? '' : v)}>
              <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                <SelectValue
                  placeholder="Select vendor"
                  getDisplayLabel={(val) => {
                    if (!val || val === '__') return null;
                    return vendorOptions.find((v) => v.id === val)?.name ?? null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__" className="text-xs">
                  Select…
                </SelectItem>
                {vendorOptions.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Title</Label>
            <Input value={cTitle} onChange={(e) => setCTitle(e.target.value)} className="text-xs h-9" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Contract #</Label>
              <Input value={cNum} onChange={(e) => setCNum(e.target.value)} className="text-xs h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Currency</Label>
              <Input
                value={cCurr}
                maxLength={3}
                onChange={(e) => setCCurr(e.target.value.toUpperCase())}
                className="text-xs h-9"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Total value</Label>
            <Input
              type="number"
              step="0.01"
              value={cValue}
              onChange={(e) => setCValue(e.target.value)}
              className="text-xs h-9"
            />
          </div>
          <Button
            size="sm"
            disabled={pendingC || !cVendorId || !cTitle.trim() || cValue === ''}
            onClick={submitContract}
          >
            Create contract
          </Button>
        </div>

        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="text-[11px] font-medium text-muted-foreground">Edit vendor</div>
          <div className="space-y-1">
            <Label className="text-[11px]">Vendor</Label>
            <Select value={editVendorId || '__'} onValueChange={(v) => setEditVendorId(v === '__' ? '' : v)}>
              <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                <SelectValue
                  placeholder="Select vendor"
                  getDisplayLabel={(val) => {
                    if (!val || val === '__') return null;
                    const v = vendors.find((x) => x.id === val);
                    return v ? `${v.name}${v.status === 'archived' ? ' (Archived)' : ''}` : null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__" className="text-xs">
                  Select…
                </SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.name}
                    {v.status === 'archived' ? ' (archived)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Name</Label>
            <Input value={evName} onChange={(e) => setEvName(e.target.value)} className="text-xs h-9" disabled={!editVendorId} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Service category</Label>
            <Select
              value={evCat}
              onValueChange={(v) => setEvCat(v as FmVendorServiceCategory)}
              disabled={!editVendorId}
            >
              <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                <SelectValue
                  placeholder="Service category"
                  getDisplayLabel={(val) =>
                    val && FM_VENDOR_SERVICE_CATEGORY_LABELS[val as FmVendorServiceCategory]
                      ? FM_VENDOR_SERVICE_CATEGORY_LABELS[val as FmVendorServiceCategory]
                      : null
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_KEYS.map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {FM_VENDOR_SERVICE_CATEGORY_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select value={evStatus} onValueChange={(v) => setEvStatus(v as FmVendorStatus)} disabled={!editVendorId}>
              <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                <SelectValue
                  placeholder="Status"
                  getDisplayLabel={(val) =>
                    val && VENDOR_STATUS_LABELS[val as FmVendorStatus]
                      ? VENDOR_STATUS_LABELS[val as FmVendorStatus]
                      : null
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {STATUS_KEYS.map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {VENDOR_STATUS_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Notes</Label>
            <Textarea value={evNotes} onChange={(e) => setEvNotes(e.target.value)} rows={2} className="text-xs" disabled={!editVendorId} />
          </div>
          <Button size="sm" disabled={pendingE || !editVendorId || !evName.trim()} onClick={submitEdit}>
            Save changes
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-medium text-muted-foreground">Vendor directory</div>
        {vendors.length === 0 ? (
          <p className="text-xs text-muted-foreground">No vendors yet.</p>
        ) : (
          <FinanceDataTable urlPrefix="fmt_vendors_dir" studyId={studyId} columns={vendorColumns} data={vendors} getRowId={(r) => r.id} />
        )}
      </div>

      <VendorContractsTable studyId={studyId} contracts={contracts} vendors={vendors} />

      <FinanceDeleteConfirmDialog
        open={Boolean(archiveVendor)}
        onOpenChange={(o) => !o && setArchiveVendor(null)}
        title="Archive this vendor?"
        description="Archived vendors are hidden from default pickers but remain for historical invoices and POs."
        confirmLabel="Archive"
        onConfirm={() => {
          if (!archiveVendor) return;
          archiveTransition(async () => {
            const { error, code } = await archiveStudyVendor({
              studyId,
              vendorId: archiveVendor.id,
              updatedAt: archiveVendor.updated_at,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Vendor archived.');
            setArchiveVendor(null);
            router.refresh();
          });
        }}
      />
      </CardContent>
    </Card>
  );
}
