'use client';

import Link from 'next/link';
import { useState, useCallback, useTransition, useEffect } from 'react';
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
  ChevronDown,
  Settings2,
  FileDown,
  FileSpreadsheet,
  Loader2,
  Layers,
  ArrowUpCircle,
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
  StudyBudget,
  StudyBudgetWithItems,
  StudyBudgetSection,
  BudgetSectionType,
  BudgetLineItem,
  ProcedureGrid,
  SitePaymentWithSite,
  PaymentType,
  PaymentStatus,
  BudgetStatus,
  FinancialSummary,
  StudySite,
  FinanceInvoiceWithRelations,
  FinanceApprovalTemplateOption,
} from '@/lib/types/ctms';
import {
  BUDGET_STATUS_OPTIONS,
  BUDGET_SECTION_TYPE_OPTIONS,
  BUDGET_SECTION_TYPE_LABEL,
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
  updateLineItem,
  deleteLineItem,
  bulkInsertStudyBudgetLineItems,
  createStudyBudgetSection,
  updateStudyBudgetSection,
  deleteStudyBudgetSection,
  upgradeToStructuredBudget,
  createPayment,
  updatePayment,
  deletePayment,
} from '@/lib/actions/financials';
import {
  buildStudyBudgetLineCsvTemplate,
  parseStudyBudgetLineCsv,
  type StudyBudgetLineCsvRowItem,
} from '@/lib/validation/study-budget-line-csv';
import { listFinanceInvoicesForStudy } from '@/lib/actions/finance-invoices';
import { updateStudyFinanceApprovalTemplate } from '@/lib/actions/studies';
import { getProcedureGrid, getStudyEnrollmentActuals } from '@/lib/actions/study-visit-definitions';
import { FinanceInvoicesSection } from '@/components/ctms/financials/finance-invoices-section';
import { FinancialsStudyCharts } from '@/components/ctms/financials/financials-study-charts';
import { ProcedureCostGrid } from '@/components/ctms/financials/procedure-cost-grid';
import { BudgetWizardDialog } from '@/components/ctms/financials/budget-wizard/budget-wizard-dialog';
import { PropagateBudgetDialog } from '@/components/ctms/financials/propagate-budget-dialog';
import { buildCtaBudgetHtml, buildCtaBudgetCsv } from '@/lib/budget-cta-export';

const STUDY_FINANCE_TEMPLATE_NONE = '__none__';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

interface FinancialsTabProps {
  studyId: string;
  companyId: string;
  initialBudgets: StudyBudgetWithItems[];
  initialPayments: SitePaymentWithSite[];
  initialSummary: FinancialSummary;
  initialFinanceInvoices: FinanceInvoiceWithRelations[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  isAdmin: boolean;
  studyFinanceApprovalTemplateId: string | null;
  financeApprovalTemplateOptions: FinanceApprovalTemplateOption[];
}

export function FinancialsTab({
  studyId,
  companyId,
  initialBudgets,
  initialPayments,
  initialSummary,
  initialFinanceInvoices,
  sites,
  isAdmin,
  studyFinanceApprovalTemplateId,
  financeApprovalTemplateOptions,
}: FinancialsTabProps) {
  const [budgets, setBudgets] = useState(initialBudgets);
  const [payments, setPayments] = useState(initialPayments);
  const [summary, setSummary] = useState(initialSummary);
  const [financeInvoices, setFinanceInvoices] = useState(initialFinanceInvoices);
  const [, startTransition] = useTransition();
  const [studyWorkflowSelect, setStudyWorkflowSelect] = useState<string>(
    studyFinanceApprovalTemplateId ?? STUDY_FINANCE_TEMPLATE_NONE
  );
  const [studyWorkflowModalOpen, setStudyWorkflowModalOpen] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvAppendConfirmItems, setCsvAppendConfirmItems] = useState<StudyBudgetLineCsvRowItem[] | null>(null);
  const [csvAppendBudgetId, setCsvAppendBudgetId] = useState<string | null>(null);
  const [addSectionBudgetId, setAddSectionBudgetId] = useState<string | null>(null);
  const [addSectionType, setAddSectionType] = useState<BudgetSectionType>('invoiceable');
  const [addSectionName, setAddSectionName] = useState('');
  const [addSectionRate, setAddSectionRate] = useState('');
  const [addSectionSaving, setAddSectionSaving] = useState(false);
  const [upgradingBudgetId, setUpgradingBudgetId] = useState<string | null>(null);

  useEffect(() => {
    setStudyWorkflowSelect(studyFinanceApprovalTemplateId ?? STUDY_FINANCE_TEMPLATE_NONE);
  }, [studyFinanceApprovalTemplateId]);

  const refreshData = useCallback(() => {
    startTransition(async () => {
      try {
        const [b, p, s, inv] = await Promise.all([
          getStudyBudgets(studyId),
          getStudyPayments(studyId),
          getStudyFinancialSummary(studyId),
          listFinanceInvoicesForStudy(studyId),
        ]);
        setBudgets(b);
        setPayments(p);
        setSummary(s);
        setFinanceInvoices(inv);
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

  const handleDownloadStudyBudgetCsvTemplate = () => {
    const csv = buildStudyBudgetLineCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'study-budget-line-items-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runStudyBudgetCsvBulkImport = (items: StudyBudgetLineCsvRowItem[], budgetId: string) => {
    setCsvImporting(true);
    startTransition(async () => {
      const { error } = await bulkInsertStudyBudgetLineItems(
        budgetId,
        studyId,
        items.map((item) => ({
          category: item.category,
          description: item.description,
          unitCost: item.unitCost,
          quantity: item.quantity,
          notes: item.notes,
          sortOrder: item.sortOrder,
          sectionName: item.sectionName,
        }))
      );
      setCsvImporting(false);
      if (error) toast.error(error);
      else {
        toast.success(`${items.length} line item(s) imported.`);
        refreshData();
      }
    });
  };

  const handleStudyBudgetCsvFile = async (file: File, budgetId: string, existingCount: number) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error('Could not read the CSV file.');
      return;
    }
    const { items, errors } = parseStudyBudgetLineCsv(text);
    if (errors.length > 0) {
      const lines = errors
        .slice(0, 12)
        .map((e) => (e.row === 0 ? e.message : `Row ${e.row}: ${e.message}`));
      const suffix = errors.length > 12 ? `\n…${errors.length - 12} more issue(s).` : '';
      toast.error('CSV could not be imported.', {
        description: `${lines.join('\n')}${suffix}`,
      });
      return;
    }
    if (items.length === 0) {
      toast.error('No data rows found in the CSV.');
      return;
    }
    if (existingCount > 0) {
      setCsvAppendConfirmItems(items);
      setCsvAppendBudgetId(budgetId);
      return;
    }
    runStudyBudgetCsvBulkImport(items, budgetId);
  };

  const handleAddSection = async () => {
    if (!addSectionBudgetId || !addSectionName.trim()) return;
    setAddSectionSaving(true);
    const indirectRate = addSectionRate.trim() !== '' ? parseFloat(addSectionRate) / 100 : null;
    const { error } = await createStudyBudgetSection(addSectionBudgetId, studyId, {
      section_type: addSectionType,
      name: addSectionName.trim(),
      indirect_rate: indirectRate && !Number.isNaN(indirectRate) ? indirectRate : null,
    });
    setAddSectionSaving(false);
    if (error) { toast.error(error); return; }
    toast.success('Section added');
    setAddSectionBudgetId(null);
    setAddSectionName('');
    setAddSectionRate('');
    setAddSectionType('invoiceable');
    refreshData();
  };

  const handleUpgradeBudget = async (budgetId: string) => {
    setUpgradingBudgetId(budgetId);
    const { error } = await upgradeToStructuredBudget(budgetId, studyId);
    setUpgradingBudgetId(null);
    if (error) { toast.error(error); return; }
    toast.success('Budget upgraded to structured format');
    refreshData();
  };

  const handleExportCtaHtml = (budget: StudyBudgetWithItems) => {
    const html = buildCtaBudgetHtml({
      budget,
      sections: budget.study_budget_sections,
      currency: budget.currency,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) URL.revokeObjectURL(url);
    else win.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
  };

  const handleExportCtaCsv = (budget: StudyBudgetWithItems) => {
    const csv = buildCtaBudgetCsv({
      budget,
      sections: budget.study_budget_sections,
      currency: budget.currency,
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${budget.name.replace(/\s+/g, '-').toLowerCase()}-cta-budget.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-medium">Budgets</h3>
          <div className="flex items-center gap-2">
            <BudgetWizardDialog studyId={studyId} companyId={companyId} onSuccess={refreshData} />
            <BudgetFormDialog studyId={studyId} onSuccess={refreshData} />
          </div>
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
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <CollapsibleTrigger
                          className="flex min-w-0 flex-1 items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 text-left -ml-1 transition-colors hover:bg-muted/60 hover:border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[panel-open]:bg-muted/35 data-[panel-open]:border-border/35 [&[data-panel-open]>svg:first-of-type]:rotate-180"
                        >
                          <ChevronDown
                            aria-hidden
                            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out"
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-1.5 text-left sm:flex-row sm:items-center sm:gap-2.5">
                            <CardTitle className="text-sm font-semibold leading-snug">
                              {budget.name}
                            </CardTitle>
                            <StatusBadge status={budget.status} className="w-fit shrink-0 text-xs" />
                          </span>
                          <span className="sr-only">
                            {budget.name}. Toggle to show or hide line items.
                          </span>
                        </CollapsibleTrigger>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-2 border-t border-border/60 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 md:gap-x-3">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Total
                            </span>
                            <span className="text-sm font-semibold tabular-nums">
                              {formatCurrency(Number(budget.total_amount), budget.currency)}
                            </span>
                          </div>
                          <span className="hidden h-8 w-px shrink-0 self-center bg-border/70 sm:block" aria-hidden />
                          <Select
                            value={budget.status}
                            onValueChange={async (val) => {
                              const { error } = await updateBudget(budget.id, studyId, { status: val as BudgetStatus });
                              if (error) toast.error(error);
                              else refreshData();
                            }}
                          >
                            <SelectTrigger className="h-7 w-[100px] text-xs">
                              <SelectValue
                                getDisplayLabel={(v) =>
                                  BUDGET_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? null
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {BUDGET_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="hidden h-8 w-px shrink-0 self-center bg-border/70 sm:block" aria-hidden />
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={handleDownloadStudyBudgetCsvTemplate}
                          >
                            <FileDown className="h-3.5 w-3.5 mr-1" />
                            CSV template
                          </Button>
                          <label className="cursor-pointer inline-flex">
                            <span
                              className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),10px)] border border-border bg-background px-2.5 h-8 text-xs font-medium shadow-xs hover:bg-muted hover:text-foreground transition-all select-none dark:border-input dark:bg-input/30 dark:hover:bg-input/50 ${csvImporting ? 'pointer-events-none opacity-60' : ''}`}
                            >
                              {csvImporting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                              )}
                              Import CSV
                            </span>
                            <input
                              type="file"
                              accept=".csv,text/csv"
                              className="hidden"
                              disabled={csvImporting}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) void handleStudyBudgetCsvFile(f, budget.id, budget.budget_line_items.length);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <BudgetWizardDialog
                            mode="edit"
                            existingBudgetId={budget.id}
                            studyId={studyId}
                            companyId={companyId}
                            currency={budget.currency}
                            onSuccess={refreshData}
                          />
                          <LineItemFormDialog
                            budgetId={budget.id}
                            studyId={studyId}
                            currency={budget.currency}
                            sections={budget.study_budget_sections}
                            onSuccess={refreshData}
                          />
                          {budget.study_budget_sections.length > 0 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                title="Export CTA budget as HTML (print to PDF)"
                                onClick={() => handleExportCtaHtml(budget)}
                              >
                                <FileDown className="h-3.5 w-3.5 mr-1" />
                                CTA export
                              </Button>
                            </>
                          )}
                          {isAdmin && budget.status === 'approved' && sites.length > 0 && (
                            <PropagateBudgetDialog
                              studyId={studyId}
                              studyBudgetId={budget.id}
                              studyBudgetName={budget.name}
                              sites={sites}
                              onSuccess={refreshData}
                            />
                          )}
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
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {isAdmin && budget.study_budget_sections.length === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={upgradingBudgetId === budget.id}
                              onClick={() => handleUpgradeBudget(budget.id)}
                            >
                              {upgradingBudgetId === budget.id ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />
                              )}
                              Upgrade to sections
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                setAddSectionBudgetId(budget.id);
                                setAddSectionName('');
                                setAddSectionRate('');
                                setAddSectionType('invoiceable');
                              }}
                            >
                              <Layers className="h-3.5 w-3.5 mr-1" />
                              Add section
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0 px-4 pb-3">
                        {budget.study_budget_sections.length > 0 ? (
                          <SectionedBudgetContent
                            budget={budget}
                            studyId={studyId}
                            currency={budget.currency}
                            isAdmin={isAdmin}
                            onSuccess={refreshData}
                            formatCurrency={formatCurrency}
                            plannedEnrollment={(budget as unknown as { planned_enrollment?: number | null }).planned_enrollment ?? null}
                            onDeleteSection={async (sectionId) => {
                              const { error } = await deleteStudyBudgetSection(sectionId, budget.id, studyId);
                              if (error) toast.error(error);
                              else { toast.success('Section removed'); refreshData(); }
                            }}
                            onUpdateSectionRate={async (sectionId, rate) => {
                              const { error } = await updateStudyBudgetSection(sectionId, budget.id, studyId, { indirect_rate: rate });
                              if (error) toast.error(error);
                              else refreshData();
                            }}
                          />
                        ) : (
                          <>
                            {budget.budget_line_items.length > 0 && (
                              <FlatLineItemsTable
                                items={budget.budget_line_items}
                                studyId={studyId}
                                currency={budget.currency}
                                lineTotal={lineTotal}
                                onSuccess={refreshData}
                                formatCurrency={formatCurrency}
                              />
                            )}
                            {budget.budget_line_items.length === 0 && (
                              <p className="text-sm text-muted-foreground py-6 text-center">
                                No line items yet. Use CSV import or Add Line Item in the header.
                              </p>
                            )}
                          </>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setStudyWorkflowModalOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Study invoice approval workflow
            </Button>
          </div>

          <Dialog open={studyWorkflowModalOpen} onOpenChange={setStudyWorkflowModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">Default invoice approval workflow (this study)</DialogTitle>
                <DialogDescription className="text-xs text-pretty">
                  Used when a new invoice draft does not pick a specific workflow. Configure company-wide workflows under{' '}
                  <Link
                    href="/protected/financials/approval-templates"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
                  >
                    Financials → Approval templates
                  </Link>
                  .
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="space-y-1.5">
                  <Label className="text-xs">Workflow</Label>
                  <Select
                    value={studyWorkflowSelect}
                    onValueChange={setStudyWorkflowSelect}
                    disabled={financeApprovalTemplateOptions.length === 0}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue
                        getDisplayLabel={(v) => {
                          if (v === STUDY_FINANCE_TEMPLATE_NONE) return 'Company default';
                          return financeApprovalTemplateOptions.find((o) => o.id === v)?.name ?? null;
                        }}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={STUDY_FINANCE_TEMPLATE_NONE} className="text-xs">
                        Company default
                      </SelectItem>
                      {financeApprovalTemplateOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id} className="text-xs">
                          {o.name}
                          {o.is_default ? ' (default)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setStudyWorkflowModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="text-xs"
                  disabled={financeApprovalTemplateOptions.length === 0}
                  onClick={() => {
                    startTransition(async () => {
                      const templateId =
                        studyWorkflowSelect === STUDY_FINANCE_TEMPLATE_NONE ? null : studyWorkflowSelect;
                      const { error } = await updateStudyFinanceApprovalTemplate({ studyId, templateId });
                      if (error) toast.error(error);
                      else {
                        toast.success('Study approval workflow saved.');
                        setStudyWorkflowModalOpen(false);
                      }
                    });
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      <FinanceInvoicesSection
        studyId={studyId}
        companyId={companyId}
        invoices={financeInvoices}
        sites={sites}
        onChanged={refreshData}
        approvalTemplateOptions={financeApprovalTemplateOptions}
      />
      <FinancialsStudyCharts summary={summary} financeInvoices={financeInvoices} currency={summary.currency} />

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
                          <SelectValue
                            getDisplayLabel={(v) =>
                              PAYMENT_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? null
                            }
                          />
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

      <AlertDialog
        open={csvAppendConfirmItems != null}
        onOpenChange={(open) => {
          if (!open) {
            setCsvAppendConfirmItems(null);
            setCsvAppendBudgetId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Append CSV rows?</AlertDialogTitle>
            <AlertDialogDescription>
              This budget already has line items. Import will add{' '}
              {csvAppendConfirmItems?.length ?? 0} new row(s) from the file. Existing rows stay
              unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={() => {
                const pending = csvAppendConfirmItems;
                const budgetId = csvAppendBudgetId;
                setCsvAppendConfirmItems(null);
                setCsvAppendBudgetId(null);
                if (pending && budgetId) runStudyBudgetCsvBulkImport(pending, budgetId);
              }}
            >
              Append rows
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Section Dialog */}
      <Dialog open={addSectionBudgetId != null} onOpenChange={(open) => { if (!open) setAddSectionBudgetId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Add Budget Section</DialogTitle>
            <DialogDescription className="text-xs">
              Sections group line items by cost type and can carry an indirect rate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Section type</Label>
              <Select value={addSectionType} onValueChange={(v) => {
                const t = v as BudgetSectionType;
                setAddSectionType(t);
                if (!addSectionName || addSectionName === BUDGET_SECTION_TYPE_LABEL[addSectionType]) {
                  setAddSectionName(BUDGET_SECTION_TYPE_LABEL[t]);
                }
              }}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_SECTION_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Display name</Label>
              <Input
                className="text-xs h-9"
                value={addSectionName}
                onChange={(e) => setAddSectionName(e.target.value)}
                placeholder="Section name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Indirect rate % <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                className="text-xs h-9"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={addSectionRate}
                onChange={(e) => setAddSectionRate(e.target.value)}
                placeholder="e.g. 26"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setAddSectionBudgetId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              disabled={addSectionSaving || !addSectionName.trim()}
              onClick={handleAddSection}
            >
              {addSectionSaving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Add section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function EditBudgetDialog({
  budget,
  studyId,
  onSuccess,
}: {
  budget: StudyBudget;
  studyId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: budget.name,
      total_amount: String(budget.total_amount),
      currency: budget.currency,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: budget.name,
        total_amount: String(budget.total_amount),
        currency: budget.currency,
      });
    }
  }, [open, budget.id, budget.name, budget.total_amount, budget.currency, form]);

  const onSubmit = async (values: BudgetFormValues) => {
    const { error } = await updateBudget(budget.id, studyId, {
      name: values.name,
      total_amount: parseFloat(values.total_amount),
      currency: values.currency,
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Budget updated');
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" title="Edit budget" />}
      >
        <Pencil className="h-3 w-3" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit budget</DialogTitle>
          <DialogDescription>Update the name, total, or currency for this study budget.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Budget name</Label>
            <Input className="text-xs" placeholder="e.g., Primary Study Budget" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Total amount</Label>
              <Input className="text-xs" type="number" step="0.01" placeholder="0.00" {...form.register('total_amount')} />
              {form.formState.errors.total_amount && (
                <p className="text-xs text-destructive">{form.formState.errors.total_amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Currency</Label>
              <Select value={form.watch('currency')} onValueChange={(val) => form.setValue('currency', val)}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD" className="text-xs">
                    USD
                  </SelectItem>
                  <SelectItem value="EUR" className="text-xs">
                    EUR
                  </SelectItem>
                  <SelectItem value="GBP" className="text-xs">
                    GBP
                  </SelectItem>
                  <SelectItem value="CHF" className="text-xs">
                    CHF
                  </SelectItem>
                  <SelectItem value="JPY" className="text-xs">
                    JPY
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="text-xs" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Line Item Form Dialog

/** Human-readable section label for selects (never show raw UUIDs). */
function studyBudgetSectionDisplayLabel(sec: StudyBudgetSection): string {
  const name = sec.name?.trim();
  if (name) return name;
  return BUDGET_SECTION_TYPE_LABEL[sec.section_type];
}

const lineItemSchema = z.object({
  section_id: z.string().optional(),
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
  sections = [],
  defaultSectionId,
  onSuccess,
  triggerLabel,
}: {
  budgetId: string;
  studyId: string;
  currency: string;
  sections?: StudyBudgetSection[];
  defaultSectionId?: string;
  onSuccess: () => void;
  triggerLabel?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<LineItemFormValues>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: { section_id: defaultSectionId ?? '', category: '', description: '', unit_cost: '', quantity: '1', notes: '' },
  });

  // Reset section to defaultSectionId whenever dialog opens
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) form.setValue('section_id', defaultSectionId ?? '');
  };

  const onSubmit = async (values: LineItemFormValues) => {
    const { error } = await addLineItem(budgetId, studyId, {
      category: values.category,
      description: values.description,
      unit_cost: parseFloat(values.unit_cost),
      quantity: parseInt(values.quantity),
      notes: values.notes,
      section_id: values.section_id && values.section_id !== '__none__' ? values.section_id : null,
    });
    if (error) { toast.error(error); return; }
    toast.success('Line item added');
    setOpen(false);
    form.reset({ section_id: defaultSectionId ?? '', category: '', description: '', unit_cost: '', quantity: '1', notes: '' });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-8 text-xs" />}>
        {triggerLabel ?? <><Plus className="mr-1 h-3 w-3" />Add Line Item</>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Budget Line Item</DialogTitle>
          <DialogDescription>Add a cost item to this budget ({currency}).</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {sections.length > 0 && (
            <div className="space-y-2">
              <Label>Budget section</Label>
              <Select
                value={form.watch('section_id') ?? '__none__'}
                onValueChange={(v) => form.setValue('section_id', v)}
              >
                <SelectTrigger className="text-xs h-9 min-w-[240px] capitalize">
                  <SelectValue
                    placeholder="No section"
                    getDisplayLabel={(v) => {
                      if (v == null || v === '__none__') return null;
                      const sec = sections.find((s) => s.id === v);
                      if (!sec) return null;
                      return studyBudgetSectionDisplayLabel(sec);
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sections.length > 1 && (
                    <SelectItem value="__none__" className="text-xs text-muted-foreground capitalize">
                      No section
                    </SelectItem>
                  )}
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs capitalize">
                      {studyBudgetSectionDisplayLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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

function EditLineItemDialog({
  item,
  studyId,
  currency,
  onSuccess,
}: {
  item: BudgetLineItem;
  studyId: string;
  currency: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const form = useForm<LineItemFormValues>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      category: item.category,
      description: item.description,
      unit_cost: String(item.unit_cost),
      quantity: String(item.quantity),
      notes: item.notes ?? '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        category: item.category,
        description: item.description,
        unit_cost: String(item.unit_cost),
        quantity: String(item.quantity),
        notes: item.notes ?? '',
      });
    }
  }, [open, item.id, item.category, item.description, item.unit_cost, item.quantity, item.notes, form]);

  const onSubmit = async (values: LineItemFormValues) => {
    const { error } = await updateLineItem(item.id, studyId, {
      category: values.category,
      description: values.description,
      unit_cost: parseFloat(values.unit_cost),
      quantity: parseInt(values.quantity, 10),
      notes: values.notes?.trim() ?? '',
    });
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Line item updated');
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" title="Edit line item" />
        }
      >
        <Pencil className="h-3 w-3" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit line item</DialogTitle>
          <DialogDescription>Update this budget line ({currency}). Totals recalculate from unit cost × quantity.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Category</Label>
              <Input className="text-xs" placeholder="e.g., Site Costs, CRO Fees" {...form.register('category')} />
              {form.formState.errors.category && (
                <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Input className="text-xs" placeholder="e.g., Per-patient visit cost" {...form.register('description')} />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Unit cost</Label>
              <Input className="text-xs" type="number" step="0.01" placeholder="0.00" {...form.register('unit_cost')} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Quantity</Label>
              <Input className="text-xs" type="number" min="1" {...form.register('quantity')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs min-h-[52px]" placeholder="Optional notes…" rows={2} {...form.register('notes')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="text-xs" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Save changes'}
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

// ─── Flat line-items table (legacy / unsectioned budgets) ────────────────────

function FlatLineItemsTable({
  items,
  studyId,
  currency,
  lineTotal,
  onSuccess,
  formatCurrency: fmt,
}: {
  items: BudgetLineItem[];
  studyId: string;
  currency: string;
  lineTotal: number;
  onSuccess: () => void;
  formatCurrency: (n: number, c: string) => string;
}) {
  return (
    <div className="rounded-md border mb-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Category</TableHead>
            <TableHead className="text-xs">Description</TableHead>
            <TableHead className="text-xs text-right">Unit Cost</TableHead>
            <TableHead className="text-xs text-right">Qty</TableHead>
            <TableHead className="text-xs text-right">Total</TableHead>
            <TableHead className="text-xs w-[72px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-xs">{item.category}</TableCell>
              <TableCell className="text-xs truncate max-w-[150px]">{item.description}</TableCell>
              <TableCell className="text-xs text-right">{fmt(Number(item.unit_cost), currency)}</TableCell>
              <TableCell className="text-xs text-right">{item.quantity}</TableCell>
              <TableCell className="text-xs text-right font-medium">{fmt(Number(item.total_cost), currency)}</TableCell>
              <TableCell className="p-2">
                <div className="flex items-center justify-end gap-0.5">
                  <EditLineItemDialog item={item} studyId={studyId} currency={currency} onSuccess={onSuccess} />
                  <DeleteLineItemButton itemId={item.id} studyId={studyId} onSuccess={onSuccess} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50">
            <TableCell colSpan={4} className="text-xs font-medium text-right">Line Items Total</TableCell>
            <TableCell className="text-xs text-right font-semibold">{fmt(lineTotal, currency)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function DeleteLineItemButton({
  itemId,
  studyId,
  onSuccess,
}: {
  itemId: string;
  studyId: string;
  onSuccess: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 shrink-0"
      title="Remove line item"
      onClick={async () => {
        const { error } = await deleteLineItem(itemId, studyId);
        if (error) toast.error(error);
        else {
          toast.success('Line item removed');
          onSuccess();
        }
      }}
    >
      <Trash2 className="h-3 w-3 text-destructive" />
    </Button>
  );
}

// ─── Sectioned budget content ─────────────────────────────────────────────────

function SectionedBudgetContent({
  budget,
  studyId,
  currency,
  isAdmin,
  onSuccess,
  formatCurrency: fmt,
  onDeleteSection,
  onUpdateSectionRate,
  plannedEnrollment,
}: {
  budget: StudyBudgetWithItems;
  studyId: string;
  currency: string;
  isAdmin: boolean;
  onSuccess: () => void;
  formatCurrency: (n: number, c: string) => string;
  onDeleteSection: (sectionId: string) => void;
  onUpdateSectionRate: (sectionId: string, rate: number | null) => void;
  plannedEnrollment?: number | null;
}) {
  // Lines with no section go into an implicit "Unsectioned" bucket
  const unsectionedLines = budget.budget_line_items.filter((l) => l.section_id == null);

  const grandTotal = budget.budget_line_items.reduce((s, l) => s + Number(l.total_cost), 0);

  return (
    <div className="space-y-4">
      {budget.study_budget_sections.map((section) => {
        const lines = budget.budget_line_items.filter((l) => l.section_id === section.id);
        const directTotal = lines.reduce((s, l) => s + Number(l.total_cost), 0);
        const indirectAmount =
          section.indirect_rate != null ? directTotal * section.indirect_rate : null;
        const sectionTotal = directTotal + (indirectAmount ?? 0);

        return (
          <BudgetSectionGroup
            key={section.id}
            budgetId={budget.id}
            section={section}
            lines={lines}
            studyId={studyId}
            currency={currency}
            directTotal={directTotal}
            indirectAmount={indirectAmount}
            sectionTotal={sectionTotal}
            isAdmin={isAdmin}
            onSuccess={onSuccess}
            fmt={fmt}
            onDeleteSection={onDeleteSection}
            onUpdateSectionRate={onUpdateSectionRate}
            plannedEnrollment={plannedEnrollment}
          />
        );
      })}

      {unsectionedLines.length > 0 && (
        <div className="rounded-md border">
          <div className="px-3 py-2 bg-muted/40 border-b flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Unsectioned
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs text-right">Unit Cost</TableHead>
                <TableHead className="text-xs text-right">Qty</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs w-[72px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unsectionedLines.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs">{item.category}</TableCell>
                  <TableCell className="text-xs truncate max-w-[150px]">{item.description}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(Number(item.unit_cost), currency)}</TableCell>
                  <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                  <TableCell className="text-xs text-right font-medium">{fmt(Number(item.total_cost), currency)}</TableCell>
                  <TableCell className="p-2">
                    <div className="flex items-center justify-end gap-0.5">
                      <EditLineItemDialog item={item} studyId={studyId} currency={currency} onSuccess={onSuccess} />
                      <DeleteLineItemButton itemId={item.id} studyId={studyId} onSuccess={onSuccess} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {budget.budget_line_items.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No line items yet. Use CSV import or Add Line Item in the header.
        </p>
      )}

      {/* Grand total footer */}
      <div className="flex items-center justify-end gap-3 pt-1 border-t">
        <span className="text-xs font-medium text-muted-foreground">Grand Total</span>
        <span className="text-sm font-semibold tabular-nums">{fmt(grandTotal, currency)}</span>
      </div>
    </div>
  );
}

function BudgetSectionGroup({
  budgetId,
  section,
  lines,
  studyId,
  currency,
  directTotal,
  indirectAmount,
  sectionTotal,
  isAdmin,
  onSuccess,
  fmt,
  onDeleteSection,
  onUpdateSectionRate,
  plannedEnrollment,
}: {
  budgetId: string;
  section: StudyBudgetSection;
  lines: BudgetLineItem[];
  studyId: string;
  currency: string;
  directTotal: number;
  indirectAmount: number | null;
  sectionTotal: number;
  isAdmin: boolean;
  onSuccess: () => void;
  fmt: (n: number, c: string) => string;
  onDeleteSection: (sectionId: string) => void;
  onUpdateSectionRate: (sectionId: string, rate: number | null) => void;
  plannedEnrollment?: number | null;
}) {
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(
    section.indirect_rate != null ? String(section.indirect_rate * 100) : ''
  );
  const [procedureGrid, setProcedureGrid] = useState<ProcedureGrid | null>(null);
  const [gridLoading, setGridLoading] = useState(false);
  const [enrollmentActual, setEnrollmentActual] = useState<number | null>(null);

  const loadProcedureGrid = useCallback((opts?: { quiet?: boolean }) => {
    if (section.section_type !== 'per_patient_procedure') return Promise.resolve();
    const quiet = opts?.quiet === true;
    if (!quiet) setGridLoading(true);
    return Promise.all([
      getProcedureGrid(section.id, studyId),
      getStudyEnrollmentActuals(studyId),
    ])
      .then(([grid, actuals]) => {
        setProcedureGrid(grid);
        setEnrollmentActual(actuals.total);
      })
      .catch(() => {
        // Non-fatal: grid just won't show
      })
      .finally(() => {
        if (!quiet) setGridLoading(false);
      });
  }, [section.id, section.section_type, studyId]);

  // Load procedure grid when section is per_patient_procedure
  useEffect(() => {
    void loadProcedureGrid();
  }, [loadProcedureGrid]);

  /** Parent refresh + reload grid cells (useEffect only runs when section id changes). */
  const handleProcedureGridChanged = useCallback(() => {
    onSuccess();
    void loadProcedureGrid({ quiet: true });
  }, [onSuccess, loadProcedureGrid]);

  return (
    <div className="rounded-md border">
      {/* Section header */}
      <div className="px-3 py-2 bg-muted/40 border-b flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold">{section.name}</span>
          {section.indirect_rate != null && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {(section.indirect_rate * 100).toFixed(0)}% indirect
            </Badge>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            {editingRate ? (
              <div className="flex items-center gap-1">
                <Input
                  className="h-6 w-20 text-xs"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="Rate %"
                  autoFocus
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    const rate =
                      rateInput.trim() !== '' ? parseFloat(rateInput) / 100 : null;
                    onUpdateSectionRate(section.id, rate && !Number.isNaN(rate) ? rate : null);
                    setEditingRate(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setEditingRate(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setRateInput(section.indirect_rate != null ? String(section.indirect_rate * 100) : '');
                  setEditingRate(true);
                }}
              >
                <Pencil className="h-3 w-3 mr-1" />
                {section.indirect_rate != null ? 'Edit rate' : 'Set indirect rate'}
              </Button>
            )}
            <LineItemFormDialog
              budgetId={budgetId}
              studyId={studyId}
              currency={currency}
              sections={[section]}
              defaultSectionId={section.id}
              onSuccess={onSuccess}
              triggerLabel={<><Plus className="h-3 w-3 mr-1" />Add item</>}
            />
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="h-6 w-6 p-0" />}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove section?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The section &ldquo;{section.name}&rdquo; will be removed. Line items in this section
                    will become unsectioned and stay in the budget.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDeleteSection(section.id)}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Procedure cost grid for per_patient_procedure sections */}
      {section.section_type === 'per_patient_procedure' && (
        <div className="p-3 border-b">
          {gridLoading ? (
            <p className="text-xs text-muted-foreground py-3 text-center">Loading procedure grid…</p>
          ) : procedureGrid ? (
            <ProcedureCostGrid
              sectionId={section.id}
              studyId={studyId}
              currency={currency}
              grid={procedureGrid}
              plannedEnrollment={plannedEnrollment}
              enrollmentActual={enrollmentActual}
              isAdmin={isAdmin}
              onChanged={handleProcedureGridChanged}
            />
          ) : null}
        </div>
      )}

      {/* Line items */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Category</TableHead>
            <TableHead className="text-xs">Description</TableHead>
            <TableHead className="text-xs text-right">Unit Cost</TableHead>
            <TableHead className="text-xs text-right">Qty</TableHead>
            <TableHead className="text-xs text-right">Total</TableHead>
            <TableHead className="text-xs w-[72px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 && section.section_type !== 'per_patient_procedure' && (
            <TableRow>
              <TableCell colSpan={6} className="text-xs text-muted-foreground text-center py-4">
                No line items in this section yet.
              </TableCell>
            </TableRow>
          )}
          {section.section_type === 'per_patient_procedure' && lines.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-xs text-muted-foreground text-center py-2">
                Use the grid above to enter per-visit costs, or add line items manually.
              </TableCell>
            </TableRow>
          )}
          {lines.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-xs">{item.category}</TableCell>
              <TableCell className="text-xs truncate max-w-[150px]">{item.description}</TableCell>
              <TableCell className="text-xs text-right">{fmt(Number(item.unit_cost), currency)}</TableCell>
              <TableCell className="text-xs text-right">{item.quantity}</TableCell>
              <TableCell className="text-xs text-right font-medium">{fmt(Number(item.total_cost), currency)}</TableCell>
              <TableCell className="p-2">
                <div className="flex items-center justify-end gap-0.5">
                  <EditLineItemDialog item={item} studyId={studyId} currency={currency} onSuccess={onSuccess} />
                  <DeleteLineItemButton itemId={item.id} studyId={studyId} onSuccess={onSuccess} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {/* Subtotal rows */}
          <TableRow className="bg-muted/30">
            <TableCell colSpan={4} className="text-xs text-right text-muted-foreground">Direct subtotal</TableCell>
            <TableCell className="text-xs text-right">{fmt(directTotal, currency)}</TableCell>
            <TableCell />
          </TableRow>
          {indirectAmount != null && (
            <TableRow className="bg-muted/30">
              <TableCell colSpan={4} className="text-xs text-right text-muted-foreground">
                Indirect ({((section.indirect_rate ?? 0) * 100).toFixed(0)}%)
              </TableCell>
              <TableCell className="text-xs text-right">{fmt(indirectAmount, currency)}</TableCell>
              <TableCell />
            </TableRow>
          )}
          <TableRow className="bg-muted/50">
            <TableCell colSpan={4} className="text-xs font-semibold text-right">Section total</TableCell>
            <TableCell className="text-xs text-right font-semibold">{fmt(sectionTotal, currency)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
