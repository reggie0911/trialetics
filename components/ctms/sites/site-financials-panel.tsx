'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Loader2, ExternalLink, FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SCHEDULE_STATUS_OPTIONS,
  type BudgetCostBasis,
  type FinanceApprovalTemplateOption,
  type FinanceInvoiceWithRelations,
  type InvoiceBudgetLineAllocationRef,
  type PaymentScheduleWithSite,
  type ScheduleStatus,
  type SiteBudgetLineItem,
  type SiteBudgetLineItemPaidTo,
  type SiteBudgetPaymentInfo,
  type SiteBudgetWithLineItems,
  type SiteNegotiationStatus,
  type SitePaymentTermsType,
  type StudySite,
} from '@/lib/types/ctms';
import { FinanceInvoicesSection } from '@/components/ctms/financials/finance-invoices-section';
import { BudgetResyncDiffDialog } from '@/components/ctms/financials/budget-resync-diff-dialog';
import {
  upsertSiteBudget,
  updateSiteBudgetExtras,
  applySiteDefaultOverheadToLineItems,
  addSiteBudgetLineItem,
  bulkInsertSiteBudgetLineItems,
  updateSiteBudgetLineItem,
  getSiteBudgetDocumentUrl,
  createSiteBudgetAmendment,
} from '@/lib/actions/finance-site-budgets';
import { createClient } from '@/lib/client';
import {
  buildSiteBudgetLineCsvTemplate,
  parseSiteBudgetLineCsv,
  type SiteBudgetLineCsvRowItem,
} from '@/lib/validation/site-budget-line-csv';
import {
  buildSiteBudgetLinesDataCsv,
  buildSiteBudgetLinesReportHtml,
} from '@/lib/site-budget-line-export';
import { triggerCsvDownload } from '@/lib/utils/csv-download';
import { createSchedule, deleteSchedule, updateSchedule } from '@/lib/actions/financials';
import {
  SiteBudgetFromStudyDialog,
  type SiteBudgetStudyOption,
} from '@/components/ctms/financials/site-budget-from-study-dialog';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function formatPercent(rate: number | null): string {
  if (rate == null) return 'N/A';
  return `${(rate * 100).toFixed(0)}%`;
}

/** Strip commas/spaces and keep at most one decimal point (for budget amount state). */
function normalizeBudgetAmountInput(raw: string): string {
  let s = raw.replace(/,/g, '').replace(/\s/g, '');
  s = s.replace(/[^\d.]/g, '');
  const first = s.indexOf('.');
  if (first !== -1) {
    const rest = s.slice(first + 1).replace(/\./g, '');
    s = s.slice(0, first + 1) + rest;
  }
  return s;
}

/** Pretty-print normalized amount with thousands separators. */
function formatBudgetAmountWithCommas(normalized: string): string {
  if (!normalized) return '';
  const dot = normalized.indexOf('.');
  const intRaw = dot === -1 ? normalized : normalized.slice(0, dot);
  const decRaw = dot === -1 ? undefined : normalized.slice(dot + 1);
  const intFormatted = (intRaw || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (normalized.endsWith('.') && decRaw === '') return `${intFormatted}.`;
  if (decRaw !== undefined) return `${intFormatted}.${decRaw}`;
  return intFormatted;
}

const NEGOTIATION_LABEL: Record<SiteNegotiationStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

const PAYMENT_TERMS_LABEL: Record<SitePaymentTermsType, string> = {
  invoice: 'By Invoice',
  per_visit: 'Per Visit',
  milestone: 'Milestones',
};

const PAID_TO_LABEL: Record<SiteBudgetLineItemPaidTo, string> = {
  site: 'Site',
  irb: 'IRB',
  vendor: 'Vendor',
};

const COST_BASIS_LABEL: Record<BudgetCostBasis, string> = {
  one_time: 'One-time',
  per_visit: 'Per Visit',
  per_patient: 'Per Patient',
  per_month: 'Per Month',
};

/** Select sentinel for free-text cost basis (stored as-is in DB). */
const COST_BASIS_CUSTOM = '__custom__';

function costBasisFormPayload(selectValue: string, custom: string): string | null {
  if (selectValue === COST_BASIS_CUSTOM) return custom.trim() || null;
  return selectValue.trim() || null;
}

function formatCostBasisForDisplay(basis: string | null | undefined): string {
  if (basis == null || !String(basis).trim()) return '—';
  const raw = String(basis).trim();
  if (raw in COST_BASIS_LABEL) return COST_BASIS_LABEL[raw as BudgetCostBasis];
  return raw
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Same widths on every section table so columns line up vertically (table-fixed). */
function SiteBudgetLineTableColGroup() {
  return (
    <colgroup>
      <col className="w-[15%]" />
      <col className="w-[8%]" />
      <col className="w-[6%]" />
      <col className="w-[5%]" />
      <col className="w-[6%]" />
      <col className="w-[5%]" />
      <col className="w-[6%]" />
      <col className="w-[7%]" />
      <col className="w-[7%]" />
      <col className="w-[7%]" />
      <col className="w-[5%]" />
      <col className="w-[11%]" />
      <col className="w-[9%]" />
    </colgroup>
  );
}

function normalizeLineItemsFromServer(items: SiteBudgetLineItem[]): SiteBudgetLineItem[] {
  return items.map((li) => ({
    ...li,
    is_active: (li as SiteBudgetLineItem & { is_active?: boolean }).is_active !== false,
  }));
}

/** Match DB generated columns for client-side merge after edits. */
function recomputeLineItemNumbers(item: SiteBudgetLineItem): Pick<
  SiteBudgetLineItem,
  'total_cost' | 'overhead_amount' | 'cost_with_overhead'
> {
  const total_cost = Number(item.unit_cost) * Number(item.quantity);
  const overhead_amount =
    item.overhead_rate != null ? total_cost * Number(item.overhead_rate) : 0;
  const cost_with_overhead = total_cost + overhead_amount;
  return { total_cost, overhead_amount, cost_with_overhead };
}

interface SiteFinancialsPanelProps {
  studyId: string;
  siteId: string;
  companyId: string;
  siteBudget: SiteBudgetWithLineItems | null;
  /** The name of the study budget this site budget was generated from, if linked. */
  studyBudgetName?: string | null;
  budgetAllocations?: Record<string, number>;
  invoiceAllocationRefsByLine?: Record<string, InvoiceBudgetLineAllocationRef[]>;
  invoices: FinanceInvoiceWithRelations[];
  schedules: PaymentScheduleWithSite[];
  invoiceSites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  financeApprovalTemplateOptions: FinanceApprovalTemplateOption[];
  /** Deep-link: open this sub-tab (e.g. `invoices`) when set from URL. */
  initialFinancialsSubTab?: string | null;
  /** Deep-link: scroll/highlight this invoice row on the Invoices tab. */
  highlightInvoiceId?: string | null;
  /** Study budgets available to seed this site's budget (propagation). */
  studyBudgetOptions?: SiteBudgetStudyOption[];
  /** Human-readable labels for exports (falls back to IDs). */
  siteLabel?: string;
  studyLabel?: string;
}

const SITE_FIN_SUB_TABS = new Set([
  'site-budget',
  'line-items',
  'payment-info',
  'invoices',
  'schedule',
]);

export function SiteFinancialsPanel({
  studyId,
  siteId,
  companyId,
  siteBudget,
  studyBudgetName,
  budgetAllocations = {},
  invoiceAllocationRefsByLine = {},
  invoices,
  schedules,
  invoiceSites,
  financeApprovalTemplateOptions,
  initialFinancialsSubTab,
  highlightInvoiceId,
  studyBudgetOptions = [],
  siteLabel: siteLabelProp,
  studyLabel: studyLabelProp,
}: SiteFinancialsPanelProps) {
  const router = useRouter();
  const [proposed, setProposed] = useState(() =>
    siteBudget ? normalizeBudgetAmountInput(String(siteBudget.proposed_amount)) : ''
  );
  const [approvedAmt, setApprovedAmt] = useState(() =>
    siteBudget?.approved_amount != null
      ? normalizeBudgetAmountInput(String(siteBudget.approved_amount))
      : ''
  );
  const [negotiation, setNegotiation] = useState<SiteNegotiationStatus>(siteBudget?.negotiation_status ?? 'draft');
  const [terms, setTerms] = useState<SitePaymentTermsType>(siteBudget?.payment_terms_type ?? 'invoice');
  const [budgetNotes, setBudgetNotes] = useState(siteBudget?.notes ?? '');
  const [overheadRate, setOverheadRate] = useState(
    siteBudget?.overhead_rate != null ? String(siteBudget.overhead_rate * 100) : ''
  );
  const [applyDefaultOverheadOpen, setApplyDefaultOverheadOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [financialsSubTab, setFinancialsSubTab] = useState('site-budget');

  useEffect(() => {
    const p = initialFinancialsSubTab;
    if (p && SITE_FIN_SUB_TABS.has(p)) setFinancialsSubTab(p);
  }, [initialFinancialsSubTab]);

  const [lineItems, setLineItems] = useState<SiteBudgetLineItem[]>(() =>
    normalizeLineItemsFromServer(siteBudget?.site_budget_line_items ?? [])
  );
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvAppendConfirmItems, setCsvAppendConfirmItems] = useState<SiteBudgetLineCsvRowItem[] | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<SiteBudgetPaymentInfo>(
    (siteBudget?.payment_info as SiteBudgetPaymentInfo) ?? {}
  );

  useEffect(() => {
    setPaymentInfo((siteBudget?.payment_info as SiteBudgetPaymentInfo) ?? {});
  }, [siteBudget?.id, siteBudget?.updated_at]);

  const [addLineOpen, setAddLineOpen] = useState(false);
  const [newSection, setNewSection] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCostBasis, setNewCostBasis] = useState('');
  const [newCostBasisCustom, setNewCostBasisCustom] = useState('');
  const [newUnitCost, setNewUnitCost] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newOverhead, setNewOverhead] = useState('');
  const [newPaidTo, setNewPaidTo] = useState<SiteBudgetLineItemPaidTo>('site');

  const [editLineOpen, setEditLineOpen] = useState(false);
  const [editLineId, setEditLineId] = useState<string | null>(null);
  const [editSection, setEditSection] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCostBasis, setEditCostBasis] = useState('');
  const [editCostBasisCustom, setEditCostBasisCustom] = useState('');
  const [editUnitCost, setEditUnitCost] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editOverhead, setEditOverhead] = useState('');
  const [editPaidTo, setEditPaidTo] = useState<SiteBudgetLineItemPaidTo>('site');
  const [editNotes, setEditNotes] = useState('');

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<PaymentScheduleWithSite | null>(null);
  const [scheduleMilestone, setScheduleMilestone] = useState('');
  const [scheduleAmount, setScheduleAmount] = useState('');
  const [scheduleDue, setScheduleDue] = useState('');
  const [scheduleCurrency, setScheduleCurrency] = useState('USD');
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>('pending');
  const [scheduleToDelete, setScheduleToDelete] = useState<PaymentScheduleWithSite | null>(null);

  const resetScheduleFormFields = () => {
    setScheduleMilestone('');
    setScheduleAmount('');
    setScheduleDue('');
    setScheduleCurrency('USD');
    setScheduleStatus('pending');
  };

  const openAddSchedule = () => {
    setEditingSchedule(null);
    resetScheduleFormFields();
    setScheduleDialogOpen(true);
  };

  const openEditSchedule = (s: PaymentScheduleWithSite) => {
    setEditingSchedule(s);
    setScheduleMilestone(s.milestone_name);
    setScheduleAmount(String(s.amount));
    setScheduleDue(s.due_date ? s.due_date.slice(0, 10) : '');
    setScheduleCurrency(s.currency || 'USD');
    setScheduleStatus(s.status);
    setScheduleDialogOpen(true);
  };

  const closeScheduleDialog = () => {
    setScheduleDialogOpen(false);
    setEditingSchedule(null);
    resetScheduleFormFields();
  };

  const submitScheduleForm = () => {
    const name = scheduleMilestone.trim();
    if (!name) {
      toast.error('Enter a milestone name.');
      return;
    }
    const amt = parseFloat(scheduleAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount greater than zero.');
      return;
    }
    const due = scheduleDue.trim() || undefined;
    const cur = scheduleCurrency.trim() || 'USD';
    if (editingSchedule) {
      startTransition(async () => {
        const { error } = await updateSchedule(editingSchedule.id, studyId, siteId, {
          milestone_name: name,
          amount: amt,
          due_date: due,
          status: scheduleStatus,
          currency: cur,
        });
        if (error) toast.error(error);
        else {
          toast.success('Milestone updated.');
          closeScheduleDialog();
          router.refresh();
        }
      });
    } else {
      startTransition(async () => {
        const { error } = await createSchedule(studyId, siteId, name, amt, due, cur);
        if (error) toast.error(error);
        else {
          toast.success('Milestone added.');
          closeScheduleDialog();
          router.refresh();
        }
      });
    }
  };

  const confirmDeleteSchedule = () => {
    if (!scheduleToDelete) return;
    startTransition(async () => {
      const { error } = await deleteSchedule(scheduleToDelete.id, studyId, siteId);
      if (error) toast.error(error);
      else {
        toast.success('Milestone removed.');
        setScheduleToDelete(null);
        router.refresh();
      }
    });
  };

  const scheduleStatusLabel = (status: ScheduleStatus) =>
    SCHEDULE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;

  const openInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'rejected');
  const openSum = openInvoices.reduce((s, i) => s + Number(i.amount), 0);

  const activeLineItems = useMemo(() => lineItems.filter((i) => i.is_active), [lineItems]);
  const inactiveLineCount = lineItems.length - activeLineItems.length;

  const sections = useMemo(() => {
    const map = new Map<string, SiteBudgetLineItem[]>();
    for (const item of lineItems) {
      const arr = map.get(item.section) ?? [];
      arr.push(item);
      map.set(item.section, arr);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
    }
    return map;
  }, [lineItems]);

  const grandTotal = activeLineItems.reduce((s, i) => s + Number(i.cost_with_overhead), 0);
  const totalBeforeOverhead = activeLineItems.reduce((s, i) => s + Number(i.total_cost), 0);
  const totalInvoiced = Object.values(budgetAllocations).reduce((s, v) => s + v, 0);
  const totalRemaining = grandTotal - totalInvoiced;
  /** Actual (invoiced) on active lines only — aligns grand total proposed with variance math. */
  const grandTotalActualActive = activeLineItems.reduce((s, i) => s + (budgetAllocations[i.id] ?? 0), 0);
  const grandTotalVarianceActive = grandTotal - grandTotalActualActive;

  const exportSections = useMemo(
    () =>
      Array.from(sections.entries()).map(([sectionName, items]) => ({
        sectionName,
        items,
      })),
    [sections]
  );

  const lineItemsExportSummary = useMemo(
    () => ({
      activeCount: activeLineItems.length,
      inactiveCount: inactiveLineCount,
      totalBeforeOverheadActive: totalBeforeOverhead,
      grandTotalActive: grandTotal,
      grandTotalActualActive,
      grandVarianceActive: grandTotalVarianceActive,
    }),
    [
      activeLineItems.length,
      inactiveLineCount,
      totalBeforeOverhead,
      grandTotal,
      grandTotalActualActive,
      grandTotalVarianceActive,
    ]
  );

  const siteLabel = siteLabelProp ?? siteId;
  const studyLabel = studyLabelProp ?? studyId;

  const handleOpenLineItemsPrintReport = () => {
    if (lineItems.length === 0) {
      toast.error('No line items to export.');
      return;
    }
    const html = buildSiteBudgetLinesReportHtml({
      siteLabel,
      studyLabel,
      siteId,
      studyId,
      currency: siteBudget?.currency ?? 'USD',
      sections: exportSections,
      budgetAllocations,
      invoiceRefsByLine: invoiceAllocationRefsByLine,
      summary: lineItemsExportSummary,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) URL.revokeObjectURL(url);
    else win.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
  };

  const handleDownloadLineItemsCsv = () => {
    if (lineItems.length === 0) {
      toast.error('No line items to export.');
      return;
    }
    const csv = buildSiteBudgetLinesDataCsv({
      siteLabel,
      studyLabel,
      siteId,
      studyId,
      currency: siteBudget?.currency ?? 'USD',
      sections: exportSections,
      budgetAllocations,
      invoiceRefsByLine: invoiceAllocationRefsByLine,
      summary: lineItemsExportSummary,
    });
    const slug = siteLabel
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 48);
    const safeSlug = slug || 'site';
    triggerCsvDownload(`site-budget-lines-${safeSlug}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  function remainingColor(budgeted: number, allocated: number): string {
    if (budgeted <= 0) return '';
    const pct = (budgeted - allocated) / budgeted;
    if (pct < 0.1) return 'text-red-600';
    if (pct < 0.5) return 'text-yellow-600';
    return 'text-green-600';
  }

  const saveBudget = () => {
    const p = parseFloat(normalizeBudgetAmountInput(proposed));
    if (Number.isNaN(p) || p < 0) {
      toast.error('Enter a valid proposed budget.');
      return;
    }
    const approvedNorm = approvedAmt.trim() === '' ? '' : normalizeBudgetAmountInput(approvedAmt);
    const a = approvedNorm === '' ? null : parseFloat(approvedNorm);
    if (approvedNorm !== '' && (Number.isNaN(a!) || a! < 0)) {
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
        notes: budgetNotes.trim() || null,
      });
      if (error) toast.error(error);
      else {
        const oh = overheadRate.trim() === '' ? null : parseFloat(overheadRate) / 100;
        await updateSiteBudgetExtras({
          studyId,
          siteId,
          overheadRate: oh,
          paymentInfo: Object.values(paymentInfo).some(Boolean) ? paymentInfo : null,
        });
        toast.success('Site budget saved.');
      }
    });
  };

  const handleUploadBudget = async (file: File) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'image/png',
      'image/jpeg',
    ];
    if (!allowed.includes(file.type)) {
      toast.error('Use Excel, PDF, PNG, or JPEG.');
      return;
    }

    if (!siteBudget?.id) {
      toast.error('Save the site budget first before uploading a document.');
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'xlsx';
      const storagePath = `${companyId}/site-budgets/${siteBudget.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('finance-documents')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        toast.error('Upload failed: ' + uploadError.message);
        setUploading(false);
        return;
      }

      setUploading(false);
      toast.success('Document uploaded. Analyzing...');
      setExtracting(true);

      await updateSiteBudgetExtras({ studyId, siteId, documentPath: storagePath });

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/ai/budget-extract', { method: 'POST', body: formData });
        if (res.ok) {
          const { extracted } = await res.json();
          if (extracted?.lineItems && Array.isArray(extracted.lineItems)) {
            const items = extracted.lineItems.map((li: Record<string, unknown>, i: number) => ({
              section: String(li.section ?? 'General'),
              description: String(li.description ?? ''),
              costBasis: li.costBasis ? String(li.costBasis) : null,
              unitCost: Number(li.unitCost) || 0,
              quantity: Number(li.quantity) || 1,
              overheadRate: li.overheadRate != null ? Number(li.overheadRate) : null,
              paidTo: (['site', 'irb', 'vendor'].includes(String(li.paidTo)) ? String(li.paidTo) : 'site') as SiteBudgetLineItemPaidTo,
              sortOrder: i,
            }));
            const { error } = await bulkInsertSiteBudgetLineItems(siteBudget.id, siteId, items);
            if (error) toast.error(error);
            else toast.success(`${items.length} line items extracted and saved.`);
          }
          if (extracted?.paymentInfo) {
            setPaymentInfo(extracted.paymentInfo as SiteBudgetPaymentInfo);
            await updateSiteBudgetExtras({
              studyId,
              siteId,
              paymentInfo: extracted.paymentInfo as SiteBudgetPaymentInfo,
            });
          }
          window.location.reload();
        } else {
          toast.error('Could not extract budget data. Add line items manually.');
        }
      } catch {
        toast.error('AI extraction failed. Add line items manually.');
      } finally {
        setExtracting(false);
      }
    } catch {
      toast.error('Upload failed.');
      setUploading(false);
    }
  };

  const handleDownloadSiteBudgetCsvTemplate = () => {
    const csv = buildSiteBudgetLineCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-budget-line-items-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runCsvBulkImport = (items: SiteBudgetLineCsvRowItem[]) => {
    if (!siteBudget?.id) {
      toast.error('Save the site budget first before importing a CSV.');
      return;
    }
    setCsvImporting(true);
    startTransition(async () => {
      const { error } = await bulkInsertSiteBudgetLineItems(siteBudget.id, siteId, items);
      setCsvImporting(false);
      if (error) toast.error(error);
      else {
        toast.success(`${items.length} line item(s) imported.`);
        window.location.reload();
      }
    });
  };

  const handleSiteBudgetCsvFile = async (file: File) => {
    if (!siteBudget?.id) {
      toast.error('Save the site budget first before importing a CSV.');
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error('Could not read the CSV file.');
      return;
    }
    const { items, errors } = parseSiteBudgetLineCsv(text);
    if (errors.length > 0) {
      const lines = errors
        .slice(0, 12)
        .map((e) => (e.row === 0 ? e.message : `Row ${e.row}: ${e.message}`));
      const suffix =
        errors.length > 12 ? `\n…${errors.length - 12} more issue(s).` : '';
      toast.error('CSV could not be imported.', {
        description: `${lines.join('\n')}${suffix}`,
      });
      return;
    }
    if (items.length === 0) {
      toast.error('No data rows found in the CSV.');
      return;
    }
    if (lineItems.length > 0) {
      setCsvAppendConfirmItems(items);
      return;
    }
    runCsvBulkImport(items);
  };

  const handleViewDocument = async () => {
    if (!siteBudget?.document_path) return;
    const { url, error } = await getSiteBudgetDocumentUrl(siteBudget.document_path);
    if (error || !url) {
      toast.error('Could not open document.');
      return;
    }
    window.open(url, '_blank');
  };

  const handleAddLineItem = () => {
    if (!siteBudget?.id) {
      toast.error('Save the site budget first.');
      return;
    }
    if (!newSection.trim() || !newDesc.trim()) {
      toast.error('Section and description are required.');
      return;
    }
    const uc = parseFloat(newUnitCost);
    const qty = parseInt(newQuantity);
    if (Number.isNaN(uc) || Number.isNaN(qty)) {
      toast.error('Enter valid unit cost and quantity.');
      return;
    }
    const oh = newOverhead.trim() === '' ? null : parseFloat(newOverhead) / 100;
    startTransition(async () => {
      const { error } = await addSiteBudgetLineItem(siteBudget.id, siteId, {
        section: newSection.trim(),
        description: newDesc.trim(),
        costBasis: costBasisFormPayload(newCostBasis, newCostBasisCustom),
        unitCost: uc,
        quantity: qty,
        overheadRate: oh,
        paidTo: newPaidTo,
      });
      if (error) toast.error(error);
      else {
        toast.success('Line item added.');
        setAddLineOpen(false);
        setNewSection('');
        setNewDesc('');
        setNewCostBasis('');
        setNewCostBasisCustom('');
        setNewUnitCost('');
        setNewQuantity('1');
        setNewOverhead('');
        setNewPaidTo('site');
        window.location.reload();
      }
    });
  };

  const openEditLine = (item: SiteBudgetLineItem) => {
    setEditLineId(item.id);
    setEditSection(item.section);
    setEditDesc(item.description);
    const raw = (item.cost_basis ?? '').trim();
    if (raw && !(raw in COST_BASIS_LABEL)) {
      setEditCostBasis(COST_BASIS_CUSTOM);
      setEditCostBasisCustom(raw);
    } else {
      setEditCostBasis(raw);
      setEditCostBasisCustom('');
    }
    setEditUnitCost(String(item.unit_cost));
    setEditQuantity(String(item.quantity));
    setEditOverhead(item.overhead_rate != null ? String(Number(item.overhead_rate) * 100) : '');
    setEditPaidTo(item.paid_to);
    setEditNotes(item.notes ?? '');
    setEditLineOpen(true);
  };

  const handleSaveEditLine = () => {
    if (!editLineId || !siteBudget?.id) return;
    if (!editSection.trim() || !editDesc.trim()) {
      toast.error('Section and description are required.');
      return;
    }
    const uc = parseFloat(editUnitCost);
    const qty = parseInt(editQuantity, 10);
    if (Number.isNaN(uc) || Number.isNaN(qty)) {
      toast.error('Enter valid unit cost and quantity.');
      return;
    }
    const oh = editOverhead.trim() === '' ? null : parseFloat(editOverhead) / 100;
    startTransition(async () => {
      const { error } = await updateSiteBudgetLineItem(editLineId, siteId, {
        section: editSection.trim(),
        description: editDesc.trim(),
        costBasis: costBasisFormPayload(editCostBasis, editCostBasisCustom),
        unitCost: uc,
        quantity: qty,
        overheadRate: oh,
        paidTo: editPaidTo,
        notes: editNotes.trim() || null,
      });
      if (error) {
        toast.error(error);
        return;
      }
      setLineItems((prev) =>
        prev.map((li) => {
          if (li.id !== editLineId) return li;
          const merged: SiteBudgetLineItem = {
            ...li,
            section: editSection.trim(),
            description: editDesc.trim(),
            cost_basis: costBasisFormPayload(editCostBasis, editCostBasisCustom),
            unit_cost: uc,
            quantity: qty,
            overhead_rate: oh,
            paid_to: editPaidTo,
            notes: editNotes.trim() || null,
          };
          return { ...merged, ...recomputeLineItemNumbers(merged) };
        })
      );
      toast.success('Line item updated.');
      setEditLineOpen(false);
      setEditLineId(null);
    });
  };

  const handleSetLineItemActive = (id: string, isActive: boolean, onSuccess?: () => void) => {
    startTransition(async () => {
      const { error } = await updateSiteBudgetLineItem(id, siteId, { isActive });
      if (error) {
        toast.error(error);
        return;
      }
      setLineItems((prev) =>
        prev.map((li) => (li.id === id ? { ...li, is_active: isActive } : li))
      );
      toast.success(isActive ? 'Line item reactivated.' : 'Line item marked inactive.');
      onSuccess?.();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm print:hidden">
        <div className="rounded-md border px-3 py-2 bg-muted/30">
          <span className="text-muted-foreground">Open invoices (this site): </span>
          <span className="font-medium">{formatCurrency(openSum)}</span>
        </div>
        <Button variant="link" size="sm" className="text-xs h-auto p-0" asChild>
          <Link href={`/protected/studies/${studyId}`}>View study Financials tab</Link>
        </Button>
      </div>

      {/* Stable id scopes Radix tab ids (avoids SSR/client hydration mismatches). Default tab: configure budget before line items. */}
      <Tabs
        id={`site-financials-panel-${siteId}`}
        value={financialsSubTab}
        onValueChange={setFinancialsSubTab}
        className="flex flex-col gap-4"
      >
        <TabsList className="w-full min-w-0 justify-start overflow-x-auto rounded-none border-b border-border bg-transparent p-0 h-auto flex-nowrap gap-0 print:hidden">
          <TabsTrigger value="site-budget" className="text-xs shrink-0 px-3 py-2">
            Site budget
          </TabsTrigger>
          <TabsTrigger value="line-items" className="text-xs shrink-0 px-3 py-2">
            Line items
          </TabsTrigger>
          <TabsTrigger value="payment-info" className="text-xs shrink-0 px-3 py-2">
            Payment info
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs shrink-0 px-3 py-2 gap-1.5">
            Invoices
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal tabular-nums">
              {invoices.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs shrink-0 px-3 py-2 gap-1.5">
            Schedule
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal tabular-nums">
              {schedules.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site-budget" className="mt-0 outline-none">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Site Budget</CardTitle>
              {siteBudget && (
                <Badge variant="outline" className="text-[10px]">v{siteBudget.version ?? 1}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budget negotiation and overhead configuration for this site.
            </p>
          </div>
          {siteBudget && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" size="sm" className="text-xs" />}>
                Create Amendment
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Create Budget Amendment</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create a new version of the budget (v{(siteBudget.version ?? 1) + 1}) with all current line items copied. The current version will become read-only.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      startTransition(async () => {
                        const { error } = await createSiteBudgetAmendment(studyId, siteId);
                        if (error) toast.error(error);
                        else {
                          toast.success('Amendment created.');
                          window.location.reload();
                        }
                      });
                    }}
                  >
                    Create
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        {siteBudget?.study_budget_id && (
          <div className="mx-4 mb-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-blue-800 dark:text-blue-300">
                Generated from study budget{studyBudgetName ? `: ${studyBudgetName}` : ''}
              </span>
              <Badge variant="secondary" className="text-[10px]">Linked</Badge>
            </div>
            <BudgetResyncDiffDialog
              siteId={siteId}
              studyId={studyId}
              siteBudgetId={siteBudget.id}
              studyBudgetId={siteBudget.study_budget_id}
              studyBudgetName={studyBudgetName ?? 'Study Budget'}
              defaultEnrollment={5}
              onSuccess={() => window.location.reload()}
            />
          </div>
        )}
        <CardContent className="space-y-3 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Proposed budget</Label>
              <Input
                className="text-xs h-9"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={formatBudgetAmountWithCommas(proposed)}
                onChange={(e) => setProposed(normalizeBudgetAmountInput(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Approved budget (optional)</Label>
              <Input
                className="text-xs h-9"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={formatBudgetAmountWithCommas(approvedAmt)}
                onChange={(e) => setApprovedAmt(normalizeBudgetAmountInput(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Negotiation status</Label>
              <Select value={negotiation} onValueChange={(v) => setNegotiation(v as SiteNegotiationStatus)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue getDisplayLabel={(v) => v && v in NEGOTIATION_LABEL ? NEGOTIATION_LABEL[v as SiteNegotiationStatus] : null} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(NEGOTIATION_LABEL) as SiteNegotiationStatus[]).map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">{NEGOTIATION_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment terms</Label>
              <Select value={terms} onValueChange={(v) => setTerms(v as SitePaymentTermsType)}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue getDisplayLabel={(v) => v && v in PAYMENT_TERMS_LABEL ? PAYMENT_TERMS_LABEL[v as SitePaymentTermsType] : null} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice" className="text-xs">{PAYMENT_TERMS_LABEL.invoice}</SelectItem>
                  <SelectItem value="per_visit" className="text-xs">{PAYMENT_TERMS_LABEL.per_visit}</SelectItem>
                  <SelectItem value="milestone" className="text-xs">{PAYMENT_TERMS_LABEL.milestone}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs">Default overhead %</Label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Input
                  className="text-xs h-9 flex-1 min-w-0"
                  value={overheadRate}
                  onChange={(e) => setOverheadRate(e.target.value)}
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="e.g. 39"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs shrink-0 whitespace-nowrap"
                  disabled={!siteBudget?.id || lineItems.length === 0}
                  onClick={() => {
                    if (overheadRate.trim() !== '') {
                      const v = parseFloat(overheadRate);
                      if (Number.isNaN(v) || v < 0 || v > 100) {
                        toast.error('Enter a valid default overhead % (0–100), or clear the field.');
                        return;
                      }
                    }
                    setApplyDefaultOverheadOpen(true);
                  }}
                >
                  Apply to all line items
                </Button>
              </div>
              <AlertDialog open={applyDefaultOverheadOpen} onOpenChange={setApplyDefaultOverheadOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apply default overhead to all lines?</AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-balance">
                      <span className="block">
                        This sets the overhead rate on every budget line item to match the <strong>Default overhead %</strong>{' '}
                        {overheadRate.trim() === '' ? (
                          <>field (empty — lines will have no overhead).</>
                        ) : (
                          <>
                            field (<strong>{overheadRate.trim()}%</strong>). Direct and total amounts will update.
                          </>
                        )}
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        let rate: number | null = null;
                        if (overheadRate.trim() !== '') {
                          const v = parseFloat(overheadRate);
                          if (Number.isNaN(v) || v < 0 || v > 100) {
                            toast.error('Enter a valid default overhead % (0–100), or clear the field.');
                            return;
                          }
                          rate = v / 100;
                        }
                        if (!siteBudget?.id) return;
                        startTransition(async () => {
                          const { updated, error } = await applySiteDefaultOverheadToLineItems(
                            siteBudget.id,
                            siteId,
                            rate
                          );
                          if (error) {
                            toast.error(error);
                            return;
                          }
                          setLineItems((prev) =>
                            prev.map((li) => {
                              const merged = { ...li, overhead_rate: rate };
                              return { ...merged, ...recomputeLineItemNumbers(merged) };
                            })
                          );
                          toast.success(
                            updated === 0
                              ? 'No line items were updated.'
                              : `Updated overhead on ${updated} line item(s).`
                          );
                          setApplyDefaultOverheadOpen(false);
                          router.refresh();
                        });
                      }}
                    >
                      Apply
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs min-h-[60px]" value={budgetNotes} onChange={(e) => setBudgetNotes(e.target.value)} />
          </div>
          <Button type="button" size="sm" className="text-xs" onClick={saveBudget}>
            Save site budget
          </Button>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="line-items" className="mt-0 outline-none">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Budget Line Items</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {lineItems.length > 0
                ? `${activeLineItems.length} active${inactiveLineCount > 0 ? `, ${inactiveLineCount} inactive` : ''} — ${formatCurrency(totalBeforeOverhead)} before overhead — ${formatCurrency(grandTotal)} with overhead (active lines only)`
                : siteBudget
                  ? 'Upload a budget document, import a CSV, or add line items manually.'
                  : studyBudgetOptions.length > 0
                    ? 'Create a linked budget from a study budget below, or add lines manually, import CSV, or use AI upload after you save a site budget.'
                    : 'Create a study budget on the study Financials tab first, then use Create from study budget here or Propagate to sites from the study. You can also build this budget manually after saving an empty site budget, if needed.'}
            </p>
            {!siteBudget && (
              <p className="text-xs text-muted-foreground mt-2">
                <Link
                  href={`/protected/studies/${studyId}?tab=financials`}
                  className="text-primary underline-offset-4 hover:underline font-medium"
                >
                  Open study Financials
                </Link>{' '}
                to create or edit the study master and propagate to multiple sites at once.
              </p>
            )}
          </div>
          <div className="shrink-0 print:hidden">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!siteBudget && studyBudgetOptions.length > 0 && (
                <SiteBudgetFromStudyDialog
                  studyId={studyId}
                  siteId={siteId}
                  studyBudgets={studyBudgetOptions}
                  onSuccess={() => router.refresh()}
                />
              )}
              {siteBudget?.document_path && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={handleViewDocument}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> View original
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={lineItems.length === 0}
                title="Opens a print-friendly report in a new tab; save as PDF from the print dialog."
                onClick={handleOpenLineItemsPrintReport}
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Printable report
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={lineItems.length === 0}
                onClick={handleDownloadLineItemsCsv}
              >
                <FileDown className="h-3.5 w-3.5 mr-1" />
                Line items CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleDownloadSiteBudgetCsvTemplate}
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
                  disabled={csvImporting || uploading || extracting}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleSiteBudgetCsvFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <label className="cursor-pointer inline-flex">
                <span className="inline-flex shrink-0 items-center justify-center gap-1 rounded-[min(var(--radius-md),10px)] border border-border bg-background px-2.5 h-8 text-xs font-medium shadow-xs hover:bg-muted hover:text-foreground transition-all select-none dark:border-input dark:bg-input/30 dark:hover:bg-input/50">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {extracting ? 'Analyzing...' : 'Upload budget'}
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  disabled={uploading || extracting || csvImporting}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadBudget(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
              <DialogTrigger render={<Button size="sm" className="text-xs" />}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add item
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">Add Line Item</DialogTitle>
                  <DialogDescription className="text-xs">Add a budget line item to a section.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Section</Label>
                    <Input className="text-xs h-9" placeholder="e.g., IRB Fees, Additional Fees" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input className="text-xs h-9" placeholder="e.g., Site Monitoring Visit" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cost basis (optional)</Label>
                    <Select
                      value={newCostBasis === COST_BASIS_CUSTOM ? COST_BASIS_CUSTOM : newCostBasis}
                      onValueChange={(v) => {
                        if (v === COST_BASIS_CUSTOM) {
                          setNewCostBasis(COST_BASIS_CUSTOM);
                        } else {
                          setNewCostBasis(v);
                          setNewCostBasisCustom('');
                        }
                      }}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue
                          placeholder="Choose cost basis"
                          getDisplayLabel={(v) => {
                            if (v == null || v === '') return null;
                            if (v === COST_BASIS_CUSTOM) return 'Other (custom)';
                            return v in COST_BASIS_LABEL
                              ? COST_BASIS_LABEL[v as BudgetCostBasis]
                              : v;
                          }}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="text-xs">
                          None
                        </SelectItem>
                        {(Object.keys(COST_BASIS_LABEL) as BudgetCostBasis[]).map((k) => (
                          <SelectItem key={k} value={k} className="text-xs">
                            {COST_BASIS_LABEL[k]}
                          </SelectItem>
                        ))}
                        <SelectItem value={COST_BASIS_CUSTOM} className="text-xs">
                          Other…
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {newCostBasis === COST_BASIS_CUSTOM ? (
                      <Input
                        className="text-xs h-9"
                        placeholder="Describe cost basis (e.g. Per day)"
                        value={newCostBasisCustom}
                        onChange={(e) => setNewCostBasisCustom(e.target.value)}
                      />
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Unit cost</Label>
                      <Input className="text-xs h-9" type="number" step="0.01" value={newUnitCost} onChange={(e) => setNewUnitCost(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quantity</Label>
                      <Input className="text-xs h-9" type="number" min="1" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Overhead %</Label>
                      <Input className="text-xs h-9" type="number" step="1" placeholder="e.g. 39" value={newOverhead} onChange={(e) => setNewOverhead(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Paid to</Label>
                    <Select value={newPaidTo} onValueChange={(v) => setNewPaidTo(v as SiteBudgetLineItemPaidTo)}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue getDisplayLabel={(v) => v && v in PAID_TO_LABEL ? PAID_TO_LABEL[v as SiteBudgetLineItemPaidTo] : null} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="site" className="text-xs">Site</SelectItem>
                        <SelectItem value="irb" className="text-xs">IRB</SelectItem>
                        <SelectItem value="vendor" className="text-xs">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setAddLineOpen(false)}>Cancel</Button>
                  <Button size="sm" className="text-xs" onClick={handleAddLineItem}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lineItems.length > 0 && totalInvoiced > 0 && (
            <div className="flex items-center gap-4 mb-4 rounded-md border p-3 bg-muted/30">
              <div className="text-xs">
                <span className="text-muted-foreground">Proposed total: </span>
                <span className="font-semibold">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Actual (invoiced): </span>
                <span className="font-semibold">{formatCurrency(totalInvoiced)}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Variance: </span>
                <span className={`font-semibold ${remainingColor(grandTotal, totalInvoiced)}`}>
                  {formatCurrency(totalRemaining)}
                </span>
              </div>
              <div className="flex-1">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${grandTotal > 0 ? Math.min((totalInvoiced / grandTotal) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No line items yet. Upload a budget document to auto-populate, import a CSV template, or add items manually.
            </p>
          ) : (
            <div className="space-y-4">
              {Array.from(sections.entries()).map(([section, items]) => {
                const sectionTotal = items.reduce((s, i) => s + Number(i.cost_with_overhead), 0);
                const sectionActual = items.reduce((s, i) => s + (budgetAllocations[i.id] ?? 0), 0);
                const sectionVariance = sectionTotal - sectionActual;
                return (
                  <div key={section} className="print:break-inside-avoid">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-1">
                      <h4 className="text-xs font-semibold text-foreground">{section}</h4>
                      <span className="text-[10px] text-muted-foreground text-right">
                        Subtotal — Proposed: <span className="tabular-nums">{formatCurrency(sectionTotal)}</span>
                        {' · '}
                        Actual: <span className="tabular-nums">{formatCurrency(sectionActual)}</span>
                        {' · '}
                        Variance:{' '}
                        <span
                          className={`tabular-nums font-medium ${remainingColor(sectionTotal, sectionActual)}`}
                        >
                          {formatCurrency(sectionVariance)}
                        </span>
                      </span>
                    </div>
                    <div className="print-table-container rounded-md border overflow-x-auto">
                      <Table className="table-fixed min-w-[1150px]">
                        <SiteBudgetLineTableColGroup />
                        <TableHeader>
                          <TableRow className="h-auto min-h-10 hover:bg-transparent">
                            <TableHead className="text-[10px] min-w-0">Description</TableHead>
                            <TableHead className="text-[10px] min-w-0 text-center">Cost Basis</TableHead>
                            <TableHead className="text-[10px] text-right">Unit Cost</TableHead>
                            <TableHead className="text-[10px] text-center">Qty</TableHead>
                            <TableHead className="text-[10px] text-right">Total</TableHead>
                            <TableHead className="text-[10px] text-center whitespace-normal leading-tight align-bottom h-auto min-h-10 py-2">
                              Overhead %
                            </TableHead>
                            <TableHead className="text-[10px] text-center whitespace-normal leading-tight align-bottom h-auto min-h-10 py-2">
                              Overhead Amount
                            </TableHead>
                            <TableHead className="text-[10px] text-center whitespace-normal leading-tight align-bottom h-auto min-h-10 py-2">
                              Cost + Overhead
                            </TableHead>
                            <TableHead className="text-[10px] text-center whitespace-normal leading-tight align-bottom h-auto min-h-10 py-2">
                              Actual (invoiced)
                            </TableHead>
                            <TableHead className="text-[10px] text-center">Variance</TableHead>
                            <TableHead className="text-[10px] text-center">Paid To</TableHead>
                            <TableHead className="text-[10px] min-w-0 text-center">From invoices</TableHead>
                            <TableHead className="text-[10px] p-1 border-r-0 text-center" aria-label="Actions" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow
                              key={item.id}
                              className={!item.is_active ? 'bg-muted/20 opacity-85' : undefined}
                            >
                              <TableCell className="text-xs min-w-0 max-w-0" title={item.description}>
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="truncate">{item.description}</span>
                                  {!item.is_active && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[8px] px-1 py-0 shrink-0 font-normal border-yellow-400/80 bg-yellow-100 text-yellow-950 dark:border-yellow-700 dark:bg-yellow-950/70 dark:text-yellow-100"
                                    >
                                      Inactive
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell
                                className="text-xs text-muted-foreground min-w-0 truncate text-center align-middle"
                                title={item.cost_basis != null ? formatCostBasisForDisplay(item.cost_basis) : undefined}
                              >
                                {formatCostBasisForDisplay(item.cost_basis)}
                              </TableCell>
                              <TableCell className="text-xs text-right tabular-nums align-middle">
                                {formatCurrency(item.unit_cost)}
                              </TableCell>
                              <TableCell className="text-xs text-center tabular-nums align-middle">{item.quantity}</TableCell>
                              <TableCell className="text-xs text-right tabular-nums align-middle">
                                {formatCurrency(item.total_cost)}
                              </TableCell>
                              <TableCell className="text-xs text-center align-middle">{formatPercent(item.overhead_rate)}</TableCell>
                              <TableCell className="text-xs text-center tabular-nums align-middle">
                                {formatCurrency(item.overhead_amount)}
                              </TableCell>
                              <TableCell className="text-xs text-center font-medium tabular-nums align-middle">
                                {formatCurrency(item.cost_with_overhead)}
                              </TableCell>
                              <TableCell
                                className="text-xs text-center tabular-nums align-middle"
                                title="Amount allocated from invoices to this line"
                              >
                                {formatCurrency(budgetAllocations[item.id] ?? 0)}
                              </TableCell>
                              <TableCell
                                className={`text-xs text-center font-medium tabular-nums align-middle ${remainingColor(Number(item.cost_with_overhead), budgetAllocations[item.id] ?? 0)}`}
                                title="Cost + Overhead minus actual (invoiced)"
                              >
                                {formatCurrency(Number(item.cost_with_overhead) - (budgetAllocations[item.id] ?? 0))}
                              </TableCell>
                              <TableCell className="text-xs text-center align-middle">
                                <div className="flex justify-center">
                                  <Badge variant="outline" className="text-[9px]">{PAID_TO_LABEL[item.paid_to]}</Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-[10px] text-muted-foreground leading-snug align-middle min-w-0 text-center">
                                {(() => {
                                  const refs = [...(invoiceAllocationRefsByLine[item.id] ?? [])].sort((a, b) =>
                                    a.external_invoice_id.localeCompare(b.external_invoice_id, undefined, {
                                      numeric: true,
                                    })
                                  );
                                  if (refs.length === 0) return '—';
                                  return (
                                    <ul className="list-none space-y-0.5 m-0 p-0 text-center">
                                      {refs.map((r) => (
                                        <li key={r.invoice_id} className="min-w-0">
                                          <Link
                                            href={`/protected/sites/${siteId}?tab=financials&siteFinTab=invoices&invoice=${encodeURIComponent(r.invoice_id)}`}
                                            className="text-primary hover:underline truncate block w-full text-center"
                                            title={`View invoice ${r.external_invoice_id}`}
                                          >
                                            {r.external_invoice_id}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="p-1 border-r-0 align-middle">
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 shrink-0 px-2 text-xs"
                                    onClick={() => openEditLine(item)}
                                  >
                                    Edit
                                  </Button>
                                  {!item.is_active && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 shrink-0 px-2 text-xs"
                                      onClick={() => handleSetLineItemActive(item.id, true)}
                                    >
                                      Reactivate
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-col items-end gap-0.5 text-sm pt-2 border-t">
                <div className="font-semibold tabular-nums">
                  Grand total (active lines) — Proposed: {formatCurrency(grandTotal)}
                  {' · '}
                  Actual: {formatCurrency(grandTotalActualActive)}
                  {' · '}
                  Variance:{' '}
                  <span className={remainingColor(grandTotal, grandTotalActualActive)}>
                    {formatCurrency(grandTotalVarianceActive)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <Dialog
          open={editLineOpen}
          onOpenChange={(open) => {
            setEditLineOpen(open);
            if (!open) setEditLineId(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Edit line item</DialogTitle>
              <DialogDescription className="text-xs">
                Update this budget line. Inactive lines can still be edited.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Section</Label>
                <Input
                  className="text-xs h-9"
                  placeholder="e.g., IRB Fees"
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input
                  className="text-xs h-9"
                  placeholder="Line label"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cost basis (optional)</Label>
                <Select
                  value={editCostBasis === COST_BASIS_CUSTOM ? COST_BASIS_CUSTOM : editCostBasis}
                  onValueChange={(v) => {
                    if (v === COST_BASIS_CUSTOM) {
                      setEditCostBasis(COST_BASIS_CUSTOM);
                    } else {
                      setEditCostBasis(v);
                      setEditCostBasisCustom('');
                    }
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue
                      placeholder="Choose cost basis"
                      getDisplayLabel={(v) => {
                        if (v == null || v === '') return null;
                        if (v === COST_BASIS_CUSTOM) return 'Other (custom)';
                        return v in COST_BASIS_LABEL
                          ? COST_BASIS_LABEL[v as BudgetCostBasis]
                          : v;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-xs">
                      None
                    </SelectItem>
                    {(Object.keys(COST_BASIS_LABEL) as BudgetCostBasis[]).map((k) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {COST_BASIS_LABEL[k]}
                      </SelectItem>
                    ))}
                    <SelectItem value={COST_BASIS_CUSTOM} className="text-xs">
                      Other…
                    </SelectItem>
                  </SelectContent>
                </Select>
                {editCostBasis === COST_BASIS_CUSTOM ? (
                  <Input
                    className="text-xs h-9"
                    placeholder="Describe cost basis (e.g. Per day)"
                    value={editCostBasisCustom}
                    onChange={(e) => setEditCostBasisCustom(e.target.value)}
                  />
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Unit cost</Label>
                  <Input
                    className="text-xs h-9"
                    type="number"
                    step="0.01"
                    value={editUnitCost}
                    onChange={(e) => setEditUnitCost(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    className="text-xs h-9"
                    type="number"
                    min="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Overhead %</Label>
                  <Input
                    className="text-xs h-9"
                    type="number"
                    step="1"
                    placeholder="e.g. 39"
                    value={editOverhead}
                    onChange={(e) => setEditOverhead(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Paid to</Label>
                <Select value={editPaidTo} onValueChange={(v) => setEditPaidTo(v as SiteBudgetLineItemPaidTo)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue
                      getDisplayLabel={(v) =>
                        v && v in PAID_TO_LABEL ? PAID_TO_LABEL[v as SiteBudgetLineItemPaidTo] : null
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site" className="text-xs">
                      Site
                    </SelectItem>
                    <SelectItem value="irb" className="text-xs">
                      IRB
                    </SelectItem>
                    <SelectItem value="vendor" className="text-xs">
                      Vendor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  className="text-xs min-h-[52px]"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="sm:flex-row sm:items-center sm:justify-between sm:gap-x-4">
              <div className="flex justify-start">
                {editLineId &&
                  lineItems.find((li) => li.id === editLineId)?.is_active && (
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        Mark inactive
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mark line inactive?</AlertDialogTitle>
                          <AlertDialogDescription>
                            &ldquo;
                            {editDesc.trim() ||
                              lineItems.find((li) => li.id === editLineId)?.description ||
                              'This line'}
                            &rdquo; will stay on the budget for history but won&apos;t count toward
                            totals. You can reactivate it later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="text-xs"
                            onClick={() =>
                              editLineId &&
                              handleSetLineItemActive(editLineId, false, () => {
                                setEditLineOpen(false);
                                setEditLineId(null);
                              })
                            }
                          >
                            Mark inactive
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
              </div>
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-end">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditLineOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="text-xs" onClick={handleSaveEditLine}>
                  Save
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
        </TabsContent>

        <TabsContent value="payment-info" className="mt-0 outline-none">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Information</CardTitle>
          <p className="text-xs text-muted-foreground">
            Invoice contacts and payee details for site compensation (stored on this site budget).
          </p>
        </CardHeader>
        <CardContent className="space-y-4 max-w-3xl px-4">
          <div className="rounded-md border border-border overflow-hidden">
            <div className="bg-primary/10 px-3 py-2 text-center">
              <span className="text-xs font-semibold tracking-wide text-foreground">Additional terms</span>
            </div>
            <div className="p-4 space-y-4 bg-card">
              <div>
                <div className="bg-muted/60 px-3 py-1.5 rounded-t-md border border-b-0 border-border">
                  <span className="text-xs font-semibold text-foreground">Invoice submission and inquiries</span>
                </div>
                <div className="rounded-b-md border border-border p-3 space-y-3 bg-background">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <Input
                        className="text-xs h-9"
                        type="email"
                        autoComplete="email"
                        value={paymentInfo.invoice_submission_email ?? ''}
                        onChange={(e) =>
                          setPaymentInfo((p) => ({ ...p, invoice_submission_email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email cc</Label>
                      <Input
                        className="text-xs h-9"
                        type="text"
                        autoComplete="off"
                        placeholder="Optional"
                        value={paymentInfo.invoice_submission_email_cc ?? ''}
                        onChange={(e) =>
                          setPaymentInfo((p) => ({ ...p, invoice_submission_email_cc: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-muted/60 px-3 py-1.5 rounded-t-md border border-b-0 border-border space-y-0.5">
                  <span className="text-xs font-semibold text-foreground block">Payee for compensation</span>
                  <span className="text-[10px] text-muted-foreground leading-snug">
                    Site payment checks are mailed to the payee and address below, unless bank wire is used.
                  </span>
                </div>
                <div className="rounded-b-md border border-border p-3 space-y-3 bg-background">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Payee to appear on check</Label>
                      <Input
                        className="text-xs h-9"
                        value={paymentInfo.payee_name ?? ''}
                        onChange={(e) => setPaymentInfo((p) => ({ ...p, payee_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tax I.D. number</Label>
                      <Input
                        className="text-xs h-9"
                        value={paymentInfo.tax_id ?? ''}
                        onChange={(e) => setPaymentInfo((p) => ({ ...p, tax_id: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground block">
                        Bank wire
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Routing number</Label>
                          <Input
                            className="text-xs h-9"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={34}
                            placeholder="e.g. 9-digit ABA (US)"
                            value={paymentInfo.routing_number ?? ''}
                            onChange={(e) =>
                              setPaymentInfo((p) => ({ ...p, routing_number: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Account number</Label>
                          <Input
                            className="text-xs h-9"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={34}
                            value={paymentInfo.account_number ?? ''}
                            onChange={(e) =>
                              setPaymentInfo((p) => ({ ...p, account_number: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">SWIFT / BIC</Label>
                          <Input
                            className="text-xs h-9"
                            autoComplete="off"
                            maxLength={11}
                            placeholder="8–11 characters"
                            value={paymentInfo.swift_bic ?? ''}
                            onChange={(e) =>
                              setPaymentInfo((p) => ({
                                ...p,
                                swift_bic: e.target.value.toUpperCase(),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Additional wire instructions (optional)</Label>
                          <Textarea
                            className="text-xs min-h-[72px] resize-y"
                            placeholder="Any other bank or wire notes not covered above"
                            value={paymentInfo.bank_wire_info ?? ''}
                            onChange={(e) =>
                              setPaymentInfo((p) => ({ ...p, bank_wire_info: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative py-2">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
                    <div className="relative flex justify-center">
                      <span className="bg-background px-3 text-xs font-semibold text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center -mt-1">Mailing address for checks</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 sm:pl-2 border-l-2 border-primary/20">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Mail to the attention of</Label>
                      <Input
                        className="text-xs h-9"
                        value={paymentInfo.mail_to ?? ''}
                        onChange={(e) => setPaymentInfo((p) => ({ ...p, mail_to: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Institution</Label>
                      <Input
                        className="text-xs h-9"
                        value={paymentInfo.institution ?? ''}
                        onChange={(e) => setPaymentInfo((p) => ({ ...p, institution: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Department</Label>
                      <Input
                        className="text-xs h-9"
                        value={paymentInfo.department ?? ''}
                        onChange={(e) => setPaymentInfo((p) => ({ ...p, department: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Address</Label>
                      <Input
                        className="text-xs h-9"
                        value={paymentInfo.address ?? ''}
                        onChange={(e) => setPaymentInfo((p) => ({ ...p, address: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">City, State, Zip</Label>
                      <Input
                        className="text-xs h-9"
                        value={paymentInfo.city_state_zip ?? ''}
                        onChange={(e) => setPaymentInfo((p) => ({ ...p, city_state_zip: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            className="text-xs"
            onClick={() => {
              startTransition(async () => {
                const routingDigits = (paymentInfo.routing_number ?? '').replace(/\D/g, '');
                const routingUnusual =
                  (paymentInfo.routing_number ?? '').trim().length > 0 &&
                  routingDigits.length !== 9;
                const { error } = await updateSiteBudgetExtras({
                  studyId,
                  siteId,
                  paymentInfo: Object.values(paymentInfo).some(Boolean) ? paymentInfo : null,
                });
                if (error) {
                  toast.error(error);
                  return;
                }
                if (routingUnusual) {
                  toast.success('Payment information saved.', {
                    description:
                      'Routing number is usually 9 digits for US banks; confirm if this is an international format.',
                  });
                } else {
                  toast.success('Payment information saved.');
                }
              });
            }}
          >
            Save payment info
          </Button>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-0 outline-none">
          <FinanceInvoicesSection
            studyId={studyId}
            companyId={companyId}
            invoices={invoices}
            sites={invoiceSites}
            approvalTemplateOptions={financeApprovalTemplateOptions}
            fixedSiteId={siteId}
            invoiceListScope="site"
            highlightInvoiceId={highlightInvoiceId ?? undefined}
            onChanged={() => router.refresh()}
          />
        </TabsContent>

        <TabsContent value="schedule" className="mt-0 outline-none space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Payment Schedule</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Milestone-based payments for this site.</p>
              </div>
              <Button type="button" size="sm" className="text-xs shrink-0" onClick={openAddSchedule}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add milestone
              </Button>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No milestone rows yet. Use Add milestone to record expected payments (for example startup or enrollment milestones).
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Milestone</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs">Due</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right p-1 border-r-0" aria-label="Actions" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">{s.milestone_name}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">
                            {formatCurrency(s.amount, s.currency)}
                          </TableCell>
                          <TableCell className="text-xs">{s.due_date ?? '—'}</TableCell>
                          <TableCell className="text-xs">{scheduleStatusLabel(s.status)}</TableCell>
                          <TableCell className="p-1 border-r-0 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 shrink-0 px-2 text-xs"
                                onClick={() => openEditSchedule(s)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => setScheduleToDelete(s)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog
            open={scheduleDialogOpen}
            onOpenChange={(open) => {
              if (!open) closeScheduleDialog();
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {editingSchedule ? 'Edit milestone' : 'Add milestone'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {editingSchedule
                    ? 'Update this payment milestone for the site.'
                    : 'Create a milestone payment row for this site (separate from budget line items and finance invoices).'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Milestone name</Label>
                  <Input
                    className="text-xs h-9"
                    value={scheduleMilestone}
                    onChange={(e) => setScheduleMilestone(e.target.value)}
                    placeholder="e.g. First subject enrolled"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      className="text-xs h-9"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={scheduleAmount}
                      onChange={(e) => setScheduleAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Input
                      className="text-xs h-9"
                      value={scheduleCurrency}
                      onChange={(e) => setScheduleCurrency(e.target.value)}
                      placeholder="USD"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Due date (optional)</Label>
                  <Input
                    className="text-xs h-9"
                    type="date"
                    value={scheduleDue}
                    onChange={(e) => setScheduleDue(e.target.value)}
                  />
                </div>
                {editingSchedule && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={scheduleStatus}
                      onValueChange={(v) => setScheduleStatus(v as ScheduleStatus)}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue
                          getDisplayLabel={(v) =>
                            v && SCHEDULE_STATUS_OPTIONS.some((o) => o.value === v)
                              ? SCHEDULE_STATUS_OPTIONS.find((o) => o.value === v)!.label
                              : null
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" size="sm" className="text-xs" onClick={closeScheduleDialog}>
                  Cancel
                </Button>
                <Button type="button" size="sm" className="text-xs" onClick={submitScheduleForm}>
                  {editingSchedule ? 'Save changes' : 'Add milestone'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={!!scheduleToDelete}
            onOpenChange={(open) => {
              if (!open) setScheduleToDelete(null);
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove milestone?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  This removes{' '}
                  <span className="font-medium text-foreground">
                    {scheduleToDelete?.milestone_name ?? 'this milestone'}
                  </span>{' '}
                  from the payment schedule. It does not delete invoices or payments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                <AlertDialogAction className="text-xs bg-destructive text-white hover:bg-destructive/90" onClick={confirmDeleteSchedule}>
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={csvAppendConfirmItems != null}
        onOpenChange={(open) => {
          if (!open) setCsvAppendConfirmItems(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Append CSV rows?</AlertDialogTitle>
            <AlertDialogDescription>
              You already have {lineItems.length} line item(s). Import will add{' '}
              {csvAppendConfirmItems?.length ?? 0} new row(s) from the file. Existing rows stay unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              onClick={() => {
                const pending = csvAppendConfirmItems;
                setCsvAppendConfirmItems(null);
                if (pending) runCsvBulkImport(pending);
              }}
            >
              Append rows
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
