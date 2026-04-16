'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

import type { FinancialSummary } from '@/lib/types/ctms';
import type { PortfolioMonthlySpendPoint, PortfolioStudyFinancialRow } from '@/lib/actions/financials';
import { FinancialsPortfolioCharts } from '@/components/ctms/financials/financials-portfolio-charts';

const ALL_STUDIES = '__all__';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

interface FinancialsOverviewProps {
  studies: PortfolioStudyFinancialRow[];
  totals: FinancialSummary & { invoiceOpenAmount: number };
  monthlySpend: PortfolioMonthlySpendPoint[];
  monthlySpendByStudyId: Record<string, PortfolioMonthlySpendPoint[]>;
  /** When set, the overview is locked to this study (no study picker). */
  lockToStudyId?: string;
}

export function FinancialsOverview({
  studies,
  totals,
  monthlySpend,
  monthlySpendByStudyId,
  lockToStudyId,
}: FinancialsOverviewProps) {
  const [selectedStudyId, setSelectedStudyId] = useState<string>(
    lockToStudyId ?? ALL_STUDIES
  );

  const sortedStudies = useMemo(
    () => [...studies].sort((a, b) => a.title.localeCompare(b.title)),
    [studies],
  );

  const filteredStudies = useMemo(() => {
    if (selectedStudyId === ALL_STUDIES) return sortedStudies;
    return sortedStudies.filter((s) => s.id === selectedStudyId);
  }, [sortedStudies, selectedStudyId]);

  const displayTotals = useMemo(() => {
    if (selectedStudyId === ALL_STUDIES) return totals;
    const st = sortedStudies.find((s) => s.id === selectedStudyId);
    if (!st) return totals;
    return {
      totalBudget: st.totalBudget,
      totalPaid: st.totalPaid,
      totalPending: st.totalPending,
      totalApproved: 0,
      currency: st.currency,
      invoiceOpenAmount: st.invoiceOpenAmount,
    };
  }, [selectedStudyId, sortedStudies, totals]);

  const displayMonthlySpend = useMemo(() => {
    if (selectedStudyId === ALL_STUDIES) return monthlySpend;
    return monthlySpendByStudyId[selectedStudyId] ?? [];
  }, [monthlySpend, monthlySpendByStudyId, selectedStudyId]);

  const utilization =
    displayTotals.totalBudget > 0
      ? ((displayTotals.totalPaid / displayTotals.totalBudget) * 100).toFixed(1)
      : '0.0';

  const totalsFooterLabel = selectedStudyId === ALL_STUDIES ? 'Portfolio total' : 'Study total';

  return (
    <div className="space-y-6">
      {sortedStudies.length > 0 && !lockToStudyId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5 w-full sm:max-w-xs">
            <Label htmlFor="financials-study-filter" className="text-xs">
              Study
            </Label>
            <Select value={selectedStudyId} onValueChange={setSelectedStudyId}>
              <SelectTrigger id="financials-study-filter" className="text-xs h-9 w-full sm:w-[280px]">
                <SelectValue
                  getDisplayLabel={(v) => {
                    if (v === ALL_STUDIES) return 'All studies';
                    return sortedStudies.find((s) => s.id === v)?.title ?? null;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STUDIES} className="text-xs">
                  All studies
                </SelectItem>
                {sortedStudies.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Card className="rounded-lg">
        <CardContent className="flex flex-wrap items-center gap-4 md:gap-6 py-4">
          {[
            {
              label: 'Total budget',
              value: formatCurrency(displayTotals.totalBudget, displayTotals.currency),
              markerColor: null as string | null,
            },
            {
              label: 'Total paid',
              value: formatCurrency(displayTotals.totalPaid, displayTotals.currency),
              markerColor: 'bg-emerald-500',
            },
            {
              label: 'Pending',
              value: formatCurrency(displayTotals.totalPending, displayTotals.currency),
              markerColor: 'bg-amber-500',
            },
            {
              label: 'Open invoices',
              value: formatCurrency(displayTotals.invoiceOpenAmount, displayTotals.currency),
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

      <FinancialsPortfolioCharts
        studies={filteredStudies}
        monthlySpend={displayMonthlySpend}
        currency={displayTotals.currency}
      />

      <Card>
        <CardHeader>
          <CardTitle>Budget by study</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStudies.length === 0 ? (
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
                    <TableHead className="text-xs text-right w-[1%] whitespace-nowrap">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudies.map((study) => {
                    const remaining = study.totalBudget - study.totalPaid;
                    const util =
                      study.totalBudget > 0
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
                            variant={
                              parseFloat(util) > 80 ? 'destructive' : parseFloat(util) > 50 ? 'outline' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {util}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right align-middle">
                          <Button variant="outline" size="xs" className="text-xs" asChild>
                            <Link href={`/protected/studies/${study.id}?tab=financials`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell className="text-xs">{totalsFooterLabel}</TableCell>
                    <TableCell className="text-xs text-right">
                      {formatCurrency(displayTotals.totalBudget, displayTotals.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-green-700">
                      {formatCurrency(displayTotals.totalPaid, displayTotals.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-orange-600">
                      {formatCurrency(displayTotals.totalPending, displayTotals.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-violet-700">
                      {formatCurrency(displayTotals.invoiceOpenAmount, displayTotals.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {formatCurrency(displayTotals.totalBudget - displayTotals.totalPaid, displayTotals.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <Badge variant="outline" className="text-xs">
                        {utilization}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right" aria-hidden>
                      {/* summary row: no per-study action */}
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
