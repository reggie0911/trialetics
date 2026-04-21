'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { AlertTriangle, FileText, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { bulkImportEcrf } from '@/lib/actions/study-ecrf-bulk-import';
import type {
  EcrfBulkMode,
  EcrfBulkPreview,
} from '@/lib/parsers/ecrf-bulk-preview';
import type { EcrfBulkResultCounts } from '@/lib/types/ecrf-bulk-import';
import {
  parseEcrfCsvFile,
  type EcrfBulkRow,
  type EcrfRowError,
} from '@/lib/parsers/ecrf-csv';

const MODE_OPTIONS: Array<{
  value: EcrfBulkMode;
  title: string;
  description: string;
}> = [
  {
    value: 'append',
    title: 'Append',
    description:
      'Add every row as new visits, CRFs, and questions. Nothing existing is modified.',
  },
  {
    value: 'upsert',
    title: 'Upsert',
    description:
      'Match by visit name → CRF name → question label. Existing items are updated; new ones are created.',
  },
  {
    value: 'replace',
    title: 'Replace',
    description:
      'Delete every visit, CRF, and question in this draft, then import the file from scratch.',
  },
];

const REPLACE_CONFIRM_TOKEN = 'REPLACE';

interface EcrfBulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyId: string;
  versionId: string;
  versionName: string | null;
  onSuccess: () => void;
}

export function EcrfBulkUploadDialog({
  open,
  onOpenChange,
  studyId,
  versionId,
  versionName,
  onSuccess,
}: EcrfBulkUploadDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<EcrfBulkMode>('append');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<EcrfBulkRow[]>([]);
  const [parseErrors, setParseErrors] = useState<EcrfRowError[]>([]);
  const [preview, setPreview] = useState<EcrfBulkPreview | null>(null);
  const [result, setResult] = useState<EcrfBulkResultCounts | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, startCommit] = useTransition();

  const reset = () => {
    setMode('append');
    setFile(null);
    setRows([]);
    setParseErrors([]);
    setPreview(null);
    setResult(null);
    setServerError(null);
    setConfirmText('');
    if (inputRef.current) inputRef.current.value = '';
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const handleFile = async (next: File | null) => {
    setFile(next);
    setRows([]);
    setParseErrors([]);
    setPreview(null);
    setResult(null);
    setServerError(null);
    if (!next) return;
    setIsParsing(true);
    try {
      const parsed = await parseEcrfCsvFile(next);
      setRows(parsed.rows);
      setParseErrors(parsed.errors);
    } finally {
      setIsParsing(false);
    }
  };

  const runPreview = async () => {
    if (rows.length === 0) return;
    setServerError(null);
    setResult(null);
    const res = await bulkImportEcrf({
      studyId,
      versionId,
      mode,
      rows,
      dryRun: true,
    });
    if (!res.ok) {
      setServerError(res.error);
      setPreview(null);
      return;
    }
    setPreview(res.preview);
  };

  // Re-preview whenever rows or mode change.
  useEffect(() => {
    if (rows.length === 0 || parseErrors.length > 0) {
      setPreview(null);
      return;
    }
    void runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mode]);

  const canCommit = useMemo(() => {
    if (rows.length === 0) return false;
    if (parseErrors.length > 0) return false;
    if (!preview) return false;
    if (mode === 'replace' && confirmText.trim() !== REPLACE_CONFIRM_TOKEN) {
      return false;
    }
    return true;
  }, [rows.length, parseErrors.length, preview, mode, confirmText]);

  const commit = () => {
    setServerError(null);
    startCommit(async () => {
      const res = await bulkImportEcrf({
        studyId,
        versionId,
        mode,
        rows,
        confirmReplaceText: confirmText,
      });
      if (!res.ok) {
        setServerError(res.error);
        toast.error(res.error ?? 'Bulk import failed.');
        return;
      }
      setResult(res.result);
      setPreview(res.preview);
      toast.success('Bulk import complete.');
      onSuccess();
    });
  };

  const downloadErrorsCsv = () => {
    if (parseErrors.length === 0) return;
    const header = 'row,column,message\n';
    const escape = (v: string | undefined) =>
      v === undefined ? '' : `"${v.replace(/"/g, '""')}"`;
    const body = parseErrors
      .map((e) => `${e.row},${escape(e.column)},${escape(e.message)}`)
      .join('\n');
    const blob = new Blob(['\ufeff' + header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecrf-bulk-upload-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk upload eCRF data</DialogTitle>
          <DialogDescription>
            Importing into draft <span className="font-medium">{versionName ?? '—'}</span>.
            Live versions can&apos;t be edited; clone them to a new draft first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <ModePicker value={mode} onChange={setMode} />

          <FileSection
            file={file}
            isParsing={isParsing}
            onPick={() => inputRef.current?.click()}
            onClear={() => void handleFile(null)}
          />
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />

          {parseErrors.length > 0 && (
            <ParseErrorsSection
              errors={parseErrors}
              onDownload={downloadErrorsCsv}
            />
          )}

          {parseErrors.length === 0 && rows.length > 0 && (
            <PreviewSection rows={rows} preview={preview} mode={mode} />
          )}

          {mode === 'replace' && rows.length > 0 && parseErrors.length === 0 && (
            <ReplaceConfirm value={confirmText} onChange={setConfirmText} />
          )}

          {result && <ResultSection result={result} />}

          {serverError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={commit} disabled={!canCommit || isCommitting}>
              {isCommitting ? 'Importing…' : `Import ${rows.length} row${rows.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function ModePicker({
  value,
  onChange,
}: {
  value: EcrfBulkMode;
  onChange: (next: EcrfBulkMode) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Merge strategy</Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as EcrfBulkMode)}
        className="grid gap-2 sm:grid-cols-3"
      >
        {MODE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer flex-col gap-1 rounded-md border border-input p-3 text-xs hover:bg-muted/40 has-[input:checked]:border-foreground/40 has-[input:checked]:bg-muted/40"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} />
              <span className="font-medium">{opt.title}</span>
              {opt.value === 'replace' && (
                <Badge variant="destructive" className="ml-auto text-[10px]">
                  Destructive
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">{opt.description}</p>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}

function FileSection({
  file,
  isParsing,
  onPick,
  onClear,
}: {
  file: File | null;
  isParsing: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  if (file) {
    return (
      <div className="flex items-center justify-between rounded-md border border-input bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">{file.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
              {isParsing ? ' · parsing…' : ''}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={isParsing}>
          <X className="mr-1 h-3 w-3" />
          Remove
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onPick}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input p-6 text-xs text-muted-foreground hover:bg-muted/40"
      >
        <Upload className="h-5 w-5" />
        <span className="font-medium">Choose CSV</span>
        <span className="text-[10px]">Use the downloaded template for guaranteed compatibility.</span>
      </button>
      <CsvHints />
    </div>
  );
}

function CsvHints() {
  return (
    <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <p className="mb-1 font-medium text-foreground">Accepted values</p>
      <ul className="space-y-0.5">
        <li>
          <span className="font-mono text-[11px]">Question Type</span>:{' '}
          <span className="font-mono text-[11px]">text</span>,{' '}
          <span className="font-mono text-[11px]">textarea</span>,{' '}
          <span className="font-mono text-[11px]">number</span>,{' '}
          <span className="font-mono text-[11px]">date</span>,{' '}
          <span className="font-mono text-[11px]">single_select</span>,{' '}
          <span className="font-mono text-[11px]">multi_select</span>,{' '}
          <span className="font-mono text-[11px]">yes_no</span>
        </li>
        <li>
          <span className="font-mono text-[11px]">Required</span>:{' '}
          <span className="font-mono text-[11px]">true</span> /{' '}
          <span className="font-mono text-[11px]">false</span> /{' '}
          <span className="font-mono text-[11px]">yes</span> /{' '}
          <span className="font-mono text-[11px]">no</span> /{' '}
          <span className="font-mono text-[11px]">1</span> /{' '}
          <span className="font-mono text-[11px]">0</span>
        </li>
        <li>
          <span className="font-mono text-[11px]">Options</span>: pipe-separated (e.g.{' '}
          <span className="font-mono text-[11px]">Mild|Moderate|Severe</span>) — only required for{' '}
          <span className="font-mono text-[11px]">single_select</span> /{' '}
          <span className="font-mono text-[11px]">multi_select</span>
        </li>
      </ul>
    </div>
  );
}

function ParseErrorsSection({
  errors,
  onDownload,
}: {
  errors: EcrfRowError[];
  onDownload: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {errors.length} row{errors.length === 1 ? '' : 's'} need attention
      </AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          Fix the rows below in your spreadsheet, save as CSV, and re-upload. Nothing has been written to the database.
        </p>
        <div className="rounded-md border border-destructive/40 bg-destructive/5">
          <ScrollArea className="max-h-48">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-[10px]">Row</TableHead>
                  <TableHead className="w-32 text-[10px]">Column</TableHead>
                  <TableHead className="text-[10px]">Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.slice(0, 50).map((e, i) => (
                  <TableRow key={`${e.row}-${i}`}>
                    <TableCell className="text-[10px]">{e.row}</TableCell>
                    <TableCell className="text-[10px] font-mono">
                      {e.column ?? '—'}
                    </TableCell>
                    <TableCell className="text-[10px]">{e.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        {errors.length > 50 && (
          <p className="mt-2 text-[10px]">
            Showing first 50 of {errors.length}. Use the download button for the full list.
          </p>
        )}
        <Button variant="outline" size="sm" className="mt-3" onClick={onDownload}>
          Download errors as CSV
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function PreviewSection({
  rows,
  preview,
  mode,
}: {
  rows: EcrfBulkRow[];
  preview: EcrfBulkPreview | null;
  mode: EcrfBulkMode;
}) {
  const visitNames = new Set(rows.map((r) => r.visit_name));
  const crfRows = rows.filter((r) => r.crf_name);
  const questionRows = rows.filter((r) => r.question_label);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Preview</Label>
      <div className="grid gap-2 sm:grid-cols-3">
        <PreviewCard label="Visits" total={visitNames.size} preview={preview} kind="visits" mode={mode} />
        <PreviewCard label="CRFs" total={crfRows.length} preview={preview} kind="crfs" mode={mode} />
        <PreviewCard
          label="Questions"
          total={questionRows.length}
          preview={preview}
          kind="questions"
          mode={mode}
        />
      </div>
    </div>
  );
}

function PreviewCard({
  label,
  total,
  preview,
  kind,
  mode,
}: {
  label: string;
  total: number;
  preview: EcrfBulkPreview | null;
  kind: 'visits' | 'crfs' | 'questions';
  mode: EcrfBulkMode;
}) {
  const created =
    kind === 'visits'
      ? preview?.visitsToCreate
      : kind === 'crfs'
        ? preview?.crfsToCreate
        : preview?.questionsToCreate;
  const updated =
    kind === 'visits'
      ? preview?.visitsToUpdate
      : kind === 'crfs'
        ? preview?.crfsToUpdate
        : preview?.questionsToUpdate;
  const deleted =
    kind === 'visits'
      ? preview?.visitsToDelete
      : kind === 'crfs'
        ? preview?.crfsToDelete
        : preview?.questionsToDelete;

  return (
    <div className="rounded-md border border-input bg-muted/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{total}</p>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        <Badge variant="outline">+{created ?? '—'} new</Badge>
        {mode === 'upsert' && <Badge variant="outline">~{updated ?? '—'} update</Badge>}
        {mode === 'replace' && (deleted ?? 0) > 0 && (
          <Badge variant="destructive">−{deleted} delete</Badge>
        )}
      </div>
    </div>
  );
}

function ReplaceConfirm({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Replace will delete every visit, CRF, and question in this draft</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          This is irreversible. Type{' '}
          <code className="rounded bg-destructive/20 px-1 font-mono">{REPLACE_CONFIRM_TOKEN}</code>{' '}
          to confirm.
        </p>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={REPLACE_CONFIRM_TOKEN}
          className="text-xs"
        />
      </AlertDescription>
    </Alert>
  );
}

function ResultSection({ result }: { result: EcrfBulkResultCounts }) {
  return (
    <Alert>
      <AlertTitle>Import complete</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <li>{result.visits_created} visits created</li>
          <li>{result.visits_updated} visits updated</li>
          <li>{result.crfs_created} CRFs created</li>
          <li>{result.crfs_updated} CRFs updated</li>
          <li>{result.questions_created} questions created</li>
          <li>{result.questions_updated} questions updated</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
