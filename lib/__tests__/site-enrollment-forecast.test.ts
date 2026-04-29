import { describe, expect, it } from 'vitest';

import { buildEnrollmentCumulativeSeries } from '@/lib/site-enrollment-forecast';
import type { SubjectWithSite } from '@/lib/types/ctms';

function makeSubject(over: Partial<SubjectWithSite> & { id: string; status: SubjectWithSite['status'] }): SubjectWithSite {
  return {
    id: over.id,
    study_id: 'study',
    site_id: 'site',
    site_number: '01',
    subject_number: over.id,
    first_name: null,
    last_name: null,
    date_of_birth: null,
    status: over.status,
    created_at: over.created_at ?? '2025-01-15T00:00:00.000Z',
    updated_at: '2025-01-15T00:00:00.000Z',
    study_country_id: null,
    randomization_date: over.randomization_date ?? null,
  } as unknown as SubjectWithSite;
}

describe('buildEnrollmentCumulativeSeries', () => {
  it('returns bounded expected by now and points', () => {
    const subjects: SubjectWithSite[] = [
      makeSubject({ id: '1', status: 'randomized', created_at: '2025-02-01T00:00:00.000Z' }),
    ];
    const out = buildEnrollmentCumulativeSeries({
      subjects,
      targetEnrollment: 20,
      activationDate: '2025-01-01',
      planEnd: '2026-01-01',
    });
    expect(out.targetEnrollment).toBe(20);
    expect(out.points.length).toBeGreaterThan(0);
    expect(out.expectedByNow).toBeGreaterThanOrEqual(0);
    expect(out.behindPlan).toBeTypeOf('boolean');
  });
});
