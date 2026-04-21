import { describe, expect, it } from 'vitest';
import {
  TRIP_REPORT_DEFAULT_PAGE_SIZE,
  TRIP_REPORT_MAX_PAGE_SIZE,
  TRIP_REPORT_STATUS_TRANSITIONS,
  bucketizeOverdueDays,
  compareForSort,
  emptyAgingBuckets,
  isValidTripReportStatusTransition,
  normalizeTripReportPagination,
} from './trip-report-compliance';

describe('normalizeTripReportPagination', () => {
  it('falls back to default page and page size when no options given', () => {
    expect(normalizeTripReportPagination()).toEqual({
      page: 1,
      pageSize: TRIP_REPORT_DEFAULT_PAGE_SIZE,
    });
  });

  it('clamps page to a minimum of 1 when callers pass garbage', () => {
    expect(normalizeTripReportPagination({ page: 0 })).toMatchObject({ page: 1 });
    expect(normalizeTripReportPagination({ page: -10 })).toMatchObject({ page: 1 });
    expect(normalizeTripReportPagination({ page: Number.NaN })).toMatchObject({ page: 1 });
  });

  it('clamps pageSize to [1, TRIP_REPORT_MAX_PAGE_SIZE]', () => {
    expect(normalizeTripReportPagination({ pageSize: 0 })).toMatchObject({ pageSize: 1 });
    expect(normalizeTripReportPagination({ pageSize: -50 })).toMatchObject({ pageSize: 1 });
    expect(normalizeTripReportPagination({ pageSize: 10_000 })).toMatchObject({
      pageSize: TRIP_REPORT_MAX_PAGE_SIZE,
    });
  });

  it('floors fractional inputs', () => {
    expect(normalizeTripReportPagination({ page: 2.9, pageSize: 25.6 })).toEqual({
      page: 2,
      pageSize: 25,
    });
  });
});

describe('compareForSort', () => {
  it('always sorts nulls last regardless of direction', () => {
    expect(compareForSort(null, 'a', 'asc')).toBeGreaterThan(0);
    expect(compareForSort('a', null, 'asc')).toBeLessThan(0);
    expect(compareForSort(null, 'a', 'desc')).toBeGreaterThan(0);
    expect(compareForSort('a', null, 'desc')).toBeLessThan(0);
    expect(compareForSort(null, null, 'asc')).toBe(0);
  });

  it('sorts numbers numerically and respects direction', () => {
    expect(compareForSort(1, 2, 'asc')).toBeLessThan(0);
    expect(compareForSort(1, 2, 'desc')).toBeGreaterThan(0);
    expect(compareForSort(10, 2, 'asc')).toBeGreaterThan(0);
  });

  it('uses natural-numeric string ordering for visit names', () => {
    const arr = ['Visit -10', 'Visit -2', 'Visit -1'];
    const sortedAsc = [...arr].sort((a, b) => compareForSort(a, b, 'asc'));
    expect(sortedAsc).toEqual(['Visit -1', 'Visit -2', 'Visit -10']);
  });

  it('is case-insensitive', () => {
    expect(compareForSort('apple', 'BANANA', 'asc')).toBeLessThan(0);
  });
});

describe('aging buckets', () => {
  it('emptyAgingBuckets returns a fresh zeroed object every call', () => {
    const a = emptyAgingBuckets();
    a['1to7'] = 5;
    const b = emptyAgingBuckets();
    expect(b['1to7']).toBe(0);
  });

  it.each([
    [1, '1to7'],
    [7, '1to7'],
    [8, '8to14'],
    [14, '8to14'],
    [15, '15to30'],
    [30, '15to30'],
    [31, '31plus'],
    [365, '31plus'],
  ] as const)('bucketizeOverdueDays(%i) === %s', (days, bucket) => {
    expect(bucketizeOverdueDays(days)).toBe(bucket);
  });
});

describe('trip report status transition guards', () => {
  it('matches the production status workflow whitelist', () => {
    expect(TRIP_REPORT_STATUS_TRANSITIONS).toEqual({
      report_pending: ['submitted'],
      authoring: ['submitted'],
      returned: ['submitted'],
      submitted: ['under_review', 'authoring'],
      under_review: ['returned', 'approved_and_signed'],
      approved_and_signed: ['returned'],
    });
  });

  it.each([
    ['report_pending', 'submitted'],
    ['authoring', 'submitted'],
    ['returned', 'submitted'],
    ['submitted', 'under_review'],
    ['submitted', 'authoring'],
    ['under_review', 'returned'],
    ['under_review', 'approved_and_signed'],
    ['approved_and_signed', 'returned'],
  ])('allows valid transition %s -> %s', (from, to) => {
    expect(isValidTripReportStatusTransition(from, to)).toBe(true);
  });

  it.each([
    ['report_pending', 'approved_and_signed'],
    ['authoring', 'under_review'],
    ['authoring', 'approved_and_signed'],
    ['submitted', 'approved_and_signed'],
    ['submitted', 'returned'],
    ['under_review', 'authoring'],
    ['approved_and_signed', 'submitted'],
    ['approved_and_signed', 'authoring'],
    ['unknown_status', 'submitted'],
  ])('rejects invalid transition %s -> %s', (from, to) => {
    expect(isValidTripReportStatusTransition(from, to)).toBe(false);
  });
});
