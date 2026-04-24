'use client';

import { AlertTriangle, Check, Sparkles, X } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DuplicateResolver, type DuplicateResolution } from './duplicate-resolver';
import type { CardConfidence, TableUpdatePayload } from '@/lib/ai/types';

const CONFIDENCE_META: Record<CardConfidence, { label: string; dot: string; row: string }> = {
  high: { label: 'High confidence', dot: 'bg-emerald-500', row: '' },
  medium: { label: 'Medium confidence', dot: 'bg-amber-500', row: '' },
  low: { label: 'Low confidence', dot: 'bg-red-500', row: 'bg-red-500/[0.04]' },
};

function humanizeColumn(path: string): string {
  const last = path.split('.').pop() ?? path;
  return last
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * `<TableUpdateGrid />` — review surface for proposed inserts/updates.
 *
 * Displays one row per proposal with per-row accept toggle, conflict
 * resolution UI for duplicates, and a footer Apply that hands the
 * accepted-set back to the host page (which performs the actual bulk write).
 */
export interface TableUpdateGridProps {
  payload: TableUpdatePayload;
  /** Subset of column paths to render (defaults to the union of value keys). */
  visibleColumns?: string[];
  onApply: (
    accepted: { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' }[]
  ) => void;
  onDiscard?: () => void;
  busy?: boolean;
}

export function TableUpdateGrid({ payload, visibleColumns, onApply, onDiscard, busy }: TableUpdateGridProps) {
  const [acceptedRows, setAcceptedRows] = useState<Set<number>>(() =>
    new Set(payload.ops.map((_, i) => i))
  );
  const [resolutions, setResolutions] = useState<Record<number, DuplicateResolution>>({});

  const columns = useMemo(() => {
    if (visibleColumns?.length) return visibleColumns;
    const set = new Set<string>();
    for (const op of payload.ops) Object.keys(op.values).forEach(k => set.add(k));
    return Array.from(set);
  }, [payload.ops, visibleColumns]);

  const conflictCount = useMemo(
    () => payload.ops.filter(op => op.conflictWith).length,
    [payload.ops]
  );

  const handleApply = () => {
    const accepted = payload.ops
      .map((op, idx) => ({ op, idx }))
      .filter(({ idx }) => acceptedRows.has(idx))
      .map(({ op, idx }) => {
        let values = op.values;
        const resolution = resolutions[idx] ?? (op.conflictWith ? 'keep_new' : undefined);
        if (op.conflictWith) {
          if (resolution === 'keep_existing') return null;
          if (resolution === 'merge') {
            values = { ...op.conflictWith.preview, ...op.values };
          }
        }
        return { rowIndex: idx, values, op: op.op };
      })
      .filter((entry): entry is { rowIndex: number; values: Record<string, unknown>; op: 'insert' | 'update' } => !!entry);
    onApply(accepted);
  };

  const acceptedCount = acceptedRows.size;
  const totalRows = payload.ops.length;
  const lowConfidenceCount = useMemo(
    () => payload.ops.filter(op => op.confidence === 'low').length,
    [payload.ops]
  );
  const allChecked = totalRows > 0 && acceptedCount === totalRows;
  const someChecked = acceptedCount > 0 && acceptedCount < totalRows;
  const toggleAll = () => {
    setAcceptedRows(prev => {
      if (prev.size === totalRows) return new Set();
      return new Set(payload.ops.map((_, i) => i));
    });
  };

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-background px-5 py-4">
        <div className="min-w-0 space-y-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" style={{ color: 'var(--copilot-accent)' }} />
              <h2 className="text-base font-semibold leading-tight">Review proposed rows</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Uncheck any rows you don&rsquo;t want, then apply to {payload.tableLabel ?? payload.tableId}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <Badge variant="outline">
              {totalRows.toLocaleString()} row{totalRows === 1 ? '' : 's'} proposed
            </Badge>
            <Badge variant={acceptedCount === totalRows ? 'success' : 'secondary'}>
              {acceptedCount}/{totalRows} accepted
            </Badge>
            {conflictCount > 0 ? (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {conflictCount} duplicate{conflictCount === 1 ? '' : 's'}
              </Badge>
            ) : null}
            {lowConfidenceCount > 0 ? (
              <Badge variant="destructive" className="gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                {lowConfidenceCount} low confidence
              </Badge>
            ) : null}
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 bg-muted/10">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
            <tr className="border-b border-border">
              <th className="w-8 px-2 py-2">
                <Checkbox
                  checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  aria-label={allChecked ? 'Deselect all rows' : 'Select all rows'}
                />
              </th>
              {columns.map(col => (
                <th
                  key={col}
                  className="whitespace-nowrap px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                  title={col}
                >
                  {humanizeColumn(col)}
                </th>
              ))}
              <th className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Action
              </th>
              <th className="px-2.5 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody>
            {payload.ops.map((op, idx) => {
              const accepted = acceptedRows.has(idx);
              const confidenceMeta = CONFIDENCE_META[op.confidence];
              return (
                <Fragment key={`row-${idx}`}>
                  <tr
                    className={cn(
                      'border-b border-border transition-colors hover:bg-muted/30',
                      confidenceMeta.row,
                      accepted
                        ? '[border-left:2px_solid_var(--copilot-accent)]'
                        : 'opacity-60 [border-left:2px_solid_transparent]'
                    )}
                  >
                    <td className="px-2 py-2 align-top">
                      <Checkbox
                        checked={accepted}
                        onCheckedChange={() => {
                          setAcceptedRows(prev => {
                            const next = new Set(prev);
                            if (next.has(idx)) next.delete(idx);
                            else next.add(idx);
                            return next;
                          });
                        }}
                        aria-label={accepted ? `Reject row ${idx + 1}` : `Accept row ${idx + 1}`}
                      />
                    </td>
                    {columns.map(col => {
                      const value = formatValue(op.values[col]);
                      const isEmpty = value === '—';
                      return (
                        <td
                          key={col}
                          className={cn(
                            'max-w-[220px] px-2.5 py-1.5 align-top break-words',
                            isEmpty ? 'text-muted-foreground/60' : 'text-foreground'
                          )}
                          title={value}
                        >
                          {value}
                        </td>
                      );
                    })}
                    <td className="px-2.5 py-1.5 align-top">
                      <Badge
                        variant={op.op === 'insert' ? 'success' : 'info'}
                        className="text-[10px] capitalize"
                      >
                        {op.op}
                      </Badge>
                    </td>
                    <td className="px-2.5 py-1.5 text-right align-top">
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
                    </td>
                  </tr>
                  {op.conflictWith ? (
                    <tr className="border-b border-border bg-amber-500/5">
                      <td colSpan={columns.length + 3} className="px-3 py-2">
                        <DuplicateResolver
                          row={op}
                          resolution={resolutions[idx] ?? 'keep_new'}
                          onChange={resolution => setResolutions(prev => ({ ...prev, [idx]: resolution }))}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {payload.ops.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No rows proposed. Try a different file.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </ScrollArea>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-5 py-3">
        <div className="text-[11px] text-muted-foreground">
          {acceptedCount === 0 ? (
            <span>Select at least one row to apply.</span>
          ) : (
            <span>
              <span className="font-medium text-foreground">{acceptedCount}</span> of {totalRows} row
              {totalRows === 1 ? '' : 's'} will be written
              {totalRows - acceptedCount > 0 ? ` · ${totalRows - acceptedCount} skipped` : ''}.
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onDiscard ? (
            <Button type="button" size="sm" variant="ghost" onClick={onDiscard} disabled={busy}>
              <X className="mr-1 h-3 w-3" /> Discard
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={handleApply} disabled={busy || acceptedCount === 0}>
            <Check className="mr-1 h-3 w-3" /> Apply {acceptedCount} row{acceptedCount === 1 ? '' : 's'}
          </Button>
        </div>
      </footer>
    </section>
  );
}

function formatValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
