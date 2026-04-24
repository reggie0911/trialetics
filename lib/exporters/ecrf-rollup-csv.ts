import Papa from 'papaparse';

import { computeSubjectCrfPercentages } from '@/lib/parsers/subject-ecrf-metrics';
import type {
  SiteEcrfRollupBundle,
  StudyEcrfRollupBundle,
  SubjectTrackingSummary,
} from '@/lib/types/ctms';

import { summaryToPercentages } from '@/components/ctms/subjects/subject-tracking-summary-cell';

export interface EcrfRollupCsvScope {
  kind: 'site' | 'study';
  /** Display label for the section headers. */
  label: string;
}

function pct(value: number | null): string {
  return value === null ? '' : `${value}%`;
}

function pctsFor(counters: SubjectTrackingSummary) {
  return counters.dataExpectedTotal > 0
    ? summaryToPercentages(counters)
    : computeSubjectCrfPercentages([]);
}

function commentRow(text: string): string[] {
  return [`# ${text}`];
}

function blankRow(): string[] {
  return [''];
}

/**
 * Build a single CSV containing every section of an eCRF rollup. Each section
 * is preceded by a `# Section name` comment row so analysts can pivot on it
 * easily, and followed by a blank row for visual separation in Excel.
 *
 * Section ordering:
 *   1. Overall (single row)
 *   2. By Site (study scope only)
 *   3. By Visit
 *   4. By Subject
 *
 * Percentage cells use the same cap-aware logic as the on-screen tables via
 * `summaryToPercentages` so the CSV always agrees with the UI.
 */
export function buildEcrfRollupCsv(
  bundle: SiteEcrfRollupBundle | StudyEcrfRollupBundle,
  scope: EcrfRollupCsvScope,
): string {
  const matrix: string[][] = [];

  matrix.push(commentRow(`eCRF Tracking — ${scope.label}`));
  matrix.push(blankRow());

  matrix.push(commentRow('Overall'));
  matrix.push([
    'Subjects',
    'Expected',
    'DE',
    'SDV',
    'Lock',
    'Open Queries',
    'Answered Queries',
    'DE %',
    'SDV %',
    'Lock %',
  ]);
  const overallPcts = pctsFor(bundle.totals);
  matrix.push([
    String(bundle.bySubject.length),
    String(bundle.totals.dataExpectedTotal),
    String(bundle.totals.dataEntryTotal),
    String(bundle.totals.sdvTotal),
    String(bundle.totals.lockTotal),
    String(bundle.totals.openQueryCount),
    String(bundle.totals.answeredQueryCount),
    pct(overallPcts.dataEntryPct),
    pct(overallPcts.sdvPct),
    pct(overallPcts.lockPct),
  ]);
  matrix.push(blankRow());

  if (scope.kind === 'study' && 'bySite' in bundle) {
    matrix.push(commentRow('By Site'));
    matrix.push([
      'Site #',
      'Site Name',
      'Country',
      'Subjects',
      'Expected',
      'DE',
      'SDV',
      'Lock',
      'OQ',
      'AQ',
      'DE %',
      'SDV %',
      'Lock %',
    ]);
    for (const site of bundle.bySite) {
      const p = pctsFor(site);
      matrix.push([
        site.site_number,
        site.site_name,
        site.country ?? '',
        String(site.subjectCount),
        String(site.dataExpectedTotal),
        String(site.dataEntryTotal),
        String(site.sdvTotal),
        String(site.lockTotal),
        String(site.openQueryCount),
        String(site.answeredQueryCount),
        pct(p.dataEntryPct),
        pct(p.sdvPct),
        pct(p.lockPct),
      ]);
    }
    matrix.push(blankRow());
  }

  matrix.push(commentRow('By Visit'));
  matrix.push([
    'Visit',
    'Subjects',
    'Expected',
    'DE',
    'SDV',
    'Lock',
    'OQ',
    'AQ',
    'DE %',
    'SDV %',
    'Lock %',
  ]);
  for (const visit of bundle.byVisit) {
    const p = pctsFor(visit);
    matrix.push([
      visit.visit_name,
      String(visit.subjectCount),
      String(visit.dataExpectedTotal),
      String(visit.dataEntryTotal),
      String(visit.sdvTotal),
      String(visit.lockTotal),
      String(visit.openQueryCount),
      String(visit.answeredQueryCount),
      pct(p.dataEntryPct),
      pct(p.sdvPct),
      pct(p.lockPct),
    ]);
  }
  matrix.push(blankRow());

  matrix.push(commentRow('By Subject'));
  matrix.push([
    'Subject #',
    'Site #',
    'Site name',
    'Status',
    'Expected',
    'DE',
    'SDV',
    'Lock',
    'OQ',
    'AQ',
    'DE %',
    'SDV %',
    'Lock %',
  ]);
  for (const subject of bundle.bySubject) {
    const p = pctsFor(subject);
    matrix.push([
      subject.subject_number,
      subject.site_number ?? '',
      subject.site_name ?? '',
      subject.status,
      String(subject.dataExpectedTotal),
      String(subject.dataEntryTotal),
      String(subject.sdvTotal),
      String(subject.lockTotal),
      String(subject.openQueryCount),
      String(subject.answeredQueryCount),
      pct(p.dataEntryPct),
      pct(p.sdvPct),
      pct(p.lockPct),
    ]);
  }

  const csv = Papa.unparse(matrix, { newline: '\r\n' });
  return `\ufeff${csv}`;
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').toLowerCase();
}

export function studyEcrfRollupCsvFilename(protocolNumber: string): string {
  const safe = slug(protocolNumber) || 'study';
  return `study-${safe}-ecrf-tracking.csv`;
}

export function studyEcrfRollupPdfFilename(protocolNumber: string): string {
  const safe = slug(protocolNumber) || 'study';
  return `study-${safe}-ecrf-tracking.pdf`;
}

export function siteEcrfRollupCsvFilename(
  protocolNumber: string,
  siteNumber: string,
): string {
  const safeStudy = slug(protocolNumber) || 'study';
  const safeSite = slug(siteNumber) || 'site';
  return `study-${safeStudy}-site-${safeSite}-ecrf-tracking.csv`;
}

export function siteEcrfRollupPdfFilename(
  protocolNumber: string,
  siteNumber: string,
): string {
  const safeStudy = slug(protocolNumber) || 'study';
  const safeSite = slug(siteNumber) || 'site';
  return `study-${safeStudy}-site-${safeSite}-ecrf-tracking.pdf`;
}
