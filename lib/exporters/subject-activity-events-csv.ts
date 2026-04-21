import Papa from 'papaparse';

import {
  SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS,
  SUBJECT_VISIT_EVENT_FIELD_LABELS,
  VISIT_ANCHOR_OPTIONS,
  VISIT_STATUS_OPTIONS,
  type SubjectActivityEvent,
  type SubjectCrfMetricEventField,
  type SubjectVisitEventField,
} from '@/lib/types/ctms';
import { formatPlanDate } from '@/lib/utils/visit-window';

const HEADERS = [
  'Timestamp',
  'Kind',
  'Field',
  'Previous Value',
  'New Value',
  'Visit',
  'CRF',
  'Actor',
] as const;

function formatCrfValue(
  field: SubjectCrfMetricEventField,
  value: string | null,
): string {
  if (value === null || value === '') return '';
  if (field === 'query_status') {
    if (value === 'open') return 'Open';
    if (value === 'answered') return 'Answered';
    if (value === 'none') return 'No Query';
    return value;
  }
  return value === 'true' ? 'Yes' : value === 'false' ? 'No' : value;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function formatVisitValue(
  field: SubjectVisitEventField,
  value: string | null,
): string {
  if (value === null || value === '') return '';
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
  return value;
}

/**
 * Build a CSV export of the merged subject Activity feed. One row per event,
 * with a `Kind` column ('CRF' / 'Visit') so consumers can filter or pivot.
 *
 * Caller is responsible for ordering / filtering — the exporter does not
 * re-sort. Prepends a UTF-8 BOM so Excel auto-detects encoding.
 */
export function buildSubjectActivityEventsCsv(
  events: SubjectActivityEvent[],
): string {
  const matrix: string[][] = [HEADERS.slice()];

  for (const event of events) {
    if (event.kind === 'crf') {
      matrix.push([
        new Date(event.created_at).toISOString(),
        'CRF',
        SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS[event.field] ?? event.field,
        formatCrfValue(event.field, event.previous_value),
        formatCrfValue(event.field, event.new_value),
        event.visit_name ?? '',
        event.crf_name ?? '',
        event.actor_name ?? '',
      ]);
    } else {
      matrix.push([
        new Date(event.created_at).toISOString(),
        'Visit',
        SUBJECT_VISIT_EVENT_FIELD_LABELS[event.field] ?? event.field,
        formatVisitValue(event.field, event.previous_value),
        formatVisitValue(event.field, event.new_value),
        event.visit_name ?? '',
        '',
        event.actor_name ?? '',
      ]);
    }
  }

  const csv = Papa.unparse(matrix, { newline: '\r\n' });
  return `\ufeff${csv}`;
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function subjectActivityEventsCsvFilename(
  subjectNumber: string,
): string {
  const safe = slug(subjectNumber) || 'subject';
  return `subject-activity-${safe}.csv`;
}
