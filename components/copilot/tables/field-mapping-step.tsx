'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, FileSpreadsheet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CardConfidence, TableUpdatePayload } from '@/lib/ai/types';

const CONFIDENCE_META: Record<CardConfidence, { label: string; dot: string; row: string }> = {
  high: { label: 'High confidence', dot: 'bg-emerald-500', row: '' },
  medium: { label: 'Medium confidence', dot: 'bg-amber-500', row: '' },
  low: { label: 'Low confidence', dot: 'bg-red-500', row: 'bg-red-500/5' },
};

const UNMAPPED = '__unmapped__';

/**
 * Confirm-the-mapping step that runs before the user reviews proposed rows.
 *
 * Shows the source columns on the left and the target field path each was
 * matched to on the right, with confidence per row. Each match is editable
 * via a Select; "Save mapping" persists the user's choices to
 * `copilot_field_mappings` so future uploads with the same column signature
 * skip this step.
 */
export interface FieldMappingStepProps {
  payload: TableUpdatePayload;
  /** Available target fields the user can pick from. */
  targetFields: { path: string; label: string }[];
  parsedPreview?: {
    headers: string[];
    sampleRows: string[][];
    fileName?: string;
    totalRows?: number;
  };
  /** True while the host is rebuilding ops with a changed mapping. */
  busy?: boolean;
  onConfirm: (mapping: Record<string, { fieldPath: string; confidence?: CardConfidence }>, saveForFuture: boolean) => void;
  onBack?: () => void;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function truncateCell(value: string, max = 24): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function FieldMappingStep({
  payload,
  targetFields,
  parsedPreview,
  busy,
  onConfirm,
  onBack,
}: FieldMappingStepProps) {
  const initial = payload.mapping ?? {};
  const [mapping, setMapping] = useState<Record<string, { fieldPath: string; confidence?: CardConfidence }>>(
    initial
  );
  const [saveForFuture, setSaveForFuture] = useState(true);

  // Source columns are the keys of the proposal mapping plus any column
  // that appeared in the rows but didn't get mapped automatically.
  const sourceColumns = Object.keys(initial);
  const mappedCount = Object.values(mapping).filter(v => v?.fieldPath).length;
  const totalRows = Math.max(0, parsedPreview?.totalRows ?? payload.ops.length);
  const previewHeaders = parsedPreview?.headers ?? [];
  const previewRows = parsedPreview?.sampleRows.slice(0, 5) ?? [];

  const sampleValuesByColumn = useMemo(() => {
    if (!parsedPreview?.headers?.length || !parsedPreview.sampleRows.length) return new Map<string, string>();
    const out = new Map<string, string>();
    for (const column of sourceColumns) {
      const idx = parsedPreview.headers.findIndex(h => normalizeHeader(h) === normalizeHeader(column));
      if (idx < 0) continue;
      const values = parsedPreview.sampleRows
        .map(row => String(row[idx] ?? '').trim())
        .filter(Boolean)
        .slice(0, 2);
      if (values.length) out.set(column, values.join(', '));
    }
    return out;
  }, [parsedPreview, sourceColumns]);

  const unmappedCount = sourceColumns.length - mappedCount;
  const rowGridClass =
    'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_auto] items-center gap-3';

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background px-5 py-4">
        <div className="min-w-0 space-y-2">
          <div>
            <h2 className="text-base font-semibold leading-tight">Confirm column mapping</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Review how your file&rsquo;s columns map to {payload.tableLabel ?? payload.tableId}, then continue.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {parsedPreview?.fileName ? (
              <Badge variant="secondary" className="gap-1.5">
                <FileSpreadsheet className="h-3 w-3" aria-hidden="true" />
                <span className="max-w-[220px] truncate" title={parsedPreview.fileName}>
                  {parsedPreview.fileName}
                </span>
              </Badge>
            ) : null}
            <Badge variant="outline">
              Importing {totalRows.toLocaleString()} row{totalRows === 1 ? '' : 's'}
            </Badge>
            <Badge variant={unmappedCount === 0 ? 'success' : 'warning'}>
              {mappedCount}/{sourceColumns.length} mapped
            </Badge>
          </div>
        </div>
        {onBack ? (
          <Button type="button" size="sm" variant="ghost" onClick={onBack}>
            Back
          </Button>
        ) : null}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto bg-muted/10 px-5 py-4">
        {parsedPreview && previewHeaders.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="text-xs font-medium">File preview</div>
              <div className="text-[11px] text-muted-foreground">
                Showing first {previewRows.length} of {totalRows.toLocaleString()} row
                {totalRows === 1 ? '' : 's'}
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border border-border bg-background shadow-sm">
              <table className="w-full text-[11px]">
                <thead className="bg-muted/40">
                  <tr>
                    {previewHeaders.map((header, idx) => (
                      <th
                        key={`${header}-${idx}`}
                        className="whitespace-nowrap border-b border-border px-2.5 py-2 text-left font-medium text-muted-foreground"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIdx) => (
                    <tr
                      key={`preview-row-${rowIdx}`}
                      className="border-b border-border/60 last:border-b-0 even:bg-muted/20"
                    >
                      {previewHeaders.map((_, colIdx) => {
                        const value = String(row[colIdx] ?? '');
                        return (
                          <td
                            key={`preview-cell-${rowIdx}-${colIdx}`}
                            className="max-w-[220px] px-2.5 py-1.5"
                          >
                            <span className="block truncate" title={value}>
                              {value || <span className="text-muted-foreground">—</span>}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-md border border-border bg-background shadow-sm">
          <div
            className={cn(
              rowGridClass,
              'sticky top-0 z-10 border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'
            )}
          >
            <span>Source column</span>
            <span>Sample data</span>
            <span>Mapped to</span>
            <span className="pl-1 text-right">Confidence</span>
          </div>
          <ul className="divide-y divide-border">
            {sourceColumns.map(column => {
              const current = mapping[column];
              const matchedLabel = current?.fieldPath
                ? targetFields.find(f => f.path === current.fieldPath)?.label
                : undefined;
              const sampleText = sampleValuesByColumn.get(column) ?? '';
              const isUnmapped = !current?.fieldPath;
              const confidenceMeta = current?.confidence ? CONFIDENCE_META[current.confidence] : null;
              return (
                <li
                  key={column}
                  className={cn(
                    rowGridClass,
                    'px-3 py-2.5 text-[11px] transition-colors hover:bg-muted/30',
                    isUnmapped && 'bg-amber-500/5'
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium" title={column}>
                      {column}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Source column
                    </div>
                  </div>
                  <div
                    className="min-w-0 text-muted-foreground"
                    title={sampleText || 'No sample values found'}
                  >
                    {sampleText ? (
                      <span className="block truncate">{truncateCell(sampleText, 36)}</span>
                    ) : (
                      <span className="italic text-muted-foreground/70">No sample</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Select
                      value={current?.fieldPath ?? UNMAPPED}
                      onValueChange={value =>
                        setMapping(prev => ({
                          ...prev,
                          [column]:
                            value === UNMAPPED
                              ? { fieldPath: '' }
                              : { fieldPath: value, confidence: 'medium' },
                        }))
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          'h-8 w-full text-[11px]',
                          isUnmapped && 'border-amber-500/60 text-amber-700 dark:text-amber-300'
                        )}
                      >
                        <SelectValue placeholder="Choose field…">
                          {matchedLabel ?? 'Choose field…'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNMAPPED}>Unmapped</SelectItem>
                        {targetFields.map(field => (
                          <SelectItem key={field.path} value={field.path}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-end pl-1">
                    {confidenceMeta ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span
                              aria-label={confidenceMeta.label}
                              className={cn(
                                'inline-block h-2 w-2 rounded-full',
                                confidenceMeta.dot
                              )}
                            />
                          }
                        />
                        <TooltipContent side="top" className="text-xs">
                          {confidenceMeta.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span aria-label="Unmapped">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          }
                        />
                        <TooltipContent side="top" className="text-xs">
                          Choose a target field to map this column.
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-5 py-3">
        <label className="flex max-w-[60%] items-center gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={saveForFuture}
            onChange={e => setSaveForFuture(e.target.checked)}
            className="accent-current"
          />
          <span className="truncate">
            Remember this mapping for files with the same columns
          </span>
          <Badge variant="secondary" className="text-[10px]">
            Recommended
          </Badge>
        </label>
        <Button
          type="button"
          size="sm"
          className="gap-1.5"
          onClick={() => onConfirm(mapping, saveForFuture)}
          disabled={mappedCount === 0 || busy}
        >
          {busy ? 'Rebuilding rows…' : `Continue with ${mappedCount} mapping${mappedCount === 1 ? '' : 's'}`}
        </Button>
      </footer>
    </section>
  );
}
