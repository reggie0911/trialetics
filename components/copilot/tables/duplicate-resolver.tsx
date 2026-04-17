'use client';

import { ArrowRightLeft } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TableRowProposal } from '@/lib/ai/types';

export type DuplicateResolution = 'merge' | 'keep_existing' | 'keep_new';

/**
 * Inline duplicate-resolution control. The grid renders one per conflicting
 * row and the user picks the resolution before accepting the row.
 */
export function DuplicateResolver({
  row,
  resolution,
  onChange,
}: {
  row: TableRowProposal;
  resolution: DuplicateResolution;
  onChange: (resolution: DuplicateResolution) => void;
}) {
  if (!row.conflictWith) return null;

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px]">
      <div className="mb-2 flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
        <ArrowRightLeft className="h-3 w-3" />
        Duplicate detected
        <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-700 dark:text-amber-300">
          existing
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
        <div>
          <div className="text-[10px] uppercase tracking-wide">Existing</div>
          <pre className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[10px]">
            {JSON.stringify(row.conflictWith.preview, null, 2).slice(0, 240)}
          </pre>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide">Proposed</div>
          <pre className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[10px]">
            {JSON.stringify(row.values, null, 2).slice(0, 240)}
          </pre>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5">
        <Button
          type="button"
          variant={resolution === 'keep_existing' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('keep_existing')}
        >
          Keep existing
        </Button>
        <Button
          type="button"
          variant={resolution === 'merge' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('merge')}
        >
          Merge
        </Button>
        <Button
          type="button"
          variant={resolution === 'keep_new' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('keep_new')}
        >
          Keep new
        </Button>
      </div>
    </div>
  );
}
