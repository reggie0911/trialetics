'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import type { StudySite } from '@/lib/types/ctms';
import type { ExpenseReportRow } from '@/lib/actions/expense-reports';
import {
  deleteExpenseLine,
  submitExpenseReport,
  uploadExpenseReceipt,
  upsertExpenseLine,
} from '@/lib/actions/expense-reports';
import { TIME_EXPENSE_STATUS_LABEL } from '@/lib/types/time-expense';

type LineRow = {
  id: string;
  expense_date: string;
  category_id: string;
  amount: number;
  currency: string;
  description: string | null;
  merchant: string | null;
  site_id: string | null;
  files?: { id: string; file_name: string }[];
};

export function ExpenseReportEditor({
  report,
  initialLines,
  categories,
  sites,
}: {
  report: ExpenseReportRow;
  initialLines: LineRow[];
  categories: { id: string; label: string }[];
  sites: Pick<StudySite, 'id' | 'name' | 'site_number'>[];
}) {
  const router = useRouter();
  const [version, setVersion] = useState(report.version);
  const [rows, setRows] = useState<LineRow[]>(initialLines);
  const [pending, startTransition] = useTransition();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const editable = report.status === 'draft' || report.status === 'changes_requested';

  const categorySelectItems = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.label })),
    [categories],
  );
  const siteSelectItems = useMemo(
    () => [
      { value: '__none', label: 'No Site' },
      ...sites.map((s) => ({ value: s.id, label: `${s.site_number} — ${s.name}` })),
    ],
    [sites],
  );

  useEffect(() => {
    setRows(initialLines);
  }, [initialLines]);

  useEffect(() => {
    setVersion(report.version);
  }, [report.version]);

  useEffect(() => {
    return () => timers.current.forEach((t) => clearTimeout(t));
  }, []);

  const updateRow = (id: string, patch: Partial<LineRow>) => {
    setRows((prev) => {
      const mergedRows = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const row = mergedRows.find((r) => r.id === id);
      if (row?.category_id && row?.expense_date && row.amount >= 0) {
        const existing = timers.current.get(id);
        if (existing) clearTimeout(existing);
        timers.current.set(
          id,
          setTimeout(() => {
            startTransition(async () => {
              const { error, userMessage } = await upsertExpenseLine({
                id: row.id.startsWith('local-') ? undefined : row.id,
                reportId: report.id,
                expenseDate: row.expense_date,
                categoryId: row.category_id,
                amount: row.amount,
                currency: row.currency || 'USD',
                description: row.description,
                merchant: row.merchant,
                siteId: row.site_id,
              });
              if (error) toast.error(userMessage ?? error);
              else router.refresh();
            });
          }, 650),
        );
      }
      return mergedRows;
    });
  };

  const addRow = () => {
    const cat = categories[0]?.id ?? '';
    setRows((r) => [
      ...r,
      {
        id: `local-${crypto.randomUUID()}`,
        expense_date: new Date().toISOString().slice(0, 10),
        category_id: cat,
        amount: 0,
        currency: 'USD',
        description: null,
        merchant: null,
        site_id: null,
        files: [],
      },
    ]);
  };

  const onRemove = (id: string) => {
    if (id.startsWith('local-')) {
      setRows((r) => r.filter((x) => x.id !== id));
      return;
    }
    startTransition(async () => {
      const { error } = await deleteExpenseLine(id, report.id);
      if (error) toast.error(error);
      else {
        setRows((r) => r.filter((x) => x.id !== id));
        router.refresh();
      }
    });
  };

  const onUpload = (lineId: string, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set('reportId', report.id);
    fd.set('lineId', lineId);
    fd.set('file', file);
    startTransition(async () => {
      const { error } = await uploadExpenseReceipt(fd);
      if (error) toast.error(error);
      else {
        toast.success('Receipt uploaded.');
        router.refresh();
      }
    });
  };

  const onSubmit = () => {
    startTransition(async () => {
      const { error, userMessage } = await submitExpenseReport(report.id, version);
      if (error) toast.error(userMessage ?? error);
      else {
        toast.success('Expense report submitted.');
        router.refresh();
      }
    });
  };

  const runAnomalyScan = () => {
    const payload = rows
      .filter((r) => !r.id.startsWith('local-'))
      .map((r) => ({
        id: r.id,
        amount: r.amount,
        expense_date: r.expense_date,
        description: r.description,
        merchant: r.merchant,
      }));
    if (payload.length === 0) {
      toast.message('Save lines first, then run the scan.');
      return;
    }
    startTransition(async () => {
      const res = await fetch('/api/ai/expense-anomaly-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Scan failed.');
        return;
      }
      const dups = (data.deterministicDuplicates as { a: string; b: string; reason: string }[]) ?? [];
      const flags = (data.llmFlags as { lineId: string; severity: string; note: string }[]) ?? [];
      if (dups.length === 0 && flags.length === 0) {
        toast.success('No obvious anomalies flagged.');
        return;
      }
      toast.message(
        `${dups.length} duplicate pairs, ${flags.length} model flags — review lines in the table.`,
        { duration: 6000 },
      );
    });
  };

  const runPolicyScan = () => {
    const ctx = JSON.stringify({ title: report.title, lines: rows });
    startTransition(async () => {
      const res = await fetch('/api/ai/policy-compliance-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: ctx }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Policy scan failed.');
        return;
      }
      const w = (data.warnings as { severity: string; message: string }[]) ?? [];
      if (w.length === 0) toast.success('No policy warnings.');
      else toast.message(w.map((x) => `${x.severity}: ${x.message}`).join(' · '), { duration: 8000 });
    });
  };

  const suggestCategory = (row: LineRow) => {
    if (!row.description?.trim()) {
      toast.error('Add a description first.');
      return;
    }
    startTransition(async () => {
      const res = await fetch('/api/ai/expense-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: row.description,
          merchant: row.merchant,
          categories,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Suggestion failed.');
        return;
      }
      const id = data.categoryId as string;
      toast.message(`Suggested category — apply?`, {
        action: {
          label: 'Apply',
          onClick: () => updateRow(row.id, { category_id: id }),
        },
        duration: 8000,
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" className="text-xs h-8 -ml-2" asChild>
            <Link href="/protected/time-expenses/expenses">← Back</Link>
          </Button>
          <h2 className="text-lg font-semibold">{report.title}</h2>
          <p className="text-xs text-muted-foreground">{report.studies?.title ?? 'Study'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {TIME_EXPENSE_STATUS_LABEL[report.status as keyof typeof TIME_EXPENSE_STATUS_LABEL] ?? report.status}
          </Badge>
          {report.total_amount != null && (
            <span className="text-sm font-medium">Total: {Number(report.total_amount).toFixed(2)}</span>
          )}
        </div>
      </div>

      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="text-xs h-8" onClick={addRow} disabled={pending}>
            Add line
          </Button>
          <Button type="button" size="sm" className="text-xs h-8" onClick={onSubmit} disabled={pending}>
            Submit for review
          </Button>
          <Button type="button" size="sm" variant="outline" className="text-xs h-8" disabled={pending} onClick={runAnomalyScan}>
            AI: scan anomalies
          </Button>
          <Button type="button" size="sm" variant="outline" className="text-xs h-8" disabled={pending} onClick={runPolicyScan}>
            AI: policy check
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense lines</CardTitle>
          <p className="text-xs text-muted-foreground">
            Lines save automatically after you pause editing. Version {version}.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[120px]">Date</TableHead>
                <TableHead className="text-xs min-w-[120px]">Category</TableHead>
                <TableHead className="text-xs w-[100px]">Amount</TableHead>
                <TableHead className="text-xs w-[80px]">Currency</TableHead>
                <TableHead className="text-xs min-w-[140px]">Site</TableHead>
                <TableHead className="text-xs min-w-[160px]">Description</TableHead>
                <TableHead className="text-xs min-w-[120px]">Receipt</TableHead>
                <TableHead className="text-xs w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-xs text-muted-foreground text-center py-8">
                    No lines. {editable ? 'Click Add line.' : ''}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs align-top">
                      <Input
                        type="date"
                        className="text-xs h-8"
                        value={r.expense_date}
                        disabled={!editable}
                        onChange={(e) => updateRow(r.id, { expense_date: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-xs align-top space-y-1">
                      <Select
                        value={r.category_id}
                        disabled={!editable}
                        items={categorySelectItems}
                        onValueChange={(v) => updateRow(r.id, { category_id: v })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editable && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-6 px-1"
                          disabled={pending}
                          onClick={() => suggestCategory(r)}
                        >
                          AI suggest
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-xs align-top">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        className="text-xs h-8"
                        disabled={!editable}
                        value={r.amount}
                        onChange={(e) => updateRow(r.id, { amount: Number(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell className="text-xs align-top">
                      <Input
                        className="text-xs h-8 uppercase"
                        maxLength={3}
                        disabled={!editable}
                        value={r.currency}
                        onChange={(e) => updateRow(r.id, { currency: e.target.value.toUpperCase() })}
                      />
                    </TableCell>
                    <TableCell className="text-xs align-top">
                      <Select
                        value={r.site_id ?? '__none'}
                        disabled={!editable}
                        items={siteSelectItems}
                        onValueChange={(v) => updateRow(r.id, { site_id: v === '__none' ? null : v })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select Site" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none" className="text-xs">
                            No Site
                          </SelectItem>
                          {sites.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.site_number} — {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs align-top">
                      <Input
                        className="text-xs h-8"
                        placeholder="What was purchased"
                        disabled={!editable}
                        value={r.description ?? ''}
                        onChange={(e) => updateRow(r.id, { description: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell className="text-xs align-top">
                      {!r.id.startsWith('local-') && editable && (
                        <div className="space-y-1">
                          <Input
                            type="file"
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            className="text-xs h-8 p-0 file:text-xs"
                            disabled={pending}
                            onChange={(e) => onUpload(r.id, e.target.files)}
                          />
                          {(r.files ?? []).map((f) => (
                            <p key={f.id} className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                              {f.file_name}
                            </p>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right align-top">
                      {editable && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-destructive"
                          onClick={() => onRemove(r.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
