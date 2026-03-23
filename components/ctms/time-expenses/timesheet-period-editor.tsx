'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StudySite } from '@/lib/types/ctms';
import type { TimesheetPeriodRow } from '@/lib/actions/timesheets';
import { deleteTimesheetEntry, submitTimesheetPeriod, upsertTimesheetEntry } from '@/lib/actions/timesheets';
import { TIME_EXPENSE_STATUS_LABEL } from '@/lib/types/time-expense';

type EntryRow = {
  id: string;
  work_date: string;
  activity_type_id: string;
  hours: number;
  is_billable: boolean;
  site_id: string | null;
  notes: string | null;
};

export function TimesheetPeriodEditor({
  period,
  initialEntries,
  activityTypes,
  sites,
}: {
  period: TimesheetPeriodRow;
  initialEntries: EntryRow[];
  activityTypes: { id: string; label: string }[];
  sites: Pick<StudySite, 'id' | 'name' | 'site_number'>[];
}) {
  const router = useRouter();
  const [version, setVersion] = useState(period.version);
  const [rows, setRows] = useState<EntryRow[]>(initialEntries);
  const [pending, startTransition] = useTransition();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const editable = period.status === 'draft' || period.status === 'changes_requested';

  const activitySelectItems = useMemo(
    () => activityTypes.map((a) => ({ value: a.id, label: a.label })),
    [activityTypes],
  );
  const siteSelectItems = useMemo(
    () => [
      { value: '__none', label: 'No Site' },
      ...sites.map((s) => ({ value: s.id, label: `${s.site_number} — ${s.name}` })),
    ],
    [sites],
  );

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const updateRow = (id: string, patch: Partial<EntryRow>) => {
    setRows((prev) => {
      const mergedRows = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const row = mergedRows.find((r) => r.id === id);
      if (row?.activity_type_id && row?.work_date) {
        const existing = timers.current.get(id);
        if (existing) clearTimeout(existing);
        timers.current.set(
          id,
          setTimeout(() => {
            startTransition(async () => {
              const { error, userMessage } = await upsertTimesheetEntry({
                id: row.id.startsWith('local-') ? undefined : row.id,
                periodId: period.id,
                workDate: row.work_date,
                activityTypeId: row.activity_type_id,
                hours: row.hours,
                isBillable: row.is_billable,
                siteId: row.site_id,
                notes: row.notes,
              });
              if (error) {
                toast.error(userMessage ?? error);
                return;
              }
              router.refresh();
            });
          }, 650),
        );
      }
      return mergedRows;
    });
  };

  useEffect(() => {
    setRows(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    setVersion(period.version);
  }, [period.version]);

  const addRow = () => {
    const defaultAct = activityTypes[0]?.id ?? '';
    const newRow: EntryRow = {
      id: `local-${crypto.randomUUID()}`,
      work_date: period.week_start_date,
      activity_type_id: defaultAct,
      hours: 0,
      is_billable: true,
      site_id: null,
      notes: null,
    };
    setRows((r) => [...r, newRow]);
  };

  const onRemove = (id: string) => {
    if (id.startsWith('local-')) {
      setRows((r) => r.filter((x) => x.id !== id));
      return;
    }
    startTransition(async () => {
      const { error } = await deleteTimesheetEntry(id, period.id);
      if (error) toast.error(error);
      else {
        setRows((r) => r.filter((x) => x.id !== id));
        setVersion((v) => v + 1);
        router.refresh();
      }
    });
  };

  const onSubmit = () => {
    startTransition(async () => {
      const { error, userMessage } = await submitTimesheetPeriod(period.id, version);
      if (error) toast.error(userMessage ?? error);
      else {
        toast.success('Timesheet submitted for review.');
        router.refresh();
      }
    });
  };

  const runPolicyScan = () => {
    const ctx = JSON.stringify({
      study: period.studies?.title,
      week: `${period.week_start_date}–${period.week_end_date}`,
      lines: rows,
    });
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

  const suggestHours = (row: EntryRow) => {
    const act = activityTypes.find((a) => a.id === row.activity_type_id);
    startTransition(async () => {
      const res = await fetch('/api/ai/timesheet-suggest-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workDate: row.work_date,
          activityLabel: act?.label ?? 'Activity',
          studyTitle: period.studies?.title ?? 'Study',
          recentSameContext: [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Suggestion failed.');
        return;
      }
      const h = Number(data.suggestedHours);
      toast.message(`Suggested ${h}h — apply?`, {
        action: { label: 'Apply', onClick: () => updateRow(row.id, { hours: h }) },
        duration: 8000,
      });
    });
  };

  const dayTotals = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.work_date] = (acc[r.work_date] ?? 0) + Number(r.hours);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" className="text-xs h-8 -ml-2" asChild>
            <Link href="/protected/time-expenses/timesheets">← Back</Link>
          </Button>
          <h2 className="text-lg font-semibold">{period.studies?.title ?? 'Study'}</h2>
          <p className="text-xs text-muted-foreground">
            Week {period.week_start_date} → {period.week_end_date}
          </p>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {TIME_EXPENSE_STATUS_LABEL[period.status as keyof typeof TIME_EXPENSE_STATUS_LABEL] ?? period.status}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total hours</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-lg font-semibold">
            {period.total_hours != null ? Number(period.total_hours).toFixed(2) : '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Billable</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-lg font-semibold">
            {period.billable_hours != null ? Number(period.billable_hours).toFixed(2) : '—'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overtime (est.)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-lg font-semibold">
            {period.overtime_hours != null ? Number(period.overtime_hours).toFixed(2) : '—'}
          </CardContent>
        </Card>
      </div>

      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" className="text-xs h-8" onClick={addRow} disabled={pending}>
            Add line
          </Button>
          <Button type="button" size="sm" className="text-xs h-8" variant="default" onClick={onSubmit} disabled={pending}>
            Submit for review
          </Button>
          <Button type="button" size="sm" variant="outline" className="text-xs h-8" disabled={pending} onClick={runPolicyScan}>
            AI: policy check
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time lines</CardTitle>
          <p className="text-xs text-muted-foreground">
            Changes save automatically after you pause typing. Version {version}.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[120px]">Date</TableHead>
                <TableHead className="text-xs min-w-[140px]">Activity</TableHead>
                <TableHead className="text-xs w-[90px]">Hours</TableHead>
                <TableHead className="text-xs w-[80px]">Billable</TableHead>
                <TableHead className="text-xs min-w-[140px]">Site</TableHead>
                <TableHead className="text-xs text-right w-[70px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-xs text-muted-foreground text-center py-8">
                    No lines yet. {editable ? 'Click Add line.' : ''}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs align-top">
                      <Input
                        type="date"
                        className="text-xs h-8"
                        value={r.work_date}
                        disabled={!editable}
                        onChange={(e) => updateRow(r.id, { work_date: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-xs align-top">
                      <Select
                        value={r.activity_type_id}
                        disabled={!editable}
                        items={activitySelectItems}
                        onValueChange={(v) => updateRow(r.id, { activity_type_id: v })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select Activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {activityTypes.map((a) => (
                            <SelectItem key={a.id} value={a.id} className="text-xs">
                              {a.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs align-top space-y-1">
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        step={0.25}
                        className="text-xs h-8"
                        disabled={!editable}
                        value={r.hours}
                        onChange={(e) => updateRow(r.id, { hours: Number(e.target.value) || 0 })}
                      />
                      {editable && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-6 px-1"
                          disabled={pending}
                          onClick={() => suggestHours(r)}
                        >
                          AI suggest
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2 pt-1.5">
                        <Checkbox
                          checked={r.is_billable}
                          disabled={!editable}
                          onCheckedChange={(c) => updateRow(r.id, { is_billable: c === true })}
                        />
                      </div>
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

          {Object.keys(dayTotals).length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Hours by day</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(dayTotals)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([d, h]) => (
                    <Badge key={d} variant="outline" className="text-[10px] font-normal">
                      {d}: {h.toFixed(2)}h
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
