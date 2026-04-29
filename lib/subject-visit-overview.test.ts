import { describe, expect, it } from 'vitest';

import type { SubjectVisit } from '@/lib/types/ctms';

import { deriveSubjectVisitOverview, selectLiveVisits } from './subject-visit-overview';

function visit(over: Partial<SubjectVisit>): SubjectVisit {
  return {
    id: over.id ?? '1',
    subject_id: 's',
    visit_name: 'V1',
    visit_number: 1,
    planned_date: over.planned_date ?? '2026-04-20',
    actual_date: over.actual_date ?? null,
    status: over.status ?? 'scheduled',
    window_start: over.window_start ?? '2026-04-15',
    window_end: over.window_end ?? '2026-04-25',
    notes: null,
    template_version_id: over.template_version_id ?? 'live',
    visit_definition_id: null,
    sort_order: over.sort_order ?? 1,
    timepoint_label: null,
    timepoint_days: null,
    window_before_days: 0,
    window_after_days: 0,
    created_at: '2026-01-01',
  } as SubjectVisit;
}

describe('selectLiveVisits', () => {
  it('filters to live template', () => {
    const rows = [visit({ template_version_id: 'a' }), visit({ id: '2', template_version_id: 'b', visit_number: 2 })];
    const x = selectLiveVisits(rows, 'a');
    expect(x).toHaveLength(1);
    expect(x[0]!.id).toBe('1');
  });
});

describe('deriveSubjectVisitOverview', () => {
  it('counts overdue scheduled visits', () => {
    const today = '2026-04-30';
    const rows = [
      visit({
        id: '1',
        planned_date: '2026-04-10',
        window_start: '2026-04-01',
        window_end: '2026-04-12',
        actual_date: null,
        status: 'scheduled',
      }),
    ];
    const o = deriveSubjectVisitOverview(rows, 'live', today);
    expect(o.overdueCount).toBe(1);
  });
});
