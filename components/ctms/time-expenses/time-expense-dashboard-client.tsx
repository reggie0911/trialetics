'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Study } from '@/lib/types/ctms';
import { getTimeExpenseDashboardData } from '@/lib/actions/time-expense-dashboard';
import type { TimeExpenseDashboardFilters } from '@/lib/types/time-expense';
import { exportTimeExpenseDashboardPdf, exportTimeExpenseDashboardXlsx } from '@/lib/actions/time-expense-export';

const STATUS_OPTIONS = [
  { value: '__all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

type DashboardState = Awaited<ReturnType<typeof getTimeExpenseDashboardData>>;

export function TimeExpenseDashboardClient({
  initialData,
  studies,
  initialFilters,
}: {
  initialData: DashboardState;
  studies: Pick<Study, 'id' | 'title' | 'protocol_number'>[];
  initialFilters: TimeExpenseDashboardFilters;
}) {
  const [data, setData] = useState(initialData);
  const [showTable, setShowTable] = useState(false);
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState(initialFilters);

  const pipelineChartData = useMemo(
    () =>
      data.pipeline.map((p) => ({
        name: p.status.replace(/_/g, ' '),
        timesheets: p.timesheets,
        expenses: p.expenses,
      })),
    [data.pipeline],
  );

  /** Base UI resolves trigger labels from `items` while the list portal is closed. */
  const studyFilterItems = useMemo(
    () => [
      { value: '__all', label: 'All Studies' },
      ...studies.map((s) => ({ value: s.id, label: s.title })),
    ],
    [studies],
  );

  const statusFilterItems = useMemo(
    () => STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  const refresh = () => {
    startTransition(async () => {
      try {
        const next = await getTimeExpenseDashboardData(filters);
        setData(next);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not load dashboard.');
      }
    });
  };

  const downloadB64 = (b64: string, mime: string, filename: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onExport = () => {
    startTransition(async () => {
      try {
        const b64 = await exportTimeExpenseDashboardXlsx(filters);
        downloadB64(
          b64,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          `time-expense-${filters.dateFrom}-${filters.dateTo}.xlsx`,
        );
        toast.success('Export downloaded.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Export failed.');
      }
    });
  };

  const onExportPdf = () => {
    startTransition(async () => {
      try {
        const b64 = await exportTimeExpenseDashboardPdf(filters);
        downloadB64(b64, 'application/pdf', `time-expense-${filters.dateFrom}-${filters.dateTo}.pdf`);
        toast.success('PDF downloaded.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'PDF export failed.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <p className="text-xs text-muted-foreground">
            Charts use timesheet line dates and expense line dates in this range. Optional filters narrow linked periods and
            reports.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="text-xs h-9"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="text-xs h-9"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Study</Label>
            <Select
              value={filters.studyId ?? '__all'}
              items={studyFilterItems}
              onValueChange={(v) => setFilters((f) => ({ ...f, studyId: v === '__all' ? null : v }))}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Studies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all" className="text-xs">
                  All Studies
                </SelectItem>
                {studies.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Line Status (Linked Period or Report)</Label>
            <Select
              value={filters.status ?? '__all'}
              items={statusFilterItems}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === '__all' ? null : v }))}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="button" size="sm" className="text-xs h-8" disabled={pending} onClick={refresh}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-xs h-8" disabled={pending} onClick={onExport}>
              Export Excel
            </Button>
            <Button type="button" size="sm" variant="outline" className="text-xs h-8" disabled={pending} onClick={onExportPdf}>
              Export PDF
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-xs h-8"
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? 'Hide' : 'View'} summary table
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground" role="status">
        {data.summaryText}
        {data.currenciesPresent.length > 1 ? (
          <span className="block mt-1 text-xs">
            Expense amounts are labeled by currency; mixed-currency totals are not merged.
          </span>
        ) : null}
      </p>

      {showTable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary table</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Series</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.hoursOverTime.map((r) => (
                  <TableRow key={`h-${r.bucket}`}>
                    <TableCell className="text-xs">Hours by month</TableCell>
                    <TableCell className="text-xs">{r.bucket}</TableCell>
                    <TableCell className="text-xs text-right">{r.hours.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {data.hoursByStudy.map((r) => (
                  <TableRow key={`hs-${r.name}`}>
                    <TableCell className="text-xs">Hours by study</TableCell>
                    <TableCell className="text-xs">{r.name}</TableCell>
                    <TableCell className="text-xs text-right">{r.value.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {data.expensesByCategory.map((r) => (
                  <TableRow key={`c-${r.name}`}>
                    <TableCell className="text-xs">Expense by category</TableCell>
                    <TableCell className="text-xs">{r.name}</TableCell>
                    <TableCell className="text-xs text-right">{r.value.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Hours over time (by month)" description="Sum of timesheet line hours">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.hoursOverTime} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="hours" name="Hours" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Billable vs non-billable hours" description="Within filtered lines">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: 'Billable', hours: data.billableVsNon.billable },
                { name: 'Non-billable', hours: data.billableVsNon.nonBillable },
              ]}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hours by study" description="Filtered timesheet lines">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data.hoursByStudy} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Hours by activity" description="Activity type labels">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.hoursByActivity} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Hours" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expenses by category" description="Labeled with currency prefix">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data.expensesByCategory} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expenses by study" description="Labeled with currency prefix">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={data.expensesByStudy} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 9 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Submission pipeline" description="Counts by period/report status in your organization" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineChartData} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={56} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="timesheets" fill="hsl(var(--primary))" name="Timesheets" />
              <Bar dataKey="expenses" fill="hsl(var(--muted-foreground) / 0.35)" name="Expense reports" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {data.hoursOverTime.length === 0 && data.expensesByCategory.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No data in this range for the selected filters.</p>
      )}
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="h-[260px]">{children}</CardContent>
    </Card>
  );
}

