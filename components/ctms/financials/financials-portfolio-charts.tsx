'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PortfolioMonthlySpendPoint, PortfolioStudyFinancialRow } from '@/lib/actions/financials';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

interface FinancialsPortfolioChartsProps {
  studies: PortfolioStudyFinancialRow[];
  monthlySpend: PortfolioMonthlySpendPoint[];
  currency: string;
}

export function FinancialsPortfolioCharts({ studies, monthlySpend, currency }: FinancialsPortfolioChartsProps) {
  const byStudy = studies.map((s) => ({
    name: s.title.length > 24 ? `${s.title.slice(0, 22)}…` : s.title,
    budget: s.totalBudget,
    paid: s.totalPaid,
    open: s.invoiceOpenAmount,
  }));

  const monthly = monthlySpend.map((m) => ({
    month: m.month,
    paid: m.amount,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spending by study</CardTitle>
          <p className="text-xs text-muted-foreground">
            Budget, paid (legacy site payments), and open invoice totals per study.
          </p>
        </CardHeader>
        <CardContent className="h-[320px]">
          {byStudy.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No study rows to chart yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStudy} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={70} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(Number(v), currency)} width={72} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="budget" name="Budget" fill="hsl(var(--muted-foreground) / 0.35)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Paid" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="open" name="Open invoices" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recorded payments by month</CardTitle>
          <p className="text-xs text-muted-foreground">
            From Financials payment records (finance_payments, status paid).
          </p>
        </CardHeader>
        <CardContent className="h-[320px]">
          {monthly.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No payment history to chart yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(Number(v), currency)} width={72} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0), currency)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="paid" name="Paid" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
