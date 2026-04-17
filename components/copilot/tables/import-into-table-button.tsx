'use client';

import { Sparkles, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ImportIntoTableButton({
  tableId,
  tableLabel,
  onClick,
  disabled,
}: {
  tableId: string;
  tableLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={onClick}
            className="gap-1.5"
            data-copilot-table-id={tableId}
          >
            <Upload className="h-3.5 w-3.5" />
            <Sparkles className="h-3 w-3" style={{ color: 'var(--copilot-accent)' }} />
            <span>Import with Copilot</span>
          </Button>
        }
      />
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        Drop a spreadsheet — the Copilot maps columns and proposes inserts/updates for {tableLabel ?? 'this table'} with duplicate detection.
      </TooltipContent>
    </Tooltip>
  );
}
