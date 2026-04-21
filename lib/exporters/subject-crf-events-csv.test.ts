import { describe, expect, it } from 'vitest';

import type { SubjectCrfMetricEvent } from '@/lib/types/ctms';

import {
  buildSubjectCrfEventsCsv,
  subjectCrfEventsCsvFilename,
} from './subject-crf-events-csv';

function event(
  overrides: Partial<SubjectCrfMetricEvent> = {},
): SubjectCrfMetricEvent {
  return {
    id: 'e1',
    subject_crf_id: 'sc1',
    field: 'data_entry',
    previous_value: 'false',
    new_value: 'true',
    actor_user_id: 'u1',
    created_at: '2026-04-19T03:03:06Z',
    actor_name: 'reggie@example.com',
    crf_name: 'Vitals',
    visit_name: 'Screening',
    ...overrides,
  };
}

describe('buildSubjectCrfEventsCsv', () => {
  it('starts with a UTF-8 BOM and the canonical header row', () => {
    const csv = buildSubjectCrfEventsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(
      'Timestamp,Field,Previous Value,New Value,Visit,CRF,Actor',
    );
  });

  it('renders booleans as Yes/No and includes ISO timestamp + actor', () => {
    const csv = buildSubjectCrfEventsCsv([event()]);
    expect(csv).toContain(
      '2026-04-19T03:03:06.000Z,Data Entry,No,Yes,Screening,Vitals,reggie@example.com',
    );
  });

  it('renders query_status enum values as their human labels', () => {
    const csv = buildSubjectCrfEventsCsv([
      event({
        field: 'query_status',
        previous_value: 'none',
        new_value: 'open',
      }),
    ]);
    expect(csv).toContain(',Query Status,No Query,Open,');
  });

  it('renders an empty cell for null previous_value (first insert)', () => {
    const csv = buildSubjectCrfEventsCsv([
      event({ previous_value: null, new_value: 'true' }),
    ]);
    expect(csv).toContain(',Data Entry,,Yes,');
  });

  it('falls back to empty strings when visit / crf / actor are missing', () => {
    const csv = buildSubjectCrfEventsCsv([
      event({ visit_name: null, crf_name: null, actor_name: null }),
    ]);
    expect(csv).toContain(',Yes,,,');
  });
});

describe('subjectCrfEventsCsvFilename', () => {
  it('slugifies the subject number', () => {
    expect(subjectCrfEventsCsvFilename('AUR/204-101')).toMatch(
      /^subject-activity-aur-204-101\.csv$/,
    );
  });
});
