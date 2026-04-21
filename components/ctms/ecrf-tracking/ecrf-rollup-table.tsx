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
import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import type { SubjectTrackingSummary } from '@/lib/types/ctms';

import { summaryToPercentages } from '@/components/ctms/subjects/subject-tracking-summary-cell';

/**
 * Counter shape every rollup row exposes. Lets a single table component render
 * by-site / by-visit / by-subject without bespoke percentage logic per scope.
 */
export type EcrfRollupCounters = SubjectTrackingSummary;

interface BaseColumn<TRow> {
  key: string;
  header: string;
  /** Optional aria-/title-style tooltip text shown on the column header. */
  headerTooltip?: string;
  /** Tailwind classes applied to both the header cell and body cells. */
  className?: string;
  /** Custom renderer; defaults to the column's `value` extractor as text. */
  render?: (row: TRow) => ReactNode;
}

interface ValueColumn<TRow> extends BaseColumn<TRow> {
  value: (row: TRow) => ReactNode;
}

export type EcrfRollupColumn<TRow> = ValueColumn<TRow>;

interface EcrfRollupTableProps<TRow extends EcrfRollupCounters> {
  /** Optional title (rendered in `card` variant only — `panel` callers usually rely on the parent Tab label). */
  title?: string;
  description?: string;
  rows: TRow[];
  columns: EcrfRollupColumn<TRow>[];
  /** Stable React key extractor for each row. */
  rowKey: (row: TRow) => string;
  /** Rendered when `rows` is empty. */
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

function MiniPctBadge({
  value,
  capped,
}: {
  value: number | null;
  capped?: boolean;
}) {
  if (value === null) {
    return (
      <Badge variant="outline" className="font-mono text-[10px]">
        —
      </Badge>
    );
  }
  const variant = value >= 100 ? 'success' : value >= 50 ? 'info' : 'secondary';
  const badge = (
    <Badge variant={variant} className="font-mono text-[10px]">
      {value}%
    </Badge>
  );
  if (!capped) return badge;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        Capped at 99% — at least one open or answered query in this scope.
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The five percentage / query columns shared across every rollup table. Each
 * scope (site / visit / subject) prepends its own descriptive columns and then
 * appends `metricColumns` so DE / SDV / Lock / OQ / AQ render identically.
 */
export function metricColumns<
  TRow extends EcrfRollupCounters,
>(): EcrfRollupColumn<TRow>[] {
  const pcts = (row: TRow) =>
    row.dataExpectedTotal > 0
      ? summaryToPercentages(row)
      : computeSubjectCrfPercentages([]);

  return [
    {
      key: 'de',
      header: 'DE %',
      headerTooltip: 'Data Entry %',
      className: 'text-center w-[70px]',
      value: (row) => row.dataEntryTotal,
      render: (row) => <MiniPctBadge value={pcts(row).dataEntryPct} />,
    },
    {
      key: 'sdv',
      header: 'SDV %',
      headerTooltip:
        'Source Data Verified %. Capped at 99% with an open/answered query.',
      className: 'text-center w-[70px]',
      value: (row) => row.sdvTotal,
      render: (row) => {
        const p = pcts(row);
        return (
          <MiniPctBadge
            value={p.sdvPct}
            capped={p.hasUnresolvedQuery && p.sdvPct === 99}
          />
        );
      },
    },
    {
      key: 'lock',
      header: 'Lock %',
      headerTooltip:
        'Data Management Lock %. Capped at 99% with an open/answered query.',
      className: 'text-center w-[70px]',
      value: (row) => row.lockTotal,
      render: (row) => {
        const p = pcts(row);
        return (
          <MiniPctBadge
            value={p.lockPct}
            capped={p.hasUnresolvedQuery && p.lockPct === 99}
          />
        );
      },
    },
    {
      key: 'oq',
      header: 'OQ',
      headerTooltip: 'Open queries',
      className: 'text-center w-[60px]',
      value: (row) => row.openQueryCount,
      render: (row) =>
        row.openQueryCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-red-500">
            {row.openQueryCount}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'aq',
      header: 'AQ',
      headerTooltip: 'Answered queries',
      className: 'text-center w-[60px]',
      value: (row) => row.answeredQueryCount,
      render: (row) =>
        row.answeredQueryCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[10px] font-medium text-yellow-950 dark:bg-yellow-300">
            {row.answeredQueryCount}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
  ];
}

/**
 * Generic Card-wrapped rollup table reused for By Site / By Visit / By Subject
 * sections. The percentage columns from `metricColumns()` should be appended
 * after the scope-specific descriptive columns so every section reads the same
 * left-to-right.
 */
export function EcrfRollupTable<TRow extends EcrfRollupCounters>({
  title,
  description,
  rows,
  columns,
  rowKey,
  emptyState,
  variant = 'card',
  toolbar,
  footer,
}: EcrfRollupTableProps<TRow>) {
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
                className="text-muted-foreground py-6 text-center text-xs"
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
        {toolbar}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {tableNode}
        {footer}
      </div>
    );
  }

  return (
    <Card>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && (
            <CardTitle className="text-sm font-medium">
              {title}
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                ({rows.length})
              </span>
            </CardTitle>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}
      {toolbar && <div className="px-4">{toolbar}</div>}
      <CardContent className="p-0">{tableNode}</CardContent>
      {footer && <div className="px-4 pb-3">{footer}</div>}
    </Card>
  );
}
