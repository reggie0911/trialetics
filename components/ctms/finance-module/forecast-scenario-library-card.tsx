'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
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
import {
  createFinanceForecastScenario,
  deleteFinanceForecastScenario,
  duplicateFinanceForecastScenario,
  setBaselineFinanceForecastScenario,
  updateFinanceForecastScenario,
} from '@/lib/actions/study-finance-module';
import type { FmForecastScenario } from '@/lib/finance-module/types';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

interface ForecastScenarioLibraryCardProps {
  studyId: string;
  workspaceUpdatedAt: string;
  rows: FmForecastScenario[];
}

export function ForecastScenarioLibraryCard({ studyId, workspaceUpdatedAt, rows }: ForecastScenarioLibraryCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;
  const block = permsQ.isFetched && !canWrite ? 'Read-only or closed study.' : undefined;

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [spendMult, setSpendMult] = useState('1');
  const [confidence, setConfidence] = useState('70');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>('draft');

  const [editRow, setEditRow] = useState<FmForecastScenario | null>(null);
  const [dupRow, setDupRow] = useState<FmForecastScenario | null>(null);
  const [dupName, setDupName] = useState('');

  const openCreate = () => {
    setName('');
    setSpendMult('1');
    setConfidence('70');
    setStatus('draft');
    setCreateOpen(true);
  };

  const submitCreate = () => {
    startTransition(async () => {
      const mult = Number(spendMult);
      const conf = Number(confidence);
      const { error } = await createFinanceForecastScenario({
        studyId,
        name: name.trim(),
        assumptions: {
          spend_multiplier: Number.isFinite(mult) ? mult : 1,
          confidence_pct: Number.isFinite(conf) ? conf : 70,
        },
        status,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Scenario created.');
      setCreateOpen(false);
      router.refresh();
    });
  };

  const rowActions = useCallback(
    (row: FmForecastScenario): FinanceRowActionItem[] => {
      const items: FinanceRowActionItem[] = [
        {
          id: 'edit',
          label: 'Edit…',
          disabled: pending || !canWrite,
          disabledReason: block,
          onSelect: () => setEditRow(row),
        },
        {
          id: 'dup',
          label: 'Duplicate…',
          disabled: pending || !canWrite,
          disabledReason: block,
          onSelect: () => {
            setDupRow(row);
            setDupName(`${row.name} (copy)`);
          },
        },
        {
          id: 'baseline',
          label: 'Set as baseline',
          disabled: pending || !canWrite || !workspaceUpdatedAt,
          disabledReason: block,
          onSelect: () => {
            startTransition(async () => {
              const { error, code } = await setBaselineFinanceForecastScenario({
                studyId,
                id: row.id,
                workspaceUpdatedAt,
              });
              if (error) {
                toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload workspace and try again.' } : undefined);
                return;
              }
              toast.success('Baseline updated.');
              router.refresh();
            });
          },
        },
        {
          id: 'del',
          label: 'Delete',
          variant: 'destructive',
          disabled: pending || !canWrite,
          disabledReason: block,
          onSelect: () => {
            startTransition(async () => {
              const { error, code } = await deleteFinanceForecastScenario({
                studyId,
                id: row.id,
                updatedAt: row.updated_at,
              });
              if (error) {
                toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                return;
              }
              toast.success('Scenario deleted.');
              router.refresh();
            });
          },
        },
      ];
      return items;
    },
    [block, canWrite, pending, router, studyId, workspaceUpdatedAt],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Saved scenarios</CardTitle>
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={!canWrite || pending} onClick={openCreate}>
          New scenario
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No saved scenarios yet. Create one to compare assumptions against the baseline.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
              >
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Status: {row.status}
                    {typeof (row.assumptions as { spend_multiplier?: number }).spend_multiplier === 'number'
                      ? ` · multiplier ${(row.assumptions as { spend_multiplier: number }).spend_multiplier}`
                      : null}
                  </p>
                </div>
                <FinanceRowActionsMenu
                  ariaLabel="Scenario actions"
                  telemetryContext={{ studyId, tableKey: 'forecast_scenarios', entityType: 'fm_forecast_scenario' }}
                  items={rowActions(row)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">New scenario</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 px-1">
            <div className="space-y-1">
              <Label className="text-[11px]">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Spend multiplier (vs baseline)</Label>
              <Input value={spendMult} onChange={(e) => setSpendMult(e.target.value)} className="h-9 text-xs" inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Confidence %</Label>
              <Input value={confidence} onChange={(e) => setConfidence(e.target.value)} className="h-9 text-xs" inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft" className="text-xs">
                    Draft
                  </SelectItem>
                  <SelectItem value="active" className="text-xs">
                    Active
                  </SelectItem>
                  <SelectItem value="archived" className="text-xs">
                    Archived
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={pending || !name.trim()} onClick={submitCreate}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editRow)} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Edit scenario</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <EditScenarioForm
              studyId={studyId}
              row={editRow}
              onDone={() => {
                setEditRow(null);
                router.refresh();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(dupRow)} onOpenChange={(o) => !o && setDupRow(null)}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Duplicate scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 px-1">
            <Label className="text-[11px]">Name</Label>
            <Input value={dupName} onChange={(e) => setDupName(e.target.value)} className="h-9 text-xs" />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setDupRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !dupRow || !dupName.trim()}
              onClick={() => {
                if (!dupRow) return;
                startTransition(async () => {
                  const { error } = await duplicateFinanceForecastScenario({
                    studyId,
                    id: dupRow.id,
                    name: dupName.trim(),
                  });
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success('Scenario duplicated.');
                  setDupRow(null);
                  router.refresh();
                });
              }}
            >
              Duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditScenarioForm({
  studyId,
  row,
  onDone,
}: {
  studyId: string;
  row: FmForecastScenario;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(row.name);
  const [spendMult, setSpendMult] = useState(
    String((row.assumptions as { spend_multiplier?: number }).spend_multiplier ?? 1),
  );
  const [confidence, setConfidence] = useState(
    String((row.assumptions as { confidence_pct?: number }).confidence_pct ?? 70),
  );
  const [status, setStatus] = useState(row.status);

  return (
    <>
      <div className="grid gap-2 px-1">
        <div className="space-y-1">
          <Label className="text-[11px]">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Spend multiplier</Label>
          <Input value={spendMult} onChange={(e) => setSpendMult(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Confidence %</Label>
          <Input value={confidence} onChange={(e) => setConfidence(e.target.value)} className="h-9 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as FmForecastScenario['status'])}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft" className="text-xs">
                Draft
              </SelectItem>
              <SelectItem value="active" className="text-xs">
                Active
              </SelectItem>
              <SelectItem value="archived" className="text-xs">
                Archived
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !name.trim()}
          onClick={() => {
            const mult = Number(spendMult);
            const conf = Number(confidence);
            startTransition(async () => {
              const { error, code } = await updateFinanceForecastScenario({
                studyId,
                id: row.id,
                updatedAt: row.updated_at,
                name: name.trim(),
                assumptions: {
                  spend_multiplier: Number.isFinite(mult) ? mult : 1,
                  confidence_pct: Number.isFinite(conf) ? conf : 70,
                },
                status,
              });
              if (error) {
                toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                return;
              }
              toast.success('Scenario updated.');
              onDone();
            });
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
