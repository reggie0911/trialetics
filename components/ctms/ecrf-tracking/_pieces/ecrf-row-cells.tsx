'use client';

import { MoreHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeUpdated } from '@/lib/utils/relative-time';
import { cn } from '@/lib/utils';

/**
 * Two-line cell rendering an ISO timestamp as "Apr 18, 2026" plus a relative
 * "Updated 2d ago" line below it. Falls back to an em-dash when the value is
 * missing — used by Last Entry / Last SDV columns.
 */
export function ActivityTimestampCell({
  iso,
  className,
}: {
  iso: string | null | undefined;
  className?: string;
}) {
  if (!iso) {
    return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  }
  const date = new Date(iso);
  const dateLabel = Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
  const relative = formatRelativeUpdated(iso).replace(/^Updated\s+/, '');
  return (
    <div className={cn('flex flex-col text-[11px]', className)}>
      <span className="font-medium text-foreground">{dateLabel}</span>
      <span className="text-muted-foreground">{relative}</span>
    </div>
  );
}

/**
 * Compact "Open / Overdue" queries pair, used in the "Queries" column on the
 * redesigned table. Shows two pills side-by-side — overdue surfaces only when
 * non-zero so healthy rows stay quiet.
 */
export function QueriesSplitCell({
  open,
  overdue,
  className,
}: {
  open: number;
  overdue: number;
  className?: string;
}) {
  if (open === 0 && overdue === 0) {
    return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  }
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-1', className)}>
      {open > 0 && (
        <Badge
          variant="destructive"
          className="font-mono text-[10px]"
          aria-label={`${open} open queries`}
        >
          {open} open
        </Badge>
      )}
      {overdue > 0 && (
        <Badge
          variant="warning"
          className="font-mono text-[10px]"
          aria-label={`${overdue} overdue queries`}
        >
          {overdue} overdue
        </Badge>
      )}
      {open === 0 && overdue === 0 && (
        <span className="text-muted-foreground text-xs">—</span>
      )}
    </div>
  );
}

/** Numeric badge used for the "Missing CRFs" column. */
export function MissingCrfsCell({ value }: { value: number | undefined }) {
  if (value === undefined || value === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center justify-center rounded-md bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-amber-700 dark:text-amber-400">
      {value}
    </span>
  );
}

/** Generic row "Actions ▾" / "Manage ▾" kebab menu. */
export function RowActionsMenu({
  label = 'Actions',
  items,
}: {
  label?: string;
  items: { label: string; onSelect: () => void; destructive?: boolean }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            aria-label={`${label} menu`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {items.map((it) => (
          <DropdownMenuItem
            key={it.label}
            onClick={() => it.onSelect()}
            variant={it.destructive ? 'destructive' : 'default'}
          >
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
