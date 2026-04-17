'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfidenceIndicator } from '@/components/copilot/cards/confidence-indicator';
import { cn } from '@/lib/utils';
import type { CardConfidence, TableUpdatePayload } from '@/lib/ai/types';

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
  onConfirm: (mapping: Record<string, { fieldPath: string; confidence?: CardConfidence }>, saveForFuture: boolean) => void;
  onBack?: () => void;
}

export function FieldMappingStep({ payload, targetFields, onConfirm, onBack }: FieldMappingStepProps) {
  const initial = payload.mapping ?? {};
  const [mapping, setMapping] = useState<Record<string, { fieldPath: string; confidence?: CardConfidence }>>(
    initial
  );
  const [saveForFuture, setSaveForFuture] = useState(true);

  // Source columns are the keys of the proposal mapping plus any column
  // that appeared in the rows but didn't get mapped automatically.
  const sourceColumns = Object.keys(initial);
  const mappedCount = Object.values(mapping).filter(v => v?.fieldPath).length;

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-background px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Confirm column mapping</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {mappedCount} of {sourceColumns.length} columns mapped to {payload.tableLabel ?? payload.tableId}.
          </p>
        </div>
        {onBack ? (
          <Button type="button" size="sm" variant="ghost" onClick={onBack}>
            Back
          </Button>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <ul className="divide-y divide-border">
          {sourceColumns.map(column => {
            const current = mapping[column];
            return (
              <li key={column} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 text-[11px]">
                <div className="min-w-0">
                  <div className="truncate font-mono">{column}</div>
                  <div className="text-[10px] text-muted-foreground">source column</div>
                </div>
                <div className="flex items-center justify-center">
                  {current?.fieldPath ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={current?.fieldPath ?? UNMAPPED}
                    onValueChange={value =>
                      setMapping(prev => ({
                        ...prev,
                        [column]: value === UNMAPPED ? { fieldPath: '' } : { fieldPath: value, confidence: 'medium' },
                      }))
                    }
                  >
                    <SelectTrigger className="h-7 text-[11px]">
                      <SelectValue placeholder="Unmapped" />
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
                  {current?.confidence ? <ConfidenceIndicator level={current.confidence} size="xs" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border bg-background px-4 py-3">
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={saveForFuture}
            onChange={e => setSaveForFuture(e.target.checked)}
            className="accent-current"
          />
          <span>
            Remember this mapping for future uploads with the same columns
            <Badge variant="secondary" className="ml-2 text-[10px]">
              recommended
            </Badge>
          </span>
        </label>
        <Button
          type="button"
          size="sm"
          className={cn('gap-1.5')}
          onClick={() => onConfirm(mapping, saveForFuture)}
        >
          Continue with {mappedCount} mapping{mappedCount === 1 ? '' : 's'}
        </Button>
      </footer>
    </section>
  );
}
