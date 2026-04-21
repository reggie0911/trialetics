'use client';

import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS,
  type SubjectCrfMetricEvent,
} from '@/lib/types/ctms';

/**
 * Render the raw audit-log value (string or null) for display.
 *
 * Booleans persist as the strings 'true' / 'false'; query_status persists as
 * 'none' / 'open' / 'answered'. `null` indicates the row's first insert
 * (no previous value).
 */
export function formatSubjectCrfEventValue(
  field: SubjectCrfMetricEvent['field'],
  value: string | null,
): string {
  if (value === null) return '—';
  if (field === 'query_status') {
    if (value === 'open') return 'Open';
    if (value === 'answered') return 'Answered';
    if (value === 'none') return 'No Query';
    return value;
  }
  return value === 'true' ? 'Yes' : value === 'false' ? 'No' : value;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString();
}

export function SubjectCrfHistoryList({
  events,
  showCrfContext,
}: {
  events: SubjectCrfMetricEvent[];
  /** When true, renders the visit / CRF labels alongside each event. */
  showCrfContext: boolean;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No changes recorded.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-md border bg-card px-3 py-2 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="font-medium">
                {SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS[event.field]}
              </Badge>
              <span className="text-muted-foreground">
                {formatSubjectCrfEventValue(event.field, event.previous_value)}
              </span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">
                {formatSubjectCrfEventValue(event.field, event.new_value)}
              </span>
            </div>
            <span className="text-muted-foreground tabular-nums">
              {formatTimestamp(event.created_at)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
            <span>by {event.actor_name ?? 'Unknown'}</span>
            {showCrfContext && (event.visit_name || event.crf_name) && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>
                  {event.visit_name ?? '—'}
                  {event.crf_name ? ` / ${event.crf_name}` : ''}
                </span>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
