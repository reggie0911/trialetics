import { afterEach, describe, expect, it } from 'vitest';

import { cacheClear, cacheGet, cacheInvalidate, cacheKey, cacheSet, cached } from './cache';

afterEach(() => {
  cacheClear();
});

describe('cacheKey', () => {
  it('produces deterministic, sorted keys', () => {
    const a = cacheKey('insights', { studyId: 's1', userId: 'u1', page: '/p' });
    const b = cacheKey('insights', { page: '/p', userId: 'u1', studyId: 's1' });
    expect(a).toBe(b);
    expect(a).toContain('page=/p');
    expect(a).toContain('studyId=s1');
  });

  it('skips empty / null parts so absence and presence do not collide', () => {
    const a = cacheKey('actions', { page: '/p', studyId: null, siteId: undefined, role: 'user' });
    const b = cacheKey('actions', { page: '/p', role: 'user' });
    expect(a).toBe(b);
  });
});

describe('cacheGet/cacheSet', () => {
  it('returns null when missing', () => {
    expect(cacheGet('missing')).toBeNull();
  });

  it('returns stored value before TTL', () => {
    cacheSet('k', { ok: true }, 1_000);
    expect(cacheGet<{ ok: boolean }>('k')).toEqual({ ok: true });
  });

  it('drops entries past their TTL', async () => {
    cacheSet('k', 'v', 5);
    await new Promise(r => setTimeout(r, 20));
    expect(cacheGet('k')).toBeNull();
  });
});

describe('cached()', () => {
  it('runs the producer once and reports cache hits afterwards', async () => {
    let calls = 0;
    const producer = async () => {
      calls += 1;
      return { calls };
    };
    const first = await cached('x', producer, 60_000);
    const second = await cached('x', producer, 60_000);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(calls).toBe(1);
    expect(first.generatedAt).toBe(second.generatedAt);
  });
});

describe('cacheInvalidate', () => {
  it('removes only entries matching the prefix', () => {
    cacheSet('insights::a=1', 1);
    cacheSet('insights::a=2', 2);
    cacheSet('actions::a=1', 3);
    const removed = cacheInvalidate('insights::');
    expect(removed).toBe(2);
    expect(cacheGet('actions::a=1')).toBe(3);
  });
});
