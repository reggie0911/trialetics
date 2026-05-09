import Link from 'next/link';

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
import { listFinanceInvoices, listFinanceVendors } from '@/lib/actions/study-finance-module';
import { formatCompactCurrency } from '@/lib/finance-module/calculations';
import {
  FM_INVOICE_APPROVAL_STATUS_LABELS,
  FM_INVOICE_PAYMENT_STATUS_LABELS,
  type FmInvoiceApprovalStatus,
  type FmInvoicePaymentStatus,
} from '@/lib/finance-module/types';

interface VendorRecentInvoicesProps {
  studyId: string;
  baseCurrency: string;
}

const APPROVAL_VARIANT: Record<FmInvoiceApprovalStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  draft: 'secondary',
  submitted: 'warning',
  under_review: 'info',
  approved: 'success',
  rejected: 'destructive',
  disputed: 'destructive',
};

const PAYMENT_VARIANT: Record<FmInvoicePaymentStatus, 'success' | 'warning' | 'destructive' | 'secondary' | 'info'> = {
  pending: 'secondary',
  paid: 'success',
  overdue: 'destructive',
  disputed: 'destructive',
  partial: 'warning',
};

export async function VendorRecentInvoices({ studyId, baseCurrency }: VendorRecentInvoicesProps) {
  const [{ data: invoices }, { data: vendors }] = await Promise.all([
    listFinanceInvoices(studyId),
    listFinanceVendors(studyId),
  ]);

  const vendorMap = new Map((vendors ?? []).map((v) => [v.id, v.name] as const));
  const recent = (invoices ?? [])
    .slice()
    .sort((a, b) => (b.invoice_date ?? '').localeCompare(a.invoice_date ?? ''))
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No vendor invoices yet.{' '}
            <Link
              href={`/protected/studies/${studyId}/finance-module/invoices`}
              className="underline hover:text-foreground"
            >
              Open Invoice Tracker
            </Link>
            .
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Invoice #</TableHead>
                <TableHead className="text-xs">Vendor</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs">Approval</TableHead>
                <TableHead className="text-xs">Payment</TableHead>
                <TableHead className="text-xs text-right whitespace-nowrap">Tracker</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-xs font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell className="text-xs">
                    {invoice.vendor_id ? vendorMap.get(invoice.vendor_id) ?? '—' : '—'}
                  </TableCell>
                  <TableCell className="text-xs">{invoice.invoice_date ?? '—'}</TableCell>
                  <TableCell className="text-xs text-right">
                    {formatCompactCurrency(Number(invoice.total_amount), invoice.currency || baseCurrency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={APPROVAL_VARIANT[invoice.approval_status]}>
                      {FM_INVOICE_APPROVAL_STATUS_LABELS[invoice.approval_status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={PAYMENT_VARIANT[invoice.payment_status]}>
                      {FM_INVOICE_PAYMENT_STATUS_LABELS[invoice.payment_status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/protected/studies/${studyId}/finance-module/invoices?invoice=${encodeURIComponent(invoice.id)}`}
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Open
                    </Link>
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
