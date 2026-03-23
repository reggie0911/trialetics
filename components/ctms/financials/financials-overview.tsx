'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { FinancialSummary } from '@/lib/types/ctms';
import type { PortfolioMonthlySpendPoint, PortfolioStudyFinancialRow } from '@/lib/actions/financials';
import { FinancialsPortfolioCharts } from '@/components/ctms/financials/financials-portfolio-charts';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

interface FinancialsOverviewProps {
  studies: PortfolioStudyFinancialRow[];
  totals: FinancialSummary & { invoiceOpenAmount: number };
  monthlySpend: PortfolioMonthlySpendPoint[];
}

export function FinancialsOverview({ studies, totals, monthlySpend }: FinancialsOverviewProps) {
  const utilization = totals.totalBudget > 0
    ? ((totals.totalPaid / totals.totalBudget) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      <Card className="rounded-lg">
        <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
          {[
            { label: 'Total Budget', value: formatCurrency(totals.totalBudget, totals.currency), markerColor: null as string | null },
            { label: 'Total Paid', value: formatCurrency(totals.totalPaid, totals.currency), markerColor: 'bg-emerald-500' },
            { label: 'Pending', value: formatCurrency(totals.totalPending, totals.currency), markerColor: 'bg-amber-500' },
            {
              label: 'Open invoices',
              value: formatCurrency(totals.invoiceOpenAmount, totals.currency),
              markerColor: 'bg-violet-500',
            },
            { label: 'Utilization', value: `${utilization}%`, markerColor: 'bg-blue-500' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              {item.markerColor && (
                <span className={`h-2 w-4 shrink-0 rounded-full ${item.markerColor}`} aria-hidden />
              )}
              <span>
                {item.label} ({item.value})
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <FinancialsPortfolioCharts studies={studies} monthlySpend={monthlySpend} currency={totals.currency} />

      <Card>
        <CardHeader>
          <CardTitle>Budget by Study</CardTitle>
        </CardHeader>
        <CardContent>
          {studies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No financial data</p>
              <p className="text-xs text-muted-foreground mt-1">Create budgets and record payments within study detail pages.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Study</TableHead>
                    <TableHead className="text-xs text-right">Budget</TableHead>
                    <TableHead className="text-xs text-right">Paid</TableHead>
                    <TableHead className="text-xs text-right">Pending</TableHead>
                    <TableHead className="text-xs text-right">Open inv.</TableHead>
                    <TableHead className="text-xs text-right">Remaining</TableHead>
                    <TableHead className="text-xs text-right">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studies.map((study) => {
                    const remaining = study.totalBudget - study.totalPaid;
                    const util = study.totalBudget > 0
                      ? ((study.totalPaid / study.totalBudget) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <TableRow key={study.id}>
                        <TableCell className="text-xs font-medium">
                          <Link href={`/protected/studies/${study.id}`} className="hover:underline">
                            {study.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(study.totalBudget, study.currency)}</TableCell>
                        <TableCell className="text-xs text-right text-green-700">{formatCurrency(study.totalPaid, study.currency)}</TableCell>
                        <TableCell className="text-xs text-right text-orange-600">{formatCurrency(study.totalPending, study.currency)}</TableCell>
                        <TableCell className="text-xs text-right text-violet-700">
                          {formatCurrency(study.invoiceOpenAmount, study.currency)}
                        </TableCell>
                        <TableCell className="text-xs text-right">{formatCurrency(remaining, study.currency)}</TableCell>
                        <TableCell className="text-xs text-right">
                          <Badge
                            variant={parseFloat(util) > 80 ? 'destructive' : parseFloat(util) > 50 ? 'outline' : 'secondary'}
                            className="text-xs"
                          >
                            {util}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell className="text-xs">Portfolio Total</TableCell>
                    <TableCell className="text-xs text-right">{formatCurrency(totals.totalBudget, totals.currency)}</TableCell>
                    <TableCell className="text-xs text-right text-green-700">{formatCurrency(totals.totalPaid, totals.currency)}</TableCell>
                    <TableCell className="text-xs text-right text-orange-600">{formatCurrency(totals.totalPending, totals.currency)}</TableCell>
                    <TableCell className="text-xs text-right text-violet-700">
                      {formatCurrency(totals.invoiceOpenAmount, totals.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-right">{formatCurrency(totals.totalBudget - totals.totalPaid, totals.currency)}</TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="outline" className="text-xs">{utilization}%</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
