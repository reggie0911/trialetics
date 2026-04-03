'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FinanceInvoiceWithRelations, InvoiceBudgetAllocationContextLineItem } from '@/lib/types/ctms';
import {
  getSiteBudgetAllocationBundle,
  listInvoiceBudgetAllocations,
  replaceInvoiceBudgetAllocations,
} from '@/lib/actions/finance-site-budgets';
import { suggestInvoiceBudgetAmountsByDescription } from '@/lib/invoice-budget-line-match';

function UtilizationBar({ label, allocated, cap, currency }: { label: string; allocated: number; cap: number; currency: string }) {
  const pct = cap > 0 ? Math.min((allocated / cap) * 100, 100) : 0;
  const colorClass =
    pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground truncate max-w-[160px]">{label}</span>
        <span className={pct >= 100 ? 'text-destructive font-medium' : pct >= 80 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}>
          {pct.toFixed(0)}% {pct >= 100 ? '⛔' : pct >= 80 ? '⚠' : ''}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

const AMOUNT_ROUND = (n: number) => Math.round(n * 100) / 100;

type DialogLine = InvoiceBudgetAllocationContextLineItem;

interface InvoiceBudgetAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: FinanceInvoiceWithRelations | null;
  studyId: string;
  onSaved: () => void;
}

export function InvoiceBudgetAllocationDialog({
  open,
  onOpenChange,
  invoice,
  studyId,
  onSaved,
}: InvoiceBudgetAllocationDialogProps) {
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bundle, setBundle] = useState<{
    siteId: string;
    siteBudgetId: string;
    lineItems: DialogLine[];
  } | null>(null);
  /** Running totals per line id from all invoices (includes current invoice saved amount + others). */
  const [totalsByLine, setTotalsByLine] = useState<Record<string, number>>({});
  /** This invoice's amounts already saved in DB per line (excludes unsaved form / AI suggestions). */
  const [persistedThisInvoiceByLine, setPersistedThisInvoiceByLine] = useState<Record<string, number>>({});
  const [byLine, setByLine] = useState<Record<string, string>>({});

  const inv = invoice;
  const siteId = inv?.site_id ?? null;

  const displayLines = useMemo(() => {
    if (!bundle) return [];
    const savedIds = new Set(
      Object.entries(byLine)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([id]) => id)
    );
    const fromSaved = bundle.lineItems.filter((li) => !li.is_active && savedIds.has(li.id));
    const active = bundle.lineItems.filter((li) => li.is_active);
    const extraInactive = bundle.lineItems.filter(
      (li) => !li.is_active && !savedIds.has(li.id)
    );
    return [...active, ...fromSaved, ...extraInactive];
  }, [bundle, byLine]);

  const load = useCallback(async () => {
    if (!inv?.id || !siteId) return;
    setLoading(true);
    try {
      const [ctx, saved] = await Promise.all([
        getSiteBudgetAllocationBundle(studyId, siteId),
        listInvoiceBudgetAllocations(inv.id),
      ]);
      if (!ctx) {
        toast.error('No site budget found for this site. Add budget line items first.');
        setBundle(null);
        setByLine({});
        setTotalsByLine({});
        setPersistedThisInvoiceByLine({});
        return;
      }
      setTotalsByLine(ctx.invoicedByLineId);
      setBundle({
        siteId: ctx.siteId,
        siteBudgetId: ctx.siteBudgetId,
        lineItems: ctx.lineItems,
      });

      const next: Record<string, string> = {};
      for (const li of ctx.lineItems) {
        next[li.id] = '';
      }
      const persisted: Record<string, number> = {};
      for (const row of saved) {
        if (row.site_budget_line_item_id) {
          next[row.site_budget_line_item_id] =
            row.amount > 0 ? String(row.amount) : '';
          if (row.amount > 0) {
            persisted[row.site_budget_line_item_id] = AMOUNT_ROUND(Number(row.amount));
          }
        }
      }
      setPersistedThisInvoiceByLine(persisted);

      const hasSaved = saved.some((s) => s.amount > 0);
      if (!hasSaved && inv.extracted_data) {
        const suggested = suggestInvoiceBudgetAmountsByDescription(
          inv.extracted_data,
          ctx.lineItems.map((l) => ({
            id: l.id,
            description: l.description,
            is_active: l.is_active,
          }))
        );
        for (const [lid, amt] of Object.entries(suggested)) {
          if (amt > 0 && next[lid] === '') next[lid] = String(amt);
        }
      }

      setByLine(next);
    } catch (e) {
      console.error(e);
      toast.error('Could not load budget allocation data.');
      setBundle(null);
      setByLine({});
      setTotalsByLine({});
      setPersistedThisInvoiceByLine({});
    } finally {
      setLoading(false);
    }
  }, [inv?.id, inv?.extracted_data, siteId, studyId]);

  useEffect(() => {
    if (open && inv?.id && siteId) {
      void load();
    } else if (!open) {
      setBundle(null);
      setByLine({});
      setTotalsByLine({});
      setPersistedThisInvoiceByLine({});
    }
  }, [open, inv?.id, siteId, load]);

  function thisInvoiceOnLine(lineId: string): number {
    const v = parseFloat(byLine[lineId] ?? '0');
    return Number.isNaN(v) ? 0 : AMOUNT_ROUND(v);
  }

  const allocatedSum = useMemo(() => {
    let s = 0;
    for (const v of Object.values(byLine)) {
      const n = parseFloat(v);
      if (!Number.isNaN(n) && n > 0) s += n;
    }
    return AMOUNT_ROUND(s);
  }, [byLine]);

  const invAmount = inv ? Number(inv.amount) : 0;

  /** Per-section aggregated utilization (cap vs already-allocated + this form) */
  const sectionUtilization = useMemo(() => {
    if (!bundle) return [] as { section: string; cap: number; allocated: number }[];
    const map: Record<string, { cap: number; allocated: number }> = {};
    for (const li of bundle.lineItems) {
      const key = li.section ?? '(No section)';
      if (!map[key]) map[key] = { cap: 0, allocated: 0 };
      map[key].cap += Number(li.cost_with_overhead);
      const totalInvoiced = totalsByLine[li.id] ?? 0;
      const persistedThis = persistedThisInvoiceByLine[li.id] ?? 0;
      const otherInvoiced = Math.max(0, AMOUNT_ROUND(totalInvoiced - persistedThis));
      map[key].allocated += otherInvoiced + thisInvoiceOnLine(li.id);
    }
    return Object.entries(map).map(([section, v]) => ({ section, ...v }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, totalsByLine, persistedThisInvoiceByLine, byLine]);

  /** Grand total utilization across all budget lines */
  const grandTotalCap = useMemo(
    () => bundle?.lineItems.reduce((s, li) => s + Number(li.cost_with_overhead), 0) ?? 0,
    [bundle]
  );
  const grandTotalAllocated = useMemo(() => {
    if (!bundle) return 0;
    return bundle.lineItems.reduce((s, li) => {
      const totalInvoiced = totalsByLine[li.id] ?? 0;
      const persistedThis = persistedThisInvoiceByLine[li.id] ?? 0;
      const otherInvoiced = Math.max(0, AMOUNT_ROUND(totalInvoiced - persistedThis));
      return s + otherInvoiced + thisInvoiceOnLine(li.id);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, totalsByLine, persistedThisInvoiceByLine, byLine]);

  const handleSave = () => {
    if (!inv?.id || !bundle || !siteId) return;
    if (allocatedSum > invAmount + 0.01) {
      toast.error('Allocated total cannot exceed the invoice amount.');
      return;
    }
    const allocations = Object.entries(byLine)
      .map(([siteBudgetLineItemId, s]) => ({
        siteBudgetLineItemId,
        amount: parseFloat(s),
      }))
      .filter((x) => !Number.isNaN(x.amount) && x.amount > 0.001);

    setSaving(true);
    startTransition(async () => {
      try {
        const { error } = await replaceInvoiceBudgetAllocations({
          invoiceId: inv.id,
          studyId,
          siteId,
          siteBudgetId: bundle.siteBudgetId,
          allocations: allocations.map((a) => ({
            siteBudgetLineItemId: a.siteBudgetLineItemId,
            amount: AMOUNT_ROUND(a.amount),
          })),
        });
        if (error) toast.error(error);
        else {
          toast.success('Budget line allocation saved.');
          onOpenChange(false);
          onSaved();
        }
      } finally {
        setSaving(false);
      }
    });
  };

  if (!inv) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-0 max-h-[85vh] flex flex-col max-w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-base">Allocate to site budget lines</DialogTitle>
          <DialogDescription className="text-xs">
            Map invoice {inv.external_invoice_id} to one or more line item descriptions. Totals cannot exceed the
            invoice amount or each line&apos;s remaining budget.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 min-w-0 overflow-auto space-y-3 py-1 pr-1 [scrollbar-gutter:stable]">
          {loading ? (
            <p className="text-xs text-muted-foreground py-6 text-center">Loading…</p>
          ) : !bundle ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No budget data for this site.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 text-xs border rounded-md p-2 bg-muted/30">
                <div>
                  <span className="text-muted-foreground">Invoice total: </span>
                  <span className="font-medium tabular-nums">{formatCurrency(invAmount, inv.currency)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Allocated (this form): </span>
                  <span className="font-medium tabular-nums">{formatCurrency(allocatedSum, inv.currency)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Unallocated: </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Math.max(0, invAmount - allocatedSum), inv.currency)}
                  </span>
                </div>
              </div>
              {sectionUtilization.length > 1 && (
                <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Budget utilization by section</p>
                  {sectionUtilization.map(({ section, cap, allocated }) => (
                    <UtilizationBar key={section} label={section} allocated={allocated} cap={cap} currency={inv?.currency ?? 'USD'} />
                  ))}
                  <UtilizationBar label="Grand Total" allocated={grandTotalAllocated} cap={grandTotalCap} currency={inv?.currency ?? 'USD'} />
                </div>
              )}
              <div className="min-w-0 rounded-md border">
                <Table className="min-w-[44rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Line max</TableHead>
                      <TableHead className="text-xs text-right">Other invoices</TableHead>
                      <TableHead className="text-xs text-right">Remaining</TableHead>
                      <TableHead className="text-xs text-right w-[120px]">This invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayLines.map((li) => {
                      const cap = Number(li.cost_with_overhead);
                      const totalInvoiced = totalsByLine[li.id] ?? 0;
                      const persistedThis = persistedThisInvoiceByLine[li.id] ?? 0;
                      const otherInvoiced = Math.max(0, AMOUNT_ROUND(totalInvoiced - persistedThis));
                      const thisLine = thisInvoiceOnLine(li.id);
                      const remaining = Math.max(0, AMOUNT_ROUND(cap - otherInvoiced - thisLine));
                      const canEdit = li.is_active || thisLine > 0 || persistedThis > 0;
                      const overCap = thisLine > 0 && (otherInvoiced + thisLine) > cap + 0.01;
                      const nearCap = !overCap && thisLine > 0 && cap > 0 && ((otherInvoiced + thisLine) / cap) >= 0.8;
                      return (
                        <TableRow key={li.id} className={!li.is_active ? 'opacity-80' : undefined}>
                          <TableCell className="text-xs max-w-[220px]">
                            <span className="line-clamp-2" title={li.description}>
                              {li.description}
                            </span>
                            {!li.is_active && (
                              <span className="block text-[10px] text-muted-foreground">Inactive line</span>
                            )}
                            {li.section && (
                              <span className="block text-[10px] text-muted-foreground">{li.section}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{formatCurrency(cap)}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                            {formatCurrency(otherInvoiced)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">
                            {formatCurrency(remaining)}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            <div className="flex items-center justify-end gap-1">
                              {overCap && (
                                <span title="Allocation exceeds this line's approved cap" className="text-destructive select-none">⛔</span>
                              )}
                              {nearCap && !overCap && (
                                <span title="Allocation is ≥ 80% of this line's cap" className="text-amber-500 select-none">⚠</span>
                              )}
                              <Input
                                className={`text-xs h-8 text-right tabular-nums ${overCap ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={!canEdit}
                                value={byLine[li.id] ?? ''}
                                onChange={(e) => {
                                  setByLine((prev) => ({ ...prev, [li.id]: e.target.value }));
                                }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="text-xs"
            disabled={loading || saving || !bundle}
            onClick={handleSave}
          >
            Save allocation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
