'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinancialSummary, FinanceInvoiceWithRelations } from '@/lib/types/ctms';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

interface FinancialsStudyChartsProps {
  summary: FinancialSummary;
  financeInvoices: FinanceInvoiceWithRelations[];
  currency: string;
}

export function FinancialsStudyCharts({ summary, financeInvoices, currency }: FinancialsStudyChartsProps) {
  const openSum = financeInvoices
    .filter((i) => i.status !== 'paid' && i.status !== 'rejected')
    .reduce((s, i) => s + Number(i.amount), 0);

  const data = [
    { name: 'Study budget (total)', value: summary.totalBudget },
    { name: 'Paid (legacy)', value: summary.totalPaid },
    { name: 'Open invoices', value: openSum },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budget vs paid vs open invoices</CardTitle>
        <p className="text-xs text-muted-foreground">
          Open invoices include draft through approved (not yet marked paid in Financials).
        </p>
      </CardHeader>
      <CardContent className="h-[260px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(Number(v), currency)} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" name="Amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
