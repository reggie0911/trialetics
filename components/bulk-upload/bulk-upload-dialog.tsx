'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import Papa from 'papaparse';
import { Fragment, useCallback, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { triggerCsvDownload } from '@/lib/utils/csv-download';

/**
 * One column in the standard import template. The dialog uses these to:
 *  - render header cells in the preview
 *  - look up `raw[header]` when building the row payload for `validateRows`
 *  - generate the downloadable CSV template (header row + one example row)
 */
export interface BulkUploadColumn {
  /** Capitalized human label that appears in the CSV header row. */
  header: string;
  /** Internal field path passed back through `values` in `ValidatedRow`. */
  field: string;
  /** Marks the column as required for the in-dialog template helper text. */
  required?: boolean;
  /** Example value emitted in the downloadable template's sample row. */
  example?: string;
}

/**
 * Result of validating one parsed CSV row. `errors` non-empty means the row
 * is shown in the preview but excluded from the bulk write.
 */
export interface ValidatedRow {
  /** 0-based index in the parsed file (header row excluded). */
  rowIndex: number;
  /** Raw cells keyed by template header — used to render the preview. */
  raw: Record<string, string>;
  /** Normalized values keyed by template `field` — what `onApply` consumes. */
  values: Record<string, unknown>;
  op: 'insert' | 'update';
  /** Human-readable reasons; non-empty means the row is "skipped". */
  errors: string[];
}

export interface BulkUploadDialogProps {
  tableLabel: string;
  /** Schema-defining template columns (also drives the downloaded CSV). */
  templateColumns: BulkUploadColumn[];
  /** Suggested filename for the downloaded template, e.g. `sites-import-template.csv`. */
  templateFilename: string;
  /**
   * Optional override for the downloaded CSV body. Defaults to a header row
   * derived from `templateColumns` plus one example row from `column.example`.
   */
  getTemplateCsv?: () => string;
  /** Validate every parsed row in one pass — async so callers can do bulk lookups. */
  validateRows: (rawRows: Record<string, string>[]) => Promise<ValidatedRow[]>;
  /** Apply the valid rows. Returns counts so the dialog can show a summary. */
  onApply: (validRows: ValidatedRow[]) => Promise<{
    created: number;
    updated: number;
    failed: number;
  }>;
  /** Called after `onApply` resolves — used by tabs to refetch their list. */
  onComplete?: () => void;
  /** When provided the dialog is controlled and the internal trigger button is hidden. */
  controlledOpen?: boolean;
  onControlledOpenChange?: (next: boolean) => void;
  triggerLabel?: string;
  disabled?: boolean;
}

function csvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildDefaultTemplateCsv(columns: BulkUploadColumn[]): string {
  const header = columns.map((c) => csvCell(c.header)).join(',');
  const example = columns.map((c) => csvCell(c.example ?? '')).join(',');
  return `${header}\n${example}\n`;
}

/**
 * Standard CSV-template uploader. Tabs configure the template + per-row
 * validation; the dialog handles the dropzone, papaparse, preview, busy
 * state, and download-template helper. Designed to live alongside the
 * Copilot import button rather than replace it.
 */
export function BulkUploadDialog({
  tableLabel,
  templateColumns,
  templateFilename,
  getTemplateCsv,
  validateRows,
  onApply,
  onComplete,
  triggerLabel = 'Bulk upload CSV',
  disabled,
  controlledOpen,
  onControlledOpenChange,
}: BulkUploadDialogProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (isControlled) {
        onControlledOpenChange?.(next);
      } else {
        setInternalOpen(next);
      }
    },
    [isControlled, onControlledOpenChange],
  );
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = parsing || validating || applying;

  const headerLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of templateColumns) {
      map.set(col.header.trim().toLowerCase(), col.header);
    }
    return map;
  }, [templateColumns]);

  const counts = useMemo(() => {
    let valid = 0;
    let errored = 0;
    for (const r of rows) {
      if (r.errors.length === 0) valid += 1;
      else errored += 1;
    }
    return { valid, errored, total: rows.length };
  }, [rows]);

  const resetState = useCallback(() => {
    setFile(null);
    setRows([]);
    setParseError(null);
    setParsing(false);
    setValidating(false);
    setApplying(false);
    setDragActive(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (busy && !next) return;
      setOpen(next);
      if (!next) resetState();
    },
    [busy, resetState]
  );

  const handleDownloadTemplate = useCallback(() => {
    const csv = getTemplateCsv ? getTemplateCsv() : buildDefaultTemplateCsv(templateColumns);
    triggerCsvDownload(templateFilename, csv);
  }, [getTemplateCsv, templateColumns, templateFilename]);

  const parseAndValidate = useCallback(
    async (selected: File) => {
      setFile(selected);
      setParseError(null);
      setRows([]);
      setParsing(true);

      const parseResult = await new Promise<Papa.ParseResult<Record<string, string>> | Error>(
        (resolve) => {
          Papa.parse<Record<string, string>>(selected, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: (h) => h.trim(),
            complete: (res) => resolve(res),
            error: (err) => resolve(err),
          });
        }
      );

      setParsing(false);

      if (parseResult instanceof Error) {
        setParseError(parseResult.message || 'Could not read that CSV.');
        return;
      }
      const errors = parseResult.errors?.filter((e) => e.type !== 'FieldMismatch') ?? [];
      if (errors.length > 0) {
        setParseError(errors[0].message ?? 'Could not parse the CSV file.');
        return;
      }

      const csvHeaders = parseResult.meta?.fields ?? [];
      const recognized = csvHeaders.filter((h) =>
        headerLookup.has(h.trim().toLowerCase())
      );
      if (recognized.length === 0) {
        setParseError(
          `None of the columns matched the ${tableLabel} template. Download the template and use those exact headers.`
        );
        return;
      }

      const dataRows = parseResult.data ?? [];
      if (dataRows.length === 0) {
        setParseError('Your CSV has headers but no data rows. Add at least one row and try again.');
        return;
      }

      const normalized: Record<string, string>[] = dataRows.map((row) => {
        const out: Record<string, string> = {};
        for (const col of templateColumns) {
          // Lookup is forgiving: the user's header just needs to match the
          // template label by case-insensitive equality (after trim).
          const csvHeader = csvHeaders.find(
            (h) => h.trim().toLowerCase() === col.header.trim().toLowerCase()
          );
          const value = csvHeader ? row[csvHeader] : undefined;
          out[col.header] = (value ?? '').toString().trim();
        }
        return out;
      });

      setValidating(true);
      try {
        const validated = await validateRows(normalized);
        setRows(validated);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Validation failed.';
        setParseError(message);
        setRows([]);
      } finally {
        setValidating(false);
      }
    },
    [headerLookup, tableLabel, templateColumns, validateRows]
  );

  const onFileChosen = useCallback(
    (selected: File | undefined) => {
      if (!selected) return;
      const isCsv =
        selected.type === 'text/csv' ||
        selected.name.toLowerCase().endsWith('.csv') ||
        selected.name.toLowerCase().endsWith('.tsv');
      if (!isCsv) {
        setParseError('Please choose a .csv file.');
        return;
      }
      void parseAndValidate(selected);
    },
    [parseAndValidate]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    onFileChosen(e.dataTransfer.files?.[0]);
  };

  const handleConfirm = useCallback(async () => {
    const validOnly = rows.filter((r) => r.errors.length === 0);
    if (validOnly.length === 0) return;
    setApplying(true);
    try {
      await onApply(validOnly);
      onComplete?.();
      setOpen(false);
      resetState();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed.';
      setParseError(message);
    } finally {
      setApplying(false);
    }
  }, [onApply, onComplete, resetState, rows]);

  return (
    <>
      {isControlled ? null : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Upload className="h-4 w-4" />
          {triggerLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-3xl max-w-3xl max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden p-5"
          showCloseButton={false}
        >
          <DialogHeader className="gap-1.5 pr-8">
            <DialogTitle className="text-lg flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              Bulk upload {tableLabel.toLowerCase()}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Drop a CSV that matches the {tableLabel} template. We&apos;ll validate each row,
              flag issues, and only import the rows you confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-auto pr-1">
            {!file ? (
              <EmptyState
                templateLabel={triggerLabel}
                onDownloadTemplate={handleDownloadTemplate}
                onChoose={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDrag={handleDrag}
                dragActive={dragActive}
                fileInputRef={fileInputRef}
                onFileChosen={onFileChosen}
              />
            ) : (
              <PreviewState
                file={file}
                parsing={parsing}
                validating={validating}
                applying={applying}
                rows={rows}
                counts={counts}
                templateColumns={templateColumns}
                tableLabel={tableLabel}
                onReset={resetState}
                onDownloadTemplate={handleDownloadTemplate}
                error={parseError}
              />
            )}
          </div>

          <DialogFooter className="border-t border-border pt-3">
            {file && !parseError ? (
              <p className="mr-auto text-[11px] text-muted-foreground self-center">
                {counts.valid > 0
                  ? `${counts.valid} row${counts.valid === 1 ? '' : 's'} ready to import` +
                    (counts.errored > 0
                      ? `, ${counts.errored} skipped`
                      : '')
                  : counts.total > 0
                    ? 'No rows are ready to import yet.'
                    : null}
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={busy || !file || counts.valid === 0 || Boolean(parseError)}
            >
              {applying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Importing&hellip;
                </>
              ) : (
                <>Import {counts.valid > 0 ? `${counts.valid} ` : ''}row{counts.valid === 1 ? '' : 's'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface EmptyStateProps {
  templateLabel: string;
  onDownloadTemplate: () => void;
  onChoose: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDrag: (e: React.DragEvent) => void;
  dragActive: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChosen: (file: File | undefined) => void;
}

function EmptyState({
  onDownloadTemplate,
  onChoose,
  onDrop,
  onDrag,
  dragActive,
  fileInputRef,
  onFileChosen,
}: EmptyStateProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between gap-3">
        <span>
          New here? Start with the standard template &mdash; the dialog accepts the same headers.
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onDownloadTemplate}
          className="shrink-0"
        >
          <Download className="h-3 w-3" />
          Download template
        </Button>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={onChoose}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChoose()}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        className={
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center text-xs transition cursor-pointer ' +
          (dragActive
            ? 'border-primary bg-primary/5 text-foreground'
            : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/60 hover:text-foreground')
        }
      >
        <Upload className="h-6 w-6" />
        <span className="font-medium">
          Drop a CSV here, or <span className="underline">choose a file</span>
        </span>
        <span className="text-[11px]">CSV up to 25MB</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => onFileChosen(e.target.files?.[0])}
      />
    </div>
  );
}

interface PreviewStateProps {
  file: File;
  parsing: boolean;
  validating: boolean;
  applying: boolean;
  rows: ValidatedRow[];
  counts: { valid: number; errored: number; total: number };
  templateColumns: BulkUploadColumn[];
  tableLabel: string;
  onReset: () => void;
  onDownloadTemplate: () => void;
  error: string | null;
}

function PreviewState({
  file,
  parsing,
  validating,
  applying,
  rows,
  counts,
  templateColumns,
  tableLabel,
  onReset,
  onDownloadTemplate,
  error,
}: PreviewStateProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium truncate" title={file.name}>
            {file.name}
          </span>
          <span className="text-[11px] text-muted-foreground shrink-0">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {counts.total > 0 ? (
            <>
              <Badge variant="outline" className="text-[10px]">
                {counts.total} total
              </Badge>
              {counts.valid > 0 ? (
                <Badge variant="success" className="text-[10px]">
                  <CheckCircle2 className="h-3 w-3" />
                  {counts.valid} ready
                </Badge>
              ) : null}
              {counts.errored > 0 ? (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertTriangle className="h-3 w-3" />
                  {counts.errored} skipped
                </Badge>
              ) : null}
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onReset}
            disabled={applying}
            className="ml-1"
          >
            <X className="h-3 w-3" />
            Reset
          </Button>
        </div>
      </div>

      {parsing || validating ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {parsing ? 'Reading the file…' : 'Validating rows…'}
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p>{error}</p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onDownloadTemplate}
              className="text-foreground"
            >
              <Download className="h-3 w-3" />
              Download {tableLabel} template
            </Button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No rows were parsed from that file.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="max-h-[44vh] overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-muted z-10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium w-10">#</th>
                  {/*
                   * Renamed from "Status" so it can't collide with template
                   * columns that ARE called Status (Sites, Visits, Subjects
                   * all expose a Status field). The built-in pill conveys
                   * row-level validation, not the row's domain status.
                   */}
                  <th className="px-2 py-1.5 text-left font-medium w-20">Check</th>
                  {templateColumns.map((col) => (
                    <th
                      key={col.header}
                      className="px-2 py-1.5 text-left font-medium whitespace-nowrap"
                    >
                      {col.header}
                      {col.required ? (
                        <span className="text-destructive ml-0.5" aria-label="required">
                          *
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const hasErrors = row.errors.length > 0;
                  return (
                    <Fragment key={`row-${row.rowIndex}`}>
                      <tr
                        className={
                          'border-t border-border align-top ' +
                          (hasErrors ? 'bg-destructive/5' : '')
                        }
                      >
                        <td className="px-2 py-1.5 text-muted-foreground tabular-nums">
                          {row.rowIndex + 2}
                        </td>
                        <td className="px-2 py-1.5">
                          {hasErrors ? (
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span className="inline-flex items-center gap-1 cursor-help" />
                                }
                              >
                                <Badge variant="destructive" className="text-[10px]">
                                  <AlertTriangle className="h-3 w-3" />
                                  Skipped
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <ul className="list-disc pl-3 space-y-0.5 text-left">
                                  {row.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              Ready
                            </Badge>
                          )}
                        </td>
                        {templateColumns.map((col) => {
                          const value = row.raw[col.header] ?? '';
                          return (
                            <td
                              key={col.header}
                              className="px-2 py-1.5 max-w-[200px] truncate"
                              title={value || undefined}
                            >
                              {value || <span className="text-muted-foreground">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
