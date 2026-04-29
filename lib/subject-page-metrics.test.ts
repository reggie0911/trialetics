import { describe, expect, it } from 'vitest';

import { buildSubjectAttentionList, mapSubjectToLifecycleSteps } from './subject-page-metrics';

describe('mapSubjectToLifecycleSteps', () => {
  it('maps screening subject to current step 1', () => {
    const s = mapSubjectToLifecycleSteps({
      status: 'screening',
      screeningDate: '2026-01-31',
      randomizationDate: null,
    });
    expect(s[0].id).toBe('screening');
    expect(s[0].state).toBe('current');
    expect(s[1].state).toBe('pending');
  });

  it('maps completed subject to all complete', () => {
    const s = mapSubjectToLifecycleSteps({
      status: 'completed',
      screeningDate: '2026-01-10',
      randomizationDate: '2026-02-01',
    });
    expect(s.every((x) => x.state === 'complete')).toBe(true);
  });
});

describe('buildSubjectAttentionList', () => {
  it('includes no visit when pipeline empty', () => {
    const a = buildSubjectAttentionList({
      status: 'screening',
      screeningDate: '2025-12-01',
      randomizationDate: null,
      hasNextVisitInPipeline: false,
      openQueryCount: 0,
    });
    expect(a.some((x) => x.id === 'no-visit')).toBe(true);
  });
});
