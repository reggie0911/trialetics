import Papa from 'papaparse';

import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import {
  SUBJECT_CRF_QUERY_STATUS_LABELS,
  type SubjectVisitWithCrfs,
} from '@/lib/types/ctms';

const HEADERS = [
  'Visit',
  'CRF',
  'Expected',
  'DE',
  'SDR',
  'SDV',
  'PI',
  'Lock',
  'Query',
  'DE%',
  'SDV%',
  'Lock%',
] as const;

function yn(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function pct(value: number | null): string {
  return value === null ? '' : `${value}%`;
}

/**
 * Build a CSV export of a subject's eCRF tracking matrix. One row per
 * (Visit, CRF). Per-row percentages mirror the on-screen panel (cap rule
 * applied via `computeSubjectCrfPercentages`). UTF-8 BOM is prepended so
 * Excel opens it as UTF-8 instead of ANSI.
 */
export function buildSubjectEcrfCsv(visits: SubjectVisitWithCrfs[]): string {
  const matrix: string[][] = [HEADERS.slice()];

  for (const visit of visits) {
    if (visit.crfs.length === 0) {
      matrix.push([
        visit.visit_name,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
      continue;
    }
    for (const crf of visit.crfs) {
      const totals = computeSubjectCrfPercentages([crf]);
      matrix.push([
        visit.visit_name,
        crf.crf_name,
        String(crf.data_expected),
        yn(crf.data_entry),
        yn(crf.source_data_review),
        yn(crf.source_data_verified),
        yn(crf.pi_signed),
        yn(crf.data_management_lock),
        SUBJECT_CRF_QUERY_STATUS_LABELS[crf.query_status],
        pct(totals.dataEntryPct),
        pct(totals.sdvPct),
        pct(totals.lockPct),
      ]);
    }
  }

  const csv = Papa.unparse(matrix, { newline: '\r\n' });
  return `\ufeff${csv}`;
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function subjectEcrfCsvFilename(subjectNumber: string): string {
  const safe = slug(subjectNumber) || 'subject';
  return `subject-ecrf-tracking-${safe}.csv`;
}

export function subjectEcrfPdfFilename(subjectNumber: string): string {
  const safe = slug(subjectNumber) || 'subject';
  return `subject-ecrf-tracking-${safe}.pdf`;
}
