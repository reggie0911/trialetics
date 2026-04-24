import type {
  EcrfAlert,
  SiteEcrfRollup,
  StudyEcrfRollupBundle,
  SubjectEcrfRollupRow,
  VisitEcrfRollup,
} from '@/lib/types/ctms';

import { deriveDataStatus, deriveVisitDueStatus } from './ecrf-tracking-extras';

/**
 * Build the alert feed shown in the per-tab callout row + the right-rail
 * "Top Issues" list. Pure function over the already-assembled rollup rows so
 * the rules are easy to unit-test and stay aligned with the same status logic
 * the table cells use.
 *
 * The order returned is the order rendered: highest-severity / most actionable
 * first, then "info" nudges. The dashboard slices off the top N for the
 * compact callout row.
 */
export function buildEcrfAlerts(input: {
  studyId: string;
  bySubject: ReadonlyArray<SubjectEcrfRollupRow>;
  bySite: ReadonlyArray<SiteEcrfRollup>;
  byVisit: ReadonlyArray<VisitEcrfRollup>;
}): EcrfAlert[] {
  const { studyId, bySubject, bySite, byVisit } = input;
  const out: EcrfAlert[] = [];

  // ─ Subject-scope alerts ─
  const noDataSubjects = bySubject.filter(
    (r) => r.dataExpectedTotal > 0 && r.dataEntryTotal === 0,
  );
  if (noDataSubjects.length > 0) {
    out.push({
      id: 'subjects-no-data',
      severity: 'critical',
      scope: 'subject',
      title: `${noDataSubjects.length} subject${noDataSubjects.length === 1 ? '' : 's'} with no data entered`,
      subtitle: 'Enter CRFs to capture data',
      count: noDataSubjects.length,
      ctaLabel: 'View subjects',
      ctaHref: subjectsHref(studyId, { dataStatus: 'no_data' }),
    });
  }

  const partialSubjects = bySubject.filter((r) => {
    const status = deriveDataStatus(r);
    return status === 'partial_data' || status === 'ready_for_sdv';
  });
  if (partialSubjects.length > 0) {
    out.push({
      id: 'subjects-missing-crfs',
      severity: 'warn',
      scope: 'subject',
      title: `${partialSubjects.length} subject${partialSubjects.length === 1 ? '' : 's'} with missing CRFs`,
      subtitle: 'CRFs are pending data entry',
      count: partialSubjects.length,
      ctaLabel: 'View subjects',
      ctaHref: subjectsHref(studyId, { dataStatus: 'partial_data' }),
    });
  }

  const sdvNotStarted = bySubject.filter(
    (r) => r.dataEntryTotal > 0 && (r.sdvTotal ?? 0) === 0,
  );
  if (sdvNotStarted.length > 0) {
    out.push({
      id: 'subjects-sdv-not-started',
      severity: 'info',
      scope: 'subject',
      title: `${sdvNotStarted.length} subject${sdvNotStarted.length === 1 ? '' : 's'} with SDV not started`,
      subtitle: 'Start SDV to improve quality',
      count: sdvNotStarted.length,
      ctaLabel: 'View subjects',
      ctaHref: subjectsHref(studyId, { dataStatus: 'ready_for_sdv' }),
    });
  }

  // ─ Site-scope alerts ─
  const sitesNoEntry = bySite.filter(
    (r) => r.dataExpectedTotal > 0 && r.dataEntryTotal === 0,
  );
  if (sitesNoEntry.length > 0) {
    out.push({
      id: 'sites-no-entry',
      severity: 'critical',
      scope: 'site',
      title: `${sitesNoEntry.length} site${sitesNoEntry.length === 1 ? '' : 's'} with 0% data entry`,
      subtitle: 'No CRFs entered yet',
      count: sitesNoEntry.length,
      ctaLabel: 'View sites',
      ctaHref: tabHref(studyId, 'by-site'),
    });
  }

  const totalSdv = bySite.reduce((acc, r) => acc + (r.sdvTotal ?? 0), 0);
  const totalDe = bySite.reduce((acc, r) => acc + (r.dataEntryTotal ?? 0), 0);
  if (totalDe > 0 && totalSdv === 0) {
    out.push({
      id: 'study-sdv-zero',
      severity: 'warn',
      scope: 'study',
      title: '0% SDV activity',
      subtitle: 'Start SDV to improve quality',
      count: totalDe,
      ctaLabel: 'View SDV dashboard',
      ctaHref: tabHref(studyId, 'by-site'),
    });
  }

  // ─ Visit-scope alerts ─
  const overdueVisits = byVisit.filter(
    (v) => deriveVisitDueStatus(v) === 'overdue',
  );
  if (overdueVisits.length > 0) {
    out.push({
      id: 'visits-overdue',
      severity: 'critical',
      scope: 'visit',
      title: `${overdueVisits.length} overdue visit${overdueVisits.length === 1 ? '' : 's'}`,
      subtitle: 'Window has passed without an actual date',
      count: overdueVisits.length,
      ctaLabel: 'View visits',
      ctaHref: tabHref(studyId, 'by-visit'),
    });
  }

  const visitsZeroDe = byVisit.filter(
    (v) => v.dataExpectedTotal > 0 && v.dataEntryTotal === 0,
  );
  if (visitsZeroDe.length > 0) {
    out.push({
      id: 'visits-zero-de',
      severity: 'warn',
      scope: 'visit',
      title: `${visitsZeroDe.length} visit${visitsZeroDe.length === 1 ? '' : 's'} with 0% data entry`,
      subtitle: 'CRFs are pending',
      count: visitsZeroDe.length,
      ctaLabel: 'View visits',
      ctaHref: tabHref(studyId, 'by-visit'),
    });
  }

  const visitsReadyForLock = byVisit.filter(
    (v) =>
      v.dataExpectedTotal > 0 &&
      v.dataEntryTotal === v.dataExpectedTotal &&
      (v.sdvTotal ?? 0) === v.dataEntryTotal &&
      (v.lockTotal ?? 0) < v.dataEntryTotal,
  );
  if (visitsReadyForLock.length > 0) {
    out.push({
      id: 'visits-ready-for-lock',
      severity: 'info',
      scope: 'visit',
      title: `${visitsReadyForLock.length} visit${visitsReadyForLock.length === 1 ? '' : 's'} ready for lock`,
      subtitle: 'SDV complete — lock to finalize',
      count: visitsReadyForLock.length,
      ctaLabel: 'View visits',
      ctaHref: tabHref(studyId, 'by-visit'),
    });
  }

  return out;
}

/**
 * Filter the alert feed down to the entries that should appear in a tab's
 * inline callout row. Caps at 3 cards to avoid wrapping the toolbar below.
 */
export function alertsForTab(
  bundle: StudyEcrfRollupBundle,
  tab: 'by-subject' | 'by-site' | 'by-visit',
): EcrfAlert[] {
  const scopeFilter: EcrfAlert['scope'][] =
    tab === 'by-subject'
      ? ['subject']
      : tab === 'by-site'
      ? ['site', 'study']
      : ['visit'];
  return bundle.alerts.filter((a) => scopeFilter.includes(a.scope)).slice(0, 3);
}

function subjectsHref(
  studyId: string,
  params: { dataStatus?: string } = {},
): string {
  const search = new URLSearchParams({ tab: 'ecrf-tracking', ecrfTab: 'by-subject' });
  if (params.dataStatus) search.set('dataStatus', params.dataStatus);
  return `/protected/studies/${studyId}?${search.toString()}`;
}

function tabHref(
  studyId: string,
  ecrfTab: 'by-subject' | 'by-site' | 'by-visit',
): string {
  const search = new URLSearchParams({ tab: 'ecrf-tracking', ecrfTab });
  return `/protected/studies/${studyId}?${search.toString()}`;
}
