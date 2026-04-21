import Papa from 'papaparse';

import type {
  SiteVisitScheduleBundle,
  StudyVisitScheduleBundle,
  VisitScheduleBucketCounts,
} from '@/lib/types/ctms';

export interface VisitScheduleCsvScope {
  kind: 'site' | 'study';
  /** Display label for the section headers. */
  label: string;
}

function pct(part: number, total: number): string {
  if (total <= 0) return '';
  return `${Math.round((part / total) * 100)}%`;
}

function bucketCells(row: VisitScheduleBucketCounts): string[] {
  return [
    String(row.total),
    String(row.done),
    pct(row.done, row.total),
    String(row.in_window),
    String(row.out_of_window),
    String(row.overdue),
    String(row.due_now),
    String(row.upcoming),
    String(row.pending),
  ];
}

const BUCKET_HEADERS = [
  'Visits',
  'Done',
  'Done %',
  'In Window',
  'Out Of Window',
  'Overdue',
  'Due Now',
  'Upcoming',
  'Pending',
];

function commentRow(text: string): string[] {
  return [`# ${text}`];
}

function blankRow(): string[] {
  return [''];
}

function renderTimepoint(
  timepoint_label: string | null,
  timepoint_days: number | null,
): string {
  const parts: string[] = [];
  if (timepoint_label) parts.push(timepoint_label);
  if (timepoint_days !== null && timepoint_days !== undefined) {
    const sign = timepoint_days > 0 ? '+' : '';
    parts.push(`Day ${sign}${timepoint_days}`);
  }
  return parts.join(' · ');
}

/**
 * Build a single CSV containing every section of a Visit Schedule rollup.
 * Each section is preceded by a `# Section name` comment row and followed by
 * a blank row. Section ordering mirrors the on-screen layout so analysts can
 * cross-check rows against the UI:
 *   1. Overall (single row)
 *   2. By Site (study scope only)
 *   3. By Visit
 *   4. By Subject
 */
export function buildVisitScheduleRollupCsv(
  bundle: SiteVisitScheduleBundle | StudyVisitScheduleBundle,
  scope: VisitScheduleCsvScope,
): string {
  const matrix: string[][] = [];

  matrix.push(commentRow(`Visit Window Compliance — ${scope.label}`));
  matrix.push(blankRow());

  matrix.push(commentRow('Overall'));
  matrix.push(['Subjects', 'Last Activity', ...BUCKET_HEADERS]);
  matrix.push([
    String(bundle.subjectCount),
    bundle.lastActualDate ?? '',
    ...bucketCells(bundle.overall),
  ]);
  matrix.push(blankRow());

  if (scope.kind === 'study' && 'bySite' in bundle) {
    matrix.push(commentRow('By Site'));
    matrix.push([
      'Site #',
      'Site Name',
      'Country',
      'Subjects',
      'Last Activity',
      ...BUCKET_HEADERS,
    ]);
    for (const site of bundle.bySite) {
      matrix.push([
        site.site_number,
        site.site_name,
        site.country ?? '',
        String(site.subjectCount),
        site.last_actual_date ?? '',
        ...bucketCells(site),
      ]);
    }
    matrix.push(blankRow());
  }

  matrix.push(commentRow('By Visit'));
  matrix.push(['#', 'Visit', 'Timepoint', 'Subjects', ...BUCKET_HEADERS]);
  for (const visit of bundle.byVisit) {
    matrix.push([
      visit.visit_number !== null && visit.visit_number !== undefined
        ? String(visit.visit_number)
        : '',
      visit.visit_name,
      renderTimepoint(visit.timepoint_label, visit.timepoint_days),
      String(visit.subjectCount),
      ...bucketCells(visit),
    ]);
  }
  matrix.push(blankRow());

  matrix.push(commentRow('By Subject'));
  matrix.push([
    'Subject #',
    'Site #',
    'Status',
    'Anchor',
    'Anchor Date',
    'Last Actual',
    ...BUCKET_HEADERS,
  ]);
  for (const subject of bundle.bySubject) {
    matrix.push([
      subject.subject_number,
      subject.site_number ?? '',
      subject.status,
      subject.visit_anchor_kind === 'screening' ? 'Screening' : 'Randomization',
      subject.anchor_date ?? '',
      subject.last_actual_date ?? '',
      ...bucketCells(subject),
    ]);
  }

  const csv = Papa.unparse(matrix, { newline: '\r\n' });
  return `\ufeff${csv}`;
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function studyVisitScheduleCsvFilename(protocolNumber: string): string {
  const safe = slug(protocolNumber) || 'study';
  return `study-${safe}-visit-schedule.csv`;
}

export function studyVisitSchedulePdfFilename(protocolNumber: string): string {
  const safe = slug(protocolNumber) || 'study';
  return `study-${safe}-visit-schedule.pdf`;
}

export function siteVisitScheduleCsvFilename(
  protocolNumber: string,
  siteNumber: string,
): string {
  const safeStudy = slug(protocolNumber) || 'study';
  const safeSite = slug(siteNumber) || 'site';
  return `study-${safeStudy}-site-${safeSite}-visit-schedule.csv`;
}

export function siteVisitSchedulePdfFilename(
  protocolNumber: string,
  siteNumber: string,
): string {
  const safeStudy = slug(protocolNumber) || 'study';
  const safeSite = slug(siteNumber) || 'site';
  return `study-${safeStudy}-site-${safeSite}-visit-schedule.pdf`;
}
