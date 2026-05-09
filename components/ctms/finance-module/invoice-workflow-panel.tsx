'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { InvoiceApprovalWorkflowStepper } from '@/components/ctms/finance-module/invoice-approval-workflow-stepper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  approveInvoice,
  recordPayment,
  rejectInvoice,
  submitInvoiceForApproval,
  updateInvoiceLineItems,
} from '@/lib/actions/study-finance-module';
import type { FmBudgetCategory } from '@/lib/finance-module/types';
import type { FmInvoice, FmInvoiceLineItem } from '@/lib/finance-module/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const lineFormSchema = z.object({
  description: z.string().trim().min(1, 'Description required').max(500),
  quantity: z.coerce.number().positive(),
  unitAmount: z.coerce.number().nonnegative(),
  categoryId: z.union([z.literal(''), z.string().uuid()]).optional(),
});

type LineFormValues = z.infer<typeof lineFormSchema>;

interface InvoiceWorkflowPanelProps {
  studyId: string;
  invoice: FmInvoice | null;
  lineItems: FmInvoiceLineItem[];
  categories: FmBudgetCategory[];
}

export function InvoiceWorkflowPanel({
  studyId,
  invoice,
  lineItems: initialLineItems,
  categories,
}: InvoiceWorkflowPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const form = useForm<LineFormValues>({
    resolver: zodResolver(lineFormSchema),
    defaultValues: {
      description: '',
      quantity: 1,
      unitAmount: 0,
      categoryId: '',
    },
  });

  const paymentForm = useForm({
    defaultValues: {
      amount: '0',
      paymentDate: new Date().toISOString().slice(0, 10),
      reference: '',
    },
  });

  useEffect(() => {
    const li = initialLineItems[0];
    if (!invoice) {
      form.reset({ description: '', quantity: 1, unitAmount: 0, categoryId: '' });
      return;
    }
    form.reset({
      description: li?.description ?? `${invoice.invoice_number} — Line 1`,
      quantity: li ? Number(li.quantity) : 1,
      unitAmount: li ? Number(li.unit_amount) : Number(invoice.total_amount),
      categoryId: li?.category_id ?? invoice.category_id ?? '',
    });
  }, [invoice, initialLineItems, form]);

  useEffect(() => {
    if (!invoice) return;
    paymentForm.reset({
      amount: String(Number(invoice.total_amount)),
      paymentDate: new Date().toISOString().slice(0, 10),
      reference: '',
    });
  }, [invoice?.id, invoice?.total_amount, paymentForm]);

  if (!invoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Invoice workflow</CardTitle>
          <CardDescription className="text-xs">
            Select an invoice in the table above to submit for approval, edit line allocation, or
            record payment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const total = Number(invoice.total_amount);
  const refresh = () => router.refresh();

  const saveLineItems = (values: LineFormValues) => {
    const qty = values.quantity;
    const unit = values.unitAmount;
    const lineTotal = qty * unit;
    if (Math.abs(lineTotal - total) > 0.01) {
      toast.error('Quantity × unit amount must equal the invoice total.');
      return;
    }
    startTransition(async () => {
      const { error } = await updateInvoiceLineItems({
        studyId,
        invoiceId: invoice.id,
        updatedAt: invoice.updated_at,
        lineItems: [
          {
            description: values.description.trim(),
            quantity: qty,
            unitAmount: unit,
            totalAmount: lineTotal,
            currency: invoice.currency,
            categoryId: values.categoryId && values.categoryId.length > 0 ? values.categoryId : null,
          },
        ],
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Line items saved.');
      refresh();
    });
  };

  const runSubmit = () => {
    startTransition(async () => {
      const { error } = await submitInvoiceForApproval({
        studyId,
        invoiceId: invoice.id,
        updatedAt: invoice.updated_at,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Invoice submitted for approval.');
      refresh();
    });
  };

  const runApprove = () => {
    startTransition(async () => {
      const { error } = await approveInvoice({
        studyId,
        invoiceId: invoice.id,
        updatedAt: invoice.updated_at,
        notes: null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Invoice approved.');
      refresh();
    });
  };

  const runReject = () => {
    const reason = rejectReason.trim();
    if (reason.length < 1) {
      toast.error('Provide a rejection reason.');
      return;
    }
    startTransition(async () => {
      const { error } = await rejectInvoice({
        studyId,
        invoiceId: invoice.id,
        updatedAt: invoice.updated_at,
        reason,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Invoice rejected.');
      setRejectOpen(false);
      setRejectReason('');
      refresh();
    });
  };

  const runPayment = paymentForm.handleSubmit((vals) => {
    startTransition(async () => {
      const { error } = await recordPayment({
        studyId,
        invoiceId: invoice.id,
        amount: Number(vals.amount),
        currency: invoice.currency,
        paymentDate: vals.paymentDate,
        reference: vals.reference.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Payment recorded.');
      refresh();
    });
  });

  const activeCats = categories.filter((c) => !c.is_archived);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Workflow — {invoice.invoice_number}
          </CardTitle>
          <CardDescription className="text-xs">
            Approval and payment actions for the selected invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InvoiceApprovalWorkflowStepper currentStatus={invoice.approval_status} />

          <div className="flex flex-wrap gap-2">
            {invoice.approval_status === 'draft' ? (
              <Button size="sm" disabled={pending} onClick={runSubmit}>
                Submit for approval
              </Button>
            ) : null}
            {invoice.approval_status === 'submitted' || invoice.approval_status === 'under_review' ? (
              <>
                <Button size="sm" disabled={pending} onClick={runApprove}>
                  Approve
                </Button>
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
              </>
            ) : null}
          </div>

          <div className="rounded-md border border-border p-3 space-y-2">
            <div className="text-[11px] font-medium text-muted-foreground">
              Line allocation (must match invoice total {total.toFixed(2)} {invoice.currency})
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(saveLineItems)} className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-[11px]">Description</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-xs h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Quantity</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" className="text-xs h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px]">Unit amount</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" className="text-xs h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-[11px]">Budget category (optional)</FormLabel>
                      <Select
                        value={field.value && field.value.length > 0 ? field.value : '__none__'}
                        onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 w-full min-w-0 max-w-full text-xs">
                            <SelectValue
                              placeholder="None"
                              getDisplayLabel={(val) => {
                                if (!val || val === '__none__') return null;
                                const c = activeCats.find((x) => x.id === val);
                                return c ? `${c.code} · ${c.name}` : null;
                              }}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs">
                            None
                          </SelectItem>
                          {activeCats.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.code} · {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" variant="secondary" disabled={pending}>
                    Save line items
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {invoice.approval_status === 'approved' ? (
            <div className="rounded-md border border-border p-3 space-y-2">
              <div className="text-[11px] font-medium text-muted-foreground">Record payment</div>
              <form onSubmit={runPayment} className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Amount</Label>
                  <Input
                    {...paymentForm.register('amount')}
                    type="number"
                    step="0.01"
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Payment date</Label>
                  <Input {...paymentForm.register('paymentDate')} type="date" className="text-xs h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Reference</Label>
                  <Input {...paymentForm.register('reference')} className="text-xs h-9" />
                </div>
                <div className="sm:col-span-3">
                  <Button type="submit" size="sm" disabled={pending}>
                    Record payment
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject invoice</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason"
            rows={4}
            className="text-xs"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={pending} onClick={runReject}>
              Reject invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
