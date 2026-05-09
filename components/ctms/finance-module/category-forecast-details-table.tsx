'use client';

import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ForecastCategoryRow } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface CategoryForecastDetailsTableProps {
  rows: ForecastCategoryRow[];
  baseCurrency: string;
}

function TrendIcon({ trend }: { trend: ForecastCategoryRow['trend'] }) {
  if (trend === 'up') {
    return <ArrowUp className="size-3.5 text-destructive" aria-label="Trending up" />;
  }
  if (trend === 'down') {
    return <ArrowDown className="size-3.5 text-emerald-600" aria-label="Trending down" />;
  }
  return <ArrowRight className="size-3.5 text-muted-foreground" aria-label="Flat" />;
}

export function CategoryForecastDetailsTable({ rows, baseCurrency }: CategoryForecastDetailsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Category Forecast Details</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No category-level forecast data yet. Activate a budget version with categories to enable.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Approved</TableHead>
                <TableHead className="text-xs text-right">Actual YTD</TableHead>
                <TableHead className="text-xs text-right">Forecasted</TableHead>
                <TableHead className="text-xs text-right">Total Projected</TableHead>
                <TableHead className="text-xs text-right">Variance</TableHead>
                <TableHead className="text-xs text-right">Variance %</TableHead>
                <TableHead className="text-xs text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.categoryId}>
                  <TableCell className="text-xs font-medium">{row.name}</TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(row.approved, baseCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(row.actualYtd, baseCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(row.forecasted, baseCurrency)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(row.totalProjected, baseCurrency)}
                  </TableCell>
                  <TableCell
                    className={`text-xs text-right ${
                      row.variance > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {row.variance > 0 ? '+' : ''}
                    {formatCompactCurrency(row.variance, baseCurrency)}
                  </TableCell>
                  <TableCell
                    className={`text-xs text-right ${
                      row.variancePct > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {row.variancePct > 0 ? '+' : ''}
                    {row.variancePct.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendIcon trend={row.trend} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
