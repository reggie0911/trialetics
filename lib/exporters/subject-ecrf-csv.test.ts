import { describe, expect, it } from 'vitest';

import type { SubjectCrf, SubjectVisitWithCrfs } from '@/lib/types/ctms';

import { buildSubjectEcrfCsv, subjectEcrfCsvFilename } from './subject-ecrf-csv';

function crf(overrides: Partial<SubjectCrf> = {}): SubjectCrf {
  return {
    id: 'c1',
    subject_id: 's1',
    subject_visit_id: 'v1',
    crf_definition_id: null,
    template_version_id: 't1',
    crf_name: 'Demographics',
    sort_order: 0,
    data_expected: 1,
    data_entry: false,
    source_data_review: false,
    source_data_verified: false,
    pi_signed: false,
    data_management_lock: false,
    query_status: 'none',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function visit(name: string, crfs: SubjectCrf[]): SubjectVisitWithCrfs {
  return {
    id: 'v',
    subject_id: 's1',
    visit_name: name,
    visit_number: 1,
    sort_order: 0,
    planned_date: null,
    actual_date: null,
    status: 'scheduled',
    window_start: null,
    window_end: null,
    notes: null,
    template_version_id: null,
    visit_definition_id: null,
    timepoint_label: null,
    timepoint_days: null,
    window_before_days: 0,
    window_after_days: 0,
    created_at: '2026-01-01T00:00:00Z',
    crfs,
  };
}

describe('buildSubjectEcrfCsv', () => {
  it('starts with a UTF-8 BOM and the canonical header row', () => {
    const csv = buildSubjectEcrfCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(
      'Visit,CRF,Expected,DE,SDR,SDV,PI,Lock,Query,DE%,SDV%,Lock%',
    );
  });

  it('renders booleans as Yes/No and includes per-row percentages', () => {
    const csv = buildSubjectEcrfCsv([
      visit('Screening', [
        crf({
          crf_name: 'Vitals',
          data_entry: true,
          source_data_verified: true,
        }),
      ]),
    ]);
    expect(csv).toContain('Screening,Vitals,1,Yes,No,Yes,No,No,No Query,100%,100%,');
  });

  it('caps SDV%/Lock% at 99 when an open query is set', () => {
    const csv = buildSubjectEcrfCsv([
      visit('Screening', [
        crf({
          data_entry: true,
          source_data_verified: true,
          data_management_lock: true,
          query_status: 'open',
        }),
      ]),
    ]);
    expect(csv).toContain(',Open,100%,99%,99%');
  });

  it('emits an empty-CRF placeholder row for visits without CRFs', () => {
    const csv = buildSubjectEcrfCsv([visit('Empty Visit', [])]);
    expect(csv).toContain('Empty Visit,,,,,,,,,,,');
  });
});

describe('subjectEcrfCsvFilename', () => {
  it('slugifies the subject number', () => {
    expect(subjectEcrfCsvFilename('AUR/204-101')).toMatch(
      /^subject-ecrf-tracking-aur-204-101\.csv$/,
    );
  });
});
