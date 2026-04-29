import { describe, expect, it } from 'vitest';

import {
  buildNeedsAttentionList,
  computeDataQualityPercent,
  computeSiteHealth,
  computeTaskRollup,
  isTaskOpen,
  isTaskOverdue,
} from '@/lib/site-page-metrics';
import type { TaskWithRelations } from '@/lib/types/tasks';

const baseTask: TaskWithRelations = {
  id: 't1',
  study_id: 's',
  milestone_id: null,
  title: 'x',
  description: null,
  assigned_to: null,
  site_id: 'site',
  created_by: null,
  priority: 'medium',
  status: 'in_progress',
  on_track_status: 'on_track',
  planned_start_date: null,
  due_date: new Date(2000, 0, 1).toISOString(),
  completed_date: null,
  sort_order: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function task(partial: Partial<TaskWithRelations>): TaskWithRelations {
  return { ...baseTask, ...partial };
}

describe('computeTaskRollup', () => {
  it('counts open and overdue', () => {
    const past = new Date(2000, 0, 1).toISOString();
    const t = [
      task({ status: 'in_progress', due_date: null }),
      task({ status: 'completed' }),
      task({ status: 'not_started', due_date: past }),
    ];
    const r = computeTaskRollup(t);
    expect(r.openCount).toBe(2);
    expect(r.overdueCount).toBe(1);
  });
});

describe('isTaskOpen / isTaskOverdue', () => {
  it('completed is not open or overdue', () => {
    expect(isTaskOpen(task({ status: 'completed' }))).toBe(false);
    expect(
      isTaskOverdue(
        task({ status: 'completed', due_date: '2000-01-01T00:00:00.000Z' }),
      ),
    ).toBe(false);
  });
});

describe('buildNeedsAttentionList', () => {
  it('puts no-PI first when applicable', () => {
    const items = buildNeedsAttentionList({
      hasPi: false,
      activationDate: '2020-01-01',
      enrollmentPct: 10,
      enrolledCount: 0,
      targetEnrollment: 20,
      taskRollup: { openCount: 1, overdueCount: 0 },
      openQueryCount: 0,
      noVisitsScheduled: false,
    });
    expect(items[0]?.id).toBe('no-pi');
  });
});

describe('computeDataQualityPercent', () => {
  it('returns 100 when expected 0', () => {
    expect(computeDataQualityPercent({ dataExpectedTotal: 0, dataEntryTotal: 0, sdvTotal: 0, lockTotal: 0, openQueryCount: 0, answeredQueryCount: 0 })).toBe(100);
  });
});

describe('computeSiteHealth', () => {
  it('returns a bounded label', () => {
    const h = computeSiteHealth(
      50,
      {
        totals: {
          dataExpectedTotal: 10,
          dataEntryTotal: 5,
          sdvTotal: 0,
          lockTotal: 0,
          openQueryCount: 0,
          answeredQueryCount: 0,
        },
        bySubject: [],
        byVisit: [],
        lastTemplateSyncedAt: null,
      },
      {
        rollup: {
          overall: { total: 8, done: 4, in_window: 0, out_of_window: 0, overdue: 1, due_now: 0, upcoming: 2, pending: 1 },
          subjectCount: 0,
          byVisit: [],
          bySubject: [],
          lastActualDate: null,
        },
        trends: [],
        alerts: [],
        extras: { visits: {}, subjects: {} },
        generatedAt: new Date().toISOString(),
      },
      true,
      1,
    );
    expect(h.overall).toBeGreaterThanOrEqual(0);
    expect(h.overall).toBeLessThanOrEqual(100);
    expect(['Good', 'Fair', 'Needs work']).toContain(h.label);
    expect(['Good', 'Fair', 'At risk']).toContain(h.displayLabel);
  });
});
