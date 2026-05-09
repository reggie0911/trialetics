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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  activateBudgetVersion,
  approveBudgetVersion,
  enqueueFinanceExportJob,
  rejectBudgetVersion,
  submitBudgetVersion,
} from '@/lib/actions/study-finance-module';
import {
  FM_BUDGET_VERSION_STATUS_LABELS,
  buildFinanceModulePath,
  type FmBudgetVersion,
  type FmBudgetVersionStatus,
} from '@/lib/finance-module/types';
import { useFmPermissions } from '@/hooks/use-fm-permissions';
import { cn } from '@/lib/utils';

interface BudgetVersionHistoryProps {
  studyId: string;
  versions: FmBudgetVersion[];
  selectedVersionId?: string | null;
}

const VARIANT_BY_STATUS: Record<
  FmBudgetVersionStatus,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info'
> = {
  draft: 'secondary',
  submitted: 'info',
  approved: 'success',
  active: 'success',
  superseded: 'secondary',
  rejected: 'destructive',
};

export function BudgetVersionHistory({ studyId, versions, selectedVersionId }: BudgetVersionHistoryProps) {
  const router = useRouter();
  const budgetHref = buildFinanceModulePath(studyId, 'budget');
  const [isPending, startTransition] = useTransition();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeBlockedReason =
    permsQ.isFetched && !canWrite
      ? 'You cannot modify finance records for this study (read-only or closed).'
      : undefined;

  const [submitTarget, setSubmitTarget] = useState<FmBudgetVersion | null>(null);
  const [submitNotes, setSubmitNotes] = useState('');
  const [rejectTarget, setRejectTarget] = useState<FmBudgetVersion | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [compareOpen, setCompareOpen] = useState(false);

  const selectedVersions = useMemo(
    () => versions.filter((v) => rowSelection[v.id]),
    [versions, rowSelection],
  );

  const run = useCallback(
    (fn: () => Promise<{ error: string | null; code?: string }>, ok: string) => {
      startTransition(async () => {
        const { error, code } = await fn();
        if (error) {
          toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
          return;
        }
        toast.success(ok);
        router.refresh();
      });
    },
    [router],
  );

  const rowActions = useCallback(
    (v: FmBudgetVersion): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [
        {
          id: 'open',
          label: 'Open version',
          disabled: isPending,
          onSelect: () => {
            router.push(`${budgetHref}?version=${encodeURIComponent(v.id)}`, { scroll: false });
          },
        },
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
      ];
      if (v.status === 'draft') {
        items.push({
          id: 'submit',
          label: 'Submit for approval…',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () => {
            setSubmitNotes('');
            setSubmitTarget(v);
          },
        });
      }
      if (v.status === 'submitted') {
        items.push(
          {
            id: 'approve',
            label: 'Approve',
            disabled: isPending || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () =>
              run(
                () =>
                  approveBudgetVersion({
                    studyId,
                    budgetVersionId: v.id,
                    updatedAt: v.updated_at,
                    notes: null,
                  }),
                'Budget version approved.',
              ),
          },
          {
            id: 'reject',
            label: 'Reject…',
            variant: 'destructive',
            disabled: isPending || !canWrite,
            disabledReason: writeBlockedReason,
            onSelect: () => {
              setRejectReason('');
              setRejectTarget(v);
            },
          },
        );
      }
      if (v.status === 'approved') {
        items.push({
          id: 'activate',
          label: 'Activate',
          disabled: isPending || !canWrite,
          disabledReason: writeBlockedReason,
          onSelect: () =>
            run(
              () =>
                activateBudgetVersion({
                  studyId,
                  budgetVersionId: v.id,
                  updatedAt: v.updated_at,
                }),
              'Budget version activated.',
            ),
        });
      }
      return items;
    },
    [isPending, canWrite, writeBlockedReason, budgetHref, router, run, studyId],
  );

  const columns = useMemo<ColumnDef<FmBudgetVersion>[]>(
    () => [
      {
        accessorKey: 'version_number',
        header: 'Version',
        cell: ({ row }) => {
          const v = row.original;
          const href = `${budgetHref}?version=${encodeURIComponent(v.id)}`;
          const selected = v.id === selectedVersionId;
          return (
            <Link
              href={href}
              scroll={false}
              className={cn(
                'text-xs font-medium text-primary underline-offset-2 hover:underline',
                selected && 'font-semibold',
              )}
            >
              v{v.version_number}
              {v.label ? <span className="ml-1 font-normal text-muted-foreground">— {v.label}</span> : null}
            </Link>
          );
        },
      },
      {
        id: 'timeline',
        header: 'Timeline',
        cell: ({ row }) => {
          const v = row.original;
          const line = v.activated_at
            ? `Activated ${new Date(v.activated_at).toLocaleDateString()}`
            : v.approved_at
              ? `Approved ${new Date(v.approved_at).toLocaleDateString()}`
              : `Created ${new Date(v.created_at).toLocaleDateString()}`;
          return <span className="text-[11px] text-muted-foreground">{line}</span>;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={VARIANT_BY_STATUS[row.original.status]} className="text-[10px]">
            {FM_BUDGET_VERSION_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <FinanceRowActionsMenu
            ariaLabel="Budget version actions"
            telemetryContext={{ studyId, tableKey: 'budget_versions', entityType: 'fm_budget_versions' }}
            items={rowActions(row.original)}
          />
        ),
      },
    ],
    [budgetHref, selectedVersionId, rowActions, studyId],
  );

  const queueBudgetCsvExport = useCallback(() => {
    startTransition(async () => {
      const { error } = await enqueueFinanceExportJob({ studyId, kind: 'budget' });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Budget CSV export queued.');
      setRowSelection({});
      router.refresh();
    });
  }, [router, studyId]);

  const bulkActions: FinanceBulkAction[] = useMemo(
    () => [
      {
        id: 'compare',
        label: 'Compare selected',
        onClick: () => {
          if (selectedVersions.length !== 2) {
            toast.error('Select exactly two versions to compare.');
            return;
          }
          setCompareOpen(true);
        },
        disabled: selectedVersions.length !== 2,
      },
      {
        id: 'export-queue',
        label: 'Export to queue (budget)',
        variant: 'outline',
        onClick: queueBudgetCsvExport,
        disabled: isPending || !canWrite || selectedVersions.length === 0,
      },
      {
        id: 'clear',
        label: 'Clear selection',
        variant: 'secondary',
        onClick: () => setRowSelection({}),
      },
    ],
    [selectedVersions.length, queueBudgetCsvExport, isPending, canWrite],
  );

  const [a, b] = selectedVersions.length === 2 ? selectedVersions : [null, null];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Budget Version History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {versions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No versions yet.</p>
        ) : (
          <>
            <FinanceBulkActionsBar selectedCount={selectedVersions.length} actions={bulkActions} />
            <FinanceDataTable
              urlPrefix="fmt_budget_ver"
              studyId={studyId}
              columns={columns}
              data={versions}
              getRowId={(r) => r.id}
              enableRowSelection
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
            />
          </>
        )}
      </CardContent>

      <Dialog open={Boolean(submitTarget)} onOpenChange={(o) => !o && setSubmitTarget(null)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Submit budget version</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[11px]">Notes (optional)</Label>
            <Textarea value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)} rows={3} className="text-xs" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setSubmitTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || !submitTarget}
              onClick={() => {
                if (!submitTarget) return;
                const t = submitTarget;
                const notes = submitNotes.trim() || null;
                startTransition(async () => {
                  const { error, code } = await submitBudgetVersion({
                    studyId,
                    budgetVersionId: t.id,
                    updatedAt: t.updated_at,
                    notes,
                  });
                  if (error) {
                    toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                    return;
                  }
                  toast.success('Budget version submitted.');
                  setSubmitTarget(null);
                  setSubmitNotes('');
                  router.refresh();
                });
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Reject budget version</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[11px]">Reason</Label>
            <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="text-xs" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending || !rejectTarget || !rejectReason.trim()}
              onClick={() => {
                if (!rejectTarget) return;
                const t = rejectTarget;
                const reason = rejectReason.trim();
                startTransition(async () => {
                  const { error, code } = await rejectBudgetVersion({
                    studyId,
                    budgetVersionId: t.id,
                    updatedAt: t.updated_at,
                    reason,
                  });
                  if (error) {
                    toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                    return;
                  }
                  toast.success('Budget version rejected.');
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

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-lg gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Compare versions</DialogTitle>
          </DialogHeader>
          {a && b ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border p-2">
                <div className="font-medium">
                  v{a.version_number} {a.label ? `— ${a.label}` : ''}
                </div>
                <div className="mt-1 text-muted-foreground">Status: {FM_BUDGET_VERSION_STATUS_LABELS[a.status]}</div>
                <div className="text-muted-foreground">Currency: {a.base_currency}</div>
                <div className="text-muted-foreground">Notes: {a.notes?.trim() ? a.notes : '—'}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="font-medium">
                  v{b.version_number} {b.label ? `— ${b.label}` : ''}
                </div>
                <div className="mt-1 text-muted-foreground">Status: {FM_BUDGET_VERSION_STATUS_LABELS[b.status]}</div>
                <div className="text-muted-foreground">Currency: {b.base_currency}</div>
                <div className="text-muted-foreground">Notes: {b.notes?.trim() ? b.notes : '—'}</div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setCompareOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
