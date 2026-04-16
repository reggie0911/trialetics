'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FinanceApprovalTemplateRow } from '@/lib/types/ctms';
import { TEAM_ROLE_OPTIONS } from '@/lib/types/ctms';
import {
  createFinanceApprovalTemplate,
  deleteFinanceApprovalTemplate,
  listFinanceApprovalTemplates,
  setDefaultFinanceApprovalTemplate,
  updateFinanceApprovalTemplate,
} from '@/lib/actions/finance-approval-templates';
import type { FinanceApprovalTemplateStep } from '@/lib/validation/finance-approval-template';
import { parseStepsFromDb } from '@/lib/validation/finance-approval-template';

const DEFAULT_STEP: FinanceApprovalTemplateStep = {
  order: 0,
  label: 'Review',
  study_roles_any: ['clinical_project_manager'],
};

function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function centsFromDollarsInput(s: string): number {
  const n = Number.parseFloat(s.replace(/,/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n * 100), Number.MAX_SAFE_INTEGER);
}

interface FinanceApprovalTemplatesClientProps {
  initialTemplates: FinanceApprovalTemplateRow[];
}

export function FinanceApprovalTemplatesClient({ initialTemplates }: FinanceApprovalTemplatesClientProps) {
  const [, startTransition] = useTransition();
  const [rows, setRows] = useState(initialTemplates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [escalationUsd, setEscalationUsd] = useState('50000.00');
  const [steps, setSteps] = useState<FinanceApprovalTemplateStep[]>([DEFAULT_STEP]);

  const roleOptions = useMemo(() => TEAM_ROLE_OPTIONS, []);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setIsDefault(rows.length === 0);
    setEscalationUsd('50000.00');
    setSteps([{ ...DEFAULT_STEP }]);
    setDialogOpen(true);
  };

  const openEdit = (t: FinanceApprovalTemplateRow) => {
    setEditingId(t.id);
    setName(t.name);
    setIsDefault(t.is_default);
    setEscalationUsd(dollarsFromCents(t.escalation_threshold_cents));
    const parsed = parseStepsFromDb(t.steps);
    setSteps(parsed.length > 0 ? parsed.map((s, i) => ({ ...s, order: i })) : [{ ...DEFAULT_STEP }]);
    setDialogOpen(true);
  };

  const save = () => {
    const escalation_threshold_cents = centsFromDollarsInput(escalationUsd);
    startTransition(async () => {
      if (editingId) {
        const { error } = await updateFinanceApprovalTemplate({
          id: editingId,
          name,
          is_default: isDefault,
          steps,
          escalation_threshold_cents,
        });
        if (error) toast.error(error);
        else {
          toast.success('Workflow updated.');
          setDialogOpen(false);
          const next = await listFinanceApprovalTemplates();
          setRows(next);
        }
      } else {
        const { error } = await createFinanceApprovalTemplate({
          name,
          is_default: isDefault,
          steps,
          escalation_threshold_cents,
        });
        if (error) toast.error(error);
        else {
          toast.success('Workflow created.');
          setDialogOpen(false);
          const next = await listFinanceApprovalTemplates();
          setRows(next);
        }
      }
    });
  };

  const moveStep = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= steps.length) return;
    setSteps((prev) => {
      const copy = [...prev];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy.map((s, i) => ({ ...s, order: i }));
    });
  };

  const toggleRole = (stepIndex: number, roleValue: string, checked: boolean) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== stepIndex) return s;
        const set = new Set(s.study_roles_any);
        if (checked) set.add(roleValue);
        else set.delete(roleValue);
        return { ...s, study_roles_any: [...set] };
      }),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoice approval workflows</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Define multi-step approvals by study role. The{' '}
            <span className="font-medium text-foreground">default</span> workflow is used for new invoices when no study or draft override applies.
            When an invoice total is above the escalation amount (USD), one additional step requires a Finance Director or Executive Director on the study team.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <Link href="/protected/studies" className="underline hover:text-foreground">
              Back to studies
            </Link>
          </p>
        </div>
        <Button size="sm" className="text-xs shrink-0" onClick={openNew}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New workflow
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Workflows</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No workflows yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Steps</TableHead>
                    <TableHead className="text-xs text-right">Escalation (USD)</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-medium">
                        {t.name}
                        {t.is_default && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {Array.isArray(t.steps) ? (t.steps as unknown[]).length : 0}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {dollarsFromCents(t.escalation_threshold_cents)}
                      </TableCell>
                      <TableCell className="text-xs text-right space-x-1">
                        {!t.is_default && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2"
                            onClick={() => {
                              startTransition(async () => {
                                const { error } = await setDefaultFinanceApprovalTemplate(t.id);
                                if (error) toast.error(error);
                                else {
                                  toast.success('Default workflow updated.');
                                  setRows(await listFinanceApprovalTemplates());
                                }
                              });
                            }}
                          >
                            Set default
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" className="text-[10px] h-7 px-2" onClick={() => openEdit(t)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger render={<Button variant="outline" size="sm" className="text-[10px] h-7 px-2 text-destructive" />}>
                            <Trash2 className="h-3 w-3" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete workflow</AlertDialogTitle>
                              <AlertDialogDescription>
                                Delete &ldquo;{t.name}&rdquo;? Invoices already in review keep their assigned workflow.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                  startTransition(async () => {
                                    const { error } = await deleteFinanceApprovalTemplate(t.id);
                                    if (error) toast.error(error);
                                    else {
                                      toast.success('Workflow deleted.');
                                      setRows(await listFinanceApprovalTemplates());
                                    }
                                  });
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editingId ? 'Edit workflow' : 'New workflow'}</DialogTitle>
            <DialogDescription className="text-xs">
              Each step lists study team roles that may approve at that step. Company admins can always approve any step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Workflow name</Label>
              <Input className="text-xs h-9" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
              <div>
                <p className="text-xs font-medium">Company default</p>
                <p className="text-[10px] text-muted-foreground">Used when no study or invoice override applies.</p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Escalation above (USD)</Label>
              <Input
                className="text-xs h-9 tabular-nums"
                inputMode="decimal"
                value={escalationUsd}
                onChange={(e) => setEscalationUsd(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Totals strictly above this amount require an extra approval (Finance Director or Executive Director).
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Steps</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7"
                  onClick={() =>
                    setSteps((prev) => [
                      ...prev,
                      { order: prev.length, label: `Step ${prev.length + 1}`, study_roles_any: ['finance_reviewer'] },
                    ])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add step
                </Button>
              </div>
              {steps.map((step, idx) => (
                <div key={idx} className="rounded-md border p-2 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => moveStep(idx, 1)}
                      disabled={idx === steps.length - 1}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Input
                      className="text-xs h-8 flex-1"
                      value={step.label}
                      onChange={(e) =>
                        setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, label: e.target.value } : s)))
                      }
                      placeholder="Step label"
                    />
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive"
                        onClick={() => setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded border bg-background px-2 py-1.5 space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground">Who can approve this step</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {roleOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2 text-xs cursor-pointer">
                          <Checkbox
                            checked={step.study_roles_any.includes(opt.value)}
                            onCheckedChange={(c) => toggleRole(idx, opt.value, c === true)}
                          />
                          <span className="leading-tight">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="text-xs" onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
