'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Copy, Download, ExternalLink, MoreVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TablePaginationFooter } from '@/components/ui/table-pagination-footer';
import { cn } from '@/lib/utils';
import { formatPlanDate } from '@/lib/utils/visit-window';
import type { VisitScheduleSiteRow, VisitWindowComplianceBundle } from '@/lib/types/ctms';
import type { UseClientPaginationResult } from '@/lib/hooks/use-client-pagination';
import { BucketCell, MiniProgressBar } from './visit-rollup-table';

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 100);
}

function LastVisitActivityGridCell({
  iso,
  daysOverdue,
}: {
  iso: string | null;
  daysOverdue: number | null;
}) {
  if (!iso) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col leading-tight text-xs">
      <span>{formatPlanDate(iso)}</span>
      {daysOverdue !== null && daysOverdue > 0 ? (
        <span className="text-[10px] text-red-600 dark:text-red-400">
          {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
        </span>
      ) : null}
    </div>
  );
}

export interface SiteVisitScheduleGridProps {
  /** Same paginated slice as the list table. */
  rows: VisitScheduleSiteRow[];
  /** Count after filters (for pagination footer). */
  totalFiltered: number;
  emptyMessage: string;
  extras: VisitWindowComplianceBundle['extras'] | undefined;
  hrefForSite: (siteId: string) => string;
  onCopySiteLink: (siteId: string) => void;
  onExportSiteCsv: (siteId: string) => void;
  rowAccent: (row: VisitScheduleSiteRow) => { color: string; tooltip?: string } | null;
  renderDetails: (row: VisitScheduleSiteRow) => ReactNode;
  pagination: UseClientPaginationResult;
  itemNoun: string;
  itemNounPlural?: string;
  /** e.g. "Total (3 sites)" for screen readers on summary region */
  summaryLabel: string;
}

/**
 * Card grid view for By Site in Visit Window Compliance — mirrors list filters
 * and pagination; pair with the same `VisitWindowToolbar` as `VisitRollupTable`.
 */
export function SiteVisitScheduleGrid({
  rows,
  totalFiltered,
  emptyMessage,
  extras,
  hrefForSite,
  onCopySiteLink,
  onExportSiteCsv,
  rowAccent,
  renderDetails,
  pagination,
  itemNoun,
  itemNounPlural,
  summaryLabel,
}: SiteVisitScheduleGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const regionId = useId();

  /** Stale expansion after pagination/filter: hide panel without an effect. */
  const visibleExpandedId = useMemo(
    () =>
      expandedId !== null && rows.some((r) => r.site_id === expandedId) ? expandedId : null,
    [expandedId, rows],
  );

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <>
          <p className="sr-only" id={regionId}>
            {summaryLabel}
          </p>
          <ul
            className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
            aria-describedby={regionId}
          >
            {rows.map((row) => {
              const id = row.site_id;
              const expanded = visibleExpandedId === id;
              const accent = rowAccent?.(row) ?? null;
              const e = extras?.sites[row.site_id];
              const href = hrefForSite(row.site_id);
              return (
                <li key={id}>
                  <Card
                    className={cn(
                      'h-full overflow-hidden',
                      accent && 'border-l-[3px]',
                      accent?.color,
                    )}
                    title={accent?.tooltip}
                  >
                    <CardHeader className="space-y-2 pb-2 pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <Link
                            href={href}
                            className="block truncate text-sm font-semibold text-foreground hover:underline"
                            aria-label={`Open site ${row.site_number}`}
                          >
                            {row.site_number}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {[row.site_name, row.country].filter(Boolean).join(' · ') || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{row.subjectCount}</span>{' '}
                            subject{row.subjectCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                            <Link href={href} aria-label={`Open site ${row.site_number}`}>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              aria-label={`More actions for site ${row.site_number}`}
                            >
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onSelect={() => onCopySiteLink(row.site_id)}>
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Copy site link
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => onExportSiteCsv(row.site_id)}>
                                <Download className="mr-2 h-3.5 w-3.5" />
                                Export site CSV
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            aria-label={expanded ? 'Collapse site details' : 'Expand site details'}
                            aria-expanded={expanded}
                            aria-controls={`${id}-details`}
                            onClick={() => setExpandedId((cur) => (cur === id ? null : id))}
                          >
                            {expanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-3 pt-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono tabular-nums text-foreground">
                          {row.done} / {row.total} <span className="text-muted-foreground">done</span>
                        </span>
                        <MiniProgressBar value={pct(row.done, row.total)} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <div className="text-center text-[10px]">
                          <p className="mb-0.5 text-muted-foreground">In window</p>
                          <BucketCell
                            count={row.in_window}
                            total={row.total}
                            tone="success"
                          />
                        </div>
                        <div className="text-center text-[10px]">
                          <p className="mb-0.5 text-muted-foreground">Out of window</p>
                          <BucketCell
                            count={row.out_of_window}
                            total={row.total}
                            tone="warning"
                          />
                        </div>
                        <div className="text-center text-[10px]">
                          <p className="mb-0.5 text-muted-foreground">Overdue</p>
                          <BucketCell
                            count={row.overdue}
                            total={row.total}
                            tone="destructive"
                          />
                        </div>
                        <div className="text-center text-[10px]">
                          <p className="mb-0.5 text-muted-foreground">Due now</p>
                          <BucketCell
                            count={row.due_now}
                            total={row.total}
                            tone="info"
                          />
                        </div>
                        <div className="text-center text-[10px]">
                          <p className="mb-0.5 text-muted-foreground">Upcoming</p>
                          <BucketCell
                            count={row.upcoming}
                            total={row.total}
                            tone="muted"
                          />
                        </div>
                        <div className="text-center text-[10px]">
                          <p className="mb-0.5 text-muted-foreground">Pending</p>
                          <BucketCell
                            count={row.pending}
                            total={row.total}
                            tone="muted"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Last visit activity
                        </p>
                        <LastVisitActivityGridCell
                          iso={e?.oldestOverdueDate ?? row.last_actual_date ?? null}
                          daysOverdue={e?.oldestOverdueDays ?? null}
                        />
                      </div>
                    </CardContent>
                    {expanded && (
                      <div
                        id={`${id}-details`}
                        className="border-t border-border bg-muted/30 px-3 py-3"
                        role="region"
                        aria-label={`Details for site ${row.site_number}`}
                      >
                        {renderDetails(row)}
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="px-1 pt-1">
        <TablePaginationFooter
          pagination={pagination}
          totalItems={totalFiltered}
          itemNoun={itemNoun}
          itemNounPlural={itemNounPlural}
        />
      </div>
    </div>
  );
}
