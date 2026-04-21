import { describe, expect, it } from 'vitest';

import type { SubjectVisit } from '@/lib/types/ctms';

import {
  buildSubjectVisitsCsv,
  subjectVisitsCsvFilename,
  subjectVisitsPdfFilename,
} from './subject-visits-csv';

function visit(overrides: Partial<SubjectVisit> = {}): SubjectVisit {
  return {
    id: 'v1',
    subject_id: 's1',
    visit_name: 'Baseline',
    visit_number: 2,
    planned_date: '2026-04-19',
    actual_date: null,
    status: 'scheduled',
    window_start: '2026-04-16',
    window_end: '2026-04-22',
    notes: null,
    template_version_id: 't1',
    visit_definition_id: 'd1',
    sort_order: 1,
    timepoint_label: 'Baseline',
    timepoint_days: 0,
    window_before_days: 3,
    window_after_days: 3,
    created_at: '2026-04-19T03:03:06Z',
    ...overrides,
  };
}

describe('buildSubjectVisitsCsv', () => {
  it('starts with a UTF-8 BOM and the canonical header row', () => {
    const csv = buildSubjectVisitsCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain(
      '#,Visit,Timepoint Label,Day Offset,Planned,Actual,Window Start,Window End,Window Status,Lifecycle Status,Notes',
    );
  });

  it('renders dates with formatPlanDate (dd-MMM-yyyy)', () => {
    const csv = buildSubjectVisitsCsv([visit()], '2026-04-19');
    expect(csv).toContain('19-Apr-2026');
    expect(csv).toContain('16-Apr-2026');
    expect(csv).toContain('22-Apr-2026');
  });

  it('formats positive timepoint_days with a leading + and Day 0 for zero', () => {
    const csv1 = buildSubjectVisitsCsv([visit({ timepoint_days: 14 })]);
    expect(csv1).toContain(',Day +14,');
    const csv2 = buildSubjectVisitsCsv([visit({ timepoint_days: 0 })]);
    expect(csv2).toContain(',Day 0,');
    const csv3 = buildSubjectVisitsCsv([visit({ timepoint_days: -14 })]);
    expect(csv3).toContain(',Day -14,');
  });

  it('renders -- for missing dates', () => {
    const csv = buildSubjectVisitsCsv(
      [visit({ planned_date: null, window_start: null, window_end: null })],
      '2026-04-19',
    );
    // Each missing date becomes the literal `--` string in the cell.
    expect(csv).toMatch(/,--,/);
  });

  it('reflects window status (Due now) for an in-progress visit', () => {
    const csv = buildSubjectVisitsCsv([visit()], '2026-04-19');
    expect(csv).toContain('Due now');
  });

  it('reflects window status (Done) when lifecycle status is completed', () => {
    const csv = buildSubjectVisitsCsv(
      [visit({ status: 'completed', actual_date: '2026-04-19' })],
      '2026-04-19',
    );
    expect(csv).toContain('Done');
    expect(csv).toContain('Completed'); // Lifecycle Status column
  });

  it('escapes notes containing commas/newlines safely', () => {
    const csv = buildSubjectVisitsCsv([
      visit({ notes: 'Subject was 3 days late, per call' }),
    ]);
    // PapaParse should wrap the cell in quotes.
    expect(csv).toContain('"Subject was 3 days late, per call"');
  });
});

describe('subjectVisitsCsvFilename / subjectVisitsPdfFilename', () => {
  it('slugifies the subject number', () => {
    expect(subjectVisitsCsvFilename('AUR/204-101')).toBe(
      'subject-visits-aur-204-101.csv',
    );
    expect(subjectVisitsPdfFilename('AUR/204-101')).toBe(
      'subject-visits-aur-204-101.pdf',
    );
  });

  it('falls back to "subject" when the input is empty', () => {
    expect(subjectVisitsCsvFilename('')).toBe('subject-visits-subject.csv');
  });
});
