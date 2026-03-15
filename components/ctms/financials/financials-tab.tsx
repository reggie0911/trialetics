'use client';

import { useState, useCallback, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import type {
  StudyBudgetWithItems,
  SitePaymentWithSite,
  PaymentType,
  PaymentStatus,
  BudgetStatus,
  FinancialSummary,
  StudySite,
} from '@/lib/types/ctms';
import {
  BUDGET_STATUS_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_TYPE_LABEL,
} from '@/lib/types/ctms';
import {
  getStudyBudgets,
  getStudyPayments,
  getStudyFinancialSummary,
  createBudget,
  updateBudget,
  deleteBudget,
  addLineItem,
  deleteLineItem,
  createPayment,
  updatePayment,
  deletePayment,
} from '@/lib/actions/financials';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

interface FinancialsTabProps {
  studyId: string;
  initialBudgets: StudyBudgetWithItems[];
  initialPayments: SitePaymentWithSite[];
  initialSummary: FinancialSummary;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
}

export function FinancialsTab({ studyId, initialBudgets, initialPayments, initialSummary, sites }: FinancialsTabProps) {
  const [budgets, setBudgets] = useState(initialBudgets);
  const [payments, setPayments] = useState(initialPayments);
  const [summary, setSummary] = useState(initialSummary);
  const [, startTransition] = useTransition();

  const refreshData = useCallback(() => {
    startTransition(async () => {
      try {
        const [b, p, s] = await Promise.all([
          getStudyBudgets(studyId),
          getStudyPayments(studyId),
          getStudyFinancialSummary(studyId),
        ]);
        setBudgets(b);
        setPayments(p);
        setSummary(s);
      } catch {
        toast.error('Failed to refresh financial data');
      }
    });
  }, [studyId]);

  const handleDeleteBudget = async (id: string) => {
    const { error } = await deleteBudget(id, studyId);
    if (error) { toast.error(error); return; }
    toast.success('Budget deleted');
    refreshData();
  };

  const handleDeletePayment = async (id: string) => {
    const { error } = await deletePayment(id, studyId);
    if (error) { toast.error(error); return; }
    toast.success('Payment deleted');
    refreshData();
  };

  const handlePaymentStatus = async (id: string, status: PaymentStatus) => {
    const { error } = await updatePayment(id, studyId, { status });
    if (error) { toast.error(error); return; }
    refreshData();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const budgetUtilization = summary.totalBudget > 0
    ? ((summary.totalPaid / summary.totalBudget) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </div>
            <p className="text-xl font-semibold mt-1">{formatCurrency(summary.totalBudget, summary.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </div>
            <p className="text-xl font-semibold mt-1">{formatCurrency(summary.totalPaid, summary.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <p className="text-xl font-semibold mt-1">{formatCurrency(summary.totalPending, summary.currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Utilization</p>
            </div>
            <p className="text-xl font-semibold mt-1">{budgetUtilization}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Budgets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Budgets</h3>
          <BudgetFormDialog studyId={studyId} onSuccess={refreshData} />
        </div>

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No budgets defined</p>
              <p className="text-xs text-muted-foreground mt-1">Create a budget to track study finances.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {budgets.map((budget) => {
              const lineTotal = budget.budget_line_items.reduce((s, li) => s + Number(li.total_cost), 0);
              return (
                <Collapsible key={budget.id} defaultOpen>
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer hover:opacity-80">
                          <CardTitle className="text-sm">{budget.name}</CardTitle>
                          <StatusBadge status={budget.status} className="text-xs" />
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatCurrency(Number(budget.total_amount), budget.currency)}</span>
                          <Select
                            value={budget.status}
                            onValueChange={async (val) => {
                              const { error } = await updateBudget(budget.id, studyId, { status: val as BudgetStatus });
                              if (error) toast.error(error);
                              else refreshData();
                            }}
                          >
                            <SelectTrigger className="h-7 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BUDGET_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <AlertDialog>
                            <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently remove &ldquo;{budget.name}&rdquo; and all line items.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBudget(budget.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0 px-4 pb-3">
                        {budget.budget_line_items.length > 0 && (
                          <div className="rounded-md border mb-3">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Category</TableHead>
                                  <TableHead className="text-xs">Description</TableHead>
                                  <TableHead className="text-xs text-right">Unit Cost</TableHead>
                                  <TableHead className="text-xs text-right">Qty</TableHead>
                                  <TableHead className="text-xs text-right">Total</TableHead>
                                  <TableHead className="text-xs w-[40px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {budget.budget_line_items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs">{item.category}</TableCell>
                                    <TableCell className="text-xs truncate max-w-[150px]">{item.description}</TableCell>
                                    <TableCell className="text-xs text-right">{formatCurrency(Number(item.unit_cost), budget.currency)}</TableCell>
                                    <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-xs text-right font-medium">{formatCurrency(Number(item.total_cost), budget.currency)}</TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={async () => {
                                          const { error } = await deleteLineItem(item.id, studyId);
                                          if (error) toast.error(error);
                                          else refreshData();
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-muted/50">
                                  <TableCell colSpan={4} className="text-xs font-medium text-right">Line Items Total</TableCell>
                                  <TableCell className="text-xs text-right font-semibold">{formatCurrency(lineTotal, budget.currency)}</TableCell>
                                  <TableCell />
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        <LineItemFormDialog budgetId={budget.id} studyId={studyId} currency={budget.currency} onSuccess={refreshData} />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Payments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Site Payments</h3>
          <PaymentFormDialog studyId={studyId} sites={sites} onSuccess={refreshData} />
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No payments recorded</p>
              <p className="text-xs text-muted-foreground mt-1">Record site payments to track financial activity.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Site</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Invoice Date</TableHead>
                  <TableHead className="text-xs">Payment Date</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-xs font-medium">{payment.study_sites?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{PAYMENT_TYPE_LABEL[payment.payment_type]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">{formatCurrency(Number(payment.amount), payment.currency)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{payment.invoice_number ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(payment.invoice_date)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(payment.payment_date)}</TableCell>
                    <TableCell>
                      <Select
                        value={payment.status}
                        onValueChange={(val) => handlePaymentStatus(payment.id, val as PaymentStatus)}
                      >
                        <SelectTrigger className="h-7 w-[100px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" />}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently remove this payment record.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePayment(payment.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// Budget Form Dialog

const budgetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  total_amount: z.string().min(1, 'Amount is required'),
  currency: z.string().min(1),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

function BudgetFormDialog({ studyId, onSuccess }: { studyId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { name: '', total_amount: '', currency: 'USD' },
  });

  const onSubmit = async (values: BudgetFormValues) => {
    const { error } = await createBudget(studyId, values.name, parseFloat(values.total_amount), values.currency);
    if (error) { toast.error(error); return; }
    toast.success('Budget created');
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />Add Budget
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
          <DialogDescription>Define a new budget for this study.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Budget Name</Label>
            <Input placeholder="e.g., Primary Study Budget" {...form.register('name')} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...form.register('total_amount')} />
              {form.formState.errors.total_amount && <p className="text-xs text-destructive">{form.formState.errors.total_amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.watch('currency')} onValueChange={(val) => form.setValue('currency', val)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creating...' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Line Item Form Dialog

const lineItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  unit_cost: z.string().min(1, 'Unit cost is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  notes: z.string().optional(),
});

type LineItemFormValues = z.infer<typeof lineItemSchema>;

function LineItemFormDialog({
  budgetId,
  studyId,
  currency,
  onSuccess,
}: {
  budgetId: string;
  studyId: string;
  currency: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<LineItemFormValues>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: { category: '', description: '', unit_cost: '', quantity: '1', notes: '' },
  });

  const onSubmit = async (values: LineItemFormValues) => {
    const { error } = await addLineItem(budgetId, studyId, {
      category: values.category,
      description: values.description,
      unit_cost: parseFloat(values.unit_cost),
      quantity: parseInt(values.quantity),
      notes: values.notes,
    });
    if (error) { toast.error(error); return; }
    toast.success('Line item added');
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="mr-2 h-3 w-3" />Add Line Item
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Budget Line Item</DialogTitle>
          <DialogDescription>Add a cost item to this budget ({currency}).</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input placeholder="e.g., Site Costs, CRO Fees" {...form.register('category')} />
              {form.formState.errors.category && <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="e.g., Per-patient visit cost" {...form.register('description')} />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Unit Cost</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...form.register('unit_cost')} />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" min="1" {...form.register('quantity')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." rows={2} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Payment Form Dialog

const paymentSchema = z.object({
  site_id: z.string().min(1, 'Site is required'),
  payment_type: z.string().min(1, 'Type is required'),
  amount: z.string().min(1, 'Amount is required'),
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

function PaymentFormDialog({
  studyId,
  sites,
  onSuccess,
}: {
  studyId: string;
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { site_id: '', payment_type: 'milestone', amount: '', invoice_number: '', invoice_date: '', notes: '' },
  });

  const onSubmit = async (values: PaymentFormValues) => {
    const { error } = await createPayment({
      site_id: values.site_id,
      study_id: studyId,
      payment_type: values.payment_type as PaymentType,
      amount: parseFloat(values.amount),
      invoice_number: values.invoice_number,
      invoice_date: values.invoice_date,
      notes: values.notes,
    });
    if (error) { toast.error(error); return; }
    toast.success('Payment recorded');
    setOpen(false);
    form.reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />Record Payment
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Site Payment</DialogTitle>
          <DialogDescription>Log a payment to a study site.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={form.watch('site_id')} onValueChange={(val) => form.setValue('site_id', val)}>
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select Site"
                  getDisplayLabel={(v) => {
                    const s = sites.find((x) => x.id === v);
                    return s ? `${s.site_number} — ${s.name}` : v;
                  }}
                />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.site_number} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.site_id && <p className="text-xs text-destructive">{form.formState.errors.site_id.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={form.watch('payment_type')} onValueChange={(val) => form.setValue('payment_type', val)}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    getDisplayLabel={(v) => PAYMENT_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
                  />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...form.register('amount')} />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input placeholder="INV-001" {...form.register('invoice_number')} />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input type="date" {...form.register('invoice_date')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea placeholder="Payment notes..." rows={2} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
