'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type {
  FinanceInvoiceWithRelations,
  PaymentScheduleWithSite,
  SiteBudgetRow,
  SiteNegotiationStatus,
  SitePaymentTermsType,
} from '@/lib/types/ctms';
import { FINANCE_INVOICE_STATUS_LABEL } from '@/lib/types/ctms';
import { upsertSiteBudget } from '@/lib/actions/finance-site-budgets';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

const NEGOTIATION_LABEL: Record<SiteNegotiationStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
};

interface SiteFinancialsPanelProps {
  studyId: string;
  siteId: string;
  siteBudget: SiteBudgetRow | null;
  invoices: FinanceInvoiceWithRelations[];
  schedules: PaymentScheduleWithSite[];
}

export function SiteFinancialsPanel({
  studyId,
  siteId,
  siteBudget,
  invoices,
  schedules,
}: SiteFinancialsPanelProps) {
  const [proposed, setProposed] = useState(siteBudget ? String(siteBudget.proposed_amount) : '');
  const [approvedAmt, setApprovedAmt] = useState(
    siteBudget?.approved_amount != null ? String(siteBudget.approved_amount) : ''
  );
  const [negotiation, setNegotiation] = useState<SiteNegotiationStatus>(siteBudget?.negotiation_status ?? 'draft');
  const [terms, setTerms] = useState<SitePaymentTermsType>(siteBudget?.payment_terms_type ?? 'invoice');
  const [notes, setNotes] = useState(siteBudget?.notes ?? '');
  const [, startTransition] = useTransition();

  const openInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'rejected');
  const openSum = openInvoices.reduce((s, i) => s + Number(i.amount), 0);

  const saveBudget = () => {
    const p = parseFloat(proposed);
    if (Number.isNaN(p) || p < 0) {
      toast.error('Enter a valid proposed budget.');
      return;
    }
    const a = approvedAmt.trim() === '' ? null : parseFloat(approvedAmt);
    if (approvedAmt.trim() !== '' && (Number.isNaN(a!) || a! < 0)) {
      toast.error('Approved budget must be a valid number or empty.');
      return;
    }
    startTransition(async () => {
      const { error } = await upsertSiteBudget({
        studyId,
        siteId,
        proposedAmount: p,
        approvedAmount: a,
        negotiationStatus: negotiation,
        paymentTermsType: terms,
        notes: notes.trim() || null,
      });
      if (error) toast.error(error);
      else toast.success('Site budget saved.');
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-md border px-3 py-2 bg-muted/30">
          <span className="text-muted-foreground">Open invoices (this site): </span>
          <span className="font-medium">{formatCurrency(openSum)}</span>
        </div>
        <Button variant="link" size="sm" className="text-xs h-auto p-0" asChild>
          <Link href={`/protected/studies/${studyId}`}>View study Financials tab</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Site budget and negotiation</CardTitle>
          <p className="text-xs text-muted-foreground">
            Proposed vs approved figures for this site. Wording here is for your team only.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Proposed budget</Label>
              <Input className="text-xs h-9" value={proposed} onChange={(e) => setProposed(e.target.value)} type="number" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Approved budget (optional)</Label>
              <Input className="text-xs h-9" value={approvedAmt} onChange={(e) => setApprovedAmt(e.target.value)} type="number" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Negotiation status</Label>
              <Select value={negotiation} onValueChange={(v) => setNegotiation(v as SiteNegotiationStatus)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(NEGOTIATION_LABEL) as SiteNegotiationStatus[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {NEGOTIATION_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">How you expect to pay</Label>
              <Select value={terms} onValueChange={(v) => setTerms(v as SitePaymentTermsType)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice" className="text-xs">By invoice</SelectItem>
                  <SelectItem value="per_visit" className="text-xs">Per visit</SelectItem>
                  <SelectItem value="milestone" className="text-xs">Milestones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="button" size="sm" className="text-xs" onClick={saveBudget}>
            Save site budget
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices for this site</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices linked to this site yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-xs">{inv.external_invoice_id}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                      <TableCell className="text-xs">{FINANCE_INVOICE_STATUS_LABEL[inv.status]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment schedule (milestones)</CardTitle>
          <p className="text-xs text-muted-foreground">From the study payment schedule for this site.</p>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No milestone rows for this site.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Milestone</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Due</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.milestone_name}</TableCell>
                      <TableCell className="text-xs text-right">{formatCurrency(s.amount, s.currency)}</TableCell>
                      <TableCell className="text-xs">{s.due_date ?? '—'}</TableCell>
                      <TableCell className="text-xs capitalize">{s.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
