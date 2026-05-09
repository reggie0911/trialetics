import { describe, expect, it } from 'vitest';

import { enrichSitesWithMetrics } from '@/lib/sites/derive';
import type { MonitoringVisitWithRelations, StudySite, SubjectWithSite } from '@/lib/types/ctms';

const STUDY_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const NOW = new Date('2026-05-07T12:00:00.000Z');

function baseSite(overrides: Partial<StudySite> = {}): StudySite {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    study_id: STUDY_ID,
    study_country_id: null,
    site_number: '001',
    name: 'Test Site',
    address: null,
    city: null,
    state: null,
    postal_code: null,
    pi_name: null,
    pi_email: null,
    pi_directory_contact_id: null,
    status: 'activated',
    activation_date: '2026-01-15',
    target_enrollment: 20,
    nearest_airport_place_id: null,
    nearest_airport_name: null,
    nearest_airport_address: null,
    nearest_hotel_place_id: null,
    nearest_hotel_name: null,
    nearest_hotel_address: null,
    travel_notes: null,
    latitude: null,
    longitude: null,
    geocode_status: null,
    geocoded_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('enrichSitesWithMetrics', () => {
  it('does not flag enrollment_pace when activation_date is missing', () => {
    const site = baseSite({ activation_date: null, target_enrollment: 100 });
    const [row] = enrichSitesWithMetrics([site], [], [], { now: NOW });
    expect(row.atRiskReasons).not.toContain('enrollment_pace');
    expect(row.isAtRisk).toBe(false);
  });

  it('does not flag enrollment_pace when activation is in the future', () => {
    const site = baseSite({ activation_date: '2026-12-01', target_enrollment: 100 });
    const [row] = enrichSitesWithMetrics([site], [], [], { now: NOW });
    expect(row.atRiskReasons).not.toContain('enrollment_pace');
    expect(row.isAtRisk).toBe(false);
  });

  it('does not flag enrollment_pace when target_enrollment is zero', () => {
    const site = baseSite({ target_enrollment: 0, activation_date: '2026-01-01' });
    const [row] = enrichSitesWithMetrics([site], [], [], { now: NOW });
    expect(row.atRiskReasons).not.toContain('enrollment_pace');
    expect(row.isAtRisk).toBe(false);
  });

  it('flags enrollment_pace when activated, target > 0, and enrolled strictly below 50% of target', () => {
    const site = baseSite({
      id: 'site-a',
      target_enrollment: 10,
      activation_date: '2026-01-01',
    });
    const subjects: Pick<SubjectWithSite, 'site_id' | 'status' | 'updated_at'>[] = [
      { site_id: 'site-a', status: 'randomized', updated_at: '2026-05-06T00:00:00.000Z' },
      { site_id: 'site-a', status: 'randomized', updated_at: '2026-05-06T00:00:00.000Z' },
      { site_id: 'site-a', status: 'randomized', updated_at: '2026-05-06T00:00:00.000Z' },
      { site_id: 'site-a', status: 'randomized', updated_at: '2026-05-06T00:00:00.000Z' },
    ];
    const [row] = enrichSitesWithMetrics([site], subjects, [], { now: NOW });
    expect(row.enrolled).toBe(4);
    expect(row.atRiskReasons).toContain('enrollment_pace');
    expect(row.isAtRisk).toBe(true);
  });

  it('does not flag enrollment_pace when enrolled is exactly 50% of target', () => {
    const site = baseSite({
      id: 'site-b',
      target_enrollment: 10,
      activation_date: '2026-01-01',
    });
    const subjects: Pick<SubjectWithSite, 'site_id' | 'status' | 'updated_at'>[] = Array.from(
      { length: 5 },
      () => ({
        site_id: 'site-b',
        status: 'randomized' as const,
        updated_at: '2026-05-06T00:00:00.000Z',
      }),
    );
    const [row] = enrichSitesWithMetrics([site], subjects, [], { now: NOW });
    expect(row.enrolled).toBe(5);
    expect(row.atRiskReasons).not.toContain('enrollment_pace');
    expect(row.isAtRisk).toBe(false);
  });

  it('flags stale_activity for enrolling sites with no subject or visit touch within 30 days', () => {
    const site = baseSite({
      status: 'enrolling',
      activation_date: '2026-01-01',
      target_enrollment: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    const [row] = enrichSitesWithMetrics([site], [], [], { now: NOW });
    expect(row.atRiskReasons).toContain('stale_activity');
    expect(row.isAtRisk).toBe(true);
  });

  it('does not flag stale_activity when enrolling site has recent subject activity', () => {
    const site = baseSite({
      id: 'site-c',
      status: 'enrolling',
      activation_date: '2026-01-01',
      target_enrollment: 100,
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    const subjects: Pick<SubjectWithSite, 'site_id' | 'status' | 'updated_at'>[] = [
      {
        site_id: 'site-c',
        status: 'screening',
        updated_at: '2026-05-06T00:00:00.000Z',
      },
    ];
    const [row] = enrichSitesWithMetrics([site], subjects, [], { now: NOW });
    expect(row.atRiskReasons).not.toContain('stale_activity');
  });

  it('flags monitoring_overdue when a non-terminal visit is planned in the past', () => {
    const site = baseSite({
      id: 'site-d',
      status: 'identified',
      activation_date: null,
      target_enrollment: 0,
    });
    const visits: Pick<
      MonitoringVisitWithRelations,
      'site_id' | 'status' | 'planned_date' | 'updated_at'
    >[] = [
      {
        site_id: 'site-d',
        status: 'planned',
        planned_date: '2026-05-01',
        updated_at: '2026-05-01T00:00:00.000Z',
      },
    ];
    const [row] = enrichSitesWithMetrics([site], [], visits, { now: NOW });
    expect(row.atRiskReasons).toContain('monitoring_overdue');
    expect(row.isAtRisk).toBe(true);
  });

  it('does not flag monitoring_overdue for completed or cancelled past visits', () => {
    const site = baseSite({
      id: 'site-e',
      status: 'identified',
      activation_date: null,
      target_enrollment: 0,
    });
    const visits: Pick<
      MonitoringVisitWithRelations,
      'site_id' | 'status' | 'planned_date' | 'updated_at'
    >[] = [
      {
        site_id: 'site-e',
        status: 'completed',
        planned_date: '2026-05-01',
        updated_at: '2026-05-01T00:00:00.000Z',
      },
      {
        site_id: 'site-e',
        status: 'cancelled',
        planned_date: '2026-04-01',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
    ];
    const [row] = enrichSitesWithMetrics([site], [], visits, { now: NOW });
    expect(row.atRiskReasons).not.toContain('monitoring_overdue');
    expect(row.isAtRisk).toBe(false);
  });
});
