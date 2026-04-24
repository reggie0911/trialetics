'use client';

import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { VisitScheduleBucketCounts } from '@/lib/types/ctms';

/** Counter shape every Visit Schedule rollup row exposes. */
export type VisitRollupCounters = VisitScheduleBucketCounts;

interface BaseColumn<TRow> {
  key: string;
  header: string;
  /** Optional aria-/title-style tooltip text shown on the column header. */
  headerTooltip?: string;
  /** Tailwind classes applied to both the header cell and body cells. */
  className?: string;
  render?: (row: TRow) => ReactNode;
}

interface ValueColumn<TRow> extends BaseColumn<TRow> {
  value: (row: TRow) => ReactNode;
}

export type VisitRollupColumn<TRow> = ValueColumn<TRow>;

interface VisitRollupTableProps<TRow extends VisitRollupCounters> {
  /** Optional title (rendered in `card` variant only — `panel` callers usually rely on the parent Tab label). */
  title?: string;
  description?: string;
  rows: TRow[];
  columns: VisitRollupColumn<TRow>[];
  rowKey: (row: TRow) => string;
  emptyState?: ReactNode;
  /**
   * `card` (default) keeps the standalone Card chrome with header + bordered
   * table. `panel` drops the Card so the table sits flush inside a TabsContent
   * or other parent container.
   */
  variant?: 'card' | 'panel';
  /** Optional toolbar slot rendered above the description (e.g. a Search input). */
  toolbar?: ReactNode;
  /** Optional footer slot rendered below the table (typically `<TablePaginationFooter>`). */
  footer?: ReactNode;
}

function CountBadge({
  count,
  variant,
  zeroAsDash = true,
}: {
  count: number;
  variant: 'success' | 'warning' | 'destructive' | 'info' | 'secondary' | 'outline';
  zeroAsDash?: boolean;
}) {
  if (count === 0 && zeroAsDash) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  return (
    <Badge variant={variant} className="font-mono text-[10px]">
      {count}
    </Badge>
  );
}

function PctBadge({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Badge variant="outline" className="font-mono text-[10px]">
        —
      </Badge>
    );
  }
  const variant = value >= 100 ? 'success' : value >= 50 ? 'info' : 'secondary';
  return (
    <Badge variant={variant} className="font-mono text-[10px]">
      {value}%
    </Badge>
  );
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

/**
 * Shared bucket / completion columns appended after each scope's descriptive
 * columns. Same left-to-right order as the header pills so the eye can scan
 * across header → table without re-mapping mental model.
 */
export function bucketColumns<
  TRow extends VisitRollupCounters,
>(): VisitRollupColumn<TRow>[] {
  return [
    {
      key: 'total',
      header: 'Visits',
      headerTooltip: 'Total visits in scope.',
      className: 'text-center w-[70px]',
      value: (row) => row.total,
    },
    {
      key: 'done',
      header: 'Done',
      headerTooltip: 'Status completed / missed / skipped.',
      className: 'text-center w-[70px]',
      value: (row) => row.done,
      render: (row) => <CountBadge count={row.done} variant="success" />,
    },
    {
      key: 'done_pct',
      header: 'Done %',
      headerTooltip: 'Done ÷ total visits.',
      className: 'text-center w-[80px]',
      value: (row) => row.done,
      render: (row) => <PctBadge value={pct(row.done, row.total)} />,
    },
    {
      key: 'in_window',
      header: 'In win',
      headerTooltip: 'Actual date inside the protocol window.',
      className: 'text-center w-[70px]',
      value: (row) => row.in_window,
      render: (row) => <CountBadge count={row.in_window} variant="success" />,
    },
    {
      key: 'out_of_window',
      header: 'Out',
      headerTooltip: 'Actual date outside the protocol window.',
      className: 'text-center w-[70px]',
      value: (row) => row.out_of_window,
      render: (row) => <CountBadge count={row.out_of_window} variant="warning" />,
    },
    {
      key: 'overdue',
      header: 'Overdue',
      headerTooltip: 'Window closed without an actual date.',
      className: 'text-center w-[80px]',
      value: (row) => row.overdue,
      render: (row) => <CountBadge count={row.overdue} variant="destructive" />,
    },
    {
      key: 'due_now',
      header: 'Due',
      headerTooltip: 'Today is inside the protocol window.',
      className: 'text-center w-[70px]',
      value: (row) => row.due_now,
      render: (row) => <CountBadge count={row.due_now} variant="info" />,
    },
    {
      key: 'upcoming',
      header: 'Upcoming',
      headerTooltip: 'Window has not opened yet.',
      className: 'text-center w-[90px]',
      value: (row) => row.upcoming,
      render: (row) => <CountBadge count={row.upcoming} variant="secondary" />,
    },
    {
      key: 'pending',
      header: 'Pending',
      headerTooltip: 'No planned date or window set yet.',
      className: 'text-center w-[80px]',
      value: (row) => row.pending,
      render: (row) => <CountBadge count={row.pending} variant="outline" />,
    },
  ];
}

/**
 * Generic Card-wrapped rollup table reused for By Site / By Visit / By Subject
 * sections. The bucket columns from `bucketColumns()` should be appended
 * after the scope-specific descriptive columns so every section reads the
 * same left-to-right.
 */
export function VisitRollupTable<TRow extends VisitRollupCounters>({
  title,
  description,
  rows,
  columns,
  rowKey,
  emptyState,
  variant = 'card',
  toolbar,
  footer,
}: VisitRollupTableProps<TRow>) {
  const tableNode = (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.headerTooltip ? (
                  <Tooltip>
                    <TooltipTrigger render={<span className="cursor-help" />}>
                      {col.header}
                    </TooltipTrigger>
                    <TooltipContent>{col.headerTooltip}</TooltipContent>
                  </Tooltip>
                ) : (
                  col.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-xs text-muted-foreground py-8"
              >
                {emptyState ?? 'No rows in scope.'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(row) : col.value(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (variant === 'panel') {
    return (
      <div className="space-y-3">
        {(toolbar || description) && (
          <div className="space-y-2 px-1">
            {toolbar}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        {tableNode}
        {footer && <div className="px-1 pt-1">{footer}</div>}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            ({rows.length})
          </span>
        </CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {toolbar}
      </CardHeader>
      <CardContent className="p-0">{tableNode}</CardContent>
      {footer && (
        <div className="px-4 pb-3 pt-2 border-t">{footer}</div>
      )}
    </Card>
  );
}
