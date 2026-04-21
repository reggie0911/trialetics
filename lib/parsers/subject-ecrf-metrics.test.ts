import { describe, expect, it } from 'vitest';

import type { SubjectCrf, SubjectCrfQueryStatus } from '@/lib/types/ctms';

import { computeSubjectCrfPercentages } from './subject-ecrf-metrics';

type Row = Pick<
  SubjectCrf,
  | 'data_expected'
  | 'data_entry'
  | 'source_data_verified'
  | 'data_management_lock'
  | 'query_status'
>;

function row(overrides: Partial<Row> = {}): Row {
  return {
    data_expected: 1,
    data_entry: false,
    source_data_verified: false,
    data_management_lock: false,
    query_status: 'none' as SubjectCrfQueryStatus,
    ...overrides,
  };
}

describe('computeSubjectCrfPercentages', () => {
  it('returns all-zero totals and null percentages for empty input', () => {
    const r = computeSubjectCrfPercentages([]);
    expect(r).toEqual({
      dataExpectedTotal: 0,
      dataEntryTotal: 0,
      sdvTotal: 0,
      lockTotal: 0,
      openQueryCount: 0,
      answeredQueryCount: 0,
      hasUnresolvedQuery: false,
      dataEntryPct: null,
      sdvPct: null,
      lockPct: null,
    });
  });

  it('counts open and answered query rows independently', () => {
    const rows: Row[] = [
      row({ query_status: 'open' }),
      row({ query_status: 'open' }),
      row({ query_status: 'answered' }),
      row({ query_status: 'none' }),
    ];
    const r = computeSubjectCrfPercentages(rows);
    expect(r.openQueryCount).toBe(2);
    expect(r.answeredQueryCount).toBe(1);
    expect(r.hasUnresolvedQuery).toBe(true);
  });

  it('reports zero query counts when nothing is unresolved', () => {
    const r = computeSubjectCrfPercentages([row(), row(), row()]);
    expect(r.openQueryCount).toBe(0);
    expect(r.answeredQueryCount).toBe(0);
    expect(r.hasUnresolvedQuery).toBe(false);
  });

  it('reports DE% = 0 and SDV / Lock = null when nothing is entered', () => {
    const r = computeSubjectCrfPercentages([row(), row(), row()]);
    expect(r.dataExpectedTotal).toBe(3);
    expect(r.dataEntryPct).toBe(0);
    expect(r.sdvPct).toBeNull();
    expect(r.lockPct).toBeNull();
  });

  it('reports 100% across the board when fully complete and no queries', () => {
    const rows: Row[] = [
      row({ data_entry: true, source_data_verified: true, data_management_lock: true }),
      row({ data_entry: true, source_data_verified: true, data_management_lock: true }),
    ];
    const r = computeSubjectCrfPercentages(rows);
    expect(r.dataEntryPct).toBe(100);
    expect(r.sdvPct).toBe(100);
    expect(r.lockPct).toBe(100);
    expect(r.hasUnresolvedQuery).toBe(false);
  });

  it("caps SDV% and Lock% at 99 when any row's query is 'open'", () => {
    const rows: Row[] = [
      row({ data_entry: true, source_data_verified: true, data_management_lock: true }),
      row({
        data_entry: true,
        source_data_verified: true,
        data_management_lock: true,
        query_status: 'open',
      }),
    ];
    const r = computeSubjectCrfPercentages(rows);
    expect(r.dataEntryPct).toBe(100);
    expect(r.sdvPct).toBe(99);
    expect(r.lockPct).toBe(99);
    expect(r.hasUnresolvedQuery).toBe(true);
  });

  it("caps SDV% and Lock% at 99 when any row's query is 'answered' too", () => {
    const rows: Row[] = [
      row({ data_entry: true, source_data_verified: true, data_management_lock: true }),
      row({
        data_entry: true,
        source_data_verified: true,
        data_management_lock: true,
        query_status: 'answered',
      }),
    ];
    const r = computeSubjectCrfPercentages(rows);
    expect(r.sdvPct).toBe(99);
    expect(r.lockPct).toBe(99);
  });

  it("releases the cap when every row's query_status returns to 'none'", () => {
    const rows: Row[] = [
      row({ data_entry: true, source_data_verified: true, data_management_lock: true }),
      row({
        data_entry: true,
        source_data_verified: true,
        data_management_lock: true,
        query_status: 'none',
      }),
    ];
    const r = computeSubjectCrfPercentages(rows);
    expect(r.sdvPct).toBe(100);
    expect(r.lockPct).toBe(100);
    expect(r.hasUnresolvedQuery).toBe(false);
  });

  it('uses Math.floor so 199/200 becomes 99% (no upward rounding)', () => {
    const rows: Row[] = [];
    for (let i = 0; i < 199; i++) {
      rows.push(row({ data_entry: true }));
    }
    rows.push(row({ data_entry: false }));
    const r = computeSubjectCrfPercentages(rows);
    expect(r.dataEntryPct).toBe(99);
  });

  it('handles mixed data_expected values for forward-compat', () => {
    const rows: Row[] = [
      row({ data_expected: 2, data_entry: true }),
      row({ data_expected: 3, data_entry: false }),
    ];
    const r = computeSubjectCrfPercentages(rows);
    expect(r.dataExpectedTotal).toBe(5);
    expect(r.dataEntryTotal).toBe(1);
    expect(r.dataEntryPct).toBe(20);
  });

  it('reports DE% = 100, SDV%/Lock% = 0 for a single fully-entered row with no SDV/Lock', () => {
    const r = computeSubjectCrfPercentages([row({ data_entry: true })]);
    expect(r.dataEntryPct).toBe(100);
    expect(r.sdvPct).toBe(0);
    expect(r.lockPct).toBe(0);
  });

  it('reports SDV% = 100 for a single row with DE + SDV', () => {
    const r = computeSubjectCrfPercentages([
      row({ data_entry: true, source_data_verified: true }),
    ]);
    expect(r.dataEntryPct).toBe(100);
    expect(r.sdvPct).toBe(100);
    expect(r.lockPct).toBe(0);
  });

  it("caps single-row SDV% at 99 when the row's own query is 'open'", () => {
    const r = computeSubjectCrfPercentages([
      row({
        data_entry: true,
        source_data_verified: true,
        query_status: 'open',
      }),
    ]);
    expect(r.dataEntryPct).toBe(100);
    expect(r.sdvPct).toBe(99);
    expect(r.hasUnresolvedQuery).toBe(true);
  });
});
