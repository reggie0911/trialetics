'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState, useTransition } from 'react';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { FinanceBulkActionsBar, type FinanceBulkAction } from '@/components/ctms/finance-module/_shared/bulk-actions-bar';
import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
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
  listStudyFinanceTeamUsers,
  reassignFinanceApprovalRequest,
  resolveFinanceApprovalRequest,
} from '@/lib/actions/study-finance-module';
import { buildFinanceApprovalSourceHref } from '@/lib/finance-module/approval-source-links';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';
import {
  FM_APPROVAL_OBJECT_LABELS,
  FM_APPROVAL_PRIORITY_LABELS,
  FM_APPROVAL_STATUS_LABELS,
  type FmApprovalObjectType,
  type FmApprovalRequest,
} from '@/lib/finance-module/types';
import { useFmPermissions } from '@/hooks/use-fm-permissions';
import { cn } from '@/lib/utils';

interface ApprovalsPendingTableProps {
  studyId: string;
  rows: FmApprovalRequest[];
}

const TABS: { value: 'all' | FmApprovalObjectType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'budget_version', label: 'Budgets' },
  { value: 'purchase_order', label: 'Purchase Orders' },
  { value: 'change_order', label: 'Change Orders' },
  { value: 'site_payment_schedule', label: 'Site Payments' },
];

const ACTIONABLE = new Set<FmApprovalRequest['status']>(['pending', 'in_progress', 'overdue', 'escalated']);

const PRIORITY_VARIANT = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
} as const;

const STATUS_VARIANT = {
  pending: 'secondary',
  in_progress: 'info',
  approved: 'success',
  rejected: 'destructive',
  overdue: 'destructive',
  escalated: 'warning',
  completed: 'success',
} as const;

export function ApprovalsPendingTable({ studyId, rows }: ApprovalsPendingTableProps) {
  const router = useRouter();
  const [active, setActive] = useState<'all' | FmApprovalObjectType>('all');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPending, startTransition] = useTransition();
  const [reviewRow, setReviewRow] = useState<FmApprovalRequest | null>(null);
  const [notes, setNotes] = useState('');
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [reassignRow, setReassignRow] = useState<FmApprovalRequest | null>(null);
  const [reassignUserId, setReassignUserId] = useState('');
  const [teamUsers, setTeamUsers] = useState<{ userId: string; label: string }[]>([]);

  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeBlockedReason =
    permsQ.isFetched && !canWrite
      ? 'You cannot modify finance records for this study (read-only or closed).'
      : undefined;

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: rows.length };
    for (const row of rows) {
      map[row.object_type] = (map[row.object_type] ?? 0) + 1;
    }
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    if (active === 'all') return rows;
    return rows.filter((r) => r.object_type === active);
  }, [rows, active]);

  const selectedRows = useMemo(
    () => filtered.filter((r) => rowSelection[r.id] && ACTIONABLE.has(r.status)),
    [filtered, rowSelection],
  );

  const clearSelection = useCallback(() => setRowSelection({}), []);

  const rowActions = useCallback(
    (row: FmApprovalRequest): FinanceRowActionItem[] => {
      const href = buildFinanceApprovalSourceHref(studyId, row.object_type, row.object_id);
      const items: FinanceRowActionItem[] = [];
      if (href) {
        items.push({
          id: 'source',
          label: 'Open source',
          disabled: isPending,
          onSelect: () => router.push(href),
        });
      }
      if (ACTIONABLE.has(row.status)) {
        items.push({
          id: 'review',
          label: 'Review…',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => {
            setNotes('');
            setReviewRow(row);
          },
        });
        items.push({
          id: 'reassign',
          label: 'Reassign…',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => {
            setReassignRow(row);
            setReassignUserId('');
            startTransition(async () => {
              const { data, error } = await listStudyFinanceTeamUsers(studyId);
              if (error) {
                toast.error(error);
                return;
              }
              setTeamUsers(data ?? []);
            });
          },
        });
      }
      return items;
    },
    [isPending, canWrite, writeBlockedReason, router, studyId, startTransition],
  );

  const columns = useMemo<ColumnDef<FmApprovalRequest>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => <span className="text-xs font-medium">{row.original.title ?? '—'}</span>,
      },
      {
        accessorKey: 'object_type',
        header: 'Type',
        cell: ({ row }) => <span className="text-xs">{FM_APPROVAL_OBJECT_LABELS[row.original.object_type]}</span>,
      },
      {
        accessorKey: 'amount',
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs">
            {row.original.amount !== null
              ? formatCompactCurrency(Number(row.original.amount), row.original.currency || 'USD')
              : '—'}
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <Badge variant={PRIORITY_VARIANT[row.original.priority]} className="text-[10px]">
            {FM_APPROVAL_PRIORITY_LABELS[row.original.priority]}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]} className="text-[10px]">
            {FM_APPROVAL_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: 'step',
        header: 'Step',
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.current_step}/{row.original.total_steps}
          </span>
        ),
      },
      {
        accessorKey: 'due_date',
        header: 'Due',
        cell: ({ row }) => <span className="text-xs">{row.original.due_date ?? '—'}</span>,
      },
      {
        id: 'source',
        header: 'Source',
        cell: ({ row }) => {
          const href = buildFinanceApprovalSourceHref(studyId, row.original.object_type, row.original.object_id);
          return href ? (
            <Link href={href} className="text-xs text-primary underline-offset-2 hover:underline">
              Open
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <FinanceRowActionsMenu
            ariaLabel="Approval actions"
            telemetryContext={{ studyId, tableKey: 'approvals', entityType: 'fm_approval_requests' }}
            items={rowActions(row.original)}
          />
        ),
      },
    ],
    [studyId, rowActions],
  );

  const runDecision = (row: FmApprovalRequest, decision: 'approve' | 'reject' | 'escalate') => {
    startTransition(async () => {
      const { error } = await resolveFinanceApprovalRequest({
        studyId,
        approvalRequestId: row.id,
        updatedAt: row.updated_at,
        decision,
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Decision recorded.');
      setReviewRow(null);
      setNotes('');
      router.refresh();
    });
  };

  const bulkApprove = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.error('Select at least one actionable approval.');
      return;
    }
    startTransition(async () => {
      for (const row of selectedRows) {
        const { error } = await resolveFinanceApprovalRequest({
          studyId,
          approvalRequestId: row.id,
          updatedAt: row.updated_at,
          decision: 'approve',
          notes: null,
        });
        if (error) {
          toast.error(`${row.title ?? row.id}: ${error}`);
          router.refresh();
          return;
        }
      }
      toast.success(`Approved ${selectedRows.length} request(s).`);
      clearSelection();
      router.refresh();
    });
  }, [selectedRows, studyId, router, clearSelection]);

  const bulkReject = useCallback(() => {
    if (selectedRows.length === 0) {
      toast.error('Select at least one actionable approval.');
      return;
    }
    if (!bulkRejectReason.trim()) {
      toast.error('Enter a rejection reason.');
      return;
    }
    startTransition(async () => {
      const reason = bulkRejectReason.trim();
      for (const row of selectedRows) {
        const { error } = await resolveFinanceApprovalRequest({
          studyId,
          approvalRequestId: row.id,
          updatedAt: row.updated_at,
          decision: 'reject',
          notes: reason,
        });
        if (error) {
          toast.error(`${row.title ?? row.id}: ${error}`);
          router.refresh();
          return;
        }
      }
      toast.success(`Rejected ${selectedRows.length} request(s).`);
      setBulkRejectOpen(false);
      setBulkRejectReason('');
      clearSelection();
      router.refresh();
    });
  }, [selectedRows, studyId, router, bulkRejectReason, clearSelection]);

  const bulkActions: FinanceBulkAction[] = useMemo(
    () => [
      {
        id: 'bulk-approve',
        label: 'Approve selected',
        onClick: bulkApprove,
        disabled: isPending || !canWrite,
      },
      {
        id: 'bulk-reject',
        label: 'Reject selected…',
        variant: 'destructive',
        onClick: () => setBulkRejectOpen(true),
        disabled: isPending || selectedRows.length === 0 || !canWrite,
      },
      {
        id: 'clear',
        label: 'Clear',
        variant: 'secondary',
        onClick: clearSelection,
      },
    ],
    [bulkApprove, clearSelection, isPending, canWrite, selectedRows.length],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActive(tab.value);
                setRowSelection({});
              }}
              className={cn(
                'rounded-md border px-2.5 py-1 text-[11px] transition-colors',
                active === tab.value
                  ? 'border-border bg-primary/10 font-medium text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {tab.label} ({counts[tab.value] ?? 0})
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No approvals in this view.</p>
        ) : (
          <>
            <FinanceBulkActionsBar selectedCount={selectedRows.length} actions={bulkActions} />
            <FinanceDataTable
              urlPrefix="fmt_approvals"
              studyId={studyId}
              columns={columns}
              data={filtered}
              getRowId={(r) => r.id}
              enableRowSelection
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
            />
          </>
        )}
      </CardContent>

      <Dialog open={Boolean(reviewRow)} onOpenChange={(o) => !o && setReviewRow(null)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Approval decision</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 px-1">
            <p className="text-xs text-muted-foreground">{reviewRow?.title ?? 'Untitled request'}</p>
            <Label className="text-[11px]">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="text-xs" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReviewRow(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={isPending || !reviewRow} onClick={() => reviewRow && runDecision(reviewRow, 'approve')}>
              Approve
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending || !reviewRow}
              onClick={() => reviewRow && runDecision(reviewRow, 'reject')}
            >
              Reject
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending || !reviewRow}
              onClick={() => reviewRow && runDecision(reviewRow, 'escalate')}
            >
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reassignRow)} onOpenChange={(o) => !o && setReassignRow(null)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Reassign approval</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 px-1">
            <p className="text-xs text-muted-foreground">{reassignRow?.title ?? 'Untitled request'}</p>
            <Label className="text-[11px]">Assignee</Label>
            <Select value={reassignUserId} onValueChange={setReassignUserId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select study team member" />
              </SelectTrigger>
              <SelectContent>
                {teamUsers.map((u) => (
                  <SelectItem key={u.userId} value={u.userId} className="text-xs">
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReassignRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || !reassignRow || !reassignUserId}
              onClick={() => {
                if (!reassignRow) return;
                startTransition(async () => {
                  const { error, code } = await reassignFinanceApprovalRequest({
                    studyId,
                    approvalRequestId: reassignRow.id,
                    assigneeUserId: reassignUserId,
                    updatedAt: reassignRow.updated_at,
                  });
                  if (error) {
                    toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                    return;
                  }
                  toast.success('Approval reassigned.');
                  setReassignRow(null);
                  setReassignUserId('');
                  router.refresh();
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject selected approvals</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[11px]">Reason (applies to all selected)</Label>
            <Textarea value={bulkRejectReason} onChange={(e) => setBulkRejectReason(e.target.value)} rows={3} className="text-xs" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setBulkRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={isPending || !bulkRejectReason.trim()} onClick={bulkReject}>
              Reject {selectedRows.length} request(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
