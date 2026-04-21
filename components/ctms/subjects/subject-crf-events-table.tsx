'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSubjectCrfMetricEvents } from '@/lib/actions/subject-crf-metric-events';
import {
  SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS,
  type SubjectCrfMetricEvent,
  type SubjectCrfMetricEventField,
} from '@/lib/types/ctms';

import { formatSubjectCrfEventValue } from './subject-crf-history-list';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export interface SubjectCrfEventsTableProps {
  subjectId: string;
  /**
   * When set, scopes the query to a single subject_crf row and the
   * Visit / CRF column is omitted (the data is already CRF-scoped).
   */
  subjectCrfId?: string;
  /** Optional server-side filter on the field column. */
  field?: SubjectCrfMetricEventField;
  /** Initial page size. Defaults to 25. */
  defaultPageSize?: number;
  /** Allowed page sizes shown in the rows-per-page selector. */
  pageSizeOptions?: readonly number[];
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

export function SubjectCrfEventsTable({
  subjectId,
  subjectCrfId,
  field,
  defaultPageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: SubjectCrfEventsTableProps) {
  const showCrfContext = !subjectCrfId;
  const columnCount = showCrfContext ? 5 : 4;

  const [events, setEvents] = useState<SubjectCrfMetricEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  // Reset to page 1 whenever filters / page size / scope change.
  useEffect(() => {
    setPage(1);
  }, [field, pageSize, subjectId, subjectCrfId]);

  useEffect(() => {
    let cancelled = false;
    const isFirst = events.length === 0 && total === 0;
    if (isFirst) setInitialLoading(true);
    else setPageLoading(true);

    void getSubjectCrfMetricEvents({
      subjectId,
      subjectCrfId,
      field,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    })
      .then((res) => {
        if (cancelled) return;
        setEvents(res.events);
        setTotal(res.total);
      })
      .finally(() => {
        if (cancelled) return;
        setInitialLoading(false);
        setPageLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, subjectCrfId, field, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">When</TableHead>
              <TableHead className="w-[170px]">Field</TableHead>
              <TableHead>Change</TableHead>
              {showCrfContext && (
                <TableHead className="w-[260px]">Visit / CRF</TableHead>
              )}
              <TableHead className="w-[220px]">By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: columnCount }).map((__, j) => (
                    <TableCell key={`skel-${i}-${j}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-20 text-center text-muted-foreground"
                >
                  No changes recorded.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatTimestamp(event.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium">
                      {SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS[event.field]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {formatSubjectCrfEventValue(
                          event.field,
                          event.previous_value,
                        )}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {formatSubjectCrfEventValue(
                          event.field,
                          event.new_value,
                        )}
                      </span>
                    </span>
                  </TableCell>
                  {showCrfContext && (
                    <TableCell className="text-muted-foreground">
                      {event.visit_name ?? '—'}
                      {event.crf_name ? ` / ${event.crf_name}` : ''}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {event.actor_name ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          {total === 0
            ? 'No events'
            : `Showing ${startRow} to ${endRow} of ${total} event${total === 1 ? '' : 's'}`}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-7 rounded-md border bg-background px-2 text-xs"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage(1)}
              disabled={page === 1 || initialLoading}
              aria-label="First page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || initialLoading}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="inline-flex items-center gap-1 px-2 tabular-nums">
              {pageLoading && (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              )}
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount || initialLoading}
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setPage(pageCount)}
              disabled={page >= pageCount || initialLoading}
              aria-label="Last page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
