'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  generateBulkCsvTemplate,
  parseCsvText,
  validateBulkCsvRows,
  bulkCsvHasErrors,
  BULK_CSV_COLUMNS,
  BULK_CSV_COLUMN_DOCS,
  categoryLabel,
  type BulkCsvRowValidated,
} from '@/lib/utils/ip-bulk-csv-template';
import { bulkUploadInventory, type BulkUploadResult } from '@/lib/actions/ip-bulk-upload';

type Step = 'template' | 'upload' | 'processing' | 'results';

export interface IpBulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  studyLabel: string;
  onSuccess: () => void | Promise<void>;
}

export function IpBulkUploadDialog({
  open,
  onOpenChange,
  studyId,
  studyLabel,
  onSuccess,
}: IpBulkUploadDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('template');
  const [rows, setRows] = useState<BulkCsvRowValidated[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  const reset = useCallback(() => {
    setStep('template');
    setRows([]);
    setParseError(null);
    setProcessing(false);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset]
  );

  const handleDownloadTemplate = useCallback(() => {
    const csv = generateBulkCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-bulk-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseError(null);

      if (!file.name.toLowerCase().endsWith('.csv')) {
        setParseError('Please select a .csv file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text !== 'string') {
          setParseError('Could not read file.');
          return;
        }
        try {
          const { headers, rows: parsed } = parseCsvText(text);
          if (parsed.length === 0) {
            setParseError('The CSV file is empty or contains only headers.');
            return;
          }
          if (parsed.length > 500) {
            setParseError(`Too many rows (${parsed.length}). Maximum 500 rows per upload.`);
            return;
          }

          const requiredHeaders = ['item_name', 'category', 'quantity'];
          const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
          if (missingHeaders.length > 0) {
            setParseError(`Missing required column(s): ${missingHeaders.join(', ')}`);
            return;
          }
          if (!headers.includes('site_number') && !headers.includes('site_name')) {
            setParseError('CSV must include either site_number or site_name (or both).');
            return;
          }

          const validated = validateBulkCsvRows(parsed);
          setRows(validated);
          setStep('upload');
        } catch {
          setParseError('Failed to parse CSV. Check the file format.');
        }
      };
      reader.readAsText(file);
    },
    []
  );

  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const validCount = rows.length - errorCount;
  const hasErrors = bulkCsvHasErrors(rows);

  const handleSubmit = useCallback(async () => {
    if (hasErrors || rows.length === 0) return;
    setStep('processing');
    setProcessing(true);

    try {
      const plainRows = rows.map((r) => ({
        item_name: r.item_name,
        category: r.category,
        unit: r.unit,
        part_number: r.part_number,
        contents_per_unit: r.contents_per_unit,
        site_number: r.site_number,
        site_name: r.site_name,
        lot_number: r.lot_number,
        batch_number: r.batch_number,
        expiry_date: r.expiry_date,
        serial_number: r.serial_number,
        quantity: r.quantity,
        order_reference: r.order_reference,
      }));

      const uploadResult = await bulkUploadInventory(studyId, plainRows);
      setResult(uploadResult);
      setStep('results');

      if (uploadResult.succeeded > 0) {
        await onSuccess();
      }
    } catch (e) {
      toast({
        title: 'Bulk upload failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setStep('upload');
    } finally {
      setProcessing(false);
    }
  }, [hasErrors, rows, studyId, onSuccess, toast]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] w-full max-w-[min(500px,calc(100%-2rem))] flex-col gap-4 overflow-hidden"
      >
        <DialogHeader className="shrink-0 space-y-1.5 pr-8 text-left">
          <DialogTitle>Bulk upload inventory</DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple catalog items, link them to sites, and create orders
            in one batch for <strong>{studyLabel}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 'template' && (
            <div className="space-y-5">
              <div className="rounded-md border bg-card">
                <div className="border-b px-4 py-3">
                  <h3 className="text-sm font-medium">CSV columns</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Column order in the template matches this table. <span className="text-destructive">Yes</span> =
                    required every row.
                  </p>
                </div>
                <div className="max-h-[min(380px,45vh)] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[1%] whitespace-nowrap">Column</TableHead>
                        <TableHead className="w-[1%] whitespace-nowrap">Required</TableHead>
                        <TableHead className="min-w-[200px] border-r-0">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {BULK_CSV_COLUMN_DOCS.map((doc) => (
                        <TableRow key={doc.column} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-[11px] text-foreground align-top">
                            {doc.column}
                          </TableCell>
                          <TableCell className="align-top text-xs">
                            {doc.requiredLabel === 'Yes' ? (
                              <span className="text-destructive font-medium">Yes</span>
                            ) : doc.requiredLabel === 'One of two' ? (
                              <span className="text-amber-700 dark:text-amber-400 font-medium">
                                One of two
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-normal text-xs text-muted-foreground leading-snug border-r-0 align-top">
                            {doc.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download CSV template
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setStep('upload');
                    setRows([]);
                    setParseError(null);
                  }}
                >
                  Next: Upload CSV
                </Button>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/20 px-4 py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6" />
                  <span>Click to select a CSV file</span>
                  <span className="text-xs">or drag and drop (max 500 rows)</span>
                </button>

                {parseError && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {parseError}
                  </div>
                )}
              </div>

              {rows.length > 0 && (
                <>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{rows.length} rows parsed</span>
                    {errorCount > 0 ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-3.5 w-3.5" />
                        {errorCount} with errors
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        All rows valid
                      </span>
                    )}
                  </div>

                  <div className="rounded-md border overflow-x-auto max-h-[350px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-medium w-8">#</th>
                          <th className="px-2 py-1.5 text-left font-medium">Status</th>
                          {BULK_CSV_COLUMNS.map((col) => (
                            <th key={col} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => {
                          const hasErr = row.errors.length > 0;
                          return (
                            <tr
                              key={row.rowIndex}
                              className={hasErr ? 'bg-destructive/5' : ''}
                            >
                              <td className="px-2 py-1 text-muted-foreground">{row.rowIndex + 1}</td>
                              <td className="px-2 py-1">
                                {hasErr ? (
                                  <span
                                    className="flex items-center gap-1 text-destructive cursor-help"
                                    title={row.errors.join('; ')}
                                  >
                                    <XCircle className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[120px]">
                                      {row.errors[0]}
                                    </span>
                                  </span>
                                ) : (
                                  <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                                )}
                              </td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.item_name}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{categoryLabel(row.category)}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.unit || 'Each'}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.part_number}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.contents_per_unit}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.site_number}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.site_name}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.lot_number}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.batch_number}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.expiry_date}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.serial_number}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.quantity}</td>
                              <td className="px-2 py-1 whitespace-nowrap">{row.order_reference}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRows([]);
                        setParseError(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <FileUp className="h-4 w-4 mr-1.5" />
                      Upload different file
                    </Button>
                    <Button
                      type="button"
                      disabled={hasErrors || rows.length === 0}
                      onClick={() => void handleSubmit()}
                    >
                      Submit {validCount} {validCount === 1 ? 'row' : 'rows'}
                    </Button>
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    reset();
                    setStep('template');
                  }}
                  className="text-xs"
                >
                  Back to template
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Processing bulk upload...</p>
              <p className="text-xs text-muted-foreground">
                Creating items, linking sites, and creating orders. This may take a moment.
              </p>
            </div>
          )}

          {step === 'results' && result && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border p-4">
                {result.failed.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                ) : result.succeeded > 0 ? (
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="text-sm space-y-1">
                  <p className="font-medium">
                    {result.failed.length === 0
                      ? 'All rows processed successfully'
                      : result.succeeded > 0
                        ? 'Upload completed with some errors'
                        : 'Upload failed'}
                  </p>
                  <p className="text-muted-foreground">
                    {result.succeeded} {result.succeeded === 1 ? 'order' : 'orders'} created
                    successfully
                    {result.failed.length > 0
                      ? `, ${result.failed.length} ${result.failed.length === 1 ? 'row' : 'rows'} failed`
                      : ''}
                    .
                  </p>
                </div>
              </div>

              {result.failed.length > 0 && (
                <div className="rounded-md border overflow-x-auto max-h-[250px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium w-12">Row</th>
                        <th className="px-2 py-1.5 text-left font-medium">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.failed.map((f, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 text-muted-foreground">{f.rowIndex + 1}</td>
                          <td className="px-2 py-1 text-destructive">{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button type="button" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
