'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  enqueueFinanceExportJob,
  type FinanceModuleCsvKind,
  type FinanceReportSummary,
} from '@/lib/actions/study-finance-module';

interface ReportsPopularTableProps {
  studyId: string;
  rows: FinanceReportSummary[];
}

const FREQUENCY_LABELS: Record<FinanceReportSummary['frequency'], string> = {
  on_demand: 'On Demand',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

const REPORT_CSV_KIND: Record<string, FinanceModuleCsvKind> = {
  'budget-variance': 'budget',
  'spend-by-category': 'budget',
  'site-payment-status': 'budget',
  'vendor-spend-summary': 'vendors',
  'invoice-aging': 'invoices',
  'po-utilization': 'budget',
  'forecast-variance': 'budget',
};

export function ReportsPopularTable({ studyId, rows }: ReportsPopularTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runExport = useCallback(
    (reportId: string, label: string) => {
      const kind = REPORT_CSV_KIND[reportId] ?? 'budget';
      startTransition(async () => {
        const { error } = await enqueueFinanceExportJob({ studyId, kind });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success(`${label} export queued.`);
        router.refresh();
      });
    },
    [router, studyId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Popular Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-8" />
              <TableHead className="text-xs">Report Name</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Frequency</TableHead>
              <TableHead className="text-xs">Last Run</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Star
                    className={`size-3.5 ${
                      row.isFavorite
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-muted-foreground'
                    }`}
                    aria-label={row.isFavorite ? 'Favorite' : 'Not favorite'}
                  />
                </TableCell>
                <TableCell className="text-xs font-medium">{row.name}</TableCell>
                <TableCell className="text-xs">
                  <Badge variant="secondary">{row.category}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                  {row.description}
                </TableCell>
                <TableCell className="text-xs">{FREQUENCY_LABELS[row.frequency]}</TableCell>
                <TableCell className="text-xs">{row.lastRunAt ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      disabled={pending}
                      onClick={() => runExport(row.id, row.name)}
                    >
                      Run
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      disabled={pending}
                      onClick={() => runExport(row.id, row.name)}
                    >
                      Export
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
