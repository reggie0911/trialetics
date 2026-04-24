import { describe, expect, it } from 'vitest';

import type {
  SiteEcrfRollup,
  SubjectEcrfRollupRow,
  VisitEcrfRollup,
} from '@/lib/types/ctms';

import { buildEcrfAlerts } from './ecrf-alerts';
import {
  deriveDataEntryByStatus,
  deriveDataStatus,
  deriveVisitDueStatus,
  missingCrfsFor,
  nextActionForStatus,
} from './ecrf-tracking-extras';

const STUDY_ID = '11111111-1111-1111-1111-111111111111';

function subj(overrides: Partial<SubjectEcrfRollupRow> = {}): SubjectEcrfRollupRow {
  return {
    subject_id: overrides.subject_id ?? 's1',
    subject_number: overrides.subject_number ?? 'CRS-S-001',
    status: overrides.status ?? 'screening',
    site_id: overrides.site_id ?? 'site-1',
    site_number: overrides.site_number ?? '101',
    site_name: overrides.site_name ?? 'Northeast Clinical',
    dataExpectedTotal: overrides.dataExpectedTotal ?? 0,
    dataEntryTotal: overrides.dataEntryTotal ?? 0,
    sdvTotal: overrides.sdvTotal ?? 0,
    lockTotal: overrides.lockTotal ?? 0,
    openQueryCount: overrides.openQueryCount ?? 0,
    answeredQueryCount: overrides.answeredQueryCount ?? 0,
  };
}

function site(overrides: Partial<SiteEcrfRollup> = {}): SiteEcrfRollup {
  return {
    site_id: overrides.site_id ?? 'site-1',
    site_number: overrides.site_number ?? '101',
    site_name: overrides.site_name ?? 'Northeast Clinical',
    country: overrides.country ?? 'United States of America',
    subjectCount: overrides.subjectCount ?? 3,
    dataExpectedTotal: overrides.dataExpectedTotal ?? 28,
    dataEntryTotal: overrides.dataEntryTotal ?? 0,
    sdvTotal: overrides.sdvTotal ?? 0,
    lockTotal: overrides.lockTotal ?? 0,
    openQueryCount: overrides.openQueryCount ?? 0,
    answeredQueryCount: overrides.answeredQueryCount ?? 0,
  };
}

function visit(overrides: Partial<VisitEcrfRollup> = {}): VisitEcrfRollup {
  return {
    visit_name: overrides.visit_name ?? 'Screening',
    subjectCount: overrides.subjectCount ?? 2,
    dataExpectedTotal: overrides.dataExpectedTotal ?? 16,
    dataEntryTotal: overrides.dataEntryTotal ?? 0,
    sdvTotal: overrides.sdvTotal ?? 0,
    lockTotal: overrides.lockTotal ?? 0,
    openQueryCount: overrides.openQueryCount ?? 0,
    answeredQueryCount: overrides.answeredQueryCount ?? 0,
    subjectsExpected: overrides.subjectsExpected,
    subjectsCompleted: overrides.subjectsCompleted,
    subjectsOverdue: overrides.subjectsOverdue,
    subjectsDueNow: overrides.subjectsDueNow,
    subjectsUpcoming: overrides.subjectsUpcoming,
  };
}

describe('deriveDataStatus', () => {
  it('returns not_started when nothing is expected', () => {
    expect(
      deriveDataStatus({
        dataExpectedTotal: 0,
        dataEntryTotal: 0,
        sdvTotal: 0,
        lockTotal: 0,
      }),
    ).toBe('not_started');
  });

  it('returns no_data when expected > 0 but DE = 0', () => {
    expect(
      deriveDataStatus({
        dataExpectedTotal: 16,
        dataEntryTotal: 0,
        sdvTotal: 0,
        lockTotal: 0,
      }),
    ).toBe('no_data');
  });

  it('returns partial_data when DE > 0 but < expected', () => {
    expect(
      deriveDataStatus({
        dataExpectedTotal: 16,
        dataEntryTotal: 5,
        sdvTotal: 0,
        lockTotal: 0,
      }),
    ).toBe('partial_data');
  });

  it('returns ready_for_sdv when DE = expected and SDV = 0', () => {
    expect(
      deriveDataStatus({
        dataExpectedTotal: 16,
        dataEntryTotal: 16,
        sdvTotal: 0,
        lockTotal: 0,
      }),
    ).toBe('ready_for_sdv');
  });

  it('returns sdv_in_progress when SDV is partial', () => {
    expect(
      deriveDataStatus({
        dataExpectedTotal: 16,
        dataEntryTotal: 16,
        sdvTotal: 8,
        lockTotal: 0,
      }),
    ).toBe('sdv_in_progress');
  });

  it('returns ready_for_lock when SDV = DE = expected and lock = 0', () => {
    expect(
      deriveDataStatus({
        dataExpectedTotal: 16,
        dataEntryTotal: 16,
        sdvTotal: 16,
        lockTotal: 0,
      }),
    ).toBe('ready_for_lock');
  });

  it('returns locked when lock = expected', () => {
    expect(
      deriveDataStatus({
        dataExpectedTotal: 16,
        dataEntryTotal: 16,
        sdvTotal: 16,
        lockTotal: 16,
      }),
    ).toBe('locked');
  });
});

describe('nextActionForStatus', () => {
  it('escalates from data entry to lock as the row matures', () => {
    expect(nextActionForStatus('no_data').label).toMatch(/start data entry/i);
    expect(nextActionForStatus('partial_data').label).toMatch(/continue/i);
    expect(nextActionForStatus('ready_for_sdv').label).toMatch(/sdv/i);
    expect(nextActionForStatus('ready_for_lock').label).toMatch(/lock/i);
    expect(nextActionForStatus('locked').label).toMatch(/locked/i);
  });
});

describe('deriveVisitDueStatus', () => {
  it('flags overdue first', () => {
    expect(
      deriveVisitDueStatus({
        subjectCount: 5,
        subjectsOverdue: 2,
        subjectsDueNow: 1,
        subjectsUpcoming: 1,
        subjectsCompleted: 1,
      }),
    ).toBe('overdue');
  });

  it('falls through to upcoming and not_started', () => {
    expect(
      deriveVisitDueStatus({
        subjectCount: 5,
        subjectsUpcoming: 5,
      }),
    ).toBe('upcoming');
    expect(
      deriveVisitDueStatus({
        subjectCount: 5,
      }),
    ).toBe('not_started');
  });

  it('returns completed only when every subject is done', () => {
    expect(
      deriveVisitDueStatus({
        subjectCount: 5,
        subjectsCompleted: 5,
      }),
    ).toBe('completed');
    expect(
      deriveVisitDueStatus({
        subjectCount: 5,
        subjectsCompleted: 4,
      }),
    ).toBe('not_started');
  });
});

describe('deriveDataEntryByStatus', () => {
  it('counts CRF units (not subjects)', () => {
    const buckets = deriveDataEntryByStatus([
      // No data → all 16 expected go to not_entered
      { dataExpectedTotal: 16, dataEntryTotal: 0 },
      // Half done → 8 complete + 8 in_progress
      { dataExpectedTotal: 16, dataEntryTotal: 8 },
      // All done → 16 complete
      { dataExpectedTotal: 16, dataEntryTotal: 16 },
    ]);
    expect(buckets).toEqual({
      not_entered: 16,
      in_progress: 8,
      complete: 24,
    });
  });

  it('skips rows with expected = 0', () => {
    expect(
      deriveDataEntryByStatus([{ dataExpectedTotal: 0, dataEntryTotal: 0 }]),
    ).toEqual({ not_entered: 0, in_progress: 0, complete: 0 });
  });
});

describe('missingCrfsFor', () => {
  it('returns expected - entered, never negative', () => {
    expect(missingCrfsFor({ dataExpectedTotal: 16, dataEntryTotal: 5 })).toBe(11);
    expect(missingCrfsFor({ dataExpectedTotal: 16, dataEntryTotal: 16 })).toBe(0);
    expect(missingCrfsFor({ dataExpectedTotal: 0, dataEntryTotal: 0 })).toBe(0);
  });
});

describe('buildEcrfAlerts', () => {
  it('returns empty when nothing is wrong', () => {
    const alerts = buildEcrfAlerts({
      studyId: STUDY_ID,
      bySubject: [],
      bySite: [],
      byVisit: [],
    });
    expect(alerts).toEqual([]);
  });

  it('emits subject + site + visit alerts together', () => {
    const alerts = buildEcrfAlerts({
      studyId: STUDY_ID,
      bySubject: [
        subj({ dataExpectedTotal: 16, dataEntryTotal: 0 }),
        subj({ subject_id: 's2', dataExpectedTotal: 16, dataEntryTotal: 5 }),
      ],
      bySite: [site({ dataExpectedTotal: 28, dataEntryTotal: 0 })],
      byVisit: [
        visit({ subjectsOverdue: 2 }),
        visit({ visit_name: 'Day 1', dataExpectedTotal: 16, dataEntryTotal: 0 }),
      ],
    });

    const ids = alerts.map((a) => a.id);
    expect(ids).toContain('subjects-no-data');
    expect(ids).toContain('subjects-missing-crfs');
    expect(ids).toContain('sites-no-entry');
    expect(ids).toContain('visits-overdue');
    expect(ids).toContain('visits-zero-de');
  });

  it('embeds the deep-link CTA in the alert href', () => {
    const alerts = buildEcrfAlerts({
      studyId: STUDY_ID,
      bySubject: [subj({ dataExpectedTotal: 16, dataEntryTotal: 0 })],
      bySite: [],
      byVisit: [],
    });
    const a = alerts.find((x) => x.id === 'subjects-no-data');
    expect(a?.ctaHref).toContain(`/protected/studies/${STUDY_ID}`);
    expect(a?.ctaHref).toContain('tab=ecrf-tracking');
    expect(a?.ctaHref).toContain('ecrfTab=by-subject');
    expect(a?.ctaHref).toContain('dataStatus=no_data');
  });
});
