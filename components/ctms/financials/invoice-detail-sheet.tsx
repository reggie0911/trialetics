'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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

import type {
  FinanceInvoiceWithRelations,
  FinanceInvoiceStatus,
  InvoiceTimelineEntry,
} from '@/lib/types/ctms';
import { FINANCE_INVOICE_STATUS_LABEL } from '@/lib/types/ctms';
import {
  getInvoiceDocumentUrl,
  getInvoiceActivityTimeline,
  submitFinanceInvoice,
  resubmitRejectedFinanceInvoice,
  financeInvoiceRecordDecisionRpc,
  recordFinancePaymentForInvoice,
} from '@/lib/actions/finance-invoices';
import { InvoiceActivityPanel } from '@/components/ctms/financials/invoice-activity-panel';

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function statusVariant(
  status: FinanceInvoiceStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'paid' || status === 'approved') return 'default';
  if (status === 'rejected') return 'destructive';
  if (status === 'under_review' || status === 'submitted') return 'secondary';
  return 'outline';
}

interface InvoiceDetailSheetProps {
  inv: FinanceInvoiceWithRelations | null;
  studyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onReject: (id: string) => void;
  onOpenBudgetLines: (inv: FinanceInvoiceWithRelations) => void;
  /** Same order as the invoices table (e.g. newest first). Enables header navigation. */
  orderedInvoices?: FinanceInvoiceWithRelations[];
  onSelectInvoice?: (inv: FinanceInvoiceWithRelations) => void;
}

export function InvoiceDetailSheet({
  inv,
  studyId,
  open,
  onOpenChange,
  onChanged,
  onReject,
  onOpenBudgetLines,
  orderedInvoices,
  onSelectInvoice,
}: InvoiceDetailSheetProps) {
  const [, startTransition] = useTransition();
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [timeline, setTimeline] = useState<InvoiceTimelineEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const payee = inv
    ? inv.entity_type === 'site'
      ? inv.study_sites
        ? `${inv.study_sites.site_number} — ${inv.study_sites.name}`
        : 'Site'
      : inv.entity_type === 'vendor'
        ? inv.institutions?.name ?? 'Vendor'
        : inv.institutions?.name ?? 'IRB / ethics'
    : null;

  const loadDocument = useCallback(async (path: string) => {
    setDocumentLoading(true);
    setDocumentUrl(null);
    const { url, error } = await getInvoiceDocumentUrl(path);
    setDocumentLoading(false);
    if (error || !url) {
      toast.error('Could not load document preview.');
      return;
    }
    setDocumentUrl(url);
  }, []);

  const loadActivity = useCallback(async (invoiceId: string) => {
    setLoadingHistory(true);
    try {
      const data = await getInvoiceActivityTimeline(invoiceId);
      setTimeline(data);
    } catch {
      setTimeline([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !inv) {
      setDocumentUrl(null);
      setTimeline([]);
      return;
    }
    if (inv.document_path) void loadDocument(inv.document_path);
    void loadActivity(inv.id);
  }, [open, inv?.id, inv?.document_path, loadDocument, loadActivity]);

  if (!inv) return null;

  const navIndex =
    orderedInvoices && orderedInvoices.length > 0
      ? orderedInvoices.findIndex((i) => i.id === inv.id)
      : -1;
  const showInvoiceNav =
    Boolean(onSelectInvoice) &&
    orderedInvoices &&
    orderedInvoices.length > 1 &&
    navIndex >= 0;

  const isPdf = inv.document_path?.toLowerCase().endsWith('.pdf') ?? false;
  const isImage =
    inv.document_path
      ? /\.(png|jpe?g|gif|webp)$/i.test(inv.document_path)
      : false;
  const canEmbed = documentUrl && (isPdf || isImage);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="flex flex-col p-0 w-full max-w-[min(96vw,1100px)] sm:max-w-[min(96vw,1100px)] gap-0 overflow-hidden min-h-0 max-h-dvh"
      >
        {/* ── Header ── */}
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {showInvoiceNav && orderedInvoices && onSelectInvoice && (
              <div className="flex items-center gap-1 shrink-0" role="navigation" aria-label="Invoice list order">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={navIndex <= 0}
                  title="Newer invoice"
                  aria-label="Newer invoice"
                  onClick={() => {
                    if (navIndex > 0) onSelectInvoice(orderedInvoices[navIndex - 1]);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums px-0.5 min-w-[3.25rem] text-center">
                  {navIndex + 1} of {orderedInvoices.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={navIndex >= orderedInvoices.length - 1}
                  title="Older invoice"
                  aria-label="Older invoice"
                  onClick={() => {
                    if (navIndex < orderedInvoices.length - 1) {
                      onSelectInvoice(orderedInvoices[navIndex + 1]);
                    }
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <SheetTitle className="text-base font-semibold">
              Invoice {inv.external_invoice_id}
            </SheetTitle>
            <Badge variant={statusVariant(inv.status)} className="text-xs">
              {FINANCE_INVOICE_STATUS_LABEL[inv.status]}
            </Badge>
          </div>
        </SheetHeader>

        {/* ── Two-pane body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* ── LEFT: Document pane ── */}
          <div className="flex flex-col flex-1 min-h-0 min-w-0 border-r bg-muted/30">
            {documentLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-xs">Loading document…</p>
              </div>
            )}
            {!documentLoading && canEmbed && isPdf && (
              <iframe
                src={documentUrl}
                className="w-full flex-1 min-h-0 border-0"
                title={`Invoice ${inv.external_invoice_id}`}
              />
            )}
            {!documentLoading && canEmbed && isImage && (
              <div className="flex flex-1 min-h-0 items-center justify-center p-4 overflow-auto">
                <img
                  src={documentUrl}
                  alt={`Invoice ${inv.external_invoice_id}`}
                  className="max-w-full max-h-full object-contain rounded-md shadow"
                />
              </div>
            )}
            {!documentLoading && documentUrl && !canEmbed && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground px-6 text-center">
                <FileText className="h-10 w-10 opacity-40" />
                <p className="text-sm">This file cannot be previewed inline.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => window.open(documentUrl, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in new tab
                </Button>
              </div>
            )}
            {!documentLoading && !inv.document_path && (
              <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-muted-foreground px-6 text-center">
                <FileText className="h-10 w-10 opacity-30" />
                <p className="text-sm">No document attached to this invoice.</p>
              </div>
            )}
            {!documentLoading && inv.document_path && !documentUrl && (
              <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 text-muted-foreground px-6 text-center">
                <FileText className="h-10 w-10 opacity-30" />
                <p className="text-sm">Could not load document preview.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => void loadDocument(inv.document_path!)}
                >
                  Retry
                </Button>
              </div>
            )}
          </div>

          {/* ── RIGHT: Detail pane ── */}
          <div className="flex flex-col w-[min(100%,380px)] sm:w-[380px] shrink-0 overflow-y-auto min-h-0 border-l bg-muted/25">
            <div className="px-5 pt-5 pb-4 bg-background border-b border-border/60">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Amount</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatCurrency(inv.amount, inv.currency)}
              </p>
              {payee && (
                <div className="mt-4 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Payee</p>
                  <p className="text-xs text-foreground leading-snug line-clamp-3">{payee}</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Invoice <span className="font-medium text-foreground">{inv.external_invoice_id}</span>
                </span>
                <Badge variant={statusVariant(inv.status)} className="text-[10px] font-medium">
                  {FINANCE_INVOICE_STATUS_LABEL[inv.status]}
                </Badge>
              </div>
            </div>

            <div className="px-5 py-4 bg-background space-y-4">
              <h3 className="text-xs font-semibold text-foreground tracking-tight">Details</h3>
              <div className="rounded-lg border border-border/80 overflow-hidden">
                <table className="w-full table-fixed text-xs">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/35">
                      <th
                        scope="col"
                        className="text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-2.5 py-2 align-bottom w-[33%]"
                      >
                        Due date
                      </th>
                      <th
                        scope="col"
                        className="text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-2.5 py-2 align-bottom w-[34%]"
                      >
                        Received
                      </th>
                      <th
                        scope="col"
                        className="text-left font-medium text-[10px] uppercase tracking-wide text-muted-foreground px-2.5 py-2 align-bottom w-[33%]"
                      >
                        Billing type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2.5 py-2.5 align-top text-foreground tabular-nums leading-snug break-words">
                        {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-2.5 py-2.5 align-top text-foreground tabular-nums leading-snug break-words">
                        {new Date(inv.received_at).toLocaleDateString()}
                      </td>
                      <td className="px-2.5 py-2.5 align-top text-foreground leading-snug break-words">
                        {inv.entity_type === 'site'
                          ? 'Site'
                          : inv.entity_type === 'vendor'
                            ? 'Vendor'
                            : 'IRB / ethics'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {inv.notes ? (
                <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Notes</p>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{inv.notes}</p>
                </div>
              ) : null}
              {documentUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-2 h-9 w-full justify-center"
                  onClick={() => window.open(documentUrl, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  Open document in new tab
                </Button>
              ) : null}
            </div>

            <Separator className="opacity-60" />

            {/* Approval actions */}
            <div className="px-5 py-4 space-y-2 bg-background">
              <h3 className="text-xs font-semibold text-foreground tracking-tight mb-1">Actions</h3>

              {inv.site_id && inv.status !== 'rejected' && inv.entity_type === 'site' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8 w-full"
                  onClick={() => onOpenBudgetLines(inv)}
                >
                  Allocate to budget lines
                </Button>
              )}

              {inv.status === 'draft' && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button size="sm" variant="default" className="text-xs h-8 w-full" />}>
                    Submit for approval
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
                              void loadActivity(inv.id);
                            }
                          });
                        }}
                      >
                        Submit
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {inv.status === 'rejected' && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button size="sm" variant="default" className="text-xs h-8 w-full" />}>
                    Resubmit for approval
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Resubmit for approval</AlertDialogTitle>
                      <AlertDialogDescription>
                        Send invoice {inv.external_invoice_id} back to the approval queue? It will start again at step 1. Previous decisions stay in the activity history for audit.
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
                              void loadActivity(inv.id);
                            }
                          });
                        }}
                      >
                        Resubmit
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {(inv.status === 'submitted' || inv.status === 'under_review') && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs h-8 border-emerald-600 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 hover:border-emerald-700 hover:text-white dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500"
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
                                void loadActivity(inv.id);
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
                    className="flex-1 text-xs h-8 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      onReject(inv.id);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              )}

              {inv.status === 'approved' && (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button size="sm" variant="default" className="text-xs h-8 w-full" />}>
                    Mark as paid
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
                              void loadActivity(inv.id);
                            }
                          });
                        }}
                      >
                        Confirm Payment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <Separator className="opacity-60" />

            {/* Activity timeline */}
            <div className="px-5 py-4 flex-1 bg-background min-h-[120px]">
              <InvoiceActivityPanel loading={loadingHistory} entries={timeline} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
