'use client';

import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { cn } from '@/lib/utils';

/** Counter shape every Visit Schedule rollup row exposes. */
export type VisitRollupCounters = VisitScheduleBucketCounts;

interface BaseColumn<TRow> {
  key: string;
  header: string;
  /** Optional aria-/title-style tooltip text shown on the column header. */
  headerTooltip?: string;
  /** Optional small muted second line under the header text (e.g. "(Oldest overdue)"). */
  headerSubtitle?: string;
  /** When set, consecutive columns sharing the same `group` render under a
   *  shared parent header cell with `colSpan`. Ungrouped columns get
   *  `rowSpan={2}` automatically. */
  group?: string;
  /** Tailwind classes applied to both the header cell and body cells. */
  className?: string;
  render?: (row: TRow) => ReactNode;
  /** Optional cell rendered in the totals row (when `showTotalsRow` is true).
   *  Falls back to summing `value(row)` when omitted and the column is bucket-shaped. */
  totalRender?: (rows: TRow[]) => ReactNode;
}

interface ValueColumn<TRow> extends BaseColumn<TRow> {
  value: (row: TRow) => ReactNode;
}

export type VisitRollupColumn<TRow> = ValueColumn<TRow>;

/** Tone keys for `BucketCell`, paired with their light/dark Tailwind tokens. */
export type BucketTone =
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'muted';

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
  /** When true, render an expand chevron in the leading column whose body is
   *  produced by `renderExpanded(row)`. */
  expandable?: boolean;
  renderExpanded?: (row: TRow) => ReactNode;
  /** Render a sticky totals row at the bottom of the table summing every
   *  bucket column. Defaults to off so callers without bucket totals stay
   *  unaffected. */
  showTotalsRow?: boolean;
  /** Replaces the leading 'Totals' cell text in the footer (e.g. "Total (2 sites)"). */
  totalsLabel?: string;
  /** Optional 2px colored left-border accent on each row, with an optional
   *  tooltip surfaced via `title`. Returning null skips the accent for that
   *  row. Used by the By Site table to render the Priority stripe without
   *  spending a column. */
  rowAccent?: (row: TRow) => { color: string; tooltip?: string } | null;
}

/** Tone → text classes. Paired with dark variants so bucket %s stay legible
 *  on `dark:bg-card`. */
const TONE_TEXT: Record<BucketTone, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  destructive: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  muted: 'text-muted-foreground',
};

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

/**
 * Stacked count + percentage cell matching the redesigned reference: plain
 * dark count on top, colored percentage underneath. Empty-state semantics:
 *
 *   total === 0                   → render `—` / `—` (muted, "no data")
 *   total > 0 && count === 0      → render `0`  / `0%`  (muted, "in scope, no incidents")
 *   total > 0 && count > 0        → render `N`  / `P%`  (count in foreground, % in tone color)
 */
export function BucketCell({
  count,
  total,
  tone,
}: {
  count: number;
  total: number;
  tone: BucketTone;
}) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-0.5 leading-tight">
        <span className="text-sm tabular-nums text-muted-foreground">—</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">—</span>
      </div>
    );
  }
  const p = pct(count, total) ?? 0;
  const isZero = count === 0;
  return (
    <div className="flex flex-col items-center gap-0.5 leading-tight">
      <span
        className={cn(
          'text-sm tabular-nums',
          isZero ? 'text-muted-foreground' : 'text-foreground font-medium',
        )}
      >
        {count}
      </span>
      <span
        className={cn(
          'text-[10px] tabular-nums',
          isZero ? 'text-muted-foreground' : TONE_TEXT[tone],
        )}
      >
        {p}%
      </span>
    </div>
  );
}

/** Mini progress bar used in the Done % column on the redesigned tables. */
export function MiniProgressBar({ value }: { value: number | null }) {
  return (
    <div className="flex items-center gap-1.5">
      <Progress value={value ?? 0} className="h-1.5 w-12" />
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
        {value === null ? '—' : `${value}%`}
      </span>
    </div>
  );
}

/**
 * Sum a numeric field across rows. Used by the bucket columns' built-in
 * totals row renderer so callers don't need to wire a `totalRender` for
 * each bucket.
 */
function sumKey<TRow extends VisitRollupCounters>(
  rows: TRow[],
  key: keyof VisitRollupCounters,
): number {
  let acc = 0;
  for (const r of rows) acc += r[key];
  return acc;
}

/**
 * Shared bucket / completion columns appended after each scope's descriptive
 * columns. The first two columns ("Done / Total" + "Done %") sit under a
 * shared "Visits" parent header; the remaining six render as full-text
 * leaf headers with `BucketCell` bodies.
 */
export function bucketColumns<
  TRow extends VisitRollupCounters,
>(): VisitRollupColumn<TRow>[] {
  return [
    {
      key: 'done_total',
      header: 'Done / Total',
      group: 'Visits',
      headerTooltip: 'Visits with status completed (or missed/skipped) over total visits.',
      className: 'text-center w-[100px]',
      value: (row) => row.done,
      render: (row) => (
        <span className="font-mono text-[11px] tabular-nums text-foreground">
          {row.done} / {row.total}
        </span>
      ),
      totalRender: (rows) => (
        <span className="font-mono text-[11px] font-semibold tabular-nums">
          {sumKey(rows, 'done')} / {sumKey(rows, 'total')}
        </span>
      ),
    },
    {
      key: 'done_pct',
      header: 'Done %',
      group: 'Visits',
      headerTooltip: 'Done ÷ total visits.',
      className: 'text-center w-[110px]',
      value: (row) => row.done,
      render: (row) => <MiniProgressBar value={pct(row.done, row.total)} />,
      totalRender: (rows) => {
        const total = sumKey(rows, 'total');
        const done = sumKey(rows, 'done');
        const p = pct(done, total);
        return (
          <span className="font-mono text-[11px] font-semibold tabular-nums">
            {p === null ? '—' : `${p}%`}
          </span>
        );
      },
    },
    {
      key: 'in_window',
      header: 'In window',
      headerTooltip: 'Actual date inside the protocol window.',
      className: 'text-center w-[90px]',
      value: (row) => row.in_window,
      render: (row) => (
        <BucketCell count={row.in_window} total={row.total} tone="success" />
      ),
      totalRender: (rows) => (
        <BucketCell
          count={sumKey(rows, 'in_window')}
          total={sumKey(rows, 'total')}
          tone="success"
        />
      ),
    },
    {
      key: 'out_of_window',
      header: 'Out of window',
      headerTooltip: 'Actual date outside the protocol window.',
      className: 'text-center w-[110px]',
      value: (row) => row.out_of_window,
      render: (row) => (
        <BucketCell
          count={row.out_of_window}
          total={row.total}
          tone="warning"
        />
      ),
      totalRender: (rows) => (
        <BucketCell
          count={sumKey(rows, 'out_of_window')}
          total={sumKey(rows, 'total')}
          tone="warning"
        />
      ),
    },
    {
      key: 'overdue',
      header: 'Overdue',
      headerTooltip: 'Window closed without an actual date.',
      className: 'text-center w-[90px]',
      value: (row) => row.overdue,
      render: (row) => (
        <BucketCell
          count={row.overdue}
          total={row.total}
          tone="destructive"
        />
      ),
      totalRender: (rows) => (
        <BucketCell
          count={sumKey(rows, 'overdue')}
          total={sumKey(rows, 'total')}
          tone="destructive"
        />
      ),
    },
    {
      key: 'due_now',
      header: 'Due now',
      headerTooltip: 'Today is inside the protocol window.',
      className: 'text-center w-[90px]',
      value: (row) => row.due_now,
      render: (row) => (
        <BucketCell count={row.due_now} total={row.total} tone="info" />
      ),
      totalRender: (rows) => (
        <BucketCell
          count={sumKey(rows, 'due_now')}
          total={sumKey(rows, 'total')}
          tone="info"
        />
      ),
    },
    {
      key: 'upcoming',
      header: 'Upcoming',
      headerTooltip: 'Window has not opened yet.',
      className: 'text-center w-[90px]',
      value: (row) => row.upcoming,
      render: (row) => (
        <BucketCell count={row.upcoming} total={row.total} tone="muted" />
      ),
      totalRender: (rows) => (
        <BucketCell
          count={sumKey(rows, 'upcoming')}
          total={sumKey(rows, 'total')}
          tone="muted"
        />
      ),
    },
    {
      key: 'pending',
      header: 'Pending',
      headerTooltip: 'No planned date or window set yet.',
      className: 'text-center w-[90px]',
      value: (row) => row.pending,
      render: (row) => (
        <BucketCell count={row.pending} total={row.total} tone="muted" />
      ),
      totalRender: (rows) => (
        <BucketCell
          count={sumKey(rows, 'pending')}
          total={sumKey(rows, 'total')}
          tone="muted"
        />
      ),
    },
  ];
}

/** Walks a column array and groups consecutive columns sharing the same
 *  `group` value into header segments. Columns without a `group` form a
 *  single-segment span which renders with `rowSpan={2}` in the header. */
interface HeaderSegment<TRow> {
  group: string | null;
  columns: VisitRollupColumn<TRow>[];
}

function buildHeaderSegments<TRow>(
  columns: VisitRollupColumn<TRow>[],
): HeaderSegment<TRow>[] {
  const segments: HeaderSegment<TRow>[] = [];
  for (const col of columns) {
    const last = segments[segments.length - 1];
    const colGroup = col.group ?? null;
    if (last && last.group === colGroup && colGroup !== null) {
      last.columns.push(col);
    } else {
      segments.push({ group: colGroup, columns: [col] });
    }
  }
  return segments;
}

/** Single header `<TableHead>` with optional tooltip and subtitle. */
function ColumnHeadCell({
  header,
  tooltip,
  subtitle,
  className,
  rowSpan,
  scope = 'col',
}: {
  header: string;
  tooltip?: string;
  subtitle?: string;
  className?: string;
  rowSpan?: number;
  scope?: 'col' | 'colgroup';
}) {
  const inner = subtitle ? (
    <span className="flex flex-col leading-tight">
      <span>{header}</span>
      <span className="text-[10px] font-normal text-muted-foreground">
        {subtitle}
      </span>
    </span>
  ) : (
    header
  );

  return (
    <TableHead className={className} scope={scope} rowSpan={rowSpan}>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-help" />}>
            {inner}
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        inner
      )}
    </TableHead>
  );
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
  expandable = false,
  renderExpanded,
  showTotalsRow = false,
  totalsLabel,
  rowAccent,
}: VisitRollupTableProps<TRow>) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const toggle = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const colSpan = columns.length + (expandable ? 1 : 0);
  const segments = buildHeaderSegments(columns);
  const hasGroups = segments.some((s) => s.group !== null);

  const headerNode = hasGroups ? (
    <TableHeader>
      <TableRow>
        {expandable && (
          <TableHead className="w-[28px]" rowSpan={2}>
            <span className="sr-only">Expand</span>
          </TableHead>
        )}
        {segments.map((seg) => {
          if (seg.group === null) {
            // Ungrouped columns span both header rows.
            return seg.columns.map((col) => (
              <ColumnHeadCell
                key={col.key}
                header={col.header}
                tooltip={col.headerTooltip}
                subtitle={col.headerSubtitle}
                className={col.className}
                rowSpan={2}
                scope="col"
              />
            ));
          }
          // Grouped: render parent label spanning all child cols.
          return (
            <TableHead
              key={`group-${seg.group}`}
              colSpan={seg.columns.length}
              scope="colgroup"
              className="text-center"
            >
              {seg.group}
            </TableHead>
          );
        })}
      </TableRow>
      <TableRow>
        {segments.map((seg) => {
          if (seg.group === null) return null;
          return seg.columns.map((col) => (
            <ColumnHeadCell
              key={`leaf-${col.key}`}
              header={col.header}
              tooltip={col.headerTooltip}
              subtitle={col.headerSubtitle}
              className={col.className}
              scope="col"
            />
          ));
        })}
      </TableRow>
    </TableHeader>
  ) : (
    <TableHeader>
      <TableRow>
        {expandable && (
          <TableHead className="w-[28px]">
            <span className="sr-only">Expand</span>
          </TableHead>
        )}
        {columns.map((col) => (
          <ColumnHeadCell
            key={col.key}
            header={col.header}
            tooltip={col.headerTooltip}
            subtitle={col.headerSubtitle}
            className={col.className}
            scope="col"
          />
        ))}
      </TableRow>
    </TableHeader>
  );

  const tableNode = (
    <div className="overflow-x-auto">
      <Table>
        {headerNode}
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="text-center text-xs text-muted-foreground py-8"
              >
                {emptyState ?? 'No rows in scope.'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              const expanded = expandedKeys.has(key);
              const accent = rowAccent?.(row) ?? null;
              return (
                <Fragment key={key}>
                  <TableRow
                    className={cn(
                      // 2px left stripe carved out of the row's left border
                      // when an accent is present. Falls back to the default
                      // bottom border otherwise.
                      accent && 'border-l-[3px]',
                      accent?.color,
                    )}
                    title={accent?.tooltip}
                  >
                    {expandable && (
                      <TableCell className="w-[28px] p-0">
                        {renderExpanded ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(key);
                            }}
                            aria-label={expanded ? 'Collapse row' : 'Expand row'}
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            )}
                          >
                            {expanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : null}
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render ? col.render(row) : col.value(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expanded && renderExpanded && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={colSpan} className="p-0">
                        <div className="border-l-2 border-primary/40 px-4 py-3">
                          {renderExpanded(row)}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
        {showTotalsRow && rows.length > 0 && (
          <TableFooter>
            <TableRow className="bg-muted/40 font-medium">
              {expandable && <TableCell />}
              {columns.map((col, idx) => (
                <TableCell key={col.key} className={col.className}>
                  {col.totalRender
                    ? col.totalRender(rows)
                    : idx === 0
                      ? (totalsLabel ?? 'Totals')
                      : null}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
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
