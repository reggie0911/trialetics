import Papa from 'papaparse';

import {
  SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS,
  type SubjectCrfMetricEvent,
} from '@/lib/types/ctms';

const HEADERS = [
  'Timestamp',
  'Field',
  'Previous Value',
  'New Value',
  'Visit',
  'CRF',
  'Actor',
] as const;

/**
 * Render the persisted audit value for CSV cells. Mirrors the on-screen
 * `formatSubjectCrfEventValue` so the export matches the table.
 */
function formatValue(
  field: SubjectCrfMetricEvent['field'],
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

/**
 * Build a CSV export of the subject_crf_metric_events audit trail. One row
 * per event. Caller is responsible for fetching the events in the order /
 * scope they want (the exporter does not re-sort or filter).
 *
 * Prepends a UTF-8 BOM so Excel auto-detects encoding.
 */
export function buildSubjectCrfEventsCsv(
  events: SubjectCrfMetricEvent[],
): string {
  const matrix: string[][] = [HEADERS.slice()];

  for (const event of events) {
    matrix.push([
      new Date(event.created_at).toISOString(),
      SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS[event.field] ?? event.field,
      formatValue(event.field, event.previous_value),
      formatValue(event.field, event.new_value),
      event.visit_name ?? '',
      event.crf_name ?? '',
      event.actor_name ?? '',
    ]);
  }

  const csv = Papa.unparse(matrix, { newline: '\r\n' });
  return `\ufeff${csv}`;
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function subjectCrfEventsCsvFilename(subjectNumber: string): string {
  const safe = slug(subjectNumber) || 'subject';
  return `subject-activity-${safe}.csv`;
}
