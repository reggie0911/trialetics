'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { FinanceInvoiceEntityType, FinanceInvoiceWithRelations, StudySite } from '@/lib/types/ctms';
import { FINANCE_INVOICE_STATUS_LABEL } from '@/lib/types/ctms';
import {
  createFinanceInvoiceDraft,
  submitFinanceInvoice,
  financeInvoiceRecordDecisionRpc,
  recordFinancePaymentForInvoice,
} from '@/lib/actions/finance-invoices';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function statusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'paid' || status === 'approved') return 'default';
  if (status === 'rejected') return 'destructive';
  if (status === 'under_review' || status === 'submitted') return 'secondary';
  return 'outline';
}

interface FinanceInvoicesSectionProps {
  studyId: string;
  invoices: FinanceInvoiceWithRelations[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  onChanged: () => void;
}

export function FinanceInvoicesSection({ studyId, invoices, sites, onChanged }: FinanceInvoicesSectionProps) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<FinanceInvoiceEntityType>('site');
  const [siteId, setSiteId] = useState<string>('');
  const [externalId, setExternalId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = () => {
    const n = parseFloat(amount);
    if (!externalId.trim() || Number.isNaN(n) || n <= 0) {
      toast.error('Enter a valid invoice number and amount.');
      return;
    }
    startTransition(async () => {
      const { error, data } = await createFinanceInvoiceDraft({
        studyId,
        entityType,
        siteId: entityType === 'site' && siteId ? siteId : null,
        externalInvoiceId: externalId.trim(),
        amount: n,
        dueAt: dueAt || null,
        notes: notes.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Invoice draft saved.');
      setOpen(false);
      setExternalId('');
      setAmount('');
      setDueAt('');
      setNotes('');
      onChanged();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Invoices (Financials)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Submit for approval, then record payment when ready. Labels below are for your team, not database fields.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" className="text-xs inline-flex items-center gap-1" />}>
            <Plus className="h-3.5 w-3.5" />
            New invoice
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">New invoice draft</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Who is billing?</Label>
                <Select value={entityType} onValueChange={(v) => setEntityType(v as FinanceInvoiceEntityType)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site" className="text-xs">Site</SelectItem>
                    <SelectItem value="vendor" className="text-xs">Vendor</SelectItem>
                    <SelectItem value="irb" className="text-xs">IRB / ethics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {entityType === 'site' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Site</Label>
                  <Select value={siteId || undefined} onValueChange={setSiteId}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Choose site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.site_number} — {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice number (from vendor or site)</Label>
                <Input className="text-xs h-9" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount</Label>
                <Input className="text-xs h-9" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Due date (optional)</Label>
                <Input className="text-xs h-9" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea className="text-xs min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" className="text-xs" onClick={handleCreate}>
                Save draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet for this study.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Invoice #</TableHead>
                  <TableHead className="text-xs">Payee</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const payee =
                    inv.entity_type === 'site'
                      ? inv.study_sites
                        ? `${inv.study_sites.site_number} — ${inv.study_sites.name}`
                        : 'Site'
                      : inv.entity_type === 'vendor'
                        ? inv.institutions?.name ?? 'Vendor'
                        : inv.institutions?.name ?? 'IRB / ethics';
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs font-medium">{inv.external_invoice_id}</TableCell>
                      <TableCell className="text-xs">{payee}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={statusVariant(inv.status)} className="text-[10px]">
                          {FINANCE_INVOICE_STATUS_LABEL[inv.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right space-x-1">
                        {inv.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-[10px] h-7 px-2"
                            onClick={() => {
                              startTransition(async () => {
                                const { error } = await submitFinanceInvoice(inv.id, studyId);
                                if (error) toast.error(error);
                                else {
                                  toast.success('Submitted for approval.');
                                  onChanged();
                                }
                              });
                            }}
                          >
                            Submit
                          </Button>
                        )}
                        {(inv.status === 'submitted' || inv.status === 'under_review') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 px-2"
                              onClick={() => {
                                startTransition(async () => {
                                  const { error, userMessage } = await financeInvoiceRecordDecisionRpc(
                                    inv.id,
                                    studyId,
                                    'approved',
                                    ''
                                  );
                                  if (error) toast.error(userMessage ?? error);
                                  else {
                                    toast.success('Recorded approval step.');
                                    onChanged();
                                  }
                                });
                              }}
                            >
                              Approve step
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[10px] h-7 px-2 text-destructive"
                              onClick={() => {
                                const reason = window.prompt('Reason for rejection (shown to your team):') ?? '';
                                startTransition(async () => {
                                  const { error, userMessage } = await financeInvoiceRecordDecisionRpc(
                                    inv.id,
                                    studyId,
                                    'rejected',
                                    reason
                                  );
                                  if (error) toast.error(userMessage ?? error);
                                  else {
                                    toast.success('Invoice rejected.');
                                    onChanged();
                                  }
                                });
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {inv.status === 'approved' && (
                          <Button
                            size="sm"
                            className="text-[10px] h-7 px-2"
                            onClick={() => {
                              startTransition(async () => {
                                const { error } = await recordFinancePaymentForInvoice({
                                  studyId,
                                  invoiceId: inv.id,
                                  amount: inv.amount,
                                  currency: inv.currency,
                                });
                                if (error) toast.error(error);
                                else {
                                  toast.success('Payment recorded; invoice marked paid.');
                                  onChanged();
                                }
                              });
                            }}
                          >
                            Mark paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          <Link href="/protected/financials/approvals" className="underline hover:text-foreground">
            Open approval queue
          </Link>{' '}
          for all studies.
        </p>
      </CardContent>
    </Card>
  );
}
