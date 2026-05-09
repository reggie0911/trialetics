'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';

import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinanceDashboardCategoryRow } from '@/lib/actions/study-finance-module';
import { classifyBudgetUtilization, formatCompactCurrency } from '@/lib/finance-module/calculations';
import {
  FM_BUDGET_UTILIZATION_LABELS,
  buildFinanceModulePath,
  type FmBudgetUtilizationBand,
} from '@/lib/finance-module/types';

interface StudyFinancialHealthTableProps {
  studyId: string;
  rows: FinanceDashboardCategoryRow[];
  baseCurrency: string;
}

const VARIANT_BY_BAND: Record<FmBudgetUtilizationBand, 'success' | 'warning' | 'destructive'> = {
  on_track: 'success',
  at_risk: 'warning',
  over_budget: 'destructive',
};

export function StudyFinancialHealthTable({ studyId, rows, baseCurrency }: StudyFinancialHealthTableProps) {
  const budgetHref = buildFinanceModulePath(studyId, 'budget');

  const columns = useMemo<ColumnDef<FinanceDashboardCategoryRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Category',
        cell: ({ row }) => {
          const href = `${budgetHref}#fm-budget-tracker-cat-${row.original.categoryId}`;
          return (
            <Link href={href} className="text-xs text-primary underline-offset-2 hover:underline" scroll={true}>
              {row.original.name}
            </Link>
          );
        },
      },
      {
        accessorKey: 'approved',
        header: () => <span className="block text-right">Approved</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCompactCurrency(row.original.approved, baseCurrency)}
          </div>
        ),
      },
      {
        accessorKey: 'actual',
        header: () => <span className="block text-right">Actual</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCompactCurrency(row.original.actual, baseCurrency)}
          </div>
        ),
      },
      {
        id: 'util',
        header: () => <span className="block text-right">Utilization</span>,
        cell: ({ row }) => {
          const utilizationPct =
            row.original.approved > 0 ? (row.original.actual / row.original.approved) * 100 : 0;
          return <div className="text-right text-xs tabular-nums">{utilizationPct.toFixed(0)}%</div>;
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const band = classifyBudgetUtilization(row.original.actual, row.original.approved);
          return (
            <Badge variant={VARIANT_BY_BAND[band]} className="text-[10px]">
              {FM_BUDGET_UTILIZATION_LABELS[band]}
            </Badge>
          );
        },
      },
    ],
    [baseCurrency, budgetHref],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Study Financial Health</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add budget categories to monitor study financial health.
          </p>
        ) : (
          <FinanceDataTable
            urlPrefix="fmt_dash_health"
            columns={columns}
            data={rows}
            getRowId={(r) => r.categoryId}
          />
        )}
      </CardContent>
    </Card>
  );
}
