'use client';

import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FinanceDashboardObligationRow } from '@/lib/actions/study-finance-module';
import { formatCurrency } from '@/lib/finance-module/calculations';
import { buildFinanceModulePath } from '@/lib/finance-module/types';

interface UpcomingPaymentObligationsProps {
  studyId: string;
  rows: FinanceDashboardObligationRow[];
}

const TYPE_LABELS: Record<FinanceDashboardObligationRow['type'], string> = {
  site_payment: 'Site Payment',
  vendor_payment: 'Vendor Payment',
};

export function UpcomingPaymentObligations({ studyId, rows }: UpcomingPaymentObligationsProps) {
  const invoicesRoot = `${buildFinanceModulePath(studyId, 'invoices')}`;
  const sitePayRoot = `${buildFinanceModulePath(studyId, 'site-payments')}`;

  const hrefFor = (row: FinanceDashboardObligationRow) => {
    if (row.type === 'site_payment') {
      return `${sitePayRoot}#fm-site-pay-${row.id}`;
    }
    return `${invoicesRoot}?invoice=${encodeURIComponent(row.id)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Upcoming Payment Obligations</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No upcoming payments are due for this study.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Due Date</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Payee</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{row.dueDate ?? '—'}</TableCell>
                  <TableCell className="text-xs">{TYPE_LABELS[row.type]}</TableCell>
                  <TableCell className="text-xs">
                    <Link
                      href={hrefFor(row)}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      scroll={row.type === 'site_payment'}
                    >
                      {row.payeeName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCurrency(row.amount, row.currency)}
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
