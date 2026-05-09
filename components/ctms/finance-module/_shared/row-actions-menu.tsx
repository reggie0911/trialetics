'use client';

import { DotsThreeVerticalIcon } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { recordFmRowActionTelemetry } from '@/lib/analytics/finance-row-action-telemetry';
import { cn } from '@/lib/utils';

export interface FinanceRowActionItem {
  id: string;
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  disabledReason?: string;
}

export interface FinanceRowActionTelemetryContext {
  studyId: string;
  tableKey: string;
  entityType: string;
}

interface FinanceRowActionsMenuProps {
  ariaLabel?: string;
  items: FinanceRowActionItem[];
  triggerClassName?: string;
  /** When set, each successful menu selection records `fm.row_action` telemetry (best-effort). */
  telemetryContext?: FinanceRowActionTelemetryContext;
}

/**
 * Ellipsis row menu for finance tables — matches compact sizing used in
 * `approval-request-actions.tsx` (h-7, 11px text).
 */
export function FinanceRowActionsMenu({
  ariaLabel = 'Row actions',
  items,
  triggerClassName,
  telemetryContext,
}: FinanceRowActionsMenuProps) {
  const fireTelemetry = (item: FinanceRowActionItem) => {
    if (!telemetryContext || item.disabled) return;
    void recordFmRowActionTelemetry({
      studyId: telemetryContext.studyId,
      tableKey: telemetryContext.tableKey,
      entityType: telemetryContext.entityType,
      action: item.id,
    }).catch(() => {});
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted/60',
          triggerClassName,
        )}
        aria-label={ariaLabel}
      >
        <DotsThreeVerticalIcon className="size-4" weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            variant={item.variant ?? 'default'}
            disabled={item.disabled}
            title={item.disabled ? item.disabledReason : undefined}
            onClick={() => {
              if (!item.disabled) {
                fireTelemetry(item);
                item.onSelect();
              }
            }}
            className="text-[11px]"
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
