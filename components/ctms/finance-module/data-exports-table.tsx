'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  cancelFinanceExportJob,
  deleteFinanceExportJob,
  enqueueFinanceExportJob,
  getFinanceDocumentSignedUrl,
  type FinanceModuleCsvKind,
} from '@/lib/actions/study-finance-module';
import type { FmExportJob } from '@/lib/finance-module/types';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

const STATUS_LABEL: Record<FmExportJob['status'], string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

interface DataExportsTableProps {
  studyId: string;
  jobs: FmExportJob[];
}

const KIND_OPTIONS: { value: FinanceModuleCsvKind; label: string }[] = [
  { value: 'budget', label: 'Budget tracker' },
  { value: 'invoices', label: 'Invoice register' },
  { value: 'vendors', label: 'Vendor spend' },
];

export function DataExportsTable({ studyId, jobs }: DataExportsTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const [newOpen, setNewOpen] = useState(false);
  const [newKind, setNewKind] = useState<FinanceModuleCsvKind>('budget');

  const download = useCallback(
    (row: FmExportJob) => {
      if (!row.result_storage_path) {
        toast.error('No file for this export.');
        return;
      }
      startTransition(async () => {
        const { url, error } = await getFinanceDocumentSignedUrl({
          studyId,
          storagePath: row.result_storage_path!,
        });
        if (error || !url) {
          toast.error(error ?? 'Could not create download link.');
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    },
    [studyId],
  );

  const rowActions = useCallback(
    (row: FmExportJob): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [];
      if (row.status === 'completed' && row.result_storage_path) {
        items.push({
          id: 'dl',
          label: 'Download',
          disabled: pending,
          onSelect: () => download(row),
        });
      }
      if ((row.status === 'queued' || row.status === 'running') && canWrite) {
        items.push({
          id: 'cancel',
          label: 'Cancel',
          disabled: pending,
          onSelect: () => {
            startTransition(async () => {
              const { error, code } = await cancelFinanceExportJob({
                studyId,
                id: row.id,
                updatedAt: row.updated_at,
              });
              if (error) {
                toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                return;
              }
              toast.success('Export cancelled.');
              router.refresh();
            });
          },
        });
      }
      if (['completed', 'failed', 'cancelled'].includes(row.status) && canWrite) {
        items.push({
          id: 'del',
          label: 'Delete',
          variant: 'destructive',
          disabled: pending,
          onSelect: () => {
            startTransition(async () => {
              const { error } = await deleteFinanceExportJob({ studyId, id: row.id });
              if (error) {
                toast.error(error);
                return;
              }
              toast.success('Export removed.');
              router.refresh();
            });
          },
        });
      }
      return items;
    },
    [canWrite, download, pending, router, studyId],
  );

  const sorted = useMemo(
    () => [...jobs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [jobs],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Data exports</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-[11px]"
          disabled={!canWrite || pending}
          onClick={() => {
            setNewKind('budget');
            setNewOpen(true);
          }}
        >
          New export
        </Button>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No export jobs yet. Use Export on reports or the exporter panel to queue CSV snapshots.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Requested</TableHead>
                <TableHead className="text-xs">Finished</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs font-mono">{row.export_type}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatWhen(row.created_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatWhen(row.completed_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {row.status === 'completed' && row.result_storage_path ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={pending}
                          onClick={() => download(row)}
                        >
                          <Download className="size-3.5 mr-1" />
                          Download
                        </Button>
                      ) : null}
                      <FinanceRowActionsMenu
                        ariaLabel="Export actions"
                        telemetryContext={{ studyId, tableKey: 'data_exports', entityType: 'fm_export_job' }}
                        items={rowActions(row)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">New export</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 px-1">
            <p className="text-xs text-muted-foreground">
              Queue a study-scoped CSV snapshot. The job appears below when complete; download from the row menu or
              button.
            </p>
            <div className="space-y-1">
              <Label className="text-[11px]">Scope</Label>
              <Select value={newKind} onValueChange={(v) => setNewKind(v as FinanceModuleCsvKind)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const { error } = await enqueueFinanceExportJob({ studyId, kind: newKind });
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success('Export queued.');
                  setNewOpen(false);
                  router.refresh();
                });
              }}
            >
              Queue export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
