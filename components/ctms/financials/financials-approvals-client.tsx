'use client';

import { useState, useTransition, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Paperclip, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
import type {
  FinanceInvoiceWithRelations,
  InvoiceDecisionRecord,
  InvoiceTimelineEntry,
} from '@/lib/types/ctms';
import { FINANCE_INVOICE_STATUS_LABEL } from '@/lib/types/ctms';
import {
  financeInvoiceRecordDecisionRpc,
  listCompanyFinanceInvoicesForQueue,
  getInvoiceDocumentUrl,
  getInvoiceActivityTimeline,
} from '@/lib/actions/finance-invoices';
import { InvoiceActivityPanel } from '@/components/ctms/financials/invoice-activity-panel';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

interface StudyOption {
  id: string;
  title: string;
}

interface FinancialsApprovalsClientProps {
  initialInvoices: FinanceInvoiceWithRelations[];
  studies: StudyOption[];
}

const ALL_STUDIES = '__all__';

export function FinancialsApprovalsClient({ initialInvoices, studies }: FinancialsApprovalsClientProps) {
  const [rows, setRows] = useState(initialInvoices);
  const [selectedStudy, setSelectedStudy] = useState(ALL_STUDIES);
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

  const filtered = useMemo(
    () => selectedStudy === ALL_STUDIES ? rows : rows.filter((r) => r.study_id === selectedStudy),
    [rows, selectedStudy]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Approval Queue</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Review and approve or reject invoices submitted by your team.
            </p>
          </div>
          <Select value={selectedStudy} onValueChange={setSelectedStudy}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue
                getDisplayLabel={(v) => {
                  if (v === ALL_STUDIES) return 'All studies';
                  return studies.find((s) => s.id === v)?.title ?? null;
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STUDIES} className="text-xs">All studies</SelectItem>
              {studies.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No invoices waiting for approval.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs min-w-0">Study</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Invoice #</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap">Amount</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs min-w-[10rem] max-w-[14rem] w-[14rem]">Comment</TableHead>
                  <TableHead className="text-xs whitespace-nowrap align-top">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [decisions, setDecisions] = useState<InvoiceDecisionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [timeline, setTimeline] = useState<Awaited<ReturnType<typeof getInvoiceActivityTimeline>>>([]);
  const studyTitle = inv.studies?.title ?? 'Study';

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

  const handleViewDocument = async () => {
    if (!inv.document_path) return;
    const { url, error } = await getInvoiceDocumentUrl(inv.document_path);
    if (error || !url) {
      toast.error('Could not open document.');
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <>
      <TableRow>
        <TableCell className="text-xs">
          <Link href={`/protected/studies/${inv.study_id}`} className="font-medium hover:underline">
            {studyTitle}
          </Link>
        </TableCell>
        <TableCell className="text-xs">
          <span className="flex items-center gap-1">
            {inv.document_path && (
              <button onClick={handleViewDocument} className="text-muted-foreground hover:text-foreground" title="View attached document">
                <Paperclip className="h-3 w-3" />
              </button>
            )}
            {inv.external_invoice_id}
          </span>
        </TableCell>
        <TableCell className="text-xs text-right">{formatCurrency(inv.amount, inv.currency)}</TableCell>
        <TableCell className="text-xs">
          <Badge variant="secondary" className="text-[10px]">
            {FINANCE_INVOICE_STATUS_LABEL[inv.status]}
          </Badge>
        </TableCell>
        <TableCell className="text-xs min-w-[10rem] max-w-[14rem] w-[14rem] align-top">
          <Textarea
            className="text-xs min-h-[52px] max-h-24 resize-y w-full"
            placeholder="Optional note for your team"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </TableCell>
        <TableCell className="text-xs align-top whitespace-nowrap">
          <div className="flex flex-col gap-1.5 items-start">
            <div className="flex flex-wrap gap-1">
              {inv.document_path && (
                <Button size="sm" variant="ghost" className="text-[10px] h-7 px-2 shrink-0" onClick={handleViewDocument}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Doc
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-[10px] h-7 px-2 shrink-0"
                onClick={() => {
                  const next = !historyOpen;
                  setHistoryOpen(next);
                  if (next) loadHistory();
                }}
              >
                {historyOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                Activity
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] h-7 px-2 shrink-0 border-emerald-600 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 hover:border-emerald-700 hover:text-white dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:hover:border-emerald-500"
                />
              }
            >
              Approve step
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve Invoice Step</AlertDialogTitle>
                <AlertDialogDescription>
                  Approve invoice {inv.external_invoice_id} ({formatCurrency(inv.amount, inv.currency)}) for study &ldquo;{studyTitle}&rdquo;? This action is recorded permanently.
                  {comment && (
                    <span className="block mt-2 text-foreground">Your comment: &ldquo;{comment}&rdquo;</span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600/30 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  onClick={() => {
                    startTransition(async () => {
                      const { error, userMessage } = await financeInvoiceRecordDecisionRpc(inv.id, inv.study_id, 'approved', comment);
                      if (error) toast.error(userMessage ?? error);
                      else {
                        toast.success('Approval recorded.');
                        onDone();
                      }
                    });
                  }}
                >
                  Approve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger render={
              <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 shrink-0 text-destructive border-destructive/40" />
            }>
              Reject
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject Invoice</AlertDialogTitle>
                <AlertDialogDescription>
                  Reject invoice {inv.external_invoice_id} ({formatCurrency(inv.amount, inv.currency)}) for study &ldquo;{studyTitle}&rdquo;?
                  {comment && (
                    <span className="block mt-2 text-foreground">Your comment: &ldquo;{comment}&rdquo;</span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    startTransition(async () => {
                      const { error, userMessage } = await financeInvoiceRecordDecisionRpc(inv.id, inv.study_id, 'rejected', comment);
                      if (error) toast.error(userMessage ?? error);
                      else {
                        toast.success('Rejection recorded.');
                        onDone();
                      }
                    });
                  }}
                >
                  Reject
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
            </div>
          </div>
        </TableCell>
      </TableRow>
      {historyOpen && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30 p-3">
            <InvoiceActivityPanel loading={loadingHistory} entries={timeline} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
