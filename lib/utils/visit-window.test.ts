import { describe, expect, it } from 'vitest';

import type { SubjectVisit, VisitScheduleBucketCounts } from '@/lib/types/ctms';

import {
  bucketVisitsByWindowStatus,
  computeVisitWindowStatus,
  daysOutOfWindow,
  derivePriority,
  deriveSubjectRisk,
  deriveNextAction,
  formatPlanDate,
} from './visit-window';

function row(overrides: Partial<SubjectVisit> = {}): SubjectVisit {
  return {
    id: 'v1',
    subject_id: 's1',
    visit_name: 'Baseline',
    visit_number: 1,
    planned_date: null,
    actual_date: null,
    status: 'scheduled',
    window_start: null,
    window_end: null,
    notes: null,
    template_version_id: null,
    visit_definition_id: null,
    sort_order: 0,
    timepoint_label: null,
    timepoint_days: null,
    window_before_days: 0,
    window_after_days: 0,
    created_at: '2026-04-19T03:03:06Z',
    ...overrides,
  };
}

describe('formatPlanDate', () => {
  it('formats YYYY-MM-DD as dd-MMM-yyyy with title-cased month', () => {
    expect(formatPlanDate('2026-04-19')).toBe('19-Apr-2026');
  });

  it('zero-pads single-digit days', () => {
    expect(formatPlanDate('2026-04-05')).toBe('05-Apr-2026');
  });

  it('renders -- for null / empty / unparseable input', () => {
    expect(formatPlanDate(null)).toBe('--');
    expect(formatPlanDate(undefined)).toBe('--');
    expect(formatPlanDate('')).toBe('--');
    expect(formatPlanDate('not a date')).toBe('--');
  });

  it('only consumes the first 10 chars of an ISO timestamp', () => {
    expect(formatPlanDate('2026-04-19T03:03:06Z')).toBe('19-Apr-2026');
  });

  it('does not invoke Date / toLocaleDateString and so is timezone-stable', () => {
    // The helper is intentionally TZ-free; the assertion below would fail if it
    // ever started routing through `new Date(value).toLocaleDateString()`.
    const sample = '2026-04-19';
    const realTz = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      expect(formatPlanDate(sample)).toBe('19-Apr-2026');
      process.env.TZ = 'Pacific/Auckland';
      expect(formatPlanDate(sample)).toBe('19-Apr-2026');
    } finally {
      process.env.TZ = realTz;
    }
  });

  it('handles every month label', () => {
    const months = [
      '01-Jan-2026', '01-Feb-2026', '01-Mar-2026', '01-Apr-2026',
      '01-May-2026', '01-Jun-2026', '01-Jul-2026', '01-Aug-2026',
      '01-Sep-2026', '01-Oct-2026', '01-Nov-2026', '01-Dec-2026',
    ];
    for (let m = 1; m <= 12; m++) {
      const iso = `2026-${String(m).padStart(2, '0')}-01`;
      expect(formatPlanDate(iso)).toBe(months[m - 1]);
    }
  });
});

describe('computeVisitWindowStatus', () => {
  const today = '2026-04-19';

  it('returns Pending when planned_date / window are missing', () => {
    expect(computeVisitWindowStatus(row(), today).kind).toBe('pending');
  });

  it('returns Done (success) when status is completed', () => {
    const meta = computeVisitWindowStatus(row({ status: 'completed' }), today);
    expect(meta.kind).toBe('done');
    expect(meta.variant).toBe('success');
  });

  it('returns Done (secondary) when status is missed', () => {
    const meta = computeVisitWindowStatus(row({ status: 'missed' }), today);
    expect(meta.kind).toBe('done');
    expect(meta.variant).toBe('secondary');
    expect(meta.label).toBe('Missed');
  });

  it('actual inside the window -> in_window', () => {
    const meta = computeVisitWindowStatus(
      row({
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
        actual_date:  '2026-04-19',
      }),
      today,
    );
    expect(meta.kind).toBe('in_window');
  });

  it('actual exactly on window_start -> in_window (inclusive)', () => {
    const meta = computeVisitWindowStatus(
      row({
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
        actual_date:  '2026-04-16',
      }),
      today,
    );
    expect(meta.kind).toBe('in_window');
  });

  it('actual exactly on window_end -> in_window (inclusive)', () => {
    const meta = computeVisitWindowStatus(
      row({
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
        actual_date:  '2026-04-22',
      }),
      today,
    );
    expect(meta.kind).toBe('in_window');
  });

  it('actual outside the window -> out_of_window', () => {
    const meta = computeVisitWindowStatus(
      row({
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
        actual_date:  '2026-04-25',
      }),
      today,
    );
    expect(meta.kind).toBe('out_of_window');
    expect(meta.variant).toBe('warning');
  });

  it('today < window_start -> upcoming', () => {
    const meta = computeVisitWindowStatus(
      row({
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
      '2026-04-15',
    );
    expect(meta.kind).toBe('upcoming');
  });

  it('today exactly on window_start -> due_now (inclusive)', () => {
    const meta = computeVisitWindowStatus(
      row({
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
      '2026-04-16',
    );
    expect(meta.kind).toBe('due_now');
  });

  it('today exactly on window_end -> due_now (inclusive)', () => {
    const meta = computeVisitWindowStatus(
      row({
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
      '2026-04-22',
    );
    expect(meta.kind).toBe('due_now');
  });

  it('today > window_end -> overdue', () => {
    const meta = computeVisitWindowStatus(
      row({
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
      '2026-04-25',
    );
    expect(meta.kind).toBe('overdue');
    expect(meta.variant).toBe('destructive');
  });
});

describe('daysOutOfWindow', () => {
  it('returns 0 inside the window', () => {
    expect(
      daysOutOfWindow({
        actual_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
    ).toBe(0);
  });

  it('returns negative days when actual is before window_start', () => {
    expect(
      daysOutOfWindow({
        actual_date: '2026-04-13',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
    ).toBe(-3);
  });

  it('returns positive days when actual is after window_end', () => {
    expect(
      daysOutOfWindow({
        actual_date: '2026-04-25',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
    ).toBe(3);
  });

  it('returns 0 when any input is missing', () => {
    expect(
      daysOutOfWindow({
        actual_date: null,
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
    ).toBe(0);
  });
});

function counts(overrides: Partial<VisitScheduleBucketCounts> = {}): VisitScheduleBucketCounts {
  return {
    total: 0,
    done: 0,
    in_window: 0,
    out_of_window: 0,
    overdue: 0,
    due_now: 0,
    upcoming: 0,
    pending: 0,
    ...overrides,
  };
}

describe('derivePriority', () => {
  it('returns on_track when no open visits remain', () => {
    expect(derivePriority(counts({ total: 5, done: 5 }))).toBe('on_track');
  });

  it('returns critical when overdue / open >= 0.5', () => {
    expect(
      derivePriority(counts({ total: 10, done: 0, overdue: 5, upcoming: 5 })),
    ).toBe('critical');
  });

  it('returns at_risk when overdue / open >= 0.2', () => {
    expect(
      derivePriority(counts({ total: 10, done: 0, overdue: 2, upcoming: 8 })),
    ).toBe('at_risk');
  });

  it('returns on_track when overdue / open is below the at_risk threshold', () => {
    expect(
      derivePriority(counts({ total: 10, done: 0, overdue: 1, upcoming: 9 })),
    ).toBe('on_track');
  });
});

describe('deriveSubjectRisk', () => {
  it('mirrors derivePriority thresholds with risk-level names', () => {
    expect(deriveSubjectRisk(counts({ total: 5, done: 5 }))).toBe('low');
    expect(
      deriveSubjectRisk(counts({ total: 4, done: 0, overdue: 2, upcoming: 2 })),
    ).toBe('high');
    expect(
      deriveSubjectRisk(counts({ total: 10, done: 0, overdue: 2, upcoming: 8 })),
    ).toBe('medium');
    expect(
      deriveSubjectRisk(counts({ total: 10, done: 0, overdue: 1, upcoming: 9 })),
    ).toBe('low');
  });
});

describe('deriveNextAction', () => {
  it('prefers resolving overdue visits first', () => {
    const action = deriveNextAction(
      counts({ total: 5, overdue: 1, due_now: 1, out_of_window: 1, upcoming: 2 }),
    );
    expect(action.kind).toBe('resolve_overdue');
  });

  it('flags out-of-window deviations next', () => {
    expect(
      deriveNextAction(counts({ total: 4, out_of_window: 1, upcoming: 3 })).kind,
    ).toBe('enter_missing_data');
  });

  it('prompts action today when due_now > 0', () => {
    expect(
      deriveNextAction(counts({ total: 4, due_now: 1, upcoming: 3 })).kind,
    ).toBe('review_overdue');
  });

  it('switches between prepare / monitor based on the upcoming ratio', () => {
    expect(
      deriveNextAction(counts({ total: 5, upcoming: 4, pending: 1 })).kind,
    ).toBe('prepare_upcoming');
    expect(
      deriveNextAction(counts({ total: 5, upcoming: 1, pending: 4 })).kind,
    ).toBe('monitor_upcoming');
  });

  it('falls through to plan_visit when only pending remains', () => {
    expect(deriveNextAction(counts({ total: 3, pending: 3 })).kind).toBe('plan_visit');
  });

  it('returns all_clear when every visit is done', () => {
    expect(deriveNextAction(counts({ total: 4, done: 4 })).kind).toBe('all_clear');
  });
});

describe('bucketVisitsByWindowStatus', () => {
  it('groups rows by their derived kind', () => {
    const visits = [
      row({ id: 'a', status: 'completed' }),
      row({
        id: 'b',
        planned_date: '2026-04-19',
        window_start: '2026-04-16',
        window_end:   '2026-04-22',
      }),
      row({ id: 'c' }),
    ];
    const buckets = bucketVisitsByWindowStatus(visits, '2026-04-19');
    expect(buckets.get('done')?.map((v) => v.id)).toEqual(['a']);
    expect(buckets.get('due_now')?.map((v) => v.id)).toEqual(['b']);
    expect(buckets.get('pending')?.map((v) => v.id)).toEqual(['c']);
  });
});
