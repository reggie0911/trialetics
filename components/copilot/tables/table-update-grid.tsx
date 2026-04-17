'use client';

import { Check, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfidenceIndicator } from '@/components/copilot/cards/confidence-indicator';
import { DuplicateResolver, type DuplicateResolution } from './duplicate-resolver';
import type { TableUpdatePayload } from '@/lib/ai/types';

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

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-background px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
            <h2 className="text-sm font-semibold">Review proposed rows</h2>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {payload.ops.length} row{payload.ops.length === 1 ? '' : 's'} from{' '}
            <span className="font-mono">{payload.agentId}</span> for {payload.tableLabel ?? payload.tableId}.
          </p>
        </div>
        {conflictCount > 0 ? (
          <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-600 dark:text-amber-400">
            {conflictCount} duplicate{conflictCount === 1 ? '' : 's'}
          </Badge>
        ) : null}
      </header>

      <ScrollArea className="flex-1">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border">
              <th className="w-8 px-2 py-2"></th>
              {columns.map(col => (
                <th key={col} className="px-2 py-2 text-left font-mono text-[10px] font-semibold text-muted-foreground">
                  {col}
                </th>
              ))}
              <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                Action
              </th>
              <th className="px-2 py-2 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody>
            {payload.ops.map((op, idx) => {
              const accepted = acceptedRows.has(idx);
              return (
                <>
                  <tr
                    key={`row-${idx}`}
                    className={accepted ? 'border-b border-border [border-left:2px_solid_var(--copilot-accent)]' : 'border-b border-border'}
                  >
                    <td className="px-2 py-2">
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
                      />
                    </td>
                    {columns.map(col => (
                      <td key={col} className="px-2 py-1.5 align-top font-mono break-words text-muted-foreground">
                        {formatValue(op.values[col])}
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <Badge variant={op.op === 'insert' ? 'default' : 'secondary'} className="text-[10px]">
                        {op.op}
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5">
                      <ConfidenceIndicator level={op.confidence} size="xs" />
                    </td>
                  </tr>
                  {op.conflictWith ? (
                    <tr key={`row-${idx}-dup`} className="border-b border-border bg-muted/30">
                      <td colSpan={columns.length + 3} className="px-2 py-2">
                        <DuplicateResolver
                          row={op}
                          resolution={resolutions[idx] ?? 'keep_new'}
                          onChange={resolution => setResolutions(prev => ({ ...prev, [idx]: resolution }))}
                        />
                      </td>
                    </tr>
                  ) : null}
                </>
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

      <footer className="flex items-center justify-between gap-3 border-t border-border bg-background px-4 py-3">
        <div className="text-[11px] text-muted-foreground">
          {acceptedCount} of {payload.ops.length} rows accepted
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
