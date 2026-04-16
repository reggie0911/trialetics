'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Paperclip, ChevronDown, ChevronRight, Sparkles, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  FinanceApprovalTemplateOption,
  FinanceInvoiceEntityType,
  FinanceInvoiceWithRelations,
  InvoiceTimelineEntry,
  StudySite,
} from '@/lib/types/ctms';
import { FINANCE_INVOICE_STATUS_LABEL } from '@/lib/types/ctms';
import {
  createFinanceInvoiceDraft,
  submitFinanceInvoice,
  resubmitRejectedFinanceInvoice,
  financeInvoiceRecordDecisionRpc,
  recordFinancePaymentForInvoice,
  getInvoiceActivityTimeline,
  validateInvoiceAgainstBudget,
} from '@/lib/actions/finance-invoices';
import { InvoiceActivityPanel } from '@/components/ctms/financials/invoice-activity-panel';
import { InvoiceBudgetAllocationDialog } from '@/components/ctms/financials/invoice-budget-allocation-dialog';
import { InvoiceDetailSheet } from '@/components/ctms/financials/invoice-detail-sheet';
import { createClient } from '@/lib/client';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { STUDY_DEACTIVATED_TOOLTIP } from '@/lib/constants/study-deactivated-message';

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

const INVOICE_ENTITY_TRIGGER_LABEL: Record<FinanceInvoiceEntityType, string> = {
  site: 'Site',
  vendor: 'Vendor',
  irb: 'IRB / ethics',
};

const INVOICE_WORKFLOW_AUTO = '__auto__';
/** Placeholder value so Site Select stays controlled (never undefined). */
const SITE_SELECT_NONE = '__site_none__';

function siteInvoiceTriggerLabel(
  siteId: string | null,
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[]
): string | null {
  if (!siteId || siteId === SITE_SELECT_NONE) return null;
  const s = sites.find((x) => x.id === siteId);
  return s ? `${s.site_number} — ${s.name}` : null;
}

/** Strip commas/spaces and keep at most one decimal point (for amount state). */
function normalizeInvoiceAmountInput(raw: string): string {
  let s = raw.replace(/,/g, '').replace(/\s/g, '');
  s = s.replace(/[^\d.]/g, '');
  const first = s.indexOf('.');
  if (first !== -1) {
    const rest = s.slice(first + 1).replace(/\./g, '');
    s = s.slice(0, first + 1) + rest;
  }
  return s;
}

/** Pretty-print normalized amount with thousands separators; empty string stays empty. */
function formatInvoiceAmountWithCommas(normalized: string): string {
  if (!normalized) return '';
  const dot = normalized.indexOf('.');
  const intRaw = dot === -1 ? normalized : normalized.slice(0, dot);
  const decRaw = dot === -1 ? undefined : normalized.slice(dot + 1);
  const intFormatted = (intRaw || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (normalized.endsWith('.') && decRaw === '') return `${intFormatted}.`;
  if (decRaw !== undefined) return `${intFormatted}.${decRaw}`;
  return intFormatted;
}

interface FinanceInvoicesSectionProps {
  studyId: string;
  companyId: string;
  invoices: FinanceInvoiceWithRelations[];
  sites: Pick<StudySite, 'id' | 'site_number' | 'name'>[];
  onChanged: () => void;
  approvalTemplateOptions?: FinanceApprovalTemplateOption[];
  /** When set, site-billed drafts use this site and the site picker is hidden. */
  fixedSiteId?: string;
  /** Empty-state copy for study vs site context. */
  invoiceListScope?: 'study' | 'site';
  /** Scroll into view and highlight this invoice row (e.g. site deep-link). */
  highlightInvoiceId?: string;
  /** When true (e.g. study deactivated), invoice mutations are disabled. */
  readOnly?: boolean;
}

export function FinanceInvoicesSection({
  studyId,
  companyId,
  invoices,
  sites,
  onChanged,
  approvalTemplateOptions = [],
  fixedSiteId,
  invoiceListScope = 'study',
  highlightInvoiceId,
  readOnly = false,
}: FinanceInvoicesSectionProps) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<FinanceInvoiceEntityType>('site');
  const [siteId, setSiteId] = useState<string>(() => fixedSiteId ?? SITE_SELECT_NONE);
  const [externalId, setExternalId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentPath, setDocumentPath] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [aiPrefilled, setAiPrefilled] = useState(false);

  const [rejectInvoiceId, setRejectInvoiceId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [draftWorkflowId, setDraftWorkflowId] = useState(INVOICE_WORKFLOW_AUTO);
  const [budgetAllocInvoice, setBudgetAllocInvoice] = useState<FinanceInvoiceWithRelations | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<FinanceInvoiceWithRelations | null>(null);

  useEffect(() => {
    if (!highlightInvoiceId || invoices.length === 0) return;
    const id = `site-invoice-row-${highlightInvoiceId}`;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 150);
    return () => window.clearTimeout(t);
  }, [highlightInvoiceId, invoices]);

  const resetForm = () => {
    setExternalId('');
    setAmount('');
    setDueAt('');
    setNotes('');
    setSiteId(fixedSiteId ?? SITE_SELECT_NONE);
    setUploadedFile(null);
    setDocumentPath(null);
    setExtractedData(null);
    setAiPrefilled(false);
    setDraftWorkflowId(INVOICE_WORKFLOW_AUTO);
  };

  const handleFileSelect = async (file: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      toast.error('Use PDF, PNG, or JPEG files.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File must be under 50MB.');
      return;
    }

    setUploadedFile(file);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'pdf';
      const storagePath = `${companyId}/invoices/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('finance-documents')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        toast.error('Upload failed: ' + uploadError.message);
        setUploadedFile(null);
        setUploading(false);
        return;
      }

      setDocumentPath(storagePath);
      setUploading(false);
      toast.success('Document uploaded. Analyzing...');

      setExtracting(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/ai/invoice-extract', { method: 'POST', body: formData });
        if (res.ok) {
          const { extracted } = await res.json();
          setExtractedData(extracted);
          if (extracted) {
            if (extracted.invoiceNumber && !externalId) setExternalId(String(extracted.invoiceNumber));
            if (extracted.amount && !amount) {
              setAmount(normalizeInvoiceAmountInput(String(extracted.amount)));
            }
            if (extracted.dueDate && !dueAt) setDueAt(String(extracted.dueDate));
            setAiPrefilled(true);
            toast.success('Data extracted successfully.');
          }
        } else {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error || 'Could not extract data.';
          console.error('[invoice-extract]', res.status, msg);
          toast.error('Could not extract data. Please fill fields manually.');
        }
      } catch {
        toast.error('AI extraction failed. Please fill fields manually.');
      } finally {
        setExtracting(false);
      }
    } catch {
      toast.error('Upload failed.');
      setUploadedFile(null);
      setUploading(false);
    }
  };

  const handleCreate = () => {
    const n = parseFloat(amount.replace(/,/g, ''));
    if (!externalId.trim() || Number.isNaN(n) || n <= 0) {
      toast.error('Enter a valid invoice number and amount.');
      return;
    }
    const resolvedSiteId =
      entityType === 'site'
        ? fixedSiteId ?? (siteId !== SITE_SELECT_NONE ? siteId : null)
        : null;
    if (entityType === 'site' && !resolvedSiteId) {
      toast.error('Choose a site.');
      return;
    }
    startTransition(async () => {
      const { error } = await createFinanceInvoiceDraft({
        studyId,
        entityType,
        siteId: resolvedSiteId,
        externalInvoiceId: externalId.trim(),
        amount: n,
        dueAt: dueAt || null,
        notes: notes.trim() || null,
        documentPath,
        extractedData,
        templateId: draftWorkflowId === INVOICE_WORKFLOW_AUTO ? null : draftWorkflowId,
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('Invoice draft saved.');
      setOpen(false);
      resetForm();
      onChanged();
    });
  };

  const handleRejectConfirm = () => {
    if (!rejectInvoiceId) return;
    const invId = rejectInvoiceId;
    startTransition(async () => {
      const { error, userMessage } = await financeInvoiceRecordDecisionRpc(
        invId,
        studyId,
        'rejected',
        rejectReason
      );
      if (error) toast.error(userMessage ?? error);
      else {
        toast.success('Invoice rejected.');
        onChanged();
      }
      setRejectInvoiceId(null);
      setRejectReason('');
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Invoices</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Submit invoices for approval. Upload a PDF and let AI extract the details.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            if (readOnly && o) return;
            setOpen(o);
            if (!o) resetForm();
          }}
        >
          {readOnly ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <DialogTrigger
                  render={<Button size="sm" className="text-xs inline-flex items-center gap-1" disabled aria-label="Submit invoice" />}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Submit invoice
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {STUDY_DEACTIVATED_TOOLTIP}
              </TooltipContent>
            </Tooltip>
          ) : (
            <DialogTrigger render={<Button size="sm" className="text-xs inline-flex items-center gap-1" />}>
              <Plus className="h-3.5 w-3.5" />
              Submit invoice
            </DialogTrigger>
          )}
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">New invoice draft</DialogTitle>
              <DialogDescription className="text-xs">
                Upload the invoice document to auto-fill fields, or enter details manually.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[500px] overflow-y-auto space-y-3 py-2 pr-1 [scrollbar-gutter:stable]">
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice document (optional)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs border rounded-md px-3 py-2 hover:bg-muted transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadedFile ? uploadedFile.name : 'Choose PDF, PNG, or JPEG'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(f);
                      }}
                    />
                  </label>
                  {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {extracting && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Sparkles className="h-3 w-3" /> Analyzing...
                    </span>
                  )}
                </div>
                {uploadedFile && !uploading && !extracting && (
                  <p className="text-[10px] text-green-600 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" /> {uploadedFile.name} uploaded
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Approval workflow</Label>
                <Select value={draftWorkflowId} onValueChange={setDraftWorkflowId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue
                      getDisplayLabel={(v) => {
                        if (v === INVOICE_WORKFLOW_AUTO) return 'Automatic (study or company default)';
                        return approvalTemplateOptions.find((o) => o.id === v)?.name ?? null;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INVOICE_WORKFLOW_AUTO} className="text-xs">
                      Automatic (study or company default)
                    </SelectItem>
                    {approvalTemplateOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">
                        {o.name}
                        {o.is_default ? ' (company default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Override the study default for this draft only, or leave automatic.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Who is billing?</Label>
                <Select value={entityType} onValueChange={(v) => setEntityType(v as FinanceInvoiceEntityType)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue
                      getDisplayLabel={(v) =>
                        v && v in INVOICE_ENTITY_TRIGGER_LABEL
                          ? INVOICE_ENTITY_TRIGGER_LABEL[v as FinanceInvoiceEntityType]
                          : null
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="site" className="text-xs">Site</SelectItem>
                    <SelectItem value="vendor" className="text-xs">Vendor</SelectItem>
                    <SelectItem value="irb" className="text-xs">IRB / ethics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {entityType === 'site' && !fixedSiteId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Site</Label>
                  <Select value={siteId} onValueChange={setSiteId}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue
                        placeholder="Choose site"
                        getDisplayLabel={(v) => siteInvoiceTriggerLabel(v, sites)}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SITE_SELECT_NONE} className="text-xs text-muted-foreground">
                        Choose site
                      </SelectItem>
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
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">Invoice number</Label>
                  {aiPrefilled && externalId && (
                    <span className="text-[9px] text-violet-600 flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" />AI</span>
                  )}
                </div>
                <Input className="text-xs h-9" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">Amount</Label>
                  {aiPrefilled && amount && (
                    <span className="text-[9px] text-violet-600 flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" />AI</span>
                  )}
                </div>
                <Input
                  className="text-xs h-9"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={formatInvoiceAmountWithCommas(amount)}
                  onChange={(e) => setAmount(normalizeInvoiceAmountInput(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">Due date (optional)</Label>
                  {aiPrefilled && dueAt && (
                    <span className="text-[9px] text-violet-600 flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" />AI</span>
                  )}
                </div>
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
              <Button type="button" size="sm" className="text-xs" onClick={handleCreate} disabled={uploading || extracting}>
                Save draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {invoiceListScope === 'site'
              ? 'No invoices yet for this site.'
              : 'No invoices yet for this study.'}
          </p>
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
                {invoices.map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    inv={inv}
                    studyId={studyId}
                    highlighted={highlightInvoiceId === inv.id}
                    readOnly={readOnly}
                    onChanged={onChanged}
                    onReject={(id) => { setRejectInvoiceId(id); setRejectReason(''); }}
                    onOpenBudgetLines={(row) => setBudgetAllocInvoice(row)}
                    onOpenDetail={(row) => setDetailInvoice(row)}
                  />
                ))}
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

      <Dialog open={!!rejectInvoiceId} onOpenChange={(o) => { if (!o) { setRejectInvoiceId(null); setRejectReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Reject Invoice</DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason for rejection. This will be visible to your team.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              className="text-xs min-h-[80px]"
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setRejectInvoiceId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" className="text-xs" onClick={handleRejectConfirm}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InvoiceBudgetAllocationDialog
        open={!!budgetAllocInvoice}
        onOpenChange={(o) => {
          if (!o) setBudgetAllocInvoice(null);
        }}
        invoice={budgetAllocInvoice}
        studyId={studyId}
        onSaved={onChanged}
      />

      <InvoiceDetailSheet
        open={!!detailInvoice}
        inv={detailInvoice}
        studyId={studyId}
        onOpenChange={(o) => { if (!o) setDetailInvoice(null); }}
        onChanged={() => {
          onChanged();
          if (detailInvoice) {
            const updated = invoices.find((i) => i.id === detailInvoice.id);
            if (updated) setDetailInvoice({ ...updated });
          }
        }}
        onReject={(id) => { setRejectInvoiceId(id); setRejectReason(''); }}
        onOpenBudgetLines={(row) => setBudgetAllocInvoice(row)}
        orderedInvoices={invoices}
        onSelectInvoice={setDetailInvoice}
      />
    </Card>
  );
}

function InvoiceRow({
  inv,
  studyId,
  highlighted,
  readOnly,
  onChanged,
  onReject,
  onOpenBudgetLines,
  onOpenDetail,
}: {
  inv: FinanceInvoiceWithRelations;
  studyId: string;
  highlighted?: boolean;
  readOnly?: boolean;
  onChanged: () => void;
  onReject: (id: string) => void;
  onOpenBudgetLines: (inv: FinanceInvoiceWithRelations) => void;
  onOpenDetail: (inv: FinanceInvoiceWithRelations) => void;
}) {
  const [, startTransition] = useTransition();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [timeline, setTimeline] = useState<InvoiceTimelineEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [validationErrors, setValidationErrors] = useState<number>(0);
  const [validationWarnings, setValidationWarnings] = useState<number>(0);

  // Lazy-load validation for site invoices that are draft or submitted
  useEffect(() => {
    if (inv.entity_type !== 'site' || !['draft', 'submitted'].includes(inv.status)) return;
    validateInvoiceAgainstBudget(inv.id).then((result) => {
      if (!result.error) {
        setValidationErrors(result.errors.length);
        setValidationWarnings(result.warnings.length);
      }
    }).catch(() => {});
  }, [inv.id, inv.status, inv.entity_type]);

  const payee =
    inv.entity_type === 'site'
      ? inv.study_sites
        ? `${inv.study_sites.site_number} — ${inv.study_sites.name}`
        : 'Site'
      : inv.entity_type === 'vendor'
        ? inv.institutions?.name ?? 'Vendor'
        : inv.institutions?.name ?? 'IRB / ethics';

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getInvoiceActivityTimeline(inv.id);
      setTimeline(data);
    } catch {
      toast.error('Could not load activity.');
      setTimeline([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [inv.id]);

  const handleViewDocument = () => {
    onOpenDetail(inv);
  };

  const ro = readOnly === true;

  return (
    <>
      <TableRow
        id={`site-invoice-row-${inv.id}`}
        className={cn(
          'cursor-pointer hover:bg-muted/50',
          highlighted && 'bg-primary/10 ring-1 ring-primary/25 dark:bg-primary/15'
        )}
        onClick={() => onOpenDetail(inv)}
      >
        <TableCell className="text-xs font-medium">
          <span className="flex items-center gap-1">
            {inv.document_path && (
              <span className="text-muted-foreground" title="Has attached document">
                <Paperclip className="h-3 w-3" />
              </span>
            )}
            {inv.external_invoice_id}
          </span>
        </TableCell>
        <TableCell className="text-xs">{payee}</TableCell>
        <TableCell className="text-xs text-right">{formatCurrency(inv.amount, inv.currency)}</TableCell>
        <TableCell className="text-xs">
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant={statusVariant(inv.status)} className="text-[10px]">
              {FINANCE_INVOICE_STATUS_LABEL[inv.status]}
            </Badge>
            {validationErrors > 0 && (
              <Badge variant="destructive" className="text-[10px] gap-0.5" title="Budget validation errors">
                ⛔ {validationErrors}
              </Badge>
            )}
            {validationWarnings > 0 && validationErrors === 0 && (
              <Badge variant="outline" className="text-[10px] gap-0.5 border-amber-400 text-amber-700 dark:text-amber-400" title="Budget validation warnings">
                ⚠ {validationWarnings}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-xs text-right align-middle p-2" onClick={(e) => e.stopPropagation()}>
          <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
          {inv.document_path && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 shrink-0 px-3 font-normal"
              onClick={handleViewDocument}
            >
              View Document
            </Button>
          )}
          {inv.site_id && inv.status !== 'rejected' && inv.entity_type === 'site' && (
            ro ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button size="sm" variant="outline" className="text-xs h-7 shrink-0 px-3 font-normal" disabled>
                    Budget lines
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {STUDY_DEACTIVATED_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 shrink-0 px-3 font-normal"
                onClick={() => onOpenBudgetLines(inv)}
              >
                Budget lines
              </Button>
            )
          )}
          <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 w-7 shrink-0 p-0"
              onClick={() => {
                const next = !historyOpen;
                setHistoryOpen(next);
                if (next) loadHistory();
              }}
              title="Invoice activity"
            >
              {historyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          {inv.status === 'draft' && (
            ro ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button size="sm" variant="default" className="text-xs h-7 shrink-0 px-3" disabled>
                    Submit
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {STUDY_DEACTIVATED_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger render={<Button size="sm" variant="default" className="text-xs h-7 shrink-0 px-3" />}>
                  Submit
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit for Approval</AlertDialogTitle>
                    <AlertDialogDescription>
                      Submit invoice {inv.external_invoice_id} for approval? It will enter the review queue and cannot be edited.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
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
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          )}
          {inv.status === 'rejected' && (
            ro ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button size="sm" variant="default" className="text-xs h-7 shrink-0 px-3" disabled>
                    Resubmit
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {STUDY_DEACTIVATED_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger render={<Button size="sm" variant="default" className="text-xs h-7 shrink-0 px-3" />}>
                  Resubmit
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Resubmit for approval</AlertDialogTitle>
                    <AlertDialogDescription>
                      Send invoice {inv.external_invoice_id} back to the approval queue? It will start again at step 1.
                      Previous decisions stay in the activity history for audit.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        startTransition(async () => {
                          const { error, userMessage } = await resubmitRejectedFinanceInvoice(inv.id, studyId);
                          if (error) toast.error(userMessage ?? error);
                          else {
                            toast.success('Invoice resubmitted for approval.');
                            onChanged();
                          }
                        });
                      }}
                    >
                      Resubmit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          )}
          {(inv.status === 'submitted' || inv.status === 'under_review') && (
            ro ? (
              <>
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 shrink-0 px-3 border-emerald-600 bg-emerald-600 text-white shadow-xs"
                      disabled
                    >
                      Approve step
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {STUDY_DEACTIVATED_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" />}>
                    <Button size="sm" variant="ghost" className="text-xs h-7 shrink-0 px-3 text-destructive" disabled>
                      Reject
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {STUDY_DEACTIVATED_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 shrink-0 px-3 border-emerald-600 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 hover:border-emerald-700 hover:text-white dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500"
                      />
                    }
                  >
                    Approve step
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve Invoice Step</AlertDialogTitle>
                      <AlertDialogDescription>
                        Approve invoice {inv.external_invoice_id} ({formatCurrency(inv.amount, inv.currency)})? This action is recorded permanently.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600/30 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        onClick={() => {
                          startTransition(async () => {
                            const { error, userMessage } = await financeInvoiceRecordDecisionRpc(inv.id, studyId, 'approved', '');
                            if (error) toast.error(userMessage ?? error);
                            else {
                              toast.success('Recorded approval step.');
                              onChanged();
                            }
                          });
                        }}
                      >
                        Approve
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7 shrink-0 px-3 text-destructive hover:bg-destructive/10"
                  onClick={() => onReject(inv.id)}
                >
                  Reject
                </Button>
              </>
            )
          )}
          {inv.status === 'approved' && (
            ro ? (
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button size="sm" variant="default" className="text-xs h-7 shrink-0 px-3" disabled>
                    Mark paid
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {STUDY_DEACTIVATED_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger render={<Button size="sm" variant="default" className="text-xs h-7 shrink-0 px-3" />}>
                  Mark paid
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Record Payment</AlertDialogTitle>
                    <AlertDialogDescription>
                      Record payment of {formatCurrency(inv.amount, inv.currency)} and mark invoice {inv.external_invoice_id} as paid?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
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
                      Confirm Payment
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          )}
          </span>
        </TableCell>
      </TableRow>
      {historyOpen && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30 p-3">
            <InvoiceActivityPanel loading={loadingHistory} entries={timeline} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
