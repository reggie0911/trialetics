import { describe, expect, it } from 'vitest';

import { buildReadiness } from './readiness-builder';

describe('buildReadiness', () => {
  // The Phase-4 implementation is deterministic (uses static fallbacks) so we
  // can call with a stub Supabase and assert structure.
  const stubSupabase = {} as Parameters<typeof buildReadiness>[0];

  it('returns a portfolio snapshot with score, grade, factors, recommendations', async () => {
    const snap = await buildReadiness(stubSupabase, {
      scopeKind: 'portfolio',
      scopeId: null,
      companyId: '00000000-0000-0000-0000-000000000000',
    });
    expect(snap.scopeKind).toBe('portfolio');
    expect(snap.score).toBeGreaterThanOrEqual(0);
    expect(snap.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(snap.grade);
    expect(snap.factors.length).toBeGreaterThan(0);
    expect(snap.agentId).toBe('inspection-readiness');
  });

  it('factor weights sum to 1', async () => {
    const snap = await buildReadiness(stubSupabase, {
      scopeKind: 'portfolio',
      scopeId: null,
      companyId: '00000000-0000-0000-0000-000000000000',
    });
    const total = snap.factors.reduce((acc, f) => acc + f.weight, 0);
    expect(total).toBeCloseTo(1, 2);
  });

  it('recommendations only target factors with score < 90', async () => {
    const snap = await buildReadiness(stubSupabase, {
      scopeKind: 'portfolio',
      scopeId: null,
      companyId: '00000000-0000-0000-0000-000000000000',
    });
    for (const rec of snap.recommendations) {
      const factor = snap.factors.find((f) => f.id === rec.factorId);
      expect(factor).toBeTruthy();
      expect(factor!.score).toBeLessThan(90);
    }
  });
});
