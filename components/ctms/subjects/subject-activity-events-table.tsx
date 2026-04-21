'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
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
import { getSubjectActivityEvents } from '@/lib/actions/subject-activity-events';
import {
  SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS,
  SUBJECT_VISIT_EVENT_FIELD_LABELS,
  VISIT_STATUS_OPTIONS,
  VISIT_ANCHOR_OPTIONS,
  type SubjectActivityEvent,
  type SubjectActivityKind,
  type SubjectCrfMetricEventField,
  type SubjectVisitEventField,
} from '@/lib/types/ctms';
import { formatPlanDate } from '@/lib/utils/visit-window';

import { formatSubjectCrfEventValue } from './subject-crf-history-list';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export interface SubjectActivityEventsTableProps {
  subjectId: string;
  /** Top-level kind filter. Defaults to 'all'. */
  kind?: SubjectActivityKind;
  /** Field filter for the CRF stream (ignored when kind === 'visit'). */
  crfField?: SubjectCrfMetricEventField;
  /** Field filter for the Visit stream (ignored when kind === 'crf'). */
  visitField?: SubjectVisitEventField;
  /** Initial page size. Defaults to 25. */
  defaultPageSize?: number;
  pageSizeOptions?: readonly number[];
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function formatVisitEventValue(
  field: SubjectVisitEventField,
  value: string | null,
): string {
  if (value === null || value === '') return '—';
  if (
    field === 'planned_date' ||
    field === 'actual_date' ||
    field === 'window_start' ||
    field === 'window_end' ||
    field === 'anchor_date'
  ) {
    return ISO_DATE.test(value) ? formatPlanDate(value) : value;
  }
  if (field === 'status') {
    return VISIT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }
  if (field === 'visit_anchor_kind') {
    return VISIT_ANCHOR_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }
  // notes / recompute marker / unknown — show raw.
  return value;
}

interface RowMeta {
  fieldLabel: string;
  prev: string;
  next: string;
  context: string;
  IconCmp: typeof ClipboardList;
  kindLabel: string;
}

function rowMeta(event: SubjectActivityEvent): RowMeta {
  if (event.kind === 'crf') {
    return {
      fieldLabel: SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS[event.field],
      prev: formatSubjectCrfEventValue(event.field, event.previous_value),
      next: formatSubjectCrfEventValue(event.field, event.new_value),
      context: [event.visit_name, event.crf_name].filter(Boolean).join(' / ') || '—',
      IconCmp: ClipboardList,
      kindLabel: 'CRF',
    };
  }
  return {
    fieldLabel: SUBJECT_VISIT_EVENT_FIELD_LABELS[event.field],
    prev: formatVisitEventValue(event.field, event.previous_value),
    next: formatVisitEventValue(event.field, event.new_value),
    context: event.visit_name ?? '—',
    IconCmp: CalendarClock,
    kindLabel: 'Visit',
  };
}

export function SubjectActivityEventsTable({
  subjectId,
  kind = 'all',
  crfField,
  visitField,
  defaultPageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: SubjectActivityEventsTableProps) {
  const [events, setEvents] = useState<SubjectActivityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [kind, crfField, visitField, pageSize, subjectId]);

  useEffect(() => {
    let cancelled = false;
    const isFirst = events.length === 0 && total === 0;
    if (isFirst) setInitialLoading(true);
    else setPageLoading(true);

    void getSubjectActivityEvents({
      subjectId,
      kind,
      crfField,
      visitField,
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
  }, [subjectId, kind, crfField, visitField, page, pageSize]);

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
              <TableHead className="w-[80px]">Kind</TableHead>
              <TableHead className="w-[200px]">Field</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="w-[240px]">Visit / CRF</TableHead>
              <TableHead className="w-[220px]">By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={`skel-${i}-${j}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-20 text-center text-muted-foreground"
                >
                  No changes recorded.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => {
                const meta = rowMeta(event);
                const Icon = meta.IconCmp;
                return (
                  <TableRow key={`${event.kind}-${event.id}`}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatTimestamp(event.created_at)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {meta.kindLabel}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {meta.fieldLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span className="text-muted-foreground">{meta.prev}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{meta.next}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {meta.context}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.actor_name ?? '—'}
                    </TableCell>
                  </TableRow>
                );
              })
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
