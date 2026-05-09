'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ForecastScenarioRow } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';

interface ScenarioComparisonTableProps {
  rows: ForecastScenarioRow[];
  baseCurrency: string;
}

const PROBABILITY_VARIANT: Record<ForecastScenarioRow['overrunProbability'], 'success' | 'warning' | 'destructive'> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
};

const PROBABILITY_LABEL: Record<ForecastScenarioRow['overrunProbability'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function ScenarioComparisonTable({ rows, baseCurrency }: ScenarioComparisonTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Scenario Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Scenario</TableHead>
              <TableHead className="text-xs text-right">Projected Spend</TableHead>
              <TableHead className="text-xs text-right">Variance</TableHead>
              <TableHead className="text-xs">Overrun Probability</TableHead>
              <TableHead className="text-xs">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs font-medium">
                  {row.name}
                  {row.isBaseline ? (
                    <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(baseline)</span>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs text-right">
                  {formatCompactCurrency(row.projectedSpend, baseCurrency)}
                </TableCell>
                <TableCell
                  className={`text-xs text-right ${
                    row.variance > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {row.variance > 0 ? '+' : ''}
                  {formatCompactCurrency(row.variance, baseCurrency)}
                </TableCell>
                <TableCell>
                  <Badge variant={PROBABILITY_VARIANT[row.overrunProbability]}>
                    {PROBABILITY_LABEL[row.overrunProbability]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(100, Math.max(0, row.confidencePct))}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {row.confidencePct.toFixed(0)}%
                    </span>
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
