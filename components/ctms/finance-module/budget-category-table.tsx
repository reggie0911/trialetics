'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';

import { FinanceDataTable } from '@/components/ctms/finance-module/_shared/finance-data-table';
import { FinanceRowActionsMenu, type FinanceRowActionItem } from '@/components/ctms/finance-module/_shared/row-actions-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BudgetTrackerCategoryRow } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';
import {
  FM_BUDGET_UTILIZATION_LABELS,
  buildFinanceModulePath,
  type FmBudgetUtilizationBand,
} from '@/lib/finance-module/types';

interface BudgetCategoryTableProps {
  studyId: string;
  rows: BudgetTrackerCategoryRow[];
  baseCurrency: string;
  /** When set, category drill-down preserves the selected budget version in the URL. */
  selectedVersionId?: string | null;
}

const VARIANT_BY_BAND: Record<FmBudgetUtilizationBand, 'success' | 'warning' | 'destructive'> = {
  on_track: 'success',
  at_risk: 'warning',
  over_budget: 'destructive',
};

export function BudgetCategoryTable({ studyId, rows, baseCurrency, selectedVersionId }: BudgetCategoryTableProps) {
  const router = useRouter();
  const budgetBase = buildFinanceModulePath(studyId, 'budget');
  const versionQuery =
    selectedVersionId != null && selectedVersionId !== ''
      ? `?version=${encodeURIComponent(selectedVersionId)}`
      : '';

  const rowActions = useCallback(
    (row: BudgetTrackerCategoryRow): FinanceRowActionItem[] => {
      const href = `${budgetBase}${versionQuery}#fm-budget-draft-cat-${row.categoryId}`;
      return [
        {
          id: 'planner',
          label: 'Open in draft planning',
          onSelect: () => {
            router.push(href, { scroll: true });
          },
        },
      ];
    },
    [budgetBase, versionQuery, router],
  );

  const columns = useMemo<ColumnDef<BudgetTrackerCategoryRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Budget Category',
        cell: ({ row }) => {
          const href = `${budgetBase}${versionQuery}#fm-budget-draft-cat-${row.original.categoryId}`;
          return (
            <Link
              href={href}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              scroll={true}
            >
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
        accessorKey: 'committed',
        header: () => <span className="block text-right">Committed</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCompactCurrency(row.original.committed, baseCurrency)}
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
        accessorKey: 'forecasted',
        header: () => <span className="block text-right">Forecasted</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCompactCurrency(row.original.forecasted, baseCurrency)}
          </div>
        ),
      },
      {
        accessorKey: 'remaining',
        header: () => <span className="block text-right">Remaining</span>,
        cell: ({ row }) => (
          <div className="text-right text-xs tabular-nums">
            {formatCompactCurrency(row.original.remaining, baseCurrency)}
          </div>
        ),
      },
      {
        id: 'util',
        header: 'Utilization',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={
                  row.original.status === 'over_budget'
                    ? 'h-full bg-destructive'
                    : row.original.status === 'at_risk'
                      ? 'h-full bg-amber-500'
                      : 'h-full bg-emerald-500'
                }
                style={{ width: `${Math.min(row.original.utilizationPct, 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {row.original.utilizationPct.toFixed(0)}%
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={VARIANT_BY_BAND[row.original.status]} className="text-[10px]">
            {FM_BUDGET_UTILIZATION_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <FinanceRowActionsMenu
            ariaLabel="Category actions"
            telemetryContext={{ studyId, tableKey: 'budget_categories', entityType: 'fm_budget_categories' }}
            items={rowActions(row.original)}
          />
        ),
      },
    ],
    [baseCurrency, budgetBase, versionQuery, rowActions, studyId],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Budget Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No category totals yet. Add categories in{' '}
            <Link
              href={`/protected/studies/${studyId}/finance-module/settings`}
              className="text-primary underline-offset-2 hover:underline"
            >
              Finance Settings
            </Link>
            , then create a draft version and line items in{' '}
            <strong>Draft budget planning</strong> at the top of this page.
          </p>
        ) : (
          <FinanceDataTable
            urlPrefix="fmt_budget_cat"
            columns={columns}
            data={rows}
            getRowId={(r) => r.categoryId}
            getRowDomId={(r) => `fm-budget-tracker-cat-${r.categoryId}`}
          />
        )}
      </CardContent>
    </Card>
  );
}
