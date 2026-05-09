'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createFinanceApprovalPolicy,
  deleteFinanceApprovalPolicy,
  updateFinanceApprovalPolicy,
} from '@/lib/actions/study-finance-module';
import type { FmApprovalPolicy } from '@/lib/finance-module/types';
import { useFmPermissions } from '@/hooks/use-fm-permissions';

const OBJECT_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'budget_version', label: 'Budget version' },
  { value: 'change_order', label: 'Change order' },
  { value: 'purchase_order', label: 'Purchase order' },
  { value: 'site_payment_schedule', label: 'Site payment schedule' },
  { value: 'payment', label: 'Payment' },
] as const;

interface ApprovalPoliciesSettingsCardProps {
  studyId: string;
  policies: FmApprovalPolicy[];
}

export function ApprovalPoliciesSettingsCard({ studyId, policies }: ApprovalPoliciesSettingsCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const permsQ = useFmPermissions(studyId);
  const canWrite = permsQ.data?.canWrite ?? false;

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [objectType, setObjectType] = useState<string>('invoice');
  const [threshold, setThreshold] = useState('25000');
  const [requirement, setRequirement] = useState('dual_approval');

  const [editRow, setEditRow] = useState<FmApprovalPolicy | null>(null);
  const [editName, setEditName] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editRequirement, setEditRequirement] = useState('');

  const rowActions = useCallback(
    (row: FmApprovalPolicy): FinanceRowActionItem[] => {
      const rules = (row.rules ?? {}) as { objectType?: string; thresholdAmount?: number; requirement?: string };
      return [
        {
          id: 'edit',
          label: 'Edit…',
          disabled: pending || !canWrite,
          onSelect: () => {
            setEditRow(row);
            setEditName(row.name);
            setEditThreshold(String(rules.thresholdAmount ?? ''));
            setEditRequirement(String(rules.requirement ?? 'dual_approval'));
          },
        },
        {
          id: 'del',
          label: 'Delete',
          variant: 'destructive',
          disabled: pending || !canWrite,
          onSelect: () => {
            startTransition(async () => {
              const { error, code } = await deleteFinanceApprovalPolicy({
                studyId,
                id: row.id,
                updatedAt: row.updated_at,
              });
              if (error) {
                toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                return;
              }
              toast.success('Policy deleted.');
              router.refresh();
            });
          },
        },
      ];
    },
    [canWrite, pending, router, studyId],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Approval Policies</CardTitle>
          <CardDescription className="text-[11px]">
            Thresholds and routing rules for finance approvals. Policies are stored per study.
          </CardDescription>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={!canWrite || pending} onClick={() => setCreateOpen(true)}>
          Add policy
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {policies.length === 0 ? (
          <p className="text-xs text-muted-foreground">No policies yet. Defaults are created when the finance workspace is initialized.</p>
        ) : (
          <ul className="space-y-2">
            {policies.map((row) => {
              const rules = (row.rules ?? {}) as { objectType?: string; thresholdAmount?: number; requirement?: string };
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                >
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {rules.objectType ?? '—'} · threshold {rules.thresholdAmount != null ? `$${rules.thresholdAmount.toLocaleString()}` : '—'} ·{' '}
                      {rules.requirement ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {row.status}
                    </Badge>
                    <FinanceRowActionsMenu
                      ariaLabel="Policy actions"
                      telemetryContext={{ studyId, tableKey: 'approval_policies', entityType: 'fm_approval_policy' }}
                      items={rowActions(row)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Add approval policy</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 px-1">
            <div className="space-y-1">
              <Label className="text-[11px]">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Object type</Label>
              <Select value={objectType} onValueChange={setObjectType}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECT_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Threshold amount (USD)</Label>
              <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} className="h-9 text-xs" inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Requirement</Label>
              <Select value={requirement} onValueChange={setRequirement}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dual_approval" className="text-xs">
                    Dual approval
                  </SelectItem>
                  <SelectItem value="executive_review" className="text-xs">
                    Executive review
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
              disabled={pending || !name.trim()}
              onClick={() => {
                startTransition(async () => {
                  const amt = Number(threshold);
                  const { error } = await createFinanceApprovalPolicy({
                    studyId,
                    name: name.trim(),
                    rules: {
                      objectType,
                      thresholdAmount: Number.isFinite(amt) ? amt : 0,
                      requirement,
                    },
                    status: 'active',
                  });
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success('Policy created.');
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
            <DialogTitle className="text-sm">Edit policy</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <>
              <div className="grid gap-2 px-1">
                <div className="space-y-1">
                  <Label className="text-[11px]">Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Threshold amount (USD)</Label>
                  <Input value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Requirement</Label>
                  <Select value={editRequirement} onValueChange={setEditRequirement}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dual_approval" className="text-xs">
                        Dual approval
                      </SelectItem>
                      <SelectItem value="executive_review" className="text-xs">
                        Executive review
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditRow(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || !editName.trim()}
                  onClick={() => {
                    const amt = Number(editThreshold);
                    const prevRules = (editRow.rules ?? {}) as Record<string, unknown>;
                    startTransition(async () => {
                      const { error, code } = await updateFinanceApprovalPolicy({
                        studyId,
                        id: editRow.id,
                        updatedAt: editRow.updated_at,
                        name: editName.trim(),
                        rules: {
                          ...prevRules,
                          thresholdAmount: Number.isFinite(amt) ? amt : 0,
                          requirement: editRequirement,
                        },
                      });
                      if (error) {
                        toast.error(error, code === 'STALE_RECORD' ? { description: 'Reload and try again.' } : undefined);
                        return;
                      }
                      toast.success('Policy updated.');
                      setEditRow(null);
                      router.refresh();
                    });
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
