'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
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
import type { FinanceReportsData, FinanceReportSummary } from '@/lib/actions/study-finance-module';
import {
  createFinanceScheduledReport,
  deleteFinanceScheduledReport,
  pauseFinanceScheduledReport,
  resumeFinanceScheduledReport,
  runFinanceScheduledReportNow,
  updateFinanceScheduledReport,
} from '@/lib/actions/study-finance-module';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

type ScheduledRow = FinanceReportsData['scheduled'][number];

interface ScheduledReportsTableProps {
  studyId: string;
  rows: ScheduledRow[];
  popularReports: FinanceReportSummary[];
}

const CADENCE_LABEL: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  once: 'Once',
};

export function ScheduledReportsTable({ studyId, rows, popularReports }: ScheduledReportsTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const writeReason =
    permsQ.isFetched && !canWrite ? 'You cannot modify finance records for this study (read-only or closed).' : undefined;

  const [createOpen, setCreateOpen] = useState(false);
  const [reportKey, setReportKey] = useState(popularReports[0]?.id ?? '');
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'monthly' | 'once'>('weekly');

  const [editRow, setEditRow] = useState<ScheduledRow | null>(null);
  const [editCadence, setEditCadence] = useState<'daily' | 'weekly' | 'monthly' | 'once'>('weekly');

  const rowActions = useCallback(
    (row: ScheduledRow): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [];
      if (row.status === 'active') {
        items.push({
          id: 'pause',
          label: 'Pause',
          disabled: pending || !canWrite,
          disabledReason: writeReason,
          onSelect: () => {
            startTransition(async () => {
              const { error, code } = await pauseFinanceScheduledReport({
                studyId,
                id: row.id,
                updatedAt: row.updatedAt,
              });
              if (error) {
                toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                return;
              }
              toast.success('Schedule paused.');
              router.refresh();
            });
          },
        });
      }
      if (row.status === 'paused') {
        items.push({
          id: 'resume',
          label: 'Resume',
          disabled: pending || !canWrite,
          disabledReason: writeReason,
          onSelect: () => {
            startTransition(async () => {
              const { error, code } = await resumeFinanceScheduledReport({
                studyId,
                id: row.id,
                updatedAt: row.updatedAt,
              });
              if (error) {
                toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                return;
              }
              toast.success('Schedule resumed.');
              router.refresh();
            });
          },
        });
      }
      items.push({
        id: 'run',
        label: 'Run now',
        disabled: pending || !canWrite,
        disabledReason: writeReason,
        onSelect: () => {
          startTransition(async () => {
            const { error, code } = await runFinanceScheduledReportNow({
              studyId,
              id: row.id,
              updatedAt: row.updatedAt,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Export queued from schedule.');
            router.refresh();
          });
        },
      });
      items.push({
        id: 'edit',
        label: 'Edit cadence…',
        disabled: pending || !canWrite,
        disabledReason: writeReason,
        onSelect: () => {
          setEditRow(row);
          setEditCadence(row.cadence);
        },
      });
      items.push({
        id: 'del',
        label: 'Archive',
        variant: 'destructive',
        disabled: pending || !canWrite,
        disabledReason: writeReason,
        onSelect: () => {
          startTransition(async () => {
            const { error, code } = await deleteFinanceScheduledReport({
              studyId,
              id: row.id,
              updatedAt: row.updatedAt,
            });
            if (error) {
              toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
              return;
            }
            toast.success('Schedule archived.');
            router.refresh();
          });
        },
      });
      return items;
    },
    [canWrite, pending, router, studyId, writeReason],
  );

  const headerAction = useMemo(
    () => (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-[11px]"
        disabled={!canWrite || pending}
        title={writeReason}
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="size-3.5 mr-1" />
        Schedule report
      </Button>
    ),
    [canWrite, pending, writeReason],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Scheduled Reports</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No scheduled reports yet. Schedule a recurring export to keep stakeholders informed.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Report</TableHead>
                <TableHead className="text-xs">Schedule</TableHead>
                <TableHead className="text-xs">Next Run</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-10 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs font-medium">{row.reportName}</TableCell>
                  <TableCell className="text-xs">{CADENCE_LABEL[row.schedule] ?? row.schedule}</TableCell>
                  <TableCell className="text-xs">{row.nextRunAt ? new Date(row.nextRunAt).toLocaleString() : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <FinanceRowActionsMenu
                    ariaLabel="Schedule actions"
                    telemetryContext={{ studyId, tableKey: 'scheduled_reports', entityType: 'fm_scheduled_report' }}
                    items={rowActions(row)}
                  />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Schedule report</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 px-1">
            <div className="space-y-1">
              <Label className="text-[11px]">Report</Label>
              <Select value={reportKey} onValueChange={setReportKey}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {popularReports.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Cadence</Label>
              <Select value={cadence} onValueChange={(v) => setCadence(v as typeof cadence)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily" className="text-xs">
                    Daily
                  </SelectItem>
                  <SelectItem value="weekly" className="text-xs">
                    Weekly
                  </SelectItem>
                  <SelectItem value="monthly" className="text-xs">
                    Monthly
                  </SelectItem>
                  <SelectItem value="once" className="text-xs">
                    Once
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !reportKey}
              onClick={() => {
                startTransition(async () => {
                  const { error } = await createFinanceScheduledReport({
                    studyId,
                    reportKey,
                    cadence,
                    config: { hour: 8, dayOfWeek: 1 },
                  });
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success('Schedule created.');
                  setCreateOpen(false);
                  router.refresh();
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editRow)} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 px-1">
            <Label className="text-[11px]">Cadence</Label>
            <Select value={editCadence} onValueChange={(v) => setEditCadence(v as typeof editCadence)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily" className="text-xs">
                  Daily
                </SelectItem>
                <SelectItem value="weekly" className="text-xs">
                  Weekly
                </SelectItem>
                <SelectItem value="monthly" className="text-xs">
                  Monthly
                </SelectItem>
                <SelectItem value="once" className="text-xs">
                  Once
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !editRow}
              onClick={() => {
                if (!editRow) return;
                startTransition(async () => {
                  const { error, code } = await updateFinanceScheduledReport({
                    studyId,
                    id: editRow.id,
                    updatedAt: editRow.updatedAt,
                    cadence: editCadence,
                  });
                  if (error) {
                    toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                    return;
                  }
                  toast.success('Schedule updated.');
                  setEditRow(null);
                  router.refresh();
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
