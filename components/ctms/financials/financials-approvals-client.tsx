'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FinanceInvoiceWithRelations } from '@/lib/types/ctms';
import { FINANCE_INVOICE_STATUS_LABEL } from '@/lib/types/ctms';
import { financeInvoiceRecordDecisionRpc, listCompanyFinanceInvoicesForQueue } from '@/lib/actions/finance-invoices';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

interface FinancialsApprovalsClientProps {
  initialInvoices: FinanceInvoiceWithRelations[];
}

export function FinancialsApprovalsClient({ initialInvoices }: FinancialsApprovalsClientProps) {
  const [rows, setRows] = useState(initialInvoices);
  const [, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      try {
        const next = await listCompanyFinanceInvoicesForQueue();
        setRows(next);
      } catch {
        toast.error('Could not refresh queue.');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending review</CardTitle>
        <p className="text-xs text-muted-foreground">
          Approve or reject using your study role. Comments are stored for your organization.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No invoices waiting for approval.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Study</TableHead>
                  <TableHead className="text-xs">Invoice #</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Comment</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((inv) => (
                  <ApprovalRow key={inv.id} inv={inv} onDone={refresh} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApprovalRow({
  inv,
  onDone,
}: {
  inv: FinanceInvoiceWithRelations;
  onDone: () => void;
}) {
  const [comment, setComment] = useState('');
  const [, startTransition] = useTransition();
  const studyTitle = inv.studies?.title ?? 'Study';

  return (
    <TableRow>
      <TableCell className="text-xs">
        <Link href={`/protected/studies/${inv.study_id}`} className="font-medium hover:underline">
          {studyTitle}
        </Link>
      </TableCell>
      <TableCell className="text-xs">{inv.external_invoice_id}</TableCell>
      <TableCell className="text-xs text-right">{formatCurrency(inv.amount, inv.currency)}</TableCell>
      <TableCell className="text-xs">
        <Badge variant="secondary" className="text-[10px]">
          {FINANCE_INVOICE_STATUS_LABEL[inv.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-xs max-w-[200px]">
        <Textarea
          className="text-xs min-h-[56px]"
          placeholder="Optional note for your team"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </TableCell>
      <TableCell className="text-xs text-right space-y-1">
        <Button
          size="sm"
          variant="secondary"
          className="text-[10px] h-7 px-2 w-full"
          onClick={() => {
            startTransition(async () => {
              const { error, userMessage } = await financeInvoiceRecordDecisionRpc(
                inv.id,
                inv.study_id,
                'approved',
                comment
              );
              if (error) toast.error(userMessage ?? error);
              else {
                toast.success('Approval recorded.');
                onDone();
              }
            });
          }}
        >
          Approve step
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[10px] h-7 px-2 w-full text-destructive border-destructive/40"
          onClick={() => {
            startTransition(async () => {
              const { error, userMessage } = await financeInvoiceRecordDecisionRpc(
                inv.id,
                inv.study_id,
                'rejected',
                comment
              );
              if (error) toast.error(userMessage ?? error);
              else {
                toast.success('Rejection recorded.');
                onDone();
              }
            });
          }}
        >
          Reject
        </Button>
      </TableCell>
    </TableRow>
  );
}
