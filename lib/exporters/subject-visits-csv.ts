import Papa from 'papaparse';

import { computeVisitWindowStatus, formatPlanDate } from '@/lib/utils/visit-window';
import {
  VISIT_STATUS_OPTIONS,
  type SubjectVisit,
} from '@/lib/types/ctms';

const HEADERS = [
  '#',
  'Visit',
  'Timepoint Label',
  'Day Offset',
  'Planned',
  'Actual',
  'Window Start',
  'Window End',
  'Window Status',
  'Lifecycle Status',
  'Notes',
] as const;

function lifecycleLabel(status: SubjectVisit['status']): string {
  return VISIT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function dayOffset(value: number | null): string {
  if (value === null) return '';
  if (value === 0) return 'Day 0';
  return `Day ${value > 0 ? `+${value}` : value}`;
}

/**
 * Build a CSV export of a subject's visit schedule. One row per SubjectVisit.
 * Caller is responsible for fetching visits in the order they want (the
 * exporter does not re-sort). Prepends a UTF-8 BOM so Excel auto-detects
 * encoding. Date cells use `formatPlanDate` (`dd-MMM-yyyy`) so the export
 * matches the on-screen panel.
 *
 * `today` is injectable so server-side renders use a stable reference instant.
 */
export function buildSubjectVisitsCsv(
  visits: SubjectVisit[],
  today?: string,
): string {
  const matrix: string[][] = [HEADERS.slice()];

  for (const visit of visits) {
    const meta = computeVisitWindowStatus(visit, today);
    matrix.push([
      String(visit.visit_number),
      visit.visit_name,
      visit.timepoint_label ?? '',
      dayOffset(visit.timepoint_days),
      formatPlanDate(visit.planned_date),
      formatPlanDate(visit.actual_date),
      formatPlanDate(visit.window_start),
      formatPlanDate(visit.window_end),
      meta.label,
      lifecycleLabel(visit.status),
      visit.notes ?? '',
    ]);
  }

  const csv = Papa.unparse(matrix, { newline: '\r\n' });
  return `\ufeff${csv}`;
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function subjectVisitsCsvFilename(subjectNumber: string): string {
  const safe = slug(subjectNumber) || 'subject';
  return `subject-visits-${safe}.csv`;
}

export function subjectVisitsPdfFilename(subjectNumber: string): string {
  const safe = slug(subjectNumber) || 'subject';
  return `subject-visits-${safe}.pdf`;
}
