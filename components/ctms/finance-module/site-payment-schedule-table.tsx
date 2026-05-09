'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import type { FinanceBulkAction } from '@/components/ctms/finance-module/_shared/bulk-actions-bar';
import { FinanceDeleteConfirmDialog } from '@/components/ctms/finance-module/_shared/delete-confirm-dialog';
import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
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
import { useFmPermissions } from '@/hooks/use-fm-permissions';
import {
  deleteSitePaymentSchedule,
  enqueueFinanceExportJob,
  updateSitePaymentMilestone,
  updateSitePaymentSchedule,
} from '@/lib/actions/study-finance-module';
import { formatCurrency } from '@/lib/finance-module/calculations';
import {
  FM_SITE_PAYMENT_MILESTONE_LABELS,
  FM_SITE_PAYMENT_STATUS_LABELS,
  type FmSitePaymentMilestoneType,
  type FmSitePaymentSchedule,
  type FmSitePaymentStatus,
} from '@/lib/finance-module/types';

interface SitePaymentScheduleTableProps {
  studyId: string;
  rows: FmSitePaymentSchedule[];
}

const STATUS_OPTIONS: FmSitePaymentStatus[] = [
  'scheduled',
  'earned',
  'approved',
  'paid',
  'partial',
  'on_hold',
  'cancelled',
];

const STATUS_VARIANT: Record<FmSitePaymentStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  scheduled: 'secondary',
  earned: 'info',
  approved: 'info',
  paid: 'success',
  partial: 'warning',
  on_hold: 'warning',
  cancelled: 'destructive',
};

const MILESTONE_TYPES: FmSitePaymentMilestoneType[] = [
  'startup',
  'visit',
  'milestone',
  'enrollment',
  'closeout',
  'holdback',
  'other',
];

export function SitePaymentScheduleTable({ studyId, rows }: SitePaymentScheduleTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatusChoice, setBulkStatusChoice] = useState<FmSitePaymentStatus>('scheduled');

  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeBlockedReason =
    permsQ.isFetched && !canWrite
      ? 'You cannot modify finance records for this study (read-only or closed).'
      : undefined;

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<FmSitePaymentSchedule | null>(null);
  const [deleteRow, setDeleteRow] = useState<FmSitePaymentSchedule | null>(null);

  const [milestoneLabel, setMilestoneLabel] = useState('');
  const [milestoneType, setMilestoneType] = useState<FmSitePaymentMilestoneType>('startup');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [perSubject, setPerSubject] = useState('');
  const [holdback, setHoldback] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<FmSitePaymentStatus>('scheduled');
  const [notes, setNotes] = useState('');

  const setStatusQuick = useCallback(
    (scheduleId: string, updatedAt: string, next: FmSitePaymentStatus) => {
      if (!canWrite) {
        toast.error(writeBlockedReason ?? 'You cannot update site payments.');
        return;
      }
      startTransition(async () => {
        const { error } = await updateSitePaymentMilestone({
          studyId,
          scheduleId,
          updatedAt,
          status: next,
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success('Status updated.');
        router.refresh();
      });
    },
    [studyId, router, canWrite, writeBlockedReason],
  );

  const selectedSchedRows = useMemo(() => rows.filter((r) => rowSelection[r.id]), [rows, rowSelection]);
  const clearScheduleSelection = useCallback(() => setRowSelection({}), []);

  const queueBudgetCsvExport = useCallback(() => {
    startTransition(async () => {
      const { error } = await enqueueFinanceExportJob({ studyId, kind: 'budget' });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Budget CSV export queued.');
      clearScheduleSelection();
      router.refresh();
    });
  }, [clearScheduleSelection, router, studyId]);

  const applyBulkStatus = useCallback(() => {
    if (selectedSchedRows.length === 0) {
      toast.error('Select at least one row.');
      return;
    }
    if (!canWrite) {
      toast.error(writeBlockedReason ?? 'Not allowed.');
      return;
    }
    startTransition(async () => {
      for (const row of selectedSchedRows) {
        const { error } = await updateSitePaymentMilestone({
          studyId,
          scheduleId: row.id,
          updatedAt: row.updated_at,
          status: bulkStatusChoice,
        });
        if (error) {
          toast.error(`${row.milestone_label}: ${error}`);
          router.refresh();
          return;
        }
      }
      toast.success(`Updated status for ${selectedSchedRows.length} row(s).`);
      setBulkStatusOpen(false);
      clearScheduleSelection();
      router.refresh();
    });
  }, [selectedSchedRows, studyId, router, bulkStatusChoice, canWrite, writeBlockedReason, clearScheduleSelection]);

  const sitePayBulkActions: FinanceBulkAction[] = useMemo(
    () => [
      {
        id: 'bulk-status',
        label: 'Update status…',
        onClick: () => setBulkStatusOpen(true),
        disabled: isPending || !canWrite || selectedSchedRows.length === 0,
      },
      {
        id: 'export-queue',
        label: 'Export to queue (budget)',
        variant: 'outline',
        onClick: queueBudgetCsvExport,
        disabled: isPending || !canWrite || selectedSchedRows.length === 0,
      },
      { id: 'clear', label: 'Clear', variant: 'secondary', onClick: clearScheduleSelection },
    ],
    [isPending, canWrite, selectedSchedRows.length, clearScheduleSelection, queueBudgetCsvExport],
  );

  const openEdit = useCallback((row: FmSitePaymentSchedule) => {
    setEditRow(row);
    setMilestoneLabel(row.milestone_label);
    setMilestoneType(row.milestone_type as FmSitePaymentMilestoneType);
    setTriggerEvent(row.trigger_event ?? '');
    setAmount(String(row.amount));
    setCurrency(row.currency);
    setPerSubject(row.per_subject_amount != null ? String(row.per_subject_amount) : '');
    setHoldback(String(row.holdback_pct));
    setDueDate(row.due_date ?? '');
    setStatus(row.status);
    setNotes(row.notes ?? '');
    setEditOpen(true);
  }, []);

  const saveEdit = () => {
    if (!editRow) return;
    startTransition(async () => {
      const { error, code } = await updateSitePaymentSchedule({
        studyId,
        scheduleId: editRow.id,
        updatedAt: editRow.updated_at,
        milestoneLabel: milestoneLabel.trim(),
        milestoneType,
        triggerEvent: triggerEvent.trim() || null,
        amount: Number(amount),
        currency: currency.trim().toUpperCase(),
        perSubjectAmount: perSubject.trim() === '' ? null : Number(perSubject),
        holdbackPct: Number(holdback),
        dueDate: dueDate.trim() || null,
        status,
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
        return;
      }
      toast.success('Schedule updated.');
      setEditOpen(false);
      setEditRow(null);
      router.refresh();
    });
  };

  const rowActions = useCallback(
    (row: FmSitePaymentSchedule): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [
        {
          id: 'export-queue',
          label: 'Export to queue (budget)',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => {
            startTransition(async () => {
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
        {
          id: 'edit',
          label: 'Edit',
          disabled: isPending || !canWrite || row.status === 'paid' || row.status === 'cancelled',
          disabledReason:
            !canWrite ? writeBlockedReason : 'Paid or cancelled rows cannot be edited here.',
          onSelect: () => openEdit(row),
        },
      ];
      if (row.status === 'scheduled') {
        items.push({
          id: 'del',
          label: 'Delete',
          variant: 'destructive',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => setDeleteRow(row),
        });
      }
      return items;
    },
    [isPending, openEdit, canWrite, writeBlockedReason, router, studyId],
  );

  const columns = useMemo<ColumnDef<FmSitePaymentSchedule>[]>(
    () => [
      {
        id: 'milestone',
        header: 'Milestone',
        cell: ({ row }) => (
          <div className="text-xs">
            <div className="font-medium">{row.original.milestone_label}</div>
            <div className="text-[11px] text-muted-foreground">
              {FM_SITE_PAYMENT_MILESTONE_LABELS[row.original.milestone_type as FmSitePaymentMilestoneType] ??
                row.original.milestone_type}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'trigger_event',
        header: 'Trigger',
        cell: ({ row }) => <span className="text-xs">{row.original.trigger_event ?? '—'}</span>,
      },
      {
        accessorKey: 'amount',
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCurrency(Number(row.original.amount), row.original.currency)}
          </div>
        ),
      },
      {
        accessorKey: 'holdback_pct',
        header: () => <span className="block text-right">Holdback %</span>,
        cell: ({ row }) => <div className="text-right text-xs">{Number(row.original.holdback_pct).toFixed(0)}%</div>,
      },
      {
        accessorKey: 'due_date',
        header: 'Due',
        cell: ({ row }) => <span className="text-xs">{row.original.due_date ?? '—'}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Badge variant={STATUS_VARIANT[row.original.status]} className="w-fit">
              {FM_SITE_PAYMENT_STATUS_LABELS[row.original.status]}
            </Badge>
            <Select
              value={row.original.status}
              disabled={isPending || !canWrite}
              onValueChange={(v) =>
                setStatusQuick(row.original.id, row.original.updated_at, v as FmSitePaymentStatus)
              }
            >
              <SelectTrigger className="h-8 w-full min-w-[7rem] max-w-[10rem] text-[11px]">
                <SelectValue
                  getDisplayLabel={(val) =>
                    val && FM_SITE_PAYMENT_STATUS_LABELS[val as FmSitePaymentStatus]
                      ? FM_SITE_PAYMENT_STATUS_LABELS[val as FmSitePaymentStatus]
                      : null
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {FM_SITE_PAYMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <FinanceRowActionsMenu
            ariaLabel="Site payment actions"
            telemetryContext={{ studyId, tableKey: 'site_payments', entityType: 'fm_site_payment_schedules' }}
            items={rowActions(row.original)}
          />
        ),
      },
    ],
    [isPending, canWrite, rowActions, setStatusQuick, studyId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Site Payment Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No site payment schedules yet. Add startup, milestone, visit, holdback, and closeout payments to begin tracking
            site spend.
          </p>
        ) : (
          <FinanceDataTable
            urlPrefix="fmt_sitepay"
            studyId={studyId}
            columns={columns}
            data={rows}
            getRowId={(r) => r.id}
            getRowDomId={(r) => `fm-site-pay-${r.id}`}
            enableRowSelection
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            bulkActions={sitePayBulkActions}
          />
        )}

        <Dialog open={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
          <DialogContent className="max-w-md gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">Edit site payment</DialogTitle>
            </DialogHeader>
            <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
              <Label className="text-[11px]">Milestone label</Label>
              <Input value={milestoneLabel} onChange={(e) => setMilestoneLabel(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Milestone type</Label>
              <Select value={milestoneType} onValueChange={(v) => setMilestoneType(v as FmSitePaymentMilestoneType)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {FM_SITE_PAYMENT_MILESTONE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[11px]">Trigger (optional)</Label>
              <Input value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Currency</Label>
              <Input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className="h-9 text-xs" />
              <Label className="text-[11px]">Per-subject amount (optional)</Label>
              <Input type="number" step="0.01" value={perSubject} onChange={(e) => setPerSubject(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Holdback %</Label>
              <Input type="number" value={holdback} onChange={(e) => setHoldback(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Due date (YYYY-MM-DD)</Label>
              <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-xs" />
              <Label className="text-[11px]">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FmSitePaymentStatus)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {FM_SITE_PAYMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-[11px]">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                Close
              </Button>
              <Button type="button" size="sm" disabled={isPending || !canWrite} onClick={saveEdit}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={bulkStatusOpen}
          onOpenChange={(o) => {
            if (!o) setBulkStatusOpen(false);
          }}
        >
          <DialogContent className="max-w-md gap-3">
            <DialogHeader>
              <DialogTitle className="text-sm">
                Set status for {selectedSchedRows.length} payment{selectedSchedRows.length === 1 ? '' : 's'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-[11px]">New status</Label>
              <Select value={bulkStatusChoice} onValueChange={(v) => setBulkStatusChoice(v as FmSitePaymentStatus)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {FM_SITE_PAYMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setBulkStatusOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" disabled={isPending || !canWrite} onClick={applyBulkStatus}>
                Apply to all selected
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FinanceDeleteConfirmDialog
          open={Boolean(deleteRow)}
          onOpenChange={(o) => !o && setDeleteRow(null)}
          title="Delete site payment?"
          description="Only scheduled milestones can be permanently removed."
          onConfirm={async () => {
            if (!deleteRow) return;
            const { error, code } = await deleteSitePaymentSchedule({
              studyId,
              scheduleId: deleteRow.id,
              updatedAt: deleteRow.updated_at,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Deleted.');
            setDeleteRow(null);
            router.refresh();
          }}
        />
      </CardContent>
    </Card>
  );
}
