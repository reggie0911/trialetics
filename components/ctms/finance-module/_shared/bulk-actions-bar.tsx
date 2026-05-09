'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FinanceBulkAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
  disabled?: boolean;
}

interface FinanceBulkActionsBarProps {
  selectedCount: number;
  actions: FinanceBulkAction[];
  className?: string;
}

/**
 * Shown above finance tables when row selection is enabled and at least one row is selected.
 */
export function FinanceBulkActionsBar({ selectedCount, actions, className }: FinanceBulkActionsBarProps) {
  if (selectedCount === 0 || actions.length === 0) return null;
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2',
        className,
      )}
    >
      <p className="text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{selectedCount}</span> selected
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {actions.map((a) => (
          <Button
            key={a.id}
            type="button"
            size="sm"
            variant={a.variant ?? 'outline'}
            className="h-7 text-[11px]"
            disabled={a.disabled}
            onClick={a.onClick}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
